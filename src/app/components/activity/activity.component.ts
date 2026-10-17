import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, loadErrorText } from '../../utils/loading';
import { SafeUrl } from '@angular/platform-browser';

import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';

//DIALOGS
import { CreateActivityDialog } from './dialogs/createActivity/createActivityDialog';
import { SendTestTextDialog } from './dialogs/sendTestText/sendTestText';
import { ActivityReportDialog } from './dialogs/activityReports/activityReportDialog';
import { EditActivityDialog } from './dialogs/editActivity/editActivityDialog';

//SERVICES
import { ActivityService } from '../../services/activity.service';
import { OrganizationService } from '../../services/organization/organization.service';

//MODELS
import {Activity} from '../../models/activity.model'
import { User } from 'src/app/models/user.model';
import { TextResponsesDialog } from './dialogs/textResponses/textResponses';
import { Organization } from 'src/app/models/organization.model';
import { TextingTemplatesDialog } from './dialogs/textingTemplates/textingTemplatesDialog';

// How long households may stay "preparing" before the page stops checking and says so
const PREPARING_LIMIT_MS = 10 * 60 * 1000

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class ActivityComponent implements OnInit, OnDestroy {

  logo_dir: string = environment.LOGO_DIR;

  userProfile: User;
  dev: boolean = false;
  orgLevel: string = "";
  activityType: string = "";
  activities: Activity[] = [];
  completedActivities: Activity[] = [];
  dataLoaded: boolean = false;
  orgName: string = ''
  orgLogo$: Observable<SafeUrl | null | undefined>
  campaignName: string = ''

  dataManager: boolean = false

  // Dialog width for the current window (see updateScreenSize)
  screenSize: string = '50%'

  callingService: string = "";

  displayErrorMsg: boolean = false
  errorMessage: string = ""

  updatingCompletionStatus: boolean = false;
  subscription: string = "";

  createActivityToolTip: string = "Create An Activity"

  // One pending "are activities ready yet" check at a time; each getActivities() call replaces it
  private readyCheckTimer: ReturnType<typeof setTimeout> | null = null;
  // First load failed: the loading card shows this with Retry instead of a progress bar
  loadError: string = '';
  // Households have been "preparing" for too long: stop checking and say so instead of spinning forever
  private preparingSince: number | null = null;
  preparingStalled: boolean = false;
  private activitiesRequest?: Subscription;
  private destroyed: boolean = false;

  constructor(
              public dialog: MatDialog,
              public activityService: ActivityService,
              public orgService: OrganizationService,
              public router: Router,
              private snackBar: MatSnackBar) { }

  refreshUserProfile() {
    this.userProfile = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.getDataManagerStatus(this.userProfile)
    this.dev = this.userProfile.dev;
    this.getOrgLevel(this.userProfile)
    this.getOrganization()
    
  }

  getOrganization(){
    let orgID: string = sessionStorage.getItem('orgID') || '';

    this.orgService.getOrganization(orgID).subscribe(
      (organization: Organization) =>{
        this.callingService = organization.callingService
        this.subscription = organization.subscription;
    }, 
    error =>{
      this.displayErrorMsg = true;
      this.errorMessage = 'There was an issue with the server.  Please refresh the page.';
      console.log(error)
    })
  }

  getOrgLevel(user: User) {
    let orgID: string = sessionStorage.getItem('orgID') || '';

    const permission = (user.orgPermissions || []).find(p => p.orgID === orgID)
    if(permission) this.orgLevel = permission.level
  }

  getDataManagerStatus(user: User){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    this.dataManager = ((user.dataManager || []) as number[]).includes(campaignID)
  }

  enterActivity(activity: Activity) {
    sessionStorage.setItem('activityID', activity._id);

    if (this.activityType === 'Canvass') {
      this.router.navigate(['/canvass']);
    } else if (this.activityType === 'Texting') {
      this.router.navigate(['/texting']);
    } else if (this.activityType === 'Phonebank') {
      if (this.callingService === 'signalwire'){
        this.router.navigate(['/swCalling']);
      }else if(this.callingService === 'twilio'){
        this.router.navigate(['/phonebank']);
      }
    }else if(this.activityType === "Petition"){
      this.router.navigate(['/petition']);
    }
    else if (this.activityType === 'Canvass') {
      this.router.navigate(['/canvass']);
    }
  }

  createActivity() {
    const dialogRef = this.dialog.open(CreateActivityDialog, {autoFocus: false, disableClose: true, width: this.screenSize === "100%" ? "100vw" : "820px", maxWidth: this.screenSize === "100%" ? "100vw" : "94vw", data: {}});
    dialogRef.afterClosed().subscribe(result => {this.getActivities()});
  }

  editActivity(activity: Activity) {
    const dialogRef = this.dialog.open(EditActivityDialog, {autoFocus: false, disableClose: true, width: this.screenSize === "100%" ? "100vw" : "820px", maxWidth: this.screenSize === "100%" ? "100vw" : "94vw", data: activity});
    dialogRef.afterClosed().subscribe(result => {this.getActivities()});
  }

  openReportsDialog(activity: Activity) {
    const dialogRef = this.dialog.open(ActivityReportDialog, {autoFocus: false, width: this.screenSize === "100%" ? "100vw" : "960px", maxWidth: this.screenSize === "100%" ? "100vw" : "94vw", data: activity});
    dialogRef.afterClosed().subscribe(result => {this.getActivities()});
  }

  reactivate(activity: Activity){
    if(!this.canReactivate(activity)) return
    var _id: string = activity._id
    this.errorMessage = ''
    this.activityService.toggleActiveActivity(_id).subscribe(
      (result: unknown) => { this.getActivities() },
      error => {
        console.log(error)
        this.errorMessage = `Couldn't reactivate "${activity.name}". Please try again.`
      })
  }

  getActivities() {
    if(this.readyCheckTimer) clearTimeout(this.readyCheckTimer);
    this.readyCheckTimer = null;
    this.activitiesRequest?.unsubscribe();

    const campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    const orgID: string = sessionStorage.getItem('orgID') || '';
    var userID: string = JSON.parse(sessionStorage.getItem('user') || '{}')._id;

    this.loadError = '';
    this.activitiesRequest = this.activityService.getActivities(campaignID, orgID, this.activityType).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
        async (activities: Activity[]) => {
          activities = activities || [];
          
          for(var i = activities.length -1; i >= 0; i--){
            if(activities[i].userIDs.indexOf(userID) === -1 && (this.orgLevel !== 'ADMINISTRATOR' && this.orgLevel !== 'OWNER') && !this.dev && activities[i].userIDs.length > 1){
              activities.splice(i,1)
            }
          }
        this.activities = activities.filter(function (activity) { return activity.active});
        this.completedActivities = activities.filter(function (activity) { return !activity.active});
        this.dataLoaded = true;
        this.updatingCompletionStatus = false;

        const hasUnready = activities.some(a => a.hhReady  === false);

        if(!hasUnready){
          this.preparingSince = null;
          this.preparingStalled = false;
        } else {
          this.preparingSince = this.preparingSince ?? Date.now();
          this.preparingStalled = Date.now() - this.preparingSince > PREPARING_LIMIT_MS;
        }

        if (hasUnready && !this.preparingStalled && !this.destroyed) {
          this.readyCheckTimer = setTimeout(() => this.getActivities(), 5000);
        }

      }, 
      error =>{
        console.log(error)
        this.updatingCompletionStatus = false;
        // Nothing on screen yet: the loading card shows the error with Retry. Otherwise the banner does.
        if(!this.dataLoaded) this.loadError = loadErrorText('the activities', error);
        else this.errorMessage = "Couldn't refresh the activities. Please try again.";
      }
    )
  }

  openTestTextDialog(activity: Activity){
    if(this.canSendTestText(activity)){
      // Full width on phones; a compact card elsewhere
      const phone = this.screenSize === '100%'
      this.dialog.open(SendTestTextDialog, {autoFocus: false, width: phone ? '100vw' : '480px', maxWidth: phone ? '100vw' : '94vw', data: activity});
    }
  }

  ngOnInit() {
    this.orgName = sessionStorage.getItem('orgName') || '';
    this.orgLogo$ = this.orgService.getOrgLogoUrl(sessionStorage.getItem('orgID') || '');
    this.campaignName = sessionStorage.getItem('campaignName') || '';
    this.refreshUserProfile();
    this.activityType = sessionStorage.getItem('activityType') || '';

    this.getActivities();
  }

  ngOnDestroy() {
    this.destroyed = true;
    if(this.readyCheckTimer) clearTimeout(this.readyCheckTimer);
    this.activitiesRequest?.unsubscribe();
  }

  ngAfterContentInit() {
    this.updateScreenSize()
  }

  @HostListener("window:resize", []) onResize() {
    this.updateScreenSize()
  }

  // Dialogs open at this width; the activity grid itself is responsive CSS
  updateScreenSize(){
    const width = window.innerWidth
    if (width >= 1200) this.screenSize = "50%"
    else if (width >= 992) this.screenSize = "70%"
    else if (width >= 768) this.screenSize = "75%"
    else this.screenSize = "100%"
  }

  //////////////////////// CARDS ////////////////////////

  get canManage(): boolean {
    return this.dev || this.orgLevel === 'ADMINISTRATOR' || this.orgLevel === 'OWNER'
  }

  get canCreate(): boolean {
    return this.canManage && !!this.subscription && this.subscription !== 'FREE'
  }

  get typeInfo(): {label: string, single: string, icon: string} {
    switch(this.activityType){
      case 'Phonebank': return {label: 'Phonebanks', single: 'phonebank', icon: 'call'}
      case 'Canvass': return {label: 'Canvasses', single: 'canvass', icon: 'directions_walk'}
      case 'Texting': return {label: 'Textbanks', single: 'textbank', icon: 'sms'}
      case 'Petition': return {label: 'Petitions', single: 'petition', icon: 'assignment'}
      default: return {label: 'Activities', single: 'activity', icon: 'event_note'}
    }
  }

  // Admins, owners and developers only, on pages that use texting
  get showTextingTemplates(): boolean {
    return this.canManage && ['Texting', 'Phonebank', 'Canvass', 'Petition'].includes(this.activityType)
  }

  // Admins, owners and developers only, on activities that can text
  canSendTestText(activity: Activity): boolean {
    return this.canManage && (this.activityType === 'Texting' || !!activity.enableTexting)
  }

  // Inactive activities are managed by admins, owners and developers; textbanks only by developers
  canReactivate(activity: Activity): boolean {
    return this.canManage && (activity.activityType !== 'Texting' || this.dev)
  }

  trackActivity(index: number, activity: Activity){
    return activity._id
  }

  openTextResponsesDialog(){
    this.dialog.open(TextResponsesDialog,  {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize, data: {}});
  }

  getActivityCompletionStatus(activityID: string, wasCompleted: boolean){
    if(!this.canManage) return
    this.updatingCompletionStatus = true;
    this.errorMessage = ''
    this.activityService.updateActivityCompletionStatus(activityID).subscribe(
      (result: unknown) => {
        this.snackBar.open(wasCompleted ? 'Activity marked not completed.' : 'Activity marked completed.', 'Dismiss', {duration: 2500})
        this.getActivities()
      },
      error => {
        console.log(error)
        this.updatingCompletionStatus = false
        this.errorMessage = 'Couldn\'t update the completion status. Please try again.'
      }
    )
  }

  public enterMap(){
    this.router.navigate(['/campaignMap']);
  }

  openTextingTemplatesDialog(){
    if(!this.showTextingTemplates) return
    this.dialog.open(TextingTemplatesDialog, {autoFocus: false, disableClose: true, width: this.screenSize === "100%" ? "100vw" : "820px", maxWidth: this.screenSize === "100%" ? "100vw" : "94vw"});
  }
}