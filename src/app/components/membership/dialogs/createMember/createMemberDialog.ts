import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import {UserService} from '../../../../services/user.service'
import {OrganizationService} from '../../../../services/organization/organization.service'
import {PersonService} from '../../../../services/person.service'
import {MembershipService} from '../../../../services/membership.service'
import { PetitionService } from 'src/app/services/petition.service';



import { Address, Enrollment, Household, MemberTag, Membership, Name, Person, Phone, Resident } from 'src/app/models/person.model';
import { TagDefinition } from 'src/app/models/organization.model';
import { visibleTags } from 'src/app/utils/memberTags';
import { AddressParserService } from 'src/app/services/addressParser/address-parser.service';
import { Activity } from 'src/app/models/activity.model';
import { Question, Survey } from 'src/app/models/survey.model';
import { ActivityContactRecord, ActivityHouseholdRecord, QuestionResponse, SurveyResponse } from 'src/app/models/contact.record.model';
import { CanvassService } from 'src/app/services/canvass.service';
import { normalizePhone } from 'src/app/utils/phone';
import { hasTextingConsent } from 'src/app/utils/consent';
import { User } from 'src/app/models/user.model';
import { ActivityService } from 'src/app/services/activity.service';
import { SurveyService } from 'src/app/services/survey.service';
import { SingularTextForm } from 'src/app/components/singularTextForm/singularTextForm';
import {MatBottomSheet, MatBottomSheetRef} from '@angular/material/bottom-sheet';

@Component({
  templateUrl: './createMemberDialog.html',
  // Same look as the canvass household dialog it opens from
  styleUrls: ['../../../../styles/dialog-common.scss', '../../../canvass/dialogs/householdDialog/householdDialog.scss', './createMemberDialog.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class CreateMemberDialog implements OnInit{

  activity: Activity;
  survey: Survey;
  needsResponses: boolean = false;

  displayMessage: boolean = false;
  message: string;
  errorMessage: string
  displayErrorMsg: boolean = false;
  showProgressbar: boolean = false;

  states = {/*AL: 'ALABAMA', AK: 'ALASKA', AZ: 'ARIZONA', AR: 'ARKANSAS',*/ CA: 'CALIFORNIA', /*CO: 'COLORADO', CT: 'CONNECTICUT', DE: 'DELAWARE', FL: 'FLORIDA', GA: 'GEORGIA', HI: 'HAWAII', ID: 'IDAHO', IL: 'ILLINOIS', IN: 'INDIANA', IA: 'IOWA', KS: 'KANSAS', KY: 'KENTUCKY', LA: 'LOUISIANA', ME: 'MAINE', MD: 'MARYLAND', MA: 'MASSACHUSETTS', MI: 'MICHIGAN', MN: 'MINNESOTA', MS: 'MISSISSIPPI', MO: 'MISSOURI', MT: 'MONTANA', NE: 'NEBRASKA', NV: 'NEVADA', NH: 'NEW HAMPSHIRE', NJ: 'NEW JERSEY', NM: 'NEW MEXICO', NY: 'NEW YORK', NC: 'NORTH CAROLINA', ND: 'NORTH DAKOTA', OH: 'OHIO', OK: 'OKLAHOMA', OR: 'OREGON', PA: 'PENNSYLVANIA', RI: 'RHODE ISLAND', SC: 'SOUTH CAROLINA', SD: 'SOUTH DAKOTA', TN: 'TENNESSEE', TX: 'TEXAS', UT: 'UTAH', VT: 'VERMONT', VA: 'VIRGINIA', WA: 'WASHINGTON', WV: 'WEST VIRGINIA', WI: 'WISCONSIN', WY: 'WYOMING'*/};
  
  streetNum: string;
  street: string;
  suffix: string;
  prefix: string;
  coordinates: number[];
  accuracyType: string;
  county: string;

  requireFullAddress: boolean = false;
  requireEmail: boolean = false;

  enableTexting: boolean = false;

  // What they agreed to; saved on the member's enrollment like the petition form
  optinTexting: boolean = false;
  optinEmail: boolean = false;
  orgName: string = sessionStorage.getItem('orgName') || '';

  // Questions shown at the door (org and hidden-question filters), numbered as the canvasser sees them
  visibleQuestions: {question: Question, index: number, number: number}[] = [];
  // answers[question index]: a response, a list of responses (multi-select) or notes text
  answers: {[questionIndex: number]: any} = {};

  @ViewChild("firstName", {static: true}) firstName: ElementRef;
  @ViewChild("middleName", {static: true}) middleName: ElementRef;
  @ViewChild("lastName",{static: true}) lastName: ElementRef;
  @ViewChild("phone", {static: true}) phone: ElementRef;
  @ViewChild("email", {static: true}) email: ElementRef;
  @ViewChild("address", {static: true}) address: ElementRef;
  @ViewChild("unit", {static: true}) unit: ElementRef;

  @ViewChild("city", {static: true}) city: ElementRef;
  //@ViewChild("county", {static: true}) county: ElementRef;
  @ViewChild("state", {static: true}) state: ElementRef;
  @ViewChild("zip", {static: true}) zip: ElementRef;


  personExists:boolean = false;
  tags: string[] = [];
  memberTags: MemberTag[] = [];
  tagDefinitions: TagDefinition[] = [];

  household: Household;
  // Set for canvass households; a dropped one takes the people added here as residents
  activityHouseholdRecord: ActivityHouseholdRecord;
  // The dropped household after someone was added, handed back on close so the door shows as done
  savedRecord: ActivityHouseholdRecord;
  // People saved since the dialog opened, so the canvasser can see each save went through
  savedNames: string[] = [];

  constructor(public dialogRef: MatDialogRef<CreateMemberDialog>,
              @Inject(MAT_DIALOG_DATA) public data: {household: Household, activityHouseholdRecord?: ActivityHouseholdRecord},
              private canvassService: CanvassService,
              public userService: UserService,
              public personService: PersonService,
              public memberService: MembershipService,
              public orgService: OrganizationService,
              public addressParser: AddressParserService,
              public petitionService: PetitionService,    
              private activityService: ActivityService,
              private bottomSheet: MatBottomSheet,

              public surveyService: SurveyService
              ) {
                this.household = data.household
                this.activityHouseholdRecord = data.activityHouseholdRecord
              }
  ngOnInit(){
    this.state['value'] = "CA"
    this.getOrgTags();
    this.prefillAddress();
    this.getActivity();
  }
  // From a canvass door, the activity's hidden tags aren't offered. Elsewhere the stored activity may be stale.
  get pickerTags(): string[] {
    return this.activityHouseholdRecord ? visibleTags(this.tags, this.activity?.tagsToHide) : this.tags
  }

  getOrgTags(){
    var orgID: string = sessionStorage.getItem('orgID');
    this.orgService.getOrgTags(orgID).subscribe(
      (tags: string[]) =>{
        this.tags = (tags || []).filter(tag => !!tag);
      }
    );
    this.orgService.getTagDefinitions(orgID).subscribe(
      (definitions: TagDefinition[]) => this.tagDefinitions = definitions || [],
      error => console.log(error)
    );
  }

    getActivity(){
    var activityID: string = sessionStorage.getItem('activityID');
    this.activityService.getActivity(activityID).subscribe(
      (activity: Activity) =>{
        this.getSurvey(activity.surveyID);
        this.activity = activity;
        this.requireFullAddress = activity.petitionMetadata?.requireFullAddress || false;
        this.requireEmail = activity.petitionMetadata?.requireEmail || false;
        this.enableTexting = activity.enableTexting || false;

      }, error => {
        this.errorMessage = "Sorry, could not get activity. Please refresh to try again.";
        this.displayErrorMsg = true;
      })
  }

  getSurvey(surveyID: string){
    this.surveyService.getSurvey(surveyID).subscribe(
      (survey: Survey) =>{
        this.survey = survey
        this.visibleQuestions = this.buildVisibleQuestions()
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem loading the survey. Please refresh the page.';
      }
    )
  }

  createMemberWithForm(){
    var orgID: string = sessionStorage.getItem('orgID');
    var userID: string = JSON.parse(sessionStorage.getItem('user'))['_id'];

    var firstName: string = this.firstName.nativeElement.value;
    var middleName: string = this.middleName.nativeElement.value;
    var lastName: string = this.lastName.nativeElement.value;
    var phone: string = normalizePhone(this.phone.nativeElement.value);
    var email: string = this.email.nativeElement.value.trim();

    var addressLine: string = this.address.nativeElement.value;
    var unit: string = this.unit.nativeElement.value.trim().toUpperCase();
    var city: string = this.city.nativeElement.value;
    var state: string = this.state['value'];
    var zip: string = this.zip.nativeElement.value;
    // Checked before anything is saved, so a refused survey can't leave a member behind
    if(!this.hasChoiceAnswer(this.generateQuestionResponses())){
      this.needsResponses = true;
      return;
    }

    // An activity that hides every tag can still add members
    if(this.memberTags.length === 0 && this.pickerTags.length){
      this.displayMessage = true;
      this.message = 'Member needs a tag.';
      return;
    }

    if(firstName === ''){
      this.displayMessage = true;
      this.message = 'Member needs a first name';
      return;
    }

    if(lastName === ''){
      this.displayMessage = true;
      this.message = 'Member needs a last name';
      return;
    }

    // Phone is optional, but texting consent needs one
    if(phone === '' && this.optinTexting){
      this.displayMessage = true;
      this.message = 'Texting consent needs a phone number.';
      return;
    }

    if(phone !== '' && phone.length !== 10){
      this.displayMessage = true;
      this.message = 'Enter a 10-digit US phone number.';
      return;
    }

    if(this.zip.nativeElement.value === '' && this.zip.nativeElement.value.length < 5){
      this.displayMessage = true;
      this.message = 'Zip code needs to be at least 5 digits';
      return;
    }

    if(email === '' && this.optinEmail){
      this.displayMessage = true;
      this.message = 'Email consent needs an email.';
      return;
    }

    if(email === '' && this.requireEmail){
      this.displayMessage = true;
      this.message = 'Email is required.';
      return;
    }

    if (email.length > 0){
        const emailExpression = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!emailExpression.test(email)){
            this.displayMessage = true;
            this.message = 'Please enter a valid email';
            return;
        }
    }

    if(this.requireFullAddress && (addressLine === '' || city === '' || state === '' || zip === '')){
      this.displayMessage = true;
      this.message = 'Please enter a full address';
      return;
    }

    this.displayMessage = false;
    this.showProgressbar = true;

    var memberFirstName = firstName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')
    var memberLastName = lastName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')
    var memberMiddleName = middleName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')
    var memberFullName = memberFirstName + " " + memberMiddleName + " " + memberLastName

    var memberPhones: Phone[] = (phone ? [{type: '?', number: phone}] : [])
    var memberEmails: string[] = (email != '' ? [email.toLowerCase().trim()]: [])

    var memberCity = city.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')
    var memberZip = zip.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '') 

    var fullAddress1 =  addressLine.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')                        
    var fullAddress2 = memberCity + " " + state + ", " + memberZip  

    var memberName: Name = {
                            firstName: memberFirstName,
                            middleName: memberMiddleName,
                            lastName: memberLastName,
                            fullName: memberFullName
                          }

    var memberResidentDetails: Resident = {name: memberName, 
                                           phones: memberPhones,
                                           emails: memberEmails,
                                          }

    // The server sets where they came from (this activity) and when
    var enrollment: Enrollment = {orgID: orgID, createdBy: userID,
                                  optinTexting: {status: this.optinTexting},
                                  optinEmail: {status: this.optinEmail}}

                                          
    var memberAddress: Address = {streetNum: this.street, 
                                  street: this.street, 
                                  unit: unit, 
                                  prefix: this.prefix, 
                                  suffix: this.suffix, 
                                  city: memberCity, 
                                  zip: memberZip,  
                                  state: {name: this.states[this.state['value']], abbrv: this.state['value']}}
    
    var member: Membership= {resident: memberResidentDetails, 
                             enrollment: enrollment,
                             tags: this.memberTags,
                             activityIDs: [this.activity._id],
                             address: memberAddress,
                             fullAddress1: fullAddress1,
                             fullAddress2: fullAddress2,
                             accuracyType: this.accuracyType,
                             location: {type: 'Point', coordinates: this.coordinates},
                             county: this.county,
                            }
                
  this.memberService.createMemberWithForm(member).subscribe(
      (createdMember: Membership) =>{
        this.submitSurveyResponse(createdMember);

    }, error => {
      this.displayMessage = true;
      this.showProgressbar = false;
      this.message = 'There was an error creating the member. Please try again.';
    }
    )
  }

  // Same filters as the canvass household dialog
  private buildVisibleQuestions(){
    const orgID: string = sessionStorage.getItem('orgID')
    const hidden: string[] = this.activity?.questionsToHide || []
    const visible = []
    ;(this.survey?.questions || []).forEach((question, index) => {
      const forOrg = !question.orgIDs?.length || question.orgIDs.includes(orgID)
      if(forOrg && !hidden.includes(question.question)) visible.push({question, index, number: visible.length + 1})
    })
    return visible
  }

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

  // One entry per single-select answer, per checked multi-select option and per note
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

  // A submit needs at least one multiple-choice answer
  private hasChoiceAnswer(questionResponses: QuestionResponse[]): boolean {
    return questionResponses.some(obj => obj.questionType === "SINGLESELECT" || obj.questionType === "MULTISELECT")
  }

  submitSurveyResponse(member: Membership){
  
    var questionResponses: QuestionResponse[] = this.generateQuestionResponses();

    if(!this.hasChoiceAnswer(questionResponses)){
      this.needsResponses = true;
      this.showProgressbar = false;
      return;
    }
  
      var surveyResponse: SurveyResponse = {surveyID: this.survey._id, questionResponses: questionResponses}
  
      var personID: string = member.resident.personID
  
      var user: User = JSON.parse(sessionStorage.getItem('user'))
      var orgID: string = sessionStorage.getItem('orgID')

      var person: Person = {resident: member.resident, 
                            address: member.address, 
                            county: member.county, 
                            fullAddress1: member.fullAddress1,
                            fullAddress2: member.fullAddress2,
                            location: member.location,
                            accuracyType: member.accuracyType,
                            districts: member.districts,
                            registrationPrecinctID: member.registrationPrecinctID
                          }
  
      var activityContactRecord: ActivityContactRecord = {
                                                          personID: personID,
                                                          person: person, 
        
                                                          userID: user._id,
                                                          user: user,
        
                                                          activityID: this.activity._id, 
                                                          orgID: orgID,
                                                          campaignID: this.activity.campaignID,
                                                                
                                                          activityType: "Canvass",
                                                                
                                                          surveyResponse: surveyResponse,
                                                                
                                                          member: true,
                                                          complete: true,
                                                          pass: this.activity.passes,
                                                          // Links the response to the door, so it shows in the door's history
                                                          activityHouseholdRecordID: this.activityHouseholdRecord?._id,
                                                        }
  
        this.petitionService.submitSurveyResponse(activityContactRecord).subscribe(
          (result: any) => {

            if(this.activityHouseholdRecord?.dropped) this.addResidentToDroppedHousehold(member.resident);
            this.savedNames.push(member.resident?.name?.fullName?.replace(/\s+/g, ' ').trim() || 'New member');

            // Only people who agreed to texts can be texted
            if(this.enableTexting && hasTextingConsent(member) && member.resident?.phones?.length){
              this.openSMSDialog(member);
            }
  
            this.firstName.nativeElement.value = '';
            this.middleName.nativeElement.value = '';
            this.lastName.nativeElement.value = '';
            this.phone.nativeElement.value = '';
  
            this.email.nativeElement.value = '';
            this.optinTexting = false;
            this.optinEmail = false;

            // The address is the household's and stays for the next person; a typed unit doesn't carry over
            this.unit.nativeElement.value = this.household ? this.household._id.unit ?? '' : '';
            this.memberTags = [];
            this.needsResponses = false;
            this.answers = {};

            this.showProgressbar = false;
          },
          error => {
            console.log(error);
            this.showProgressbar = false;
            this.displayMessage = true;
            this.message = 'They were saved as a member, but their survey answers could not be saved. Please try again.';
          })
        
  
    }

  numericOnly(event) {
      var patt = /^([0-9])$/;
      var result = patt.test(event.data);
      if (!result && event.data){
          event.target.value = event.target.value.slice(0, -1);
      }
  }

  addResidentToDroppedHousehold(resident: Resident){
    this.canvassService.addCanvassHouseholdResident(this.activityHouseholdRecord._id, resident).subscribe(
      (record: ActivityHouseholdRecord) => this.savedRecord = record,
      error => {
        console.log(error);
        this.displayMessage = true;
        this.message = 'They were saved as a member, but could not be added to this household.';
      }
    )
  }

  cancel(){this.dialogRef.close(this.savedRecord)}

  prefillAddress(){
    // Missing parts (reverse geocoded doors have no unit) stay empty instead of showing "undefined"
    this.address.nativeElement.value = this.household ? this.household.fullAddress1 ?? '' : '';
    this.city.nativeElement.value = this.household ? this.household._id.city ?? '' : '';
    this.zip.nativeElement.value = this.household ? this.household._id.zip ?? '' : '';
    this.unit.nativeElement.value = this.household ? this.household._id.unit ?? '' : '';
    this.coordinates = this.household.location.coordinates
    this.accuracyType = this.household.accuracyType;
    this.county = this.household.county;
  }

  openSMSDialog(member: Membership): void {
  
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
  
    this.bottomSheet.open(SingularTextForm, {data: {resident: resident, household: household, activity: this.activity}});
  }
}