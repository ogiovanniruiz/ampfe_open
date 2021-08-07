import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

import {CampaignService} from '../../../../services/campaign/campaign.service'
import {UpdatedCampaign} from '../../../../models/campaigns/campaign.model'

@Component({
  templateUrl: './requestCampaign.html',
})
  
export class RequestCampaignDialog implements OnInit{

  mode: string = "REQUEST";
  displayMessage: boolean = false;
  userMessage: String = "";

  displayErrorMsg: boolean = false;
  errorMessage: string = ""

  constructor(public dialogRef: MatDialogRef<RequestCampaignDialog>, 
              public campaignService: CampaignService) {
              }
  
  onNoClick(): void {this.dialogRef.close()}
  closeDialog(): void{this.dialogRef.close()}

  requestCampaign(requestedCampaignID: number){

    if(!requestedCampaignID){
      this.displayMessage = true;
      this.userMessage = "Needs a Campaign ID.";
      return
    }

    if(isNaN(requestedCampaignID)){
      this.displayMessage = true;
      this.userMessage = "Campaign ID should be a number.";
      return
    }

    var orgID: string = sessionStorage.getItem('orgID')
    this.campaignService.requestCampaign(orgID, requestedCampaignID).subscribe(
      (result: UpdatedCampaign) => {
        if(result.success){
          this.mode = "SUCCESS"
        } else {
          this.displayMessage = true;
          this.userMessage = result.msg;
        }
      }, error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = "There was a problem with the server."
      }
    )
  }

  ngOnInit(){}
} 
