import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {OrganizationService} from '../../../../../services/organization/organization.service'
import {ActivityService} from '../../../../../services/activity/activity.service';
import {ScriptService} from '../../../../../services/script/script.service';
import {DatePipe} from '@angular/common';
import {Organization} from '../../../../../models/organizations/organization.model';
import {User} from '../../../../../models/users/user.model';
import {FormControl} from '@angular/forms';

@Component({
  templateUrl: './createPetitionActivityDialog.html',
  providers: [DatePipe]
})
  
export class CreatePetitionActivityDialog implements OnInit{
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

  scripts: unknown[] = [];

  creatingActivity: boolean = false;

  activityType: string;

  dev: boolean = false;

  loading = false;
  errors = false;

  @ViewChild('activityName', {static: true}) activityName: ElementRef;
  @ViewChild('description' , {static: true}) description: ElementRef;

  @ViewChild('selectedScript', {static: false}) selectedScript: ElementRef;
  
  constructor(
      public dialogRef: MatDialogRef<CreatePetitionActivityDialog>,
      public activityService: ActivityService,
      public orgService: OrganizationService,
      public scriptService: ScriptService) {
  }

  onNoClick(): void {this.dialogRef.close()}

  createActivity(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;
    var activityType: string = sessionStorage.getItem('activityType');
    var orgID: string = sessionStorage.getItem('orgID');

    if(this.activityName.nativeElement.value === ''){
      this.displayMessage = true;
      this.userMessage = 'The activity needs a name.';
      return;
    }

    if(!this.selectedScript['value']){
      this.displayMessage = true;
      this.userMessage = 'The activity needs a Script.';
      return;
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

    var newActivity = {
      name: this.activityName.nativeElement.value,
      activityType: activityType,
      description: this.description.nativeElement.value,
      campaignID: campaignID,
      orgIDs: this.campaignOrgsUpdate,
      userIDs: this.usersUpdate,
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
    );
  }

  getAllScripts(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.scriptService.getAllScripts(orgID, campaignID).subscribe(
        (scripts: unknown[]) =>{
          this.scripts = scripts
        },
        error =>{
          console.log(error)
          this.displayErrorMsg = true;
          this.errorMessage = 'There was a problem with the server.';
        }
    );
  }

  close(){this.dialogRef.close()};

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
    var orgID: string = sessionStorage.getItem('orgID')
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
    this.activityType = sessionStorage.getItem('activityType')
    this.dev = JSON.parse(sessionStorage.getItem('user')).dev
    this.getAllScripts();
  }
}
