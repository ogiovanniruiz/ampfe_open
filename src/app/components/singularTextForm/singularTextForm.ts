import {Component, Inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA} from '@angular/material/bottom-sheet';
import { UntypedFormControl, Validators } from '@angular/forms';
import { Activity } from 'src/app/models/activity.model';
import { Household, Person, Phone, Resident } from 'src/app/models/person.model';
import { environment } from '../../../environments/environment';
import { TextingService } from 'src/app/services/texting.service';
import { User } from 'src/app/models/user.model';
import { ActivityContactRecord, TextbankContactDetails, TextConversation } from 'src/app/models/contact.record.model';

import { SingularTextResult, InitTextMsg } from 'src/app/models/activity.model';
import { buildInitTextMsg, EMPTY_INIT_TEXT_MSG } from '../../utils/initTextMsg';
import { normalizePhone, usPhone, formatPhone } from '../../utils/phone';
import { ClientConfigService } from 'src/app/services/clientConfig.service';

@Component({
    selector: 'SingularTextForm',
    templateUrl: 'singularTextForm.html',
    // Shares the dialog look (ge-*) and the test-text preview styles (tt-*)
    styleUrls: [
      '../../styles/dialog-common.scss',
      '../activity/dialogs/sendTestText/sendTestText.scss',
      './singularTextForm.scss',
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class SingularTextForm implements OnInit {

  resident: Resident;
  activity: Activity;
  household: Household;

  userFirstName: string = '';
  activityPhonenumber: string = '';

  initTextMsgs: InitTextMsg[] = [];
  selectedInitTextMsg: InitTextMsg = EMPTY_INIT_TEXT_MSG;

  // Prefilled with the person's first number; editable for a different one
  phone = new UntypedFormControl('', [Validators.required, usPhone]);

  sending: boolean = false;
  // Set after a successful send so the same text can't go out twice
  sent: boolean = false;
  sentTo: string = '';
  message: string = '';
  imageFailed: boolean = false;

  demoVersion: boolean = environment.demoVersion;
  // Demo builds text this instead of the person; it comes from the server (clientConfig)
  get testCallingNumber(): string { return this.clientConfig.testCallingNumber }

  constructor(
        private textingService: TextingService,
        private sheetRef: MatBottomSheetRef<SingularTextForm>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
        private clientConfig: ClientConfigService,
        ) {
    this.resident = data.resident
    this.activity = data.activity
    this.household = data.household;
  }

  ngOnInit(){
    this.clientConfig.load()
    try {
      this.userFirstName = JSON.parse(sessionStorage.getItem('user') || '{}')?.name?.firstName || ''
    } catch {
      this.userFirstName = ''
    }

    const metadata = this.activity?.textMetaData
    this.activityPhonenumber = metadata?.activityPhonenumber || ''
    this.initTextMsgs = metadata?.initTextMsgs || []
    this.selectMessage(metadata?.defaultInitTextMsg ?? this.initTextMsgs[0] ?? EMPTY_INIT_TEXT_MSG)

    const firstPhone = this.residentPhones[0]?.number
    if(firstPhone) this.phone.setValue(normalizePhone(firstPhone))

    this.phone.valueChanges.subscribe(() => { if(!this.sending) this.message = '' })
  }

  //////////////////////// DISPLAY ////////////////////////

  get residentName(): string {
    const first = this.resident?.name?.firstName || ''
    return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : ''
  }

  get residentPhones(): Phone[] {
    return (this.resident?.phones || []).filter(p => !!p?.number)
  }

  get sendImage(): boolean {
    return !!this.selectedInitTextMsg?.attachImage
  }

  get imageUrl(): string {
    return this.selectedInitTextMsg?.imageUrl || ''
  }

  get previewText(): string {
    return buildInitTextMsg(this.selectedInitTextMsg, this.userFirstName, this.resident?.name?.firstName || '')
  }

  get hasContent(): boolean {
    return !!this.previewText || (this.sendImage && !!this.imageUrl)
  }

  get canSend(): boolean {
    return !this.sending && !this.sent && this.phone.valid && !!this.activityPhonenumber && this.hasContent
  }

  selectMessage(initTextMsg: InitTextMsg){
    this.selectedInitTextMsg = initTextMsg || EMPTY_INIT_TEXT_MSG
    this.imageFailed = false
  }

  optionLabel(initTextMsg: InitTextMsg): string {
    const text = (initTextMsg?.msg || '').trim() || (initTextMsg?.attachImage ? 'Image only' : 'Empty message')
    return text.length > 60 ? text.slice(0, 59).trimEnd() + '…' : text
  }

  usePhone(number: string){
    this.phone.setValue(normalizePhone(number))
  }

  isSelectedPhone(number: string): boolean {
    return normalizePhone(number) === normalizePhone(this.phone.value)
  }

  formatPhone(value: string): string {
    return formatPhone(value)
  }

  //////////////////////// SEND ////////////////////////

  sendSingularText(){
    if(this.sending || this.sent) return
    this.phone.markAsTouched()
    if(!this.canSend) return

    const resident = this.resident
    const household = this.household
    const user: User = JSON.parse(sessionStorage.getItem('user') || '{}')

    const fullInitTextMsg = this.previewText
    const textConversation: TextConversation = {origin: "USER", msg: fullInitTextMsg}

    // A demo build must never fall back to the person's real number
    if(this.demoVersion && !this.testCallingNumber){
      this.message = "Test number isn't configured on the server, so demo calls and texts are turned off."
      return
    }

    let residentPhonenumber = normalizePhone(this.phone.value)
    if(this.demoVersion){
      residentPhonenumber = this.testCallingNumber
    }

    const textbankContactDetails: TextbankContactDetails = {
      userPhonenumber: this.activityPhonenumber,
      residentPhonenumber: residentPhonenumber,
      textSuccessful: false,
      textConvo: [textConversation],
      initTextMessage: fullInitTextMsg,
      imageUrl: this.sendImage ? this.imageUrl : ''
    }

    const person: Person = {resident: resident,
                            address: household._id,
                            county: household.county,
                            fullAddress1: household.fullAddress1,
                            fullAddress2: household.fullAddress2,
                            location: household.location,
                            accuracyType: household.accuracyType,
                            districts: household.districts,
                            registrationPrecinctID: household.registrationPrecinctID
                            }

    const tbContactRecord: ActivityContactRecord = {
      orgID: sessionStorage.getItem('orgID'),
      campaignID: parseInt(sessionStorage.getItem('campaignID')),
      userID: user._id,
      user: user,
      activityID: sessionStorage.getItem('activityID') || this.activity._id,
      activityType: "Texting",

      textbankContactDetails,
      personID: resident.personID,
      pass: this.activity.passes,

      person: person,
      complete: false,
      activityHouseholdRecordID: "",
      member: false
    }

    this.sending = true
    this.message = ''

    this.textingService.sendSingularText(tbContactRecord).subscribe(
      (result: SingularTextResult) => {
        this.sending = false
        if(result?.status){
          this.sent = true
          this.sentTo = formatPhone(residentPhonenumber)
          // Lets the opener know a text went out, however the sheet is closed afterwards
          this.data?.onSent?.(residentPhonenumber)
        } else {
          this.message = result?.message || 'The text could not be sent.'
        }
      },
      error => {
        console.log(error)
        this.sending = false
        this.message = 'There was an error sending the text. Please try again.'
      })
  }

  close(){
    if(this.sending) return
    this.sheetRef.dismiss()
  }
}
