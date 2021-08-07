import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../services/user/user.service';
import {CampaignService} from '../../../services/campaign/campaign.service';
import {OrganizationService} from '../../../services/organization/organization.service';
import {User} from '../../../models/users/user.model';
import {Organization, UpdatedOrg} from '../../../models/organizations/organization.model';
import {Campaign} from '../../../models/campaigns/campaign.model';

@Component({
    templateUrl: './settingsDialog.html',
  })

export class SettingsDialog implements OnInit {

  campaignOrgs: Organization[] = [];
  campaignOrgsResults: Organization[] = [];
  requests: Organization[] = [];
  dev = false;
  displayErrorMsg = false;
  errorMessage = '';
  campaignID: number;
  allOrgUsers: User[] = [];
  campaign: Campaign;
  dataLoaded: boolean = false;
  loadingMembers: boolean = true;
  userURL: string;

  constructor(public dialogRef: MatDialogRef<SettingsDialog>,
              @Inject(MAT_DIALOG_DATA) public data: User,
              public userService: UserService,
              public campaignService: CampaignService,
              public orgService: OrganizationService,
              public dialog: MatDialog) {
                this.dev = data.dev;
              }

  onNoClick(): void {this.dialogRef.close(); }

  getCampaignOrgs() {
    this.campaignID = parseInt(sessionStorage.getItem('campaignID'));
    this.orgService.getCampaignOrgs(this.campaignID).subscribe(
      (orgs: Organization[]) => {
        this.campaignOrgs = orgs;
        this.campaignOrgsResults = orgs;
        this.getUserslist();
      },
      error => {
        console.log(error);
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    );
  }

  getCampaignRequests() {
    let campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    this.campaignService.getCampaignRequests(campaignID).subscribe(
      (requests: Organization[]) => {
        this.requests = requests;
      },
      error => {
        console.log(error);
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    );
  }

  manageRequest(orgID: string, action: string) {
    let campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    this.campaignService.manageCampaignRequest(campaignID, orgID, action).subscribe(
      (campaign: Campaign) => {
        if (campaign) {
          console.log(campaign)
          this.getCampaignOrgs();
          this.getCampaignRequests();
        }
      },
      error => {
        console.log(error);
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    );
  }

  removeOrg(orgID: string) {
    let campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    if (confirm('Are you sure you want to remove this Organization?')) {
      this.campaignService.removeOrg(campaignID, orgID).subscribe(
        (updatedOrg: UpdatedOrg) => {
          if (updatedOrg.success) {
            this.getCampaignOrgs();
          }
        },
        error => {
          console.log(error);
          this.displayErrorMsg = true;
          this.errorMessage = 'There was a problem with the server.';
        }
      );
    }
  }

  getUserslist() {
    this.userService.getAllUsers().subscribe(
      (users: User[]) => {
        let orgIDs: string[] = this.campaignOrgs.map(x => x._id);
        this.allOrgUsers = users.filter(x => {
          for (let i = 0; i < x.orgPermissions.length; i++) {
            if ((orgIDs.includes(x.orgPermissions[i].orgID)) && (x.orgPermissions[i].level != 'VOLUNTEER' )) {
              return true;
            }
          }
          return false;
        });

      this.loadingMembers = false;

      },
      error => {
        console.log(error);
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    );
  }

  updateDataManager(user: User) {
    let campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    this.userService.updateDataManager(user, campaignID).subscribe(
      (user: User) => {
        for (let i = 0; i < this.allOrgUsers.length; i++) {
          if (this.allOrgUsers[i]._id === user._id) {
            this.allOrgUsers[i] = user;
          }
        }
      }
    );
  }

  applyFilter(value: string) {
    if (value) {
      this.campaignOrgs = this.campaignOrgsResults;
      this.campaignOrgs = this.campaignOrgs.filter(option => option.name.toLowerCase().startsWith(value.toLowerCase()));
    } else {
      this.campaignOrgs = this.campaignOrgsResults;
    }
  }

  getCampaign(){ 
    let campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    this.campaignService.getCampaign(campaignID).subscribe(
      (campaign: Campaign) => {
          this.campaign = campaign
          this.dataLoaded = true
      },
      error => {
        console.log(error);
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    );
  }

  generateNewUserLink(){

    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

    var userDetails = {  
      orgID : sessionStorage.getItem('orgID'),
      campaignID: campaignID,
      route: "/assets"
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

 ngOnInit() {
  this.getCampaign();
  this.getCampaignOrgs();
  this.getCampaignRequests();

  }
}
