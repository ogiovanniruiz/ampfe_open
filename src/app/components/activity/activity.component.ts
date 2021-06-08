import { Component, OnInit, ViewChild } from '@angular/core';
import { MatGridList } from '@angular/material/grid-list';
import { MediaChange, MediaObserver } from '@angular/flex-layout';
import { MatDialog } from '@angular/material/dialog';
import { CreateTextActivityDialog } from './dialogs/texting/createActivity/createTextActivityDialog';
import { EditTextActivityDialog } from './dialogs/texting/editActivity/editTextActivityDialog';
import { CreatePhoneActivityDialog } from './dialogs/phonebank/createActivity/createPhoneActivityDialog';
import { EditPhoneActivityDialog } from './dialogs/phonebank/editActivity/editPhoneActivityDialog';
import { CreatePetitionActivityDialog } from './dialogs/petition/createActivity/createPetitionActivityDialog';
import { EditPetitionActivityDialog } from './dialogs/petition/editActivity/editPetitionActivityDialog';
import { Router } from '@angular/router';
import { ActivityService } from '../../services/activity/activity.service';
import { OrganizationService } from '../../services/organization/organization.service';
import { ReportService } from '../../services/report/report.service';
import { TextReportsDialog } from './dialogs/activityReports/textReport/textReportDialog';
import { PhonebankReportsDialog } from './dialogs/activityReports/phonebankReport/phonebankReportDialog';
import { PetitionReportsDialog } from './dialogs/activityReports/petitionReport/petitionReportDialog';
import { HotlineReportsDialog } from './dialogs/activityReports/hotlineReport/hotlineReportDialog';
import { environment } from '../../../environments/environment';
import { CompileShallowModuleMetadata } from '@angular/compiler';

import {CreateCanvassActivityDialog} from './dialogs/canvass/createCanvass/createCanvassActivityDialog'
import {EditCanvassActivityDialog} from './dialogs/canvass/editCanvass/editCanvassActivityDialog'
@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.scss']
})

export class ActivityComponent implements OnInit {

  logo_dir: string = environment.LOGO_DIR;

  @ViewChild('grid', {static: true}) grid: MatGridList;

  userProfile: any;
  dev: boolean = false;
  orgLevel: string;
  activityType: string;
  activities: unknown[] = [];
  completedActivities: unknown[] = [];
  dataLoaded: boolean = false;

  gridByBreakpoint = {
    xl: 4,
    lg: 4,
    md: 3,
    sm: 2,
    xs: 1
  };

  constructor(private observableMedia: MediaObserver,
              public dialog: MatDialog,
              public activityService: ActivityService,
              public reportService: ReportService,
              public orgService: OrganizationService,
              public router: Router) { }

  refreshUserProfile() {
    this.userProfile = JSON.parse(sessionStorage.getItem('user'));
    this.dev = this.userProfile['dev'];
    this.getOrgLevel(this.userProfile)
  }

  getOrgLevel(user) {
    let orgID: string = sessionStorage.getItem('orgID');

    for (var i = 0; i< user.orgPermissions.length; i++){
      if(user.orgPermissions[i].orgID === orgID){
        this.orgLevel = user.orgPermissions[i].level
      }
    }
  }

  enterActivity(activity: Object) {
    sessionStorage.setItem('activityID', activity['_id']);

    if (this.activityType === 'Canvass') {
      this.router.navigate(['/canvass']);
    } else if (this.activityType === 'Texting') {
      this.router.navigate(['/texting']);
    } else if (this.activityType === 'Phonebank') {
      this.router.navigate(['/phonebank']);
    } else if (this.activityType === 'Petition') {
      this.router.navigate(['/petition']);
    }else if (this.activityType === 'Canvass') {
      this.router.navigate(['/canvass']);
    }
  }

  createActivity() {
    if(this.activityType === 'Texting'){
      const dialogRef = this.dialog.open(CreateTextActivityDialog,  {width: '95%', data: {}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
    if(this.activityType === 'Phonebank'){
      const dialogRef = this.dialog.open(CreatePhoneActivityDialog,  {width: '95%', data: {}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
    if(this.activityType === 'Petition'){
      const dialogRef = this.dialog.open(CreatePetitionActivityDialog,  {width: '95%', data: {}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
    if(this.activityType === 'Canvass'){
      const dialogRef = this.dialog.open(CreateCanvassActivityDialog,  {width: '95%', data: {}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
  }

  editActivity(activity: Object) {
    if(this.activityType === 'Texting'){
      const dialogRef = this.dialog.open(EditTextActivityDialog,  {width: '95%', data: {activity}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
    if(this.activityType === 'Phonebank'){
      const dialogRef = this.dialog.open(EditPhoneActivityDialog,  {width: '95%', data: {activity}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
    if(this.activityType === 'Petition'){
      const dialogRef = this.dialog.open(EditPetitionActivityDialog,  {width: '95%', data: {activity}, disableClose: true });
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
    if(this.activityType === 'Canvass'){
      const dialogRef = this.dialog.open(EditCanvassActivityDialog,  {width: '95%', data: {activity}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
  }

  openReportsDialog(activity: Object) {
    if(this.activityType === 'Texting'){
      const dialogRef = this.dialog.open(TextReportsDialog,  {width: '90%', data: {activity}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
    if(this.activityType === 'Phonebank'){
      const dialogRef = this.dialog.open(PhonebankReportsDialog,  {width: '90%', data: {activity}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
    if(this.activityType === 'Petition'){
      const dialogRef = this.dialog.open(PetitionReportsDialog,  {width: '90%', data: {activity}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }

    if(this.activityType === 'Canvass'){
      const dialogRef = this.dialog.open(HotlineReportsDialog,  { data: {activity}});
      dialogRef.afterClosed().subscribe(result => {this.getActivities()});
    }
  }

  reactivate(activity: Object){
    var _id: string = activity['_id']
    this.activityService.toggleActiveActivity(_id).subscribe(
      (result: unknown)=>{
        this.getActivities()
      },
      error =>{
        console.log(error)
      }
    )
  }

  getActivities() {
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    const orgID: string = sessionStorage.getItem('orgID');
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

    this.activityService.getActivities(campaignID, orgID, this.activityType).subscribe(
        async (activities: unknown[]) => {
          /*for(var i = activities.length -1; i >= 0; i--){
            if(activities[i]['userIDs'].indexOf(userID) > -1 && this.orgLevel !== 'ADMINISTRATOR' && !this.dev){
              activities.splice(i,1)
            }
          }*/
        this.activities = activities.filter(function (activity) { return activity['active'] });
        this.completedActivities = activities.filter(function (activity) { return !activity['active'] });
        this.dataLoaded = true;
      }, 
      error =>{
        console.log(error)
      }
    )
  }

  hangUpAllNumbers(){
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    const orgID: string = sessionStorage.getItem('orgID');
    if(confirm("Are you sure?")){
      this.orgService.hangUpAllNumbers(orgID, campaignID).subscribe(
        (result: unknown) =>{
          console.log(result)
        },
        error =>{
          console.log(error)
        }
      )
    }
  }

  ngOnInit() {
    this.grid.cols = 1;
    this.refreshUserProfile();
    this.activityType = sessionStorage.getItem('activityType')
    this.getActivities();
  }

  ngAfterContentInit() {
    this.observableMedia.media$.subscribe((change: MediaChange) => {
      this.grid.cols = this.gridByBreakpoint[change.mqAlias];
    });
  }

}
