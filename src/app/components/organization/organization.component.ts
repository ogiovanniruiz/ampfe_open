import { Component, OnInit,  ViewChild, AfterContentInit, HostListener} from '@angular/core';
import { Router } from "@angular/router";
import { MatGridList } from '@angular/material/grid-list';
import {MatDialog} from '@angular/material/dialog';
import { MediaChange, MediaObserver } from '@angular/flex-layout';

import {RequestCampaignDialog} from './dialogs/requestCampaign/requestCampaign'
import {CreateCampaignDialog} from './dialogs/createCampaign/createCampaign'
import { OrgSettingsDialog } from './dialogs/orgSettings/orgSettings';
import {TwilioAccountDialog} from './dialogs/twilioAccount/twilioAccount'
import {OrgBillingDialog} from './dialogs/orgBilling/orgBilling'

import {UserService} from '../../services/user/user.service'
import {CampaignService} from '../../services/campaign/campaign.service'
import {OrganizationService} from '../../services/organization/organization.service'

import {StorageMap} from '@ngx-pwa/local-storage';

import {User, UpdatedUser} from '../../models/users/user.model'
import {Organization, UpdatedOrg} from '../../models/organizations/organization.model'
import {Campaign} from '../../models/campaigns/campaign.model'

import { environment } from '../../../environments/environment';

import {EditCampaignDialog} from './dialogs/editCampaign/editCampaignDialog'

@Component({
  selector: 'app-organization',
  templateUrl: './organization.component.html',
  styleUrls: ['./organization.component.scss']
})

export class OrganizationComponent implements OnInit {

  logo_dir: string = environment.LOGO_DIR;

  @ViewChild('grid', {static: true}) grid: MatGridList;
  @ViewChild('campaignGrid', {static: true}) campaignGrid: MatGridList;
  @ViewChild('inactiveCampaignGrid', {static: true }) inactiveCampaignGrid: MatGridList;

  gridByBreakpoint = {
    xl: 4,
    lg: 4,
    md: 3,
    sm: 2,
    xs: 1
  }

  activeCampaigns: Campaign[];
  inactiveCampaigns: Campaign[];
  dev: boolean = false;
  orgLevel: string;
  org: Organization;
  dataLoaded: boolean = false;

  funded: boolean = false;
  subscribed: boolean = false;

  displayErrorMsg: boolean = false;
  errorMessage: string = "";
  
  constructor(private userService: UserService, 
              private router: Router, 
              private observableMedia: MediaObserver, 
              public dialog: MatDialog, 
              public campaignService: CampaignService,
              public orgService: OrganizationService,
              private storage: StorageMap) {
  }

  getOrg(){
    var orgID: string = sessionStorage.getItem('orgID');

    this.orgService.getOrganization(orgID).subscribe(
      (org: Organization) =>{
        this.org = org
        this.funded = org.funded
        this.subscribed = org.subscribed
        this.dataLoaded = true;
      },
      error => {
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was an issue with the server.';
      }
    );
  }

  getOrgCampaigns(){
    var orgID: string = sessionStorage.getItem('orgID');

    this.campaignService.getOrgCampaigns(orgID).subscribe(
      (campaigns: Campaign[]) =>{
        this.activeCampaigns = campaigns.filter(function(campaign) { return campaign['active'] });
        this.inactiveCampaigns = campaigns.filter(function(campaign) { return !campaign['active'] });
        this.getOrgLevel();
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was an issue with the server.';
      }
    )
  }

  getOrgLevel(){
    var orgID: string = sessionStorage.getItem('orgID');
    var user: User = JSON.parse(sessionStorage.getItem('user'));

    for (var i = 0; i< user.orgPermissions.length; i++){
      if(user.orgPermissions[i].orgID === orgID){
        this.orgLevel = user.orgPermissions[i].level
      }
    }
    this.getOrg();
  }

  public enterCampaign(campaignID: Number){
    if(campaignID.toString() !== sessionStorage.getItem('campaignID')){
      this.storage.delete('orgSummaryTime').subscribe(() => {});
      this.storage.delete('petitionSummaryTime').subscribe(() => {});
      this.storage.delete('phonebankingSummaryTime').subscribe(() => {});
    }
    var stringID = campaignID.toString();
    sessionStorage.setItem('campaignID', stringID);
    this.router.navigate(['/dashboard']);
  }

  openCreateCampaignDialog(): void {
    const dialogRef = this.dialog.open(CreateCampaignDialog, {width: "50%", disableClose: true});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.getOrgCampaigns()
        this.refreshUserProfile();
      }
    });
  }

  openEditCampaignDialog(campaign): void{
    var orgID: string = sessionStorage.getItem('orgID');
    if(campaign['creatorOrg'] === orgID && (this.dev || this.orgLevel === "ADMINISTRATOR")){
      const dialogRef = this.dialog.open(EditCampaignDialog, {width: "50%", data: campaign, disableClose: true});
      dialogRef.afterClosed().subscribe(result => {
        if(result){
          this.getOrgCampaigns()
          this.refreshUserProfile();
        }
      });
    }
  }

  openRequestCampaignDialog(): void {
    const dialogRef = this.dialog.open(RequestCampaignDialog, {width: "50%"});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.getOrgCampaigns()
        this.refreshUserProfile();
      }
    });
  }

  openOrgSettingsDialog(): void {
    const dialogRef = this.dialog.open(OrgSettingsDialog, {data: this.org,width: "50%"});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.getOrgCampaigns()
        this.refreshUserProfile();
      }
    });
  }

  openOrgBillingDialog(): void {
    const dialogRef = this.dialog.open(OrgBillingDialog, {data: this.org, width: "50%"});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        console.log(result) 
      }
      this.dataLoaded = false
      this.getOrg();
    });
  }

  openTwilioAccountDialog(): void {
    const dialogRef = this.dialog.open(TwilioAccountDialog, {width: "50%"});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.getOrgCampaigns()
        this.refreshUserProfile();
      }
    });
  }

  refreshUserProfile(){
    var oldUserProfile: User = JSON.parse(sessionStorage.getItem('user'));
    this.userService.getUser(oldUserProfile).subscribe(
      (user: User) => {
        sessionStorage.setItem('user', JSON.stringify(user))
        this.dev =  user.dev 
        this.getOrgCampaigns(); 
      }, 
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = "There was an issue with the server."
      }
    )
  }

  openMembership(){
    this.router.navigate(['/membership']);
  }

  ngOnInit() {
    this.campaignGrid.cols = 1;    
    this.inactiveCampaignGrid.cols = 1;
    this.refreshUserProfile();
  }

  ngAfterContentInit() {
    this.observableMedia.media$.subscribe((change: MediaChange) => {
      this.campaignGrid.cols = this.gridByBreakpoint[change.mqAlias];
      this.inactiveCampaignGrid.cols =  this.gridByBreakpoint[change.mqAlias];
    });
  }
}
