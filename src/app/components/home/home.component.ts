import { Component, OnInit, ViewChild, HostListener, AfterContentInit, Output, Input, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {MatDialog} from '@angular/material/dialog';
import {Router} from "@angular/router";
import { OAuthService } from 'angular-oauth2-oidc';
import { KeyValueDiffers } from '@angular/core';
import { timeout } from 'rxjs/operators';
import { TimeoutError } from 'rxjs';

import { AuthGuard } from '../../authguards/auth-guard.service';
import { LoginDialog, loginDialogConfig } from '../../dialogs/loginDialog/loginDialog';
import { LOAD_TIMEOUT_MS } from '../../utils/loading';

// A load that hasn't answered by then is treated as failed, so Home never spins forever

import { environment } from '../../../environments/environment';

//SERVICES
import { OrganizationService, OrgTermsStatus, arrayBufferToBase64 } from '../../services/organization/organization.service'
import { UserService } from '../../services/user.service'
import { AmplifyService } from '../../services/amplify.service'
import { CampaignService } from 'src/app/services/campaign.service';

//MODELS
import { User, UpdatedUser } from '../../models/user.model'
import { Organization, UpdatedOrg } from '../../models/organization.model'
import { Campaign } from 'src/app/models/campaign.model';

//DIALOGS
import { CreateOrgDialog } from './homeDialogs/createOrganization/createOrg'
import { RequestOrgDialog } from './homeDialogs/requestOrganization/requestOrg'
import { EditOrgDialog } from './homeDialogs/editOrganization/editOrgDialog'
import { ManageAllUsersDialog } from './homeDialogs/manageAllUsers/manageAllUsers';
import { EditCampaignDialog } from './homeDialogs/editCampaign/editCampaignDialog';
import { UserOrgsDialog } from './homeDialogs/userOrgsDialog/userOrgsDialog';
import { OrgBillingDialog } from './homeDialogs/orgBilling/orgBilling';
import { OrgUserListDialog } from './homeDialogs/userList/orgUserList';
import { TwilioCallPoolDialog } from './homeDialogs/twilioCallPool/twilioCallPool'
import { SWTextNumbersDialog } from './homeDialogs/swTextNumbers/swTextNumbers';
import { ManageCampaignsDialog } from './homeDialogs/manageCampaigns/manageCampaignsDialog';
import { TermsDialog, Terms } from './homeDialogs/termsDialog/termsDialog';
import { SignalWireCallPoolDialog } from './homeDialogs/swCallPool/swCallPool';
import { LiveElectionResultsDialog } from './homeDialogs/liveElectionResults/liveElectionResults';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class HomeComponent implements OnInit {

  logo_dir: string = environment.LOGO_DIR;
  homeOrg: Organization

  demoVersion: boolean = environment.demoVersion

  subscription: string = ""


  requests = []
  termsAgreement: boolean = false
  // Whether an owner has accepted the current terms for the home org; null until loaded (no badge)
  termsStatus: OrgTermsStatus | null = null
  private termsStatusOrgID: string | null = null
  termsDialogOpen: boolean = false

  activeCampaigns: Campaign[] = []

  dev: boolean = false;
  dataLoaded:boolean = false;

  user: User;

  errorMessage: string = "";
  displayErrorMsg: boolean = false;
  // Set when loading Home failed; the loading card stops spinning and offers Retry
  loadError: string = '';
  // No user in this tab and no sign-in on its way (e.g. a new tab): offer Sign in instead of loading forever
  signedOut: boolean = false;
  private signInTimer: any;
  orgLevel: string = ''

  // Dialog width for the current window (see updateScreenSize)
  screenSize: string = '75%'

  differ:any;

  checkFlag: boolean = false;

  imageBuffer: any;
  // While the org logo is being fetched, a spinner holds its place instead of the default icon
  logoLoading: boolean = false;
  private logoOrgID: string = '';

  constructor(public orgService: OrganizationService, 

              public dialog: MatDialog, 
              public userService: UserService,
              public router: Router,
              public ampService: AmplifyService,
              public campaignService: CampaignService,
              private oauthService: OAuthService, 
              differs:  KeyValueDiffers ,
              private sanitizer: DomSanitizer,
              private authGuard: AuthGuard,
              ) {

                this.differ = differs.find([]).create();

              }

  // Any failure in the user → organization → campaigns chain: stop the spinner and offer Retry
  private loadFailed(what: string, error: any){
    console.log(error)
    this.loadError = error instanceof TimeoutError
      ? `Couldn't load ${what}: the server didn't respond.`
      : `Couldn't load ${what}: the server had a problem.`
  }

  retryLoad(){
    this.loadError = ''
    this.displayErrorMsg = false
    this.dataLoaded = false
    if(sessionStorage.getItem('user')) this.getUser()
    else this.checkSignIn()
  }

  // Home is open to tabs without a user because Google sign-in returns here. Wait for that sign-in only
  // when one is actually on its way; otherwise show Sign in. A sign-in that never arrives ends in the error card.
  private checkSignIn(){
    clearTimeout(this.signInTimer)
    this.signedOut = false
    if(this.claims) return // ngDoCheck signs in with them

    const callback = /(id_token|access_token|code)=/.test(window.location.hash + window.location.search)
    if(!callback){
      this.signedOut = true
      return
    }
    this.signInTimer = setTimeout(() => {
      if(!sessionStorage.getItem('user') && !this.claims){
        this.loadError = "Couldn't finish signing in: Google didn't respond."
      }
    }, LOAD_TIMEOUT_MS)
  }

  signIn(){
    this.dialog.open(LoginDialog, loginDialogConfig()).afterClosed().subscribe(() => {
      // Signing in navigates to /home, which keeps this page; load here once the user is stored
      if(sessionStorage.getItem('user')){
        this.signedOut = false
        this.dataLoaded = false
        this.getUser()
      } else if(this.claims){
        this.signedOut = false
      }
    })
  }

  ngOnDestroy(){
    clearTimeout(this.signInTimer)
  }

  logOut(){
    this.authGuard.logOut()
  }

  getUser(){
    var oldUserProfile: User = JSON.parse(sessionStorage.getItem('user'));
    this.loadError = ''
    if(!oldUserProfile) return this.checkSignIn()
    clearTimeout(this.signInTimer)
    this.signedOut = false
    
    this.userService.getUser(oldUserProfile).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (user: User) => {
        sessionStorage.setItem('user', JSON.stringify(user))

        if(sessionStorage.getItem('rdr')){
          console.log("You are being redirected.")
          this.processLink(sessionStorage.getItem('rdr'))
        }

        this.dev =  user.dev
        this.getHomeOrganization(user.homeOrgID)
        
      }, 
      error => this.loadFailed('your profile', error)
    )
  }

  getHomeOrganization(homeOrgID: string){
    this.loadError = ''
    // No organization yet: show the no-organization view rather than asking for an undefined id
    if(!homeOrgID){
      this.homeOrg = undefined
      this.dataLoaded = true
      return
    }
    this.orgService.getOrganization(homeOrgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (org: Organization) =>{

        this.homeOrg = org

        if(this.homeOrg){
          this.termsAgreement = this.homeOrg.termsAgreement
          this.subscription = this.homeOrg.subscription
          this.requests = this.homeOrg.requests
          sessionStorage.setItem('orgID', org._id)
          sessionStorage.setItem('orgName', org.name)
          this.getOrgCampaigns()
          this.getOrgLogo()
          this.getOrgTermsStatus()
          //this.checkTermsAgreement()

          return
        }

        this.dataLoaded = true

      },
      error => this.loadFailed('your organization', error)
    );
  }

  getOrgCampaigns(){
    this.campaignService.getOrgCampaigns(this.homeOrg._id).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (campaigns: Campaign[]) =>{
        this.activeCampaigns = (campaigns || []).filter(function(campaign) { return campaign['active'] });
        this.dataLoaded = true
        this.getOrgLevel();
      },
      error => this.loadFailed('your campaigns', error)
    )
  }

  getOrgLevel(){
    var orgID: string = sessionStorage.getItem('orgID');
    var user: User = JSON.parse(sessionStorage.getItem('user'));

    for (var i = 0; i< user.orgPermissions.length; i++){
      if(user.orgPermissions[i].orgID === orgID){
        this.orgLevel = user.orgPermissions[i].level
        this.userService.changeMessage(this.orgLevel);
        return
      }
    }
  }

  public enterMap(campaignID: Number){


    var stringID = campaignID.toString();
    sessionStorage.setItem('campaignID', stringID);

    this.router.navigate(['/campaignMap']);
  }

  openManageCampaignsDialog(){
    const dialogRef = this.dialog.open(ManageCampaignsDialog, {data: this.homeOrg, autoFocus: false, width: this.screenSize, maxWidth: this.screenSize})
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.dataLoaded = false
        this.getUser()
      }
    })
  }

  enterActivityDashboard(campaign: Campaign, activityType: string){
    var stringID = campaign.campaignID.toString();
    sessionStorage.setItem('campaignID', stringID);
    sessionStorage.setItem("campaignName", campaign.name)
    sessionStorage.setItem('activityType', activityType)
    this.router.navigate(['/activity']);
  }

  openEditCampaignDialog(campaign: Campaign): void{

    var orgID: string = sessionStorage.getItem('orgID');
    var user: User = JSON.parse(sessionStorage.getItem('user'));

    if((campaign.creatorOrg === orgID && (this.orgLevel === "ADMINISTRATOR" || this.orgLevel === "OWNER") && this.homeOrg.subscription !== 'FREE') || user.dev ){
      const dialogRef = this.dialog.open(EditCampaignDialog, { autoFocus: false, disableClose: true, width: this.screenSize, data: campaign, maxWidth: this.screenSize});
      dialogRef.afterClosed().subscribe(result => {
        if(result){
          this.dataLoaded = false
          this.getUser()
        }
      });
    }
  }

  openUserOrgsDialog(){
    const dialogRef = this.dialog.open(UserOrgsDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});

    dialogRef.afterClosed().subscribe((command: string) =>{
      if(command){
        if(command === 'openRequestOrgDialog'){
          this.openRequestOrgForm()
          return
        }
        this.dataLoaded = false
        this.getUser()
      }
    })
  }

  openCreateOrgForm(){

    const dialogRef = this.dialog.open(CreateOrgDialog, {autoFocus: false, disableClose: true, width: this.screenSize, maxWidth: this.screenSize});
    dialogRef.afterClosed().subscribe((results: UpdatedOrg) => {
      if(results) {
        this.dataLoaded = false
        this.getUser()
      }
    });
  }

  openRequestOrgForm(){
    this.dialog.open(RequestOrgDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
  }

  editOrganization(){
    var user: User = JSON.parse(sessionStorage.getItem('user'));

    if(user.dev || (this.orgLevel === "ADMINISTRATOR" || this.orgLevel === "OWNER")){
      const dialogRef = this.dialog.open(EditOrgDialog, {autoFocus: false, disableClose: true,
        data: {org: this.homeOrg, logo: this.imageBuffer, dev: !!user.dev},
        width: this.screenSize, maxWidth: this.screenSize});

      // {org, logoChanged}: reload everything only when the org itself changed
      dialogRef.afterClosed().subscribe(result => {
        if(!result) return
        if(result.org) {
          this.dataLoaded = false
          this.getUser()
          return
        }
        if(result.logoChanged) {
          this.orgService.clearOrgLogo(this.homeOrg._id)
          this.getOrgLogo()
        }
      });
    }
  }

  openManageAllUsersDialog(){
    const dialogRef = this.dialog.open(ManageAllUsersDialog, { autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
    dialogRef.afterClosed().subscribe(
      result => {
        if(result){
          this.dataLoaded = false
          this.getUser()
        }
      }
    )
  }

  massGeocodeVoters(){
    this.ampService.massGeocodeVoters().subscribe(result =>{
      console.log(result)
    })
  }

  appendGeoids(){
    this.ampService.appendGeoids().subscribe(result =>{
      console.log(result)
    })
  }

  appendPrecinctIDs(){
    this.ampService.appendPrecinctIDs().subscribe(result =>{
      console.log(result)
    })
  }

  ngOnInit() {

    var oldUserProfile: User = JSON.parse(sessionStorage.getItem('user'));

    if(oldUserProfile){
      this.getUser();
    } else {
      this.checkSignIn();
    }

  }

  getOrgLogo(){
    // Switching organizations drops the old logo; a reload of the same org keeps showing it meanwhile
    if(this.logoOrgID !== this.homeOrg._id){
      this.logoOrgID = this.homeOrg._id
      this.imageBuffer = undefined
    }
    if(!this.imageBuffer) this.logoLoading = true
    this.orgService.getOrgLogo(this.homeOrg._id).subscribe((data: any)=>{
      this.logoLoading = false
      if(!data?.image?.data) {
        this.imageBuffer = undefined
        return}

      var image = arrayBufferToBase64(data.image.data)
      let objectURL = 'data:image/png;base64,' + image;
      this.imageBuffer =  this.sanitizer.bypassSecurityTrustUrl(objectURL);
    }, error=>{
        // Not worth an error banner: the default icon stands in for the logo
        console.log(error)
        this.logoLoading = false
    })
  }
  
  

  ngDoCheck(){
    var changes: boolean = this.differ.diff(this.claims);
    var jwt: string = sessionStorage.getItem('jwt')
    
    if (changes && !this.checkFlag && !jwt){
      this.googleLogin(this.claims);
      this.checkFlag = true;
    }

  }

  get claims(){
    var claims = this.oauthService.getIdentityClaims();
    if (claims) return claims;
    return null; 
  }

  processLink(dir: string){
    var user: User = JSON.parse(sessionStorage.getItem('user'));

    this.userService.processLink(dir).subscribe(
      (redirectResults: any) => {

        if(!redirectResults){
          sessionStorage.removeItem('rdr')

          this.router.navigate(["/"]);
        }

        if(redirectResults.active){
          var route: string = redirectResults.redirectData['route'];
          var orgID: string = redirectResults.redirectData['orgID'];
          var activityID: string = redirectResults.redirectData['activityID']
          var campaignID: string = redirectResults.redirectData['campaignID']

          sessionStorage.setItem('campaignID', campaignID);
          sessionStorage.setItem('orgID', orgID);
          sessionStorage.setItem('activityID', activityID)
  
          this.userService.createRdrUser(user, orgID).subscribe((createRdrUserResult: any)=>{
            this.router.navigate([route]);
          })
        }

        return
      }
    )
  }

  openDistrictsMap(){
    this.router.navigate(['/districts']);
  }

  openHotlineDashboard(){
    this.router.navigate(['/hotline']);
  }

  ngAfterContentInit() {
    this.updateScreenSize()
  }

  @HostListener("window:resize", []) onResize() {
    this.updateScreenSize()
  }

  // Dialogs open at this width; the campaign grid itself is responsive CSS
  updateScreenSize(){
    const width = window.innerWidth
    if (width >= 1350) this.screenSize = "50%"
    else if (width >= 992) this.screenSize = "70%"
    else if (width >= 768) this.screenSize = "75%"
    else this.screenSize = "100%"
  }

  //////////////////////// CAMPAIGN CARDS ////////////////////////

  get canManage(): boolean {
    return this.dev || this.orgLevel === 'ADMINISTRATOR' || this.orgLevel === 'OWNER'
  }

  // Same rule openEditCampaignDialog enforces
  canEditCampaign(campaign: Campaign): boolean {
    if(this.dev) return true
    return campaign.creatorOrg === this.homeOrg?._id && (this.orgLevel === 'ADMINISTRATOR' || this.orgLevel === 'OWNER') && this.subscription !== 'FREE'
  }

  // Activities each subscription includes, in card order
  get activities(): {type: string, label: string, icon: string}[] {
    const plus = this.subscription === 'PLUS'
    const core = this.subscription === 'CORE'
    return [
      {type: 'Phonebank', label: 'Phonebank', icon: 'call', allowed: plus},
      {type: 'Canvass', label: 'Canvass', icon: 'directions_walk', allowed: plus || core},
      {type: 'Texting', label: 'Texting', icon: 'sms', allowed: plus},
      {type: 'Petition', label: 'Petition', icon: 'assignment', allowed: plus || core},
    ].filter(activity => activity.allowed)
  }

  // The activities list is rebuilt on each check; tracking by type keeps the buttons in place
  trackActivity(index: number, activity: {type: string}){
    return activity.type
  }

  trackCampaign(index: number, campaign: Campaign){
    return campaign.campaignID
  }

  openOrgBillingDialog(): void {
    const dialogRef = this.dialog.open(OrgBillingDialog, {autoFocus: false, data: this.homeOrg, width: this.screenSize, maxWidth: this.screenSize});
    dialogRef.afterClosed().subscribe(result => {
      // Only reload when the dialog changed something
      if(!result) return
      this.dataLoaded = false
      this.getHomeOrganization(this.homeOrg._id);
    });
  }

  openUserListDialog(){
    var orgID: string = sessionStorage.getItem('orgID');
    const dialogRef = this.dialog.open(OrgUserListDialog, {disableClose: true, autoFocus: false, data: orgID, width: this.screenSize, maxWidth: this.screenSize});
    dialogRef.afterClosed().subscribe((userWasUpdated: boolean) => {
      if(userWasUpdated){
        this.dataLoaded = false
        this.getHomeOrganization(this.homeOrg._id);
      }

    });
  }

  openTwilioAccountDialog(): void {
    this.dialog.open(TwilioCallPoolDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
  }

  openTextingNumbersDialog(): void {
    this.dialog.open(SWTextNumbersDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
  }

  openSignalWireAccountDialog(): void {
    this.dialog.open(SignalWireCallPoolDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
  }

  get termsPending(): boolean {
    return !!this.termsStatus && !this.termsStatus.accepted
  }

  getOrgTermsStatus(){
    const orgID = this.homeOrg?._id
    if(!orgID) return
    // Don't show the previous org's badge while the new org's status loads
    if(this.termsStatusOrgID !== orgID) this.termsStatus = null
    this.orgService.getOrgTermsStatus(orgID).subscribe(
      (status: OrgTermsStatus) => {
        // Ignore a late answer for an org the user has since switched away from
        if(this.homeOrg?._id !== orgID) return
        this.termsStatus = status
        this.termsStatusOrgID = orgID
      },
      error => {
        console.log(error)
        this.termsStatus = null
      }
    )
  }

  // Users must accept the current terms version (set on the server) before using the app
  checkTermsAgreement(){
    if(this.termsDialogOpen) return

    this.orgService.getTerms().subscribe(
      (terms: Terms) => {
        var user: User = JSON.parse(sessionStorage.getItem('user'))
        if(user.userAgreements?.some(agreement => agreement.version === terms.version && agreement.orgID === this.homeOrg?._id)) return

        this.openTermsDialog(terms)
      },
      error => console.log(error)
    )
  }

  openTermsDialog(requiredTerms?: Terms): void {
    const required = !!requiredTerms
    if(required) this.termsDialogOpen = true

    const dialogRef = this.dialog.open(TermsDialog, {
      data: {org: this.homeOrg, terms: requiredTerms, required, status: this.termsStatus},
      disableClose: required,
      autoFocus: false,
      width: this.screenSize,
      maxWidth: this.screenSize
    });
    dialogRef.afterClosed().subscribe(result => {
      if(required) this.termsDialogOpen = false
      if(result){
        sessionStorage.setItem('user', JSON.stringify(result.user))
        this.getHomeOrganization(this.homeOrg._id);
      }
    });
  }

  openMembership(){
    this.router.navigate(['/membership']);
  }

  peopleSearch(){
    this.router.navigate(['/people']);
  }

  openSOSMap(){
    this.router.navigate(['/statemap']);
  }

  googleLogin(claims: any){
    this.userService.oauthLogin(claims).subscribe(
      (loginResults: UpdatedUser)=> {
        if(loginResults.success){
          sessionStorage.setItem('user', JSON.stringify(loginResults.user));
          sessionStorage.setItem('jwt', loginResults.jwt);

          this.getUser()
   
        }else if(!loginResults.success){
          if(this.claims){
            this.createOauthUser(this.claims)
          }
        }
    }, error => this.loadFailed('your sign-in', error))
  }

  createOauthUser(claims: any){
    this.userService.createOauthUser(claims).subscribe(
      (loginResults: UpdatedUser)=> {
        sessionStorage.setItem('user', JSON.stringify(loginResults.user));
        sessionStorage.setItem('jwt', loginResults.jwt);
        this.getUser()
        
    }, error => this.loadFailed('your sign-in', error))
  }


  openLiveElectionResultsDialog(): void {
    this.dialog.open(LiveElectionResultsDialog, {autoFocus: false, width: "100%", maxWidth: "100%", disableClose: true});
  }

}
