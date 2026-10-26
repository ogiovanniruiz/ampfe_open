import {Component, Inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {MatBottomSheet, MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA} from '@angular/material/bottom-sheet';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';

//SERVICES
import { MembershipService } from 'src/app/services/membership.service';
import { OrganizationService } from 'src/app/services/organization/organization.service';

//MODELS
import { Activity } from 'src/app/models/activity.model';
import { Household, Membership, Resident } from 'src/app/models/person.model';
import { User } from 'src/app/models/user.model';

import { normalizePhone, usPhone } from '../../utils/phone';
import { hasEmailConsent, hasTextingConsent } from '../../utils/consent';
import { TagDefinition } from 'src/app/models/organization.model';
import { visibleTags } from 'src/app/utils/memberTags';
import { SingularTextForm } from '../singularTextForm/singularTextForm';


/**
 * Opt-in, and (when the activity allows texting) "Opt in & text":
 * a person must be on the member list with texting consent before they can be texted.
 * data: {resident, activity, household?, allowTexting?}
 */
@Component({
    selector: 'optinForm',
    templateUrl: 'optinForm.html',
    // Shares the dialog look (ge-*) and the field/notice styles from the test-text dialog (tt-*)
    styleUrls: [
      '../../styles/dialog-common.scss',
      '../activity/dialogs/sendTestText/sendTestText.scss',
      './optinForm.scss',
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class OptinFormBottomSheet implements OnInit {
  resident: Resident;
  activity: Activity;
  household: Household;
  allowTexting: boolean = false;
  orgName: string = '';

  orgTags: string[] = [];
  tagDefinitions: TagDefinition[] = [];

  loading: boolean = false;
  saving: boolean = false;
  saved: boolean = false;
  matchedExisting: boolean = false;
  message: string = '';

  // The person's member record, once known (loaded, created or updated here)
  member: Membership | null = null;
  // Whether they were already a member when the sheet opened
  wasMember: boolean = false;

  // Consent starts unchecked: volunteers check only what the person agreed to
  form = new UntypedFormGroup({
    optinTexting: new UntypedFormControl(false),
    optinEmail: new UntypedFormControl(false),
    phone: new UntypedFormControl('', [usPhone]),
    email: new UntypedFormControl('', [Validators.email]),
    tags: new UntypedFormControl([]),
  });

  constructor(
      private _bottomSheetRef: MatBottomSheetRef<OptinFormBottomSheet>,
      private bottomSheet: MatBottomSheet,
      private memberService: MembershipService,
      private orgService: OrganizationService,
      @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
      ) {
    this.resident = data.resident
    this.activity = data.activity
    this.household = data.household
    this.allowTexting = !!data.allowTexting
  }

  ngOnInit(){
    this.orgName = sessionStorage.getItem('orgName') || ''

    // Prefill from the voter file; volunteers can correct either value
    this.prefillContact(this.resident)

    // Phone and email are only required for the channels being opted in to
    this.form.get('optinTexting').valueChanges.subscribe(checked => this.setRequired('phone', checked, [usPhone]))
    this.form.get('optinEmail').valueChanges.subscribe(checked => this.setRequired('email', checked, [Validators.email]))
    this.form.valueChanges.subscribe(() => { if(!this.saving) this.message = '' })

    this.getMembership()
    this.getOrgTags()
  }

  //////////////////////// STATE ////////////////////////

  get residentName(): string {
    const first = this.resident?.name?.firstName || ''
    return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : ''
  }

  get hasTextingConsent(): boolean {
    return hasTextingConsent(this.member)
  }

  get hasEmailConsent(): boolean {
    return hasEmailConsent(this.member)
  }

  // A member is complete when every consent is in place; otherwise the volunteer can add what's missing
  get showForm(): boolean {
    if(this.saved) return false
    if(!this.member) return true
    return !this.hasTextingConsent || !this.hasEmailConsent
  }

  get canSendText(): boolean {
    return this.allowTexting && !!this.member && this.hasTextingConsent
  }

  get saveLabel(): string {
    if(this.saving) return 'Saving…'
    return this.member ? 'Save consent' : 'Save member'
  }

  private setRequired(controlName: string, required: boolean, baseValidators: any[]){
    const control = this.form.get(controlName)
    control.setValidators(required ? [Validators.required, ...baseValidators] : baseValidators)
    control.updateValueAndValidity({emitEvent: false})
  }

  private prefillContact(resident: Resident){
    const firstPhone = (resident?.phones || []).find(p => !!p?.number)?.number
    const firstEmail = (resident?.emails || []).find(e => !!e)
    this.form.patchValue({phone: firstPhone ? normalizePhone(firstPhone) : '', email: firstEmail || ''}, {emitEvent: false})
  }

  // Consents already on record are shown checked and can't be unchecked here
  private applyExistingConsents(){
    const texting = this.form.get('optinTexting'), email = this.form.get('optinEmail')
    if(this.hasTextingConsent){ texting.setValue(true); texting.disable({emitEvent: false}) }
    if(this.hasEmailConsent){ email.setValue(true); email.disable({emitEvent: false}) }
  }

  //////////////////////// LOAD ////////////////////////

  getMembership(){
    const orgID: string = sessionStorage.getItem('orgID') || ''
    this.loading = true

    this.memberService.getMember(this.resident.personID, orgID).subscribe(
      (member: Membership) => {
        this.loading = false
        if(!member) return
        this.member = member
        this.wasMember = true
        // The member record's contact details are the ones consent applies to
        this.prefillContact(member.resident)
        this.applyExistingConsents()
      },
      error => {
        console.log(error)
        this.loading = false
        this.message = 'Couldn\'t check whether this person is already a member. You can still save them.'
      })
  }

  // The activity's hidden tags aren't offered
  get pickerTags(): string[] {
    return visibleTags(this.orgTags, this.activity?.tagsToHide)
  }

  getOrgTags(){
    const orgID: string = sessionStorage.getItem('orgID') || ''
    this.orgService.getOrgTags(orgID).subscribe(
      (tags: string[]) => { this.orgTags = (tags || []).filter(tag => !!tag) },
      error => console.log(error)
    )
    this.orgService.getTagDefinitions(orgID).subscribe(
      (definitions: TagDefinition[]) => { this.tagDefinitions = definitions || [] },
      error => console.log(error)
    )
  }

  //////////////////////// SAVE ////////////////////////

  save(){
    if(this.saving || this.saved || !this.showForm) return
    if(this.form.invalid){
      this.form.markAllAsTouched()
      return
    }
    if(this.member) this.saveConsent()
    else this.saveNewMember()
  }

  private saveNewMember(){
    const orgID: string = sessionStorage.getItem('orgID') || ''
    const user: User = JSON.parse(sessionStorage.getItem('user') || '{}')
    const value = this.form.getRawValue()

    this.saving = true
    this.message = ''

    this.memberService.createMemberWithVoter(
      this.resident.personID, orgID, user._id, this.activity._id,
      value.phone ? normalizePhone(value.phone) : '',
      (value.email || '').trim(),
      !!value.optinTexting, !!value.optinEmail,
      value.tags || []
    ).subscribe(
      (result: any) => {
        this.saving = false
        // Older servers return the member document itself
        if(result && result.success === false){
          this.message = result.msg || 'The member could not be saved.'
          return
        }
        this.saved = true
        this.matchedExisting = !!result?.matchedExisting
        this.member = result?.member || result || null
      },
      error => {
        console.log(error)
        this.saving = false
        this.message = 'Couldn\'t save the member because of a server error. Please try again.'
      })
  }

  // Adds the consents checked now to the existing member record
  private saveConsent(){
    const orgID: string = sessionStorage.getItem('orgID') || ''
    const value = this.form.getRawValue()
    const addTexting = !!value.optinTexting && !this.hasTextingConsent
    const addEmail = !!value.optinEmail && !this.hasEmailConsent

    if(!addTexting && !addEmail){
      this.message = 'Check the consent they agreed to, or close.'
      return
    }

    this.saving = true
    this.message = ''

    this.memberService.updateMemberOptins(
      orgID, this.resident.personID, addTexting, addEmail,
      value.phone ? normalizePhone(value.phone) : '',
      (value.email || '').trim()
    ).subscribe(
      (result: any) => {
        this.saving = false
        if(!result?.success){
          this.message = result?.msg || 'The consent could not be saved.'
          return
        }
        this.saved = true
        this.member = result.member
      },
      error => {
        console.log(error)
        this.saving = false
        this.message = 'Couldn\'t save the consent because of a server error. Please try again.'
      })
  }

  //////////////////////// TEXT ////////////////////////

  // Hands off to the text sheet with the consented number (sheets can't stack, so open it once this one closes)
  sendText(){
    if(!this.canSendText || this.saving) return
    const memberPhone = (this.member?.resident?.phones || []).find(p => !!p?.number)
    const resident: Resident = memberPhone
      ? {...this.resident, phones: [memberPhone, ...(this.resident.phones || []).filter(p => p?.number !== memberPhone.number)]}
      : this.resident

    this._bottomSheetRef.afterDismissed().subscribe(() => {
      this.bottomSheet.open(SingularTextForm, {data: {resident, household: this.household, activity: this.activity}})
    })
    this._bottomSheetRef.dismiss()
  }

  close(){
    if(this.saving) return
    this._bottomSheetRef.dismiss()
  }
}
