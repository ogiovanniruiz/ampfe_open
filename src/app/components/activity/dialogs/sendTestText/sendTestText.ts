import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { UntypedFormControl, Validators } from '@angular/forms';

//MODEL
import {Activity, InitTextMsg} from '../../../../models/activity.model'

//SERVICES
import {TextingService} from '../../../../services/texting.service'

import { buildInitTextMsg, EMPTY_INIT_TEXT_MSG } from '../../../../utils/initTextMsg';
import { normalizePhone, usPhone, formatPhone } from '../../../../utils/phone';

@Component({
  templateUrl: './sendTestText.html',
  styleUrls: ['../../../../styles/dialog-common.scss', './sendTestText.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class SendTestTextDialog {

  activityPhonenumber: string = ''
  initTextMsgs: InitTextMsg[] = []
  selectedInitTextMsg: InitTextMsg = EMPTY_INIT_TEXT_MSG

  // The test goes to the signed-in user, so both names in the greeting are theirs
  userFirstName: string = ''

  phone = new UntypedFormControl('', [Validators.required, usPhone])

  sending: boolean = false
  message: string = ''
  sentTo: string = ''
  imageFailed: boolean = false

  constructor(public dialogRef: MatDialogRef<SendTestTextDialog>,
              @Inject(MAT_DIALOG_DATA) public activity: Activity,
              private textingService: TextingService,
              ) {
    const metadata = activity.textMetaData
    this.activityPhonenumber = metadata?.activityPhonenumber || ''
    this.initTextMsgs = metadata?.initTextMsgs || []
    this.selectMessage(metadata?.defaultInitTextMsg ?? this.initTextMsgs[0] ?? EMPTY_INIT_TEXT_MSG)

    try {
      this.userFirstName = JSON.parse(sessionStorage.getItem('user') || '{}')?.name?.firstName || ''
    } catch {
      this.userFirstName = ''
    }

    // A new number clears the last result
    this.phone.valueChanges.subscribe(() => {
      if(!this.sending){
        this.sentTo = ''
        this.message = ''
      }
    })
  }

  //////////////////////// DISPLAY ////////////////////////

  get sendImage(): boolean {
    return !!this.selectedInitTextMsg?.attachImage
  }

  get imageUrl(): string {
    return this.selectedInitTextMsg?.imageUrl || ''
  }

  get previewText(): string {
    return buildInitTextMsg(this.selectedInitTextMsg, this.userFirstName || 'Friend', this.userFirstName || 'Friend')
  }

  get hasContent(): boolean {
    return !!this.previewText || (this.sendImage && !!this.imageUrl)
  }

  get canSend(): boolean {
    return !this.sending && this.phone.valid && !!this.activityPhonenumber && this.hasContent
  }

  selectMessage(initTextMsg: InitTextMsg){
    this.selectedInitTextMsg = initTextMsg || EMPTY_INIT_TEXT_MSG
    this.imageFailed = false
  }

  optionLabel(initTextMsg: InitTextMsg): string {
    const text = (initTextMsg?.msg || '').trim() || (initTextMsg?.attachImage ? 'Image only' : 'Empty message')
    return text.length > 60 ? text.slice(0, 59).trimEnd() + '…' : text
  }

  formatPhone(value: string): string {
    return formatPhone(value)
  }

  //////////////////////// SEND ////////////////////////

  sendTestText(){
    if(this.sending) return
    this.phone.markAsTouched()
    if(!this.canSend) return

    const targetPhonenumber = normalizePhone(this.phone.value)

    const testData = {
      initTextMsg: this.previewText,
      targetPhonenumber: targetPhonenumber,
      userPhonenum: this.activityPhonenumber,
      campaignID: parseInt(sessionStorage.getItem('campaignID') || '-1'),
      orgID: sessionStorage.getItem('orgID') || '',
      imageUrl: this.imageUrl,
      sendImage: this.sendImage,
    }

    this.sending = true
    this.message = ''
    this.sentTo = ''

    this.textingService.sendTestText(testData).subscribe(
      (result: any) => {
        this.sending = false
        // Older servers answer false when the org has no texting account
        if(result && result.success !== false){
          this.sentTo = this.formatPhone(targetPhonenumber)
        } else {
          this.message = result?.msg || 'The test text could not be sent. Check that your organization has texting set up.'
        }
      },
      error => {
        console.log(error)
        this.sending = false
        this.message = 'Couldn\'t send the test text because of a server error. Please try again.'
      })
  }

  close(){
    if(this.sending) return
    this.dialogRef.close()
  }
}
