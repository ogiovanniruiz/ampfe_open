import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subscription, from, of } from 'rxjs';
import { SafeUrl } from '@angular/platform-browser';
import { debounceTime, distinctUntilChanged, switchMap, timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, MISSING_ACTIVITY_MSG, loadErrorText } from 'src/app/utils/loading';
import { UntypedFormControl, UntypedFormGroup, Validators, AbstractControl, ValidationErrors, FormGroupDirective } from '@angular/forms';
import { Activity } from 'src/app/models/activity.model';
import { ActivityContactRecord, QuestionResponse, SurveyResponse } from 'src/app/models/contact.record.model';
import { Address, Household, Membership, Name, Person, Phone, Resident } from 'src/app/models/person.model';
import { Survey, Question } from 'src/app/models/survey.model';
import { User } from 'src/app/models/user.model';
import { ActivityService } from 'src/app/services/activity.service';
import { SurveyService } from 'src/app/services/survey.service';
import { PetitionService } from 'src/app/services/petition.service';
import { MembershipService } from 'src/app/services/membership.service';
import { OrganizationService } from 'src/app/services/organization/organization.service';

import {MatBottomSheet} from '@angular/material/bottom-sheet';

import { SingularTextForm } from 'src/app/components/singularTextForm/singularTextForm';
import { normalizePhone, usPhone } from 'src/app/utils/phone';
import { petitionSettings } from 'src/app/utils/petitionSettings';
import { hasTextingConsent } from 'src/app/utils/consent';
import { TagDefinition } from 'src/app/models/organization.model';
import { visibleTags } from 'src/app/utils/memberTags';
import { AddressSearchService, AddressSuggestion } from 'src/app/services/addressSearch.service';

interface VisibleQuestion {
  question: Question;
  index: number;   // position in survey.questions; keys the answers
  number: number;  // shown to the volunteer
}

// Whitespace-only names count as empty
const notBlank = (control: AbstractControl): ValidationErrors | null =>
  String(control.value ?? '').trim() ? null : {required: true}

// Uppercase without leading/trailing punctuation, as members are stored
const clean = (value: string): string => (value || '').toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')

// An optional address still needs both parts once either is given, so it can be geocoded
const streetWithCity = (group: AbstractControl): ValidationErrors | null => {
  const line = group.get('addressLine'), city = group.get('city')
  const hasLine = !!String(line.value ?? '').trim(), hasCity = !!String(city.value ?? '').trim()
  const setMissing = (control: AbstractControl, missing: boolean) => {
    const errors = {...(control.errors || {})}
    if(missing) errors.partner = true
    else delete errors.partner
    control.setErrors(Object.keys(errors).length ? errors : null)
  }
  setMissing(line, hasCity && !hasLine)
  setMissing(city, hasLine && !hasCity)
  return null
}

@Component({
  selector: 'app-petition',
  templateUrl: './petition.component.html',
  // Same card and form look as the register page, and the canvass survey styles
  styleUrls: [
    '../../styles/dialog-common.scss',
    '../register/register.component.scss',
    '../canvass/dialogs/householdDialog/householdDialog.scss',
    './petition.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class PetitionComponent implements OnInit, OnDestroy {

  activity: Activity;
  survey: Survey;

  states = {/*AL: 'ALABAMA', AK: 'ALASKA', AZ: 'ARIZONA', AR: 'ARKANSAS',*/ CA: 'CALIFORNIA', /*CO: 'COLORADO', CT: 'CONNECTICUT', DE: 'DELAWARE', FL: 'FLORIDA', GA: 'GEORGIA', HI: 'HAWAII', ID: 'IDAHO', IL: 'ILLINOIS', IN: 'INDIANA', IA: 'IOWA', KS: 'KANSAS', KY: 'KENTUCKY', LA: 'LOUISIANA', ME: 'MAINE', MD: 'MARYLAND', MA: 'MASSACHUSETTS', MI: 'MICHIGAN', MN: 'MINNESOTA', MS: 'MISSISSIPPI', MO: 'MISSOURI', MT: 'MONTANA', NE: 'NEBRASKA', NV: 'NEVADA', NH: 'NEW HAMPSHIRE', NJ: 'NEW JERSEY', NM: 'NEW MEXICO', NY: 'NEW YORK', NC: 'NORTH CAROLINA', ND: 'NORTH DAKOTA', OH: 'OHIO', OK: 'OKLAHOMA', OR: 'OREGON', PA: 'PENNSYLVANIA', RI: 'RHODE ISLAND', SC: 'SOUTH CAROLINA', SD: 'SOUTH DAKOTA', TN: 'TENNESSEE', TX: 'TEXAS', UT: 'UTAH', VT: 'VERMONT', VA: 'VIRGINIA', WA: 'WASHINGTON', WV: 'WEST VIRGINIA', WI: 'WISCONSIN', WY: 'WYOMING'*/};

  // Zip is always asked; street address and city, and email, are each optional parts of the form
  includeAddress: boolean = false;
  requireAddress: boolean = false;
  includeEmail: boolean = false;
  requireEmail: boolean = false;
  enableTexting: boolean = false;

  loadError: string = '';
  message: string = '';
  needsResponses: boolean = false;
  saving: boolean = false;

  // Saves since the page opened, and the last one for the confirmation
  signaturesCount: number = 0;
  savedName: string = '';
  lastSavedMember: Membership | null = null;
  // The last saved signer has been texted, so the saved notice doesn't offer Send text again
  lastSavedTexted: boolean = false;
  orgName: string = sessionStorage.getItem('orgName') || '';
  // The last saved signer agreed to texts; without it there's no Send Text
  lastSavedTextingConsent: boolean = false;

  // The member was created but its answers weren't saved; Retry re-sends only the answers
  pendingMember: Membership | null = null;
  pendingResponses: QuestionResponse[] = [];

  visibleQuestions: VisibleQuestion[] = [];
  // answers[question index]: a response, a list of responses (multi-select) or notes text
  answers: {[questionIndex: number]: any} = {};

  form = new UntypedFormGroup({
    firstName: new UntypedFormControl('', [notBlank]),
    middleName: new UntypedFormControl(''),
    lastName: new UntypedFormControl('', [notBlank]),
    phone: new UntypedFormControl('', [Validators.required, usPhone]),
    email: new UntypedFormControl(''),
    // Consent starts unchecked: volunteers check only what the signer agreed to
    optinTexting: new UntypedFormControl(false),
    optinEmail: new UntypedFormControl(false),
    addressLine: new UntypedFormControl(''),
    city: new UntypedFormControl(''),
    zip: new UntypedFormControl('', [Validators.required, Validators.pattern(/^\s*\d{5}\s*$/)]),
    // Tags (and values) the volunteer picks for this signer
    tags: new UntypedFormControl([]),
  }, {validators: streetWithCity});

  orgTags: string[] = [];
  tagDefinitions: TagDefinition[] = [];

  // Street parts from a picked Google suggestion; cleared when the address is typed by hand
  private streetNum: string = '';
  private street: string = '';
  private suffix: string = '';
  private prefix: string = '';
  private placeLine: string | null = null;

  // Number actually texted (sent, not just opened) before saving, so the save doesn't open the text sheet again
  private textedPhone: string = '';

  // Google address suggestions for the street field
  addressSuggestions: AddressSuggestion[] = [];
  resolvingAddress: boolean = false;
  private suggestionsSub?: Subscription;
  @ViewChild(FormGroupDirective) formDir: FormGroupDirective;

  orgLogo$: Observable<SafeUrl | null | undefined>;

  constructor(private activityService: ActivityService,
              private petitionService: PetitionService,
              public memberService: MembershipService,
              private bottomSheet: MatBottomSheet,
              public surveyService: SurveyService,
              public addressSearch: AddressSearchService,
              public orgService: OrganizationService) {}

  ngOnInit(){
    this.orgLogo$ = this.orgService.getOrgLogoUrl(sessionStorage.getItem('orgID') || '');
    this.getActivity();
    this.getOrgTags();
    sessionStorage.removeItem('rdr')
    sessionStorage.setItem('activityType', "Petition")

    // A hand-edited address no longer matches the suggestion it came from
    this.form.get('addressLine').valueChanges.subscribe((value: string) => {
      if(this.placeLine !== null && value !== this.placeLine) this.clearStreetParts()
    })
    this.form.valueChanges.subscribe(() => { if(!this.saving) this.message = '' })
    this.form.get('optinEmail').valueChanges.subscribe(() => setTimeout(() => this.applyEmailRequirement()))

    // Typed text (not a picked suggestion) asks Google for matching addresses
    this.suggestionsSub = this.form.get('addressLine').valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((value: any) => {
        if(!this.includeAddress || this.resolvingAddress || typeof value !== 'string' || value === this.placeLine) return of([])
        return from(this.addressSearch.suggest(value))
      }),
    ).subscribe(suggestions => this.addressSuggestions = suggestions)
  }

  ngOnDestroy(){
    this.suggestionsSub?.unsubscribe()
  }

  //////////////////////// LOAD ////////////////////////

  getActivity(){
    var activityID: string = sessionStorage.getItem('activityID');
    this.activityService.getActivity(activityID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (activity: Activity) =>{
        if(!activity){
          this.loadError = MISSING_ACTIVITY_MSG
          return
        }
        this.getSurvey(activity.surveyID);
        this.activity = activity;
        const settings = petitionSettings(activity.petitionMetadata)
        this.includeAddress = settings.includeAddress;
        this.requireAddress = settings.requireAddress;
        this.includeEmail = settings.includeEmail;
        this.requireEmail = settings.requireEmail;
        this.enableTexting = activity.enableTexting || false;
        this.applyRequirements()

        // Start loading Google now so the first suggestions come quickly
        if(this.includeAddress) this.addressSearch.load()
      }, error => {
        console.log(error)
        this.loadError = loadErrorText('the petition', error);
      })
  }

  // Loads again whatever failed: the petition, or just its questions
  retryLoad(){
    this.loadError = ''
    if(!this.activity) this.getActivity()
    else if(!this.survey) this.getSurvey(this.activity.surveyID)
  }

  getSurvey(surveyID: string){
    this.surveyService.getSurvey(surveyID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (survey: Survey) =>{
        this.survey = survey
        this.buildVisibleQuestions()
      },
      error=>{
        console.log(error)
        this.loadError = loadErrorText('the questions', error);
      }
    )
  }

  // Email consent needs an email, even on petitions that don't otherwise ask for one
  get showEmail(): boolean {
    return this.includeEmail || !!this.form.value.optinEmail
  }

  get emailRequired(): boolean {
    return this.requireEmail || !!this.form.value.optinEmail
  }

  private applyEmailRequirement(){
    const control = this.form.get('email')
    control.setValidators(this.emailRequired ? [Validators.required, Validators.email] : [Validators.email])
    control.updateValueAndValidity({emitEvent: false})
  }

  private applyRequirements(){
    const set = (name: string, validators: any[]) => {
      this.form.get(name).setValidators(validators)
      this.form.get(name).updateValueAndValidity({emitEvent: false})
    }
    this.applyEmailRequirement()
    set('addressLine', this.requireAddress ? [notBlank] : [])
    set('city', this.requireAddress ? [notBlank] : [])
  }

  // Only one state is offered, so it isn't asked
  private get state(): string {
    return Object.keys(this.states)[0] || ''
  }

  private buildVisibleQuestions(){
    const visible: VisibleQuestion[] = []
    ;(this.survey?.questions || []).forEach((question, index) => {
      if(this.shouldShowQuestion(question) && !this.shouldHideQuestion(question)){
        visible.push({question, index, number: visible.length + 1})
      }
    })
    this.visibleQuestions = visible
  }

  // Fills street, city and zip from the picked suggestion
  async pickAddress(suggestion: AddressSuggestion){
    this.addressSuggestions = []
    this.resolvingAddress = true
    // Always clear the spinner, even if Google's lookup fails
    let picked: any = null
    try {
      picked = await this.addressSearch.resolve(suggestion)
    } catch(e) {
      console.log(e)
    } finally {
      this.resolvingAddress = false
    }

    if(!picked){
      // Keep what Google showed; the server geocodes typed addresses
      this.form.patchValue({addressLine: suggestion.text.split(',')[0]})
      return
    }

    // placeLine first, so the patch below neither clears these parts nor asks for suggestions again
    this.placeLine = picked.line
    this.streetNum = picked.streetNum
    this.street = picked.street
    this.suffix = ''
    this.prefix = ''
    this.form.patchValue({
      addressLine: picked.line,
      city: picked.city,
      zip: picked.zip || this.form.value.zip,
    })
  }

  private clearStreetParts(){
    this.streetNum = ''
    this.street = ''
    this.suffix = ''
    this.prefix = ''
    this.placeLine = null
  }

  //////////////////////// ANSWERS ////////////////////////

  isChecked(questionIndex: number, response: string): boolean {
    const selected = this.answers[questionIndex]
    return Array.isArray(selected) && selected.includes(response)
  }

  toggleOption(questionIndex: number, response: string, checked: boolean){
    const current: string[] = Array.isArray(this.answers[questionIndex]) ? this.answers[questionIndex] : []
    this.answers[questionIndex] = checked
      ? (current.includes(response) ? current : [...current, response])
      : current.filter(value => value !== response)
    this.needsResponses = false
  }

  // Same shape as before: one entry per single-select answer, per checked multi-select option and per note
  generateQuestionResponses(): QuestionResponse[]{
    const questionResponses: QuestionResponse[] = [];

    for(const {question, index} of this.visibleQuestions){
      const value = this.answers[index]

      if(question.questionType === 'SINGLESELECT' && value){
        questionResponses.push({question: question.question, response: value, questionType: "SINGLESELECT"});
      }

      if(question.questionType === 'NOTES' && typeof value === 'string' && value.trim()){
        questionResponses.push({question: question.question, response: value.trim(), questionType: "NOTES"});
      }

      if(question.questionType === 'MULTISELECT' && Array.isArray(value)){
        for(const response of value){
          questionResponses.push({question: question.question, response: response, questionType: "MULTISELECT"});
        }
      }
    }

    return questionResponses;
  }

  //////////////////////// SAVE ////////////////////////

  save(){
    if(this.saving || !this.activity || !this.survey) return

    // The member exists already; only the answers still need saving
    if(this.pendingMember){
      this.submitSurveyResponse(this.pendingMember, this.pendingResponses)
      return
    }

    if(this.form.invalid){
      this.form.markAllAsTouched()
      this.message = 'Check the highlighted fields.'
      return
    }

    const questionResponses = this.generateQuestionResponses()
    if(!questionResponses.some(obj => obj.questionType === "SINGLESELECT" || obj.questionType === "MULTISELECT")){
      this.needsResponses = true;
      return;
    }

    this.needsResponses = false;
    this.message = '';
    this.saving = true;

    const member = this.buildMember()

    this.memberService.createMemberWithForm(member).subscribe(
      (createdMember: Membership) =>{
        this.submitSurveyResponse(createdMember, questionResponses);
      },
      error => {
        console.log(error)
        this.saving = false;
        this.message = 'There was an error saving the signer. Please try again.';
      }
    )
  }

  private buildMember(): Membership {
    const orgID: string = sessionStorage.getItem('orgID')
    const user: User = JSON.parse(sessionStorage.getItem('user') || '{}')
    const value = this.form.value

    const memberFirstName = clean(value.firstName)
    const memberMiddleName = clean(value.middleName)
    const memberLastName = clean(value.lastName)
    const memberFullName = [memberFirstName, memberMiddleName, memberLastName].filter(Boolean).join(' ')

    const phone = normalizePhone(value.phone)
    const email = this.showEmail ? (value.email || '').trim().toLowerCase() : ''

    const memberPhones: Phone[] = phone ? [{type: '?', number: phone}] : []
    const memberEmails: string[] = email ? [email] : []

    const addressLine = this.includeAddress ? clean(value.addressLine) : ''
    const unit = ''
    const memberCity = this.includeAddress && addressLine ? clean(value.city) : ''
    const state = addressLine ? this.state : ''
    const memberZip = clean(value.zip)

    // Typed addresses (no Google suggestion picked): take the leading house number from the line
    let streetNum = this.streetNum
    let street = this.street
    if(addressLine && !street){
      const match = addressLine.match(/^(\d+[A-Z]?)\s+(.+)$/)
      streetNum = match ? match[1] : ''
      street = match ? match[2] : addressLine
    }

    const memberName: Name = {
      firstName: memberFirstName,
      middleName: memberMiddleName,
      lastName: memberLastName,
      fullName: memberFullName
    }

    const memberResidentDetails: Resident = {
      name: memberName,
      phones: memberPhones,
      emails: memberEmails,
    }


    const memberAddress: Address = {
      streetNum: streetNum,
      street: street,
      unit: unit,
      prefix: this.prefix,
      suffix: this.suffix,
      city: memberCity,
      zip: memberZip,
      state: {name: this.states[state], abbrv: state}
    }

    return {
      resident: memberResidentDetails,
      tags: value.tags || [],
      activityIDs: [this.activity._id],
      address: memberAddress,
      fullAddress1: addressLine,
      fullAddress2: memberCity + " " + state + ", " + memberZip,
      accuracyType: "",
      location: {type: 'Point', coordinates: [0,0]},
      county: "",
      // The server sets where they came from (this petition) and when.
      // Consent lets the member be texted / emailed later (see the opt-in sheet)
      enrollment: {
        orgID: orgID,
        createdBy: user._id,
        optinTexting: {status: !!value.optinTexting},
        optinEmail: {status: !!value.optinEmail},
      },
    }
  }

  //////////////////////// TEXTING ////////////////////////

  // A first name keeps the greeting readable ("Hello Jane, …"); the number must be a full US number
  // Texting needs the signer's consent, and a first name keeps the greeting readable ("Hello Jane, …")
  get canTextFromForm(): boolean {
    return this.enableTexting && !!this.form.value.optinTexting && this.form.get('phone').valid && !!(this.form.value.firstName || '').trim()
  }

  get textFromFormHint(): string {
    if(this.canTextFromForm) return ''
    if(!this.form.value.optinTexting) return 'Check texting consent to text them'
    return 'Enter a first name and phone number to text'
  }

  // Texts the signer before saving, using the name and number typed in the form
  textFromForm(){
    if(!this.canTextFromForm) return
    this.openSMSDialog(this.buildMember(), 'draft')
  }

  submitSurveyResponse(member: Membership, questionResponses: QuestionResponse[]){

    const surveyResponse: SurveyResponse = {surveyID: this.survey._id, questionResponses: questionResponses}

    const user: User = JSON.parse(sessionStorage.getItem('user') || '{}')
    const orgID: string = sessionStorage.getItem('orgID')

    const person: Person = {resident: member.resident,
                            address: member.address,
                            county: member.county,
                            fullAddress1: member.fullAddress1,
                            fullAddress2: member.fullAddress2,
                            location: member.location,
                            accuracyType: member.accuracyType,
                            districts: member.districts,
                            registrationPrecinctID: member.registrationPrecinctID
                          }

    const activityContactRecord: ActivityContactRecord = {
      personID: member.resident.personID,
      person: person,

      userID: user._id,
      user: user,

      activityID: this.activity._id,
      orgID: orgID,
      campaignID: this.activity.campaignID,

      activityType: "Petition",

      surveyResponse: surveyResponse,

      member: true,
      complete: true,
      pass: this.activity.passes,
    }

    this.saving = true

    this.petitionService.submitSurveyResponse(activityContactRecord).subscribe(
      (result: any) => {
        this.saving = false
        this.pendingMember = null
        this.pendingResponses = []

        this.signaturesCount++
        this.savedName = [member.resident?.name?.firstName, member.resident?.name?.lastName].filter(Boolean).join(' ') || 'this signer'
        this.lastSavedMember = member
        this.lastSavedTextingConsent = hasTextingConsent(member)

        // Skip the automatic text sheet if this signer was already texted from the Text button
        const alreadyTexted = !!this.textedPhone && normalizePhone(member.resident?.phones?.[0]?.number) === this.textedPhone
        this.lastSavedTexted = alreadyTexted

        this.resetForm()

        if(this.enableTexting && this.lastSavedTextingConsent && !alreadyTexted){
          this.openSMSDialog(member, 'saved');
        }
      },
      error => {
        console.log(error)
        this.saving = false
        // Keep the created member so Retry only re-sends the answers
        this.pendingMember = member
        this.pendingResponses = questionResponses
        this.message = "The signer was saved, but their answers weren't. Press Retry to save the answers."
      })
  }

  // The activity's hidden tags aren't offered
  get pickerTags(): string[] {
    return visibleTags(this.orgTags, this.activity?.tagsToHide)
  }

  // The org's tags for the signer's tag picker
  getOrgTags(){
    const orgID: string = sessionStorage.getItem('orgID') || ''
    this.orgService.getOrgTags(orgID).subscribe(
      (tags: string[]) => this.orgTags = (tags || []).filter(tag => !!tag),
      error => console.log(error)
    )
    this.orgService.getTagDefinitions(orgID).subscribe(
      (definitions: TagDefinition[]) => this.tagDefinitions = definitions || [],
      error => console.log(error)
    )
  }

  private resetForm(){
    const values = {firstName: '', middleName: '', lastName: '', phone: '', email: '', optinTexting: false, optinEmail: false, addressLine: '', city: '', zip: '', tags: []}
    // resetForm also clears the directive's submitted flag; form.reset alone leaves every empty required field red
    if(this.formDir) this.formDir.resetForm(values)
    else this.form.reset(values, {emitEvent: false})
    this.clearStreetParts()
    this.textedPhone = ''
    this.answers = {}
    this.needsResponses = false
    this.message = ''
  }

  // draft: the signer being entered (not saved yet); saved: the signer just saved
  openSMSDialog(member: Membership, kind: 'draft' | 'saved' = 'saved'): void {

    let resident: Resident = member.resident;

    let household: Household = {
      _id: member.address,
      residents: [member.resident],
      county: member.county,
      fullAddress1: member.fullAddress1,
      fullAddress2: member.fullAddress2,
      location: member.location,
      accuracyType: member.accuracyType,
      districts: member.districts,
      registrationPrecinctID: member.registrationPrecinctID,
      hhParties: [member.resident.party],
    };

    const onSent = (phone: string) => {
      if(kind === 'draft') this.textedPhone = normalizePhone(phone)
      else if(member === this.lastSavedMember) this.lastSavedTexted = true
    }

    this.bottomSheet.open(SingularTextForm, {data: {resident: resident, household: household, activity: this.activity, onSent}});
  }

  shouldShowQuestion(question: any): boolean {
    var orgID: string = sessionStorage.getItem('orgID')

    if (!question.orgIDs || question.orgIDs.length === 0) {
      return true;
    }
    return question.orgIDs.includes(orgID);
  }

  shouldHideQuestion(question: any): boolean {
    return (this.activity?.questionsToHide || []).includes(question.question);
  }
}
