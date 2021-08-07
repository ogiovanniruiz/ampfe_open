import { Component, OnInit, ViewChild} from '@angular/core';
import { MatGridList } from '@angular/material/grid-list';
import { MediaChange, MediaObserver } from '@angular/flex-layout';
import { Router } from "@angular/router";
import { UserService } from '../../services/user/user.service';
import {MatDialog} from '@angular/material/dialog';
import {SettingsDialog } from './dialogs/settingsDialog';
import {CampaignService} from '../../services/campaign/campaign.service'
import {ReportService} from '../../services/report/report.service'
import { environment } from '../../../environments/environment';

import {OrganizationService} from '../../services/organization/organization.service'



@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  orgLevel: String;
  campaignName: String; 
  campaignActive: boolean;
  dev: boolean = false;
  dataLoaded: boolean = false;
  dataManager: boolean = false;

  errorMessage: string = '';
  displayErrorMsg: boolean = false;

  logo_dir: string = environment.LOGO_DIR;

  funded: boolean = false;

  @ViewChild('grid', {static: true}) grid: MatGridList;

  gridByBreakpoint = {
    xl: 4,
    lg: 4,
    md: 3,
    sm: 2,
    xs: 1
  }

  constructor(private observableMedia: MediaObserver,
              public router: Router, 
              public orgService: OrganizationService,
              public reportService: ReportService, 
              public userService: UserService, 
              public dialog: MatDialog, 
              public campaignService: CampaignService) { }


  openSettingsDialog(){
    const dialogRef = this.dialog.open(SettingsDialog, {data: {dev: this.dev}});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        console.log("CLOSED...")
      }
    });
  }

  getCampaign(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    this.campaignService.getCampaign(campaignID).subscribe(
      (campaign: any)=>{
        this.campaignName = campaign['name']
        this.campaignActive = campaign['active']
        this.getFundedStatus()
        sessionStorage.setItem('geographical', campaign.geographical)
        this.dataLoaded = true;
      
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = "There was an issue with the server."
      }
    )
  }

  getFundedStatus(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID');

    this.orgService.getFundedStatus(campaignID, orgID).subscribe(
      (funded: boolean)=>{
        this.funded = funded
      },
      error =>{
        console.log(error)
      }
    )
  }

  refreshUserProfile(){
    var oldUserProfile: any = JSON.parse(sessionStorage.getItem('user'));
    this.userService.getUser(oldUserProfile).subscribe(
      (user: any) => {
        sessionStorage.setItem('user', JSON.stringify(user))
        this.dev =  user.dev 
        this.getOrgLevel(user)
      }, 
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = "There was an issue with the server."
      }
    )
  }

  getOrgLevel(user: any){
    var orgID: string = sessionStorage.getItem('orgID')

    for (var i = 0; i< user.orgPermissions.length; i++){
      if(user.orgPermissions[i].orgID === orgID){
        this.orgLevel = user.orgPermissions[i].level
      }
    }
    this.getDataManagerStatus(user)
  }

  getDataManagerStatus(user: any){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    for (var i = 0; i< user.dataManager.length; i++){
      if(user.dataManager[i] === campaignID ){
        this.dataManager = true;
      }
    }
    this.getCampaign();
  }

  enterTargetingModule(){
    this.router.navigate(['/targeting']);
  }

  enterScriptsModule(){
    this.router.navigate(['/scripts']);
  }
  
  enterEventsModule(){
    sessionStorage.setItem('activityType', "Event")
    this.router.navigate(['/events']);
  }

  enterReportsModule(){
    this.router.navigate(['/reports']);
  }

  enterPeopleModule(){
    this.router.navigate(['/people']);
  }

  enterAssetsModule(){
    this.router.navigate(['/assets']);
  }

  enterActivityDashboard(activityType: string){
    sessionStorage.setItem('activityType', activityType)
    this.router.navigate(['/activity']);
  }

  ngOnInit() {
    this.grid.cols = 1;
    this.refreshUserProfile();
    
  }

  ngAfterContentInit() {
    this.observableMedia.media$.subscribe((change: MediaChange) => {
      this.grid.cols = this.gridByBreakpoint[change.mqAlias];
    });
  }
}
