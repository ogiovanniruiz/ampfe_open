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

@Component({
  templateUrl: './editTextActivityDialog.html',
  providers: [DatePipe]
})
  
export class EditTextActivityDialog implements OnInit{

  campaignOrgs: Organization[] = [];
  campaignOrgsSelected = new FormControl();
  campaignOrgsUpdate: Organization[] = [];

  users: User[] = [];
  usersSelected = new FormControl();
  usersUpdate: User[] = [];

  displayMessage: boolean = false;
  userMessage: string;

  activity: unknown;
  script: unknown;
  nonResponseSet: unknown;
  target: unknown;

  targetName: string;
  scriptName: string;
  nonResponseSetName: string;

  receiverNameFlag: boolean = true;
  senderNameFlag: boolean = true;

  attachImageFlag: boolean = false;

  sendImageFlag: boolean = false;

  quickResponses: string[] = []

  userFirstName: string;

  showLoadedResults = false;
  loadedResults = ""
  dev = false

  loading = false;
  errors = false;

  userPhoneNumbers = []

  dataSize: number = 0
  activityID: string;

  usersLoaded = false
  orgsLoaded = false

  savingEdits = false;

  userURL: string;

  resetting = false;

  @ViewChild('activityName', {static: true}) activityName: ElementRef;
  @ViewChild('description' , {static: true}) description: ElementRef;

  @ViewChild('initTextMsg' , {static: false}) initTextMsg: ElementRef;
  @ViewChild('newQuickResponse' , {static: false}) newQuickResponse: ElementRef;

  @ViewChild('senderNameActive', {static: false}) senderNameActive: ElementRef;
  @ViewChild('receiverNameActive', {static: false}) receiverNameActive: ElementRef;

  @ViewChild('attachImage', {static: false}) attachImage: ElementRef;
  @ViewChild('imageURL', {static: false}) imageURL: ElementRef;

  @ViewChild('activityAllOrgs', {static: false}) activityAllOrgs: ElementRef;
  @ViewChild('activityAllUsers', {static: false}) activityAllUsers: ElementRef;


  constructor(public dialogRef: MatDialogRef<EditTextActivityDialog>, 
              @Inject(MAT_DIALOG_DATA) public data: any, 
              public userService: UserService, 
              public activityService: ActivityService,
              public campaignService: CampaignService,
              public targetService: TargetService,
              public orgService: OrganizationService,
              public scriptService: ScriptService) {
                this.activityID = data.activity['_id']
              }

  onNoClick(): void {this.dialogRef.close()}

  resetActivity(){
    var activityID = this.data.activity._id
    this.resetting = true

    if (confirm('Are you sure you want reset this Activity?')) {
      this.activityService.resetActivity(activityID).subscribe(
        (activity: Activity) =>{
          this.activity = activity
          this.resetting = false;
        }
      )
    }
  }


  getActivity(){

    this.activityService.getActivity(this.activityID).subscribe(
      (activity: Activity) =>{
        this.activity = activity
        this.prefillActivtyData()
        this.getCampaignOrgs();
        this.getCampaignUsers();
        this.getTarget();
        this.getScript();
        this.getNonResponseSet();
    }, error=>{
      console.log(error)
    })
  }

  getTarget(){
    var targetID = this.activity['targetID']
    this.targetService.getTarget(targetID).subscribe(
      (target: unknown)=>{
        this.target = target;
        this.targetName = target['properties']['name'];
      },
      error =>{
        console.log(error)
        //this.displayErrorMsg = true;
        //this.errorMessage = 'There was a problem with the server.';
      }
    ) 
  }

  saveActivityEdits(){

    var activityID: string = this.activity['_id'];
    
    if(this.activityName.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = 'The activity needs a name.';
      return
    } 

    if(this.initTextMsg.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = 'The Texting Activity needs an initial Text Message.';
      return
    }

    if(this.attachImageFlag && this.imageURL.nativeElement.value === ''){
      this.displayMessage = true;
      this.userMessage = 'The Texting Activity needs an image url.';
      return

    }

    this.campaignOrgsUpdate = [this.activity['orgIDs'][0]].concat(this.activityAllOrgs['ngControl'].viewModel);
    this.usersUpdate = [this.activity['userIDs'][0]].concat(this.activityAllUsers['ngControl'].viewModel);


    this.savingEdits = true

    var edits: unknown = {name: this.activityName.nativeElement.value,
                          description: this.description.nativeElement.value,
                          quickResponses: this.quickResponses,
                          initTextMsg: this.initTextMsg.nativeElement.value,
                          sendSenderName: this.senderNameFlag,
                          sendReceiverName: this.receiverNameFlag,
                          attachImage: this.attachImageFlag,
                          imageUrl: this.imageURL.nativeElement.value,
                          orgIDs: this.campaignOrgsUpdate,
                          userIDs: this.usersUpdate,
                        }

    this.activityService.saveActivityEdits(activityID, edits).subscribe(
      (result: unknown) =>{
        this.dialogRef.close(result)
      },
      error =>{
        console.log(error)
        //this.displayErrorMsg = true;
        //this.errorMessage = 'There was a problem with the server.';
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

  getScript(){
    var scriptID: string = this.activity['scriptID']
    this.scriptService.getScript(scriptID).subscribe(
      (script: unknown) =>{
        this.script = script
        this.scriptName = script['title']
      },
      error =>{
        console.log(error)
        //this.displayErrorMsg = true;
        //this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  getNonResponseSet(){
    var nonResponseSetID: string = this.activity['nonResponseSetID']

    this.scriptService.getNonResponseSet(nonResponseSetID).subscribe(
      (nonResponseSet: unknown) =>{
        this.nonResponseSet = nonResponseSet
        this.nonResponseSetName = nonResponseSet['title']
      },
      error=>{
        console.log(error)
        //this.displayErrorMsg = true;
        //this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  toggleReceiverName(toggle){
    this.receiverNameFlag = !toggle.checked
  }

  toggleSenderName(toggle){
    this.senderNameFlag = !toggle.checked
  }

  toggleAttachImage(toggle){
    console.log(toggle.checked)
    this.attachImageFlag = !toggle.checked

  }

  close(){this.dialogRef.close()}

  prefillActivtyData(){

    this.activityName.nativeElement.value = this.activity['name']
    if (this.activity['description']) this.description.nativeElement.value = this.activity['description']

    this.quickResponses = this.activity['textMetaData']['quickResponses'];  

    this.receiverNameFlag = this.activity['textMetaData']['sendReceiverName']
    this.senderNameFlag = this.activity['textMetaData']['sendSenderName']

    this.attachImageFlag = this.activity['textMetaData']['attachImage']
    this.imageURL.nativeElement.value = this.activity['textMetaData']['imageUrl']
      
    setTimeout(()=>{
      this.initTextMsg.nativeElement.value = this.activity['textMetaData']['initTextMsg'];
      this.senderNameActive['checked'] = this.senderNameFlag;
      this.receiverNameActive['checked'] = this.receiverNameFlag;
      this.attachImage['checked'] = this.attachImageFlag
    })

    this.userPhoneNumbers = this.activity['textMetaData']['activityPhonenums']
    
  }

  deleteActivity(){
    if(confirm("Are you sure you want to delete this activity?")){
      var _id: string = this.activity['_id']
      this.activityService.deleteActivity(_id, 'Texting').subscribe(
        (result: unknown)=>{
          this.dialogRef.close(result)
       },
       error =>{
         console.log(error)
         //this.displayErrorMsg = true;
         //this.errorMessage = 'There was a problem with the server.';
       }
      )
    }
  }

  deactivate(){
    var _id: string = this.activity['_id']
    this.activityService.toggleActiveActivity(_id).subscribe(
      (result: unknown)=>{
        this.dialogRef.close(result)
      },
      error =>{
        console.log(error)
        //this.displayErrorMsg = true;
        //this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  getCampaignOrgs(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.orgService.getCampaignOrgs(campaignID).subscribe(
        (orgs: Organization[]) => {
          this.campaignOrgsSelected.setValue(this.activity['orgIDs'].slice(1));
          this.campaignOrgs = orgs.filter(org => {return org._id !== this.activity['orgIDs'][0]});
          this.orgsLoaded = true
        },
        error => {
          //this.displayErrorMsg = true;
          //this.errorMessage = 'There was a problem with the server.';
        }
    );
  }

  getCampaignUsers() {
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID');

    this.orgService.getCampaignUsers(campaignID, orgID).subscribe(
        (users: User[]) => {
          this.usersSelected.setValue(this.activity['userIDs'].slice(1));
          this.users = users.filter(user => {return user._id !== this.activity['userIDs'][0]});
          this.usersLoaded = true
        },
        error => {
          //this.displayErrorMsg = true;
          //this.errorMessage = 'Failed to get user list due to server error.';
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

  generateNewUserLink(){

    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var activityID = this.data.activity._id

    var userDetails = {  
      orgID : sessionStorage.getItem('orgID'),
      campaignID: campaignID,
      route: "/texting",
      activityID: activityID
    }

    this.userService.generateNewUserLink(userDetails).subscribe(link=>{
      this.userURL = link['url']
    })
  }

  copyInputMessage(inputElement){
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }

  ngOnInit(){
    this.getActivity();
    //this.getCampaignOrgs();
    //this.getCampaignUsers();
    //this.prefillActivtyData();
    //this.userFirstName = JSON.parse(sessionStorage.getItem('user')).name.firstName;

    var userFirstName = JSON.parse(sessionStorage.getItem('user')).name.firstName;


    this.userFirstName = userFirstName.charAt(0).toUpperCase() + userFirstName.slice(1).toLowerCase()
    this.dev = JSON.parse(sessionStorage.getItem('user')).dev;


  }
}
