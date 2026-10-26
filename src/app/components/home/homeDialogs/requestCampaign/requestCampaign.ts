import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

//SERVICES
import { CampaignService } from '../../../../services/campaign.service'

@Component({
  templateUrl: './requestCampaign.html',
  styleUrls: ['./requestCampaign.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
  
export class RequestCampaignDialog {

  campaignIDText: string = ''
  sending: boolean = false
  // Shown inline under the ID field
  idError: string = ''
  // Server problems, shown in the banner
  errorMessage: string = ''

  sent: {campaignID: number, campaignName: string} | null = null
  requestedAny: boolean = false

  constructor(public dialogRef: MatDialogRef<RequestCampaignDialog>,
              public campaignService: CampaignService) {}

  get campaignID(): number | null {
    const text = this.campaignIDText.trim()
    return /^\d+$/.test(text) ? Number(text) : null
  }

  onInput(){
    this.idError = ''
    this.errorMessage = ''
  }

  requestCampaign(){
    if(this.sending) return
    if(!this.campaignIDText.trim()){
      this.idError = 'Enter a campaign ID.'
      return
    }
    if(this.campaignID === null){
      this.idError = 'Campaign ID should be a whole number.'
      return
    }

    const orgID: string = sessionStorage.getItem('orgID')
    const campaignID = this.campaignID

    this.sending = true
    this.idError = ''
    this.errorMessage = ''

    this.campaignService.requestCampaign(orgID, campaignID).subscribe(
      (result: any) => {
        this.sending = false
        if(!result?.success){
          this.idError = result?.msg || 'The request could not be sent.'
          return
        }
        this.requestedAny = true
        this.sent = {campaignID, campaignName: result.campaignName || ''}
      },
      error => {
        console.log(error)
        this.sending = false
        this.errorMessage = 'There was a problem with the server. Please try again.'
      }
    )
  }

  requestAnother(){
    this.sent = null
    this.campaignIDText = ''
    this.idError = ''
  }

  closeDialog(): void{
    if(this.sending) return
    this.dialogRef.close(this.requestedAny || undefined)
  }
}
