import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import { FormControl } from '@angular/forms';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../../services/user/user.service';
import {CampaignService} from '../../../../../services/campaign/campaign.service';
import {OrganizationService} from '../../../../../services/organization/organization.service';
import {ActivityService} from '../../../../../services/activity/activity.service';
import {TargetService} from '../../../../../services/target/target.service';
import {ScriptService} from '../../../../../services/script/script.service';
import {DatePipe} from '@angular/common';
import { Router } from '@angular/router';
import {Organization} from '../../../../../models/organizations/organization.model';
import {User} from '../../../../../models/users/user.model';


@Component({
  templateUrl: './createTextActivityDialog.html',
  providers: [DatePipe]
})
  
export class CreateTextActivityDialog implements OnInit{
  campaignOrgs: Organization[] = [];
  campaignOrgsSelected = new FormControl();
  campaignOrgsUpdate = [];

  users: User[] = [];
  usersSelected = new FormControl();
  usersUpdate = [];

  displayErrorMsg: boolean = false;
  errorMessage: string = '';

  displayMessage: boolean = false;
  userMessage: string = '';

  targets: unknown[] = [];
  activity: unknown;
  scripts: unknown[] = [];
  nonResponseSets: unknown[] = [];

  selectedTargetIds: string[] = [];

  creatingActivity: boolean = false;

  activityType: string;
  quickResponses: string[] = []
  userFirstName: string;

  receiverNameFlag: boolean = true;
  senderNameFlag:boolean = true;

  attachImageFlag: boolean = false;

  dev:boolean = false;

  loading = false;
  errors = false;

  selectedTargets;
  targetsAvailable: boolean = false;
  geographical: boolean;
  scriptsAvailable: boolean = false;
  nonResponseSetsAvailable: boolean = false;

  @ViewChild('activityName', {static: false}) activityName: ElementRef;
  @ViewChild('description' , {static: false}) description: ElementRef;
  @ViewChild('newNonresponse' , {static: false}) newNonresponse: ElementRef;
  @ViewChild('initTextMsg' , {static: false}) initTextMsg: ElementRef;
  @ViewChild('newQuickResponse' , {static: false}) newQuickResponse: ElementRef;

  @ViewChild('senderNameActive', {static: false}) senderNameActive: ElementRef;
  @ViewChild('receiverNameActive', {static: false}) receiverNameActive: ElementRef;
  @ViewChild('attachImage', {static: false}) attachImage: ElementRef;
  @ViewChild('imageURL', {static: false}) imageURL: ElementRef;
  @ViewChild('selectedNonResponseSet', {static: false}) selectedNonResponseSet: ElementRef;
  @ViewChild('selectedScript', {static: false}) selectedScript: ElementRef;
  @ViewChild('selectedTarget', {static: false}) selectedTarget: ElementRef;
  
  constructor(public dialogRef: MatDialogRef<CreateTextActivityDialog>,
              public userService: UserService,
              public activityService: ActivityService,
              public campaignService: CampaignService,
              public targetService: TargetService,
              public orgService: OrganizationService,
              public router: Router, 
              public scriptService: ScriptService) {
              }

  onNoClick(): void {this.dialogRef.close()}

  getOrgTargets(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var orgID: string = sessionStorage.getItem('orgID')
    this.geographical = (sessionStorage.getItem('geographical') === 'true')

    this.targetService.getOrgTargets(campaignID, orgID).subscribe(
      (targets: unknown[])=>{
        if(this.geographical){
          for(var i = 0; i < targets.length; i++){
            if(targets[i]['properties'].geometric || targets[i]['properties'].idByHousehold === 'MEMBERSHIP'){
              this.targets.push(targets[i])
            }
          }
        }else{
          this.targets = targets
        }

        if(this.geographical){
            for(var i = 0; i < this.targets.length; i++){
                if(this.targets[i]['properties'].geometric || this.targets[i]['properties'].idByHousehold === 'MEMBERSHIP'){
                    this.targetsAvailable = true;
                }
            }
        } else {
            if(this.targets.length > 0){
                this.targetsAvailable = true;
            }
        }
        
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    ) 
  }

  createActivity(){
    
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id
    var activityType: string = sessionStorage.getItem('activityType')
    var orgID: string = sessionStorage.getItem('orgID')

    if(this.activityName.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = "The activity needs a name."
      return
    } 

    if(!this.selectedNonResponseSet['value']){
      this.displayMessage = true;
      this.userMessage = "The activity needs a NonResponse Set."
      return
    }

    if(!this.selectedScript['value']){
      this.displayMessage = true;
      this.userMessage = "The activity needs a Script."
      return
    }

    if(this.initTextMsg.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = "The Texting Activity needs an initial Text Message."
      return
    }

    if(!this.selectedTarget['value']){
      this.displayMessage = true;
      this.userMessage = "The activity needs a target."
      return
    }

    this.creatingActivity = true;

    this.campaignOrgsUpdate = [orgID]
    this.usersUpdate = [userID]

    if (this.campaignOrgsSelected.value){
        this.campaignOrgsUpdate = [orgID].concat(this.campaignOrgsSelected.value);
    }

    if (this.usersSelected.value){
        this.usersUpdate = [userID].concat(this.usersSelected.value);
    }

    var textMetaData = {
                        quickResponses: this.quickResponses,
                        initTextMsg: this.initTextMsg.nativeElement.value,
                        sendReceiverName: this.receiverNameFlag,
                        sendSenderName: this.senderNameFlag,
                        attachImage: this.attachImageFlag,
                        imageUrl: this.imageURL.nativeElement.value
                      }

    var newActivity = {
                       name: this.activityName.nativeElement.value,
                       activityType: activityType,
                       description: this.description.nativeElement.value,
                       targetID: this.selectedTarget['value'],
                       campaignID: campaignID,
                       orgIDs: this.campaignOrgsUpdate,
                       userIDs: this.usersUpdate,
                       nonResponseSetID: this.selectedNonResponseSet['value'],
                       textMetaData: textMetaData,
                       scriptID: this.selectedScript['value']
                      }

    this.activityService.createActivity(newActivity).subscribe(
      (result: unknown) => {
        this.dialogRef.close(result)
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )   
  }

  addQuickResponse(quickResponse: string){
    if(quickResponse === ""){
      this.displayMessage = true;
      this.userMessage = "New Quick Responses need text."
    } else{
      if(!this.quickResponses.includes(quickResponse)){
        this.quickResponses.push(quickResponse)
        this.displayMessage = false;
      }
      this.newQuickResponse.nativeElement.value = ""
    }
  }

  removeQuickResponse(quickResponse: string){
    for(var i = 0; i < this.quickResponses.length; i++){
      if(this.quickResponses[i] === quickResponse){
        this.quickResponses.splice(i, 1)
      }
    }
  }

  getAllScripts(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.scriptService.getAllScripts(orgID, campaignID).subscribe(
      (scripts: unknown[]) =>{
        this.scripts = scripts.filter(scripts => {
            return scripts['campaignIDs'].includes(campaignID) && scripts['orgStatus'].active;
        });
        if(this.scripts.length){
          this.scriptsAvailable = true;
        }
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  getAllNonResponseSets(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.scriptService.getAllNonResponseSets(orgID, campaignID).subscribe(
      (nonResponseSets: unknown[]) =>{
        this.nonResponseSets = nonResponseSets.filter(nonResponseSet => {
          return nonResponseSet['campaignIDs'].includes(campaignID) && nonResponseSet['orgStatus'].active;
        });
        if(this.nonResponseSets.length){
          this.nonResponseSetsAvailable = true;
        }
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  targetChecked(selectedTargets){
    this.selectedTargetIds = selectedTargets.value;
  }

  toggleReceiverName(toggle){
    this.receiverNameFlag = !toggle.checked
  }

  toggleSenderName(toggle){
    this.senderNameFlag = !toggle.checked
  }

  toggleAttachImage(toggle){
    this.attachImageFlag = !toggle.checked

  }

  close(){this.dialogRef.close()}

  goToTargeting(){
    this.router.navigate(['/targeting']);
    this.dialogRef.close()
  }

  goToScripts(){
      this.router.navigate(['/scripts']);
      this.dialogRef.close()
  }

    getCampaignOrgs(){
        var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
        var orgID: string = sessionStorage.getItem('orgID');

        this.orgService.getCampaignOrgs(campaignID).subscribe(
            (orgs: Organization[]) => {
                this.campaignOrgs = orgs.filter(org => {return org._id !== orgID});
            },
            error => {
                this.displayErrorMsg = true;
                this.errorMessage = 'There was a problem with the server.';
            }
        );
    }

    getCampaignUsers() {
        var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
        var orgID: string = sessionStorage.getItem('orgID');
        var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

        this.orgService.getCampaignUsers(campaignID, orgID).subscribe(
            (users: User[]) => {
                this.users = users.filter(user => {return user._id !== userID});
            },
            error => {
                this.displayErrorMsg = true;
                this.errorMessage = 'Failed to get user list due to server error.';
            }
        );
    }

    selectAllUsers(ev) {
        if(ev._selected){
            var userIDs = this.users.map(u => u._id);
            this.usersSelected.setValue(userIDs);
            ev._selected = true;
        }
        if(ev._selected === false){
            this.usersSelected.setValue([]);
        }
    }

  ngOnInit(){
    this.getCampaignOrgs();
    this.getCampaignUsers();
    this.activityType = sessionStorage.getItem('activityType');
    var userFirstName = JSON.parse(sessionStorage.getItem('user')).name.firstName;


    this.userFirstName = userFirstName.charAt(0).toUpperCase() + userFirstName.slice(1).toLowerCase()
    this.dev = JSON.parse(sessionStorage.getItem('user')).dev;
    this.getOrgTargets();
    this.getAllScripts();
    this.getAllNonResponseSets();

    this.selectedTargets = new FormControl()}
}
