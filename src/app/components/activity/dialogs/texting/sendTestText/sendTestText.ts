import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import { FormControl } from '@angular/forms';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../../services/user/user.service'
import {CampaignService} from '../../../../../services/campaign/campaign.service'
import {OrganizationService} from '../../../../../services/organization/organization.service'
import {ActivityService} from '../../../../../services/activity/activity.service'
import {TargetService} from '../../../../../services/target/target.service'
import {ScriptService} from '../../../../../services/script/script.service'
import {DatePipe} from '@angular/common';
import {User} from '../../../../../models/users/user.model';
import {Organization} from '../../../../../models/organizations/organization.model';
import {Activity} from '../../../../../models/activities/activity.model'
import {TextingService} from '../../../../../services/texting/texting.service'

@Component({
  templateUrl: './sendTestText.html',
  providers: [DatePipe]
})
  
export class SendTestTextDialog implements OnInit{

  activityID: string = ''
  activity: any;
  sendImage: boolean = false
  imageUrl: string = ''
  orgPhonenumbers: any[]
  userPhonenumber: string;

  userMessage: string = ''
  displayUserMessage: boolean = false

  @ViewChild('targetPhonenumber', {static: true}) targetPhonenumber: ElementRef;


  constructor(public dialogRef: MatDialogRef<SendTestTextDialog>, 
              @Inject(MAT_DIALOG_DATA) public data: any, 
              public userService: UserService, 
              public activityService: ActivityService,
              public campaignService: CampaignService,
              public targetService: TargetService,
              private textingService: TextingService,
              public orgService: OrganizationService,
              public scriptService: ScriptService) {
                this.activityID = data.activity['_id']
              }

  onNoClick(): void {this.dialogRef.close()}

  getActivity(){

    this.activityService.getActivity(this.activityID).subscribe(
      (activity: Activity) =>{
        this.activity = activity
        this.sendImage = activity.textMetaData.attachImage
        this.imageUrl = activity.textMetaData.imageUrl

    }, error=>{
      console.log(error)
    })
  }

  sendTestText(){

    var fullInitTextMsg: string = this.activity.textMetaData.initTextMsg

    var correctlyCappedUsername = '*user'//this.userFirstName.charAt(0).toUpperCase() + this.userFirstName.slice(1).toLowerCase()
    var correctlyCappedResidentName = '*receiver'//resident['name']['firstName'].charAt(0).toUpperCase() + resident['name']['firstName'].slice(1).toLowerCase()

    if(this.activity.textMetaData.sendSenderName && this.activity.textMetaData.sendReceiverName){
      fullInitTextMsg = "this is " + correctlyCappedUsername + fullInitTextMsg
    }

    if(this.activity.textMetaData.sendSenderName && !this.activity.textMetaData.sendReceiverName){
      fullInitTextMsg = "This is " + correctlyCappedUsername + " " + fullInitTextMsg
    }

    if(this.activity.textMetaData.sendReceiverName){
      fullInitTextMsg = "Hello " + correctlyCappedResidentName + ", " + fullInitTextMsg
    }

    var targetPhonenumber = this.targetPhonenumber.nativeElement.value

    if(targetPhonenumber === ''){
      this.userMessage = "Needs a Target Phonenumber."
      this.displayUserMessage = true;
      return
    }

    if(!this.userPhonenumber){
      this.userMessage = "Needs a User Phonenumber."
      this.displayUserMessage = true;
      return
    }

    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID')

    var testData = {initTextMsg: fullInitTextMsg, 
                    targetPhonenumber: targetPhonenumber, 
                    userPhonenum: this.userPhonenumber,
                    campaignID: campaignID,
                    orgID: orgID,
                    imageUrl: this.imageUrl,
                    sendImage: this.sendImage,
                  }

    this.textingService.sendTestText(testData).subscribe(result=>{
      console.log(result)
      this.displayUserMessage = false;
    })
    
  }

  public getOrgPhoneNumbers(){

    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID')

    this.orgService.getOrgPhoneNumbers(orgID, campaignID).subscribe(
      (phoneNumbers: unknown[])=>{
        this.orgPhonenumbers = phoneNumbers
      }
    )
  }

  public numberSelected(selectedNumber){
    this.userPhonenumber = selectedNumber.value
  }

  ngOnInit(){
    this.getActivity()
    this.getOrgPhoneNumbers()

  }

}
