import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import { FormControl } from '@angular/forms';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {OrganizationService} from '../../../../../services/organization/organization.service'
import {ActivityService} from '../../../../../services/activity/activity.service'
import {ScriptService} from '../../../../../services/script/script.service'
import {DatePipe} from '@angular/common';
import {Organization} from '../../../../../models/organizations/organization.model';
import {User} from '../../../../../models/users/user.model';

@Component({
  templateUrl: './editHotlineActivityDialog.html',
  providers: [DatePipe]
})
  
export class EditHotlineActivityDialog implements OnInit{
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

    scriptName: string;

    activityType: string;
    userFirstName: string;

    dev = false;

    loading = false;

    mainPhonenum: string = ''
    email: string = ''
    voiceMailNumber: string = ''

    @ViewChild('activityName', {static: true}) activityName: ElementRef;
    @ViewChild('description' , {static: true}) description: ElementRef;

    @ViewChild('activityAllOrgs', {static: true}) activityAllOrgs: ElementRef;
    @ViewChild('activityAllUsers', {static: true}) activityAllUsers: ElementRef;
  
  constructor(public dialogRef: MatDialogRef<EditHotlineActivityDialog>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              public activityService: ActivityService,
              public orgService: OrganizationService,
              public scriptService: ScriptService) {
                this.activity = data.activity;
              }

  onNoClick(): void {this.dialogRef.close()}

  saveActivityEdits(){
      var activityID: string = this.activity['_id'];

      if(this.activityName.nativeElement.value === ''){
          this.displayMessage = true;
          this.userMessage = 'The activity needs a name.';
          return;
      }

      this.campaignOrgsUpdate = [this.activity['orgIDs'][0]].concat(this.activityAllOrgs['ngControl'].viewModel);
      this.usersUpdate = [this.activity['userIDs'][0]].concat(this.activityAllUsers['ngControl'].viewModel);

      var edits: unknown = {name: this.activityName.nativeElement.value,
          description: this.description.nativeElement.value,
          orgIDs: this.campaignOrgsUpdate,
          userIDs: this.usersUpdate,
      }

      this.activityService.saveActivityEdits(activityID, edits).subscribe(
          (result: unknown) =>{
              this.dialogRef.close(result);
          },
          error =>{
              console.log(error);
              //this.displayErrorMsg = true;
              //this.errorMessage = 'There was a problem with the server.';
          }
      )
  }

  /*
  getScript(){
      var scriptID: string = this.activity['scriptID']
      this.scriptService.getScript(scriptID).subscribe(
          (script: unknown) =>{
              this.script = script;
              this.scriptName = script['title'];
          },
          error =>{
              console.log(error)
              //this.displayErrorMsg = true;
              //this.errorMessage = 'There was a problem with the server.';
          }
      )
  }*/

  close(){this.dialogRef.close()}

  prefillActivtyData(){
      this.activityName.nativeElement.value = this.activity['name'];
      
      if (this.activity['description']) this.description.nativeElement.value = this.activity['description'];
      this.mainPhonenum = this.activity['hotlineMetaData']['mainPhoneNumber']
      this.email = this.activity['hotlineMetaData']['email']
      this.voiceMailNumber = this.activity['hotlineMetaData']['voiceMailNumber']

  }

  deleteActivity(){
      if(confirm("Are you sure you want to delete this activity?")){
          var _id: string = this.activity['_id']
          this.activityService.deleteActivity(_id, 'Hotline').subscribe(
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

  ngOnInit(){
      this.getCampaignOrgs();
      this.getCampaignUsers();
      this.prefillActivtyData();
      this.activityType = sessionStorage.getItem('activityType');
      this.userFirstName = JSON.parse(sessionStorage.getItem('user')).name.firstName;
      this.dev = JSON.parse(sessionStorage.getItem('user')).dev;
      //this.getScript();
  }
}
