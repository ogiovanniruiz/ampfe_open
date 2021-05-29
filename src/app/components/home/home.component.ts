import { Component, OnInit } from '@angular/core';

import { MediaChange, MediaObserver } from '@angular/flex-layout';
import {MatDialog} from '@angular/material/dialog';
import {Router} from "@angular/router";

import {OrganizationService} from '../../services/organization/organization.service'
import {UserService} from '../../services/user/user.service'
import {AmplifyService} from '../../services/amplify/amplify.service'

import {CreateOrgDialog} from './dialogs/createOrg/createOrg'
import {OrgUserListDialog} from './dialogs/userList/orgUserList'
import {RequestOrgDialog} from './dialogs/requestOrg/requestOrg'
import {UserAgreementDialog} from './dialogs/userAgreement/userAgreement'
import {EditOrgDialog} from './dialogs/editOrg/editOrgDialog'
import { DevStatusDialog } from './dialogs/devStatus/devStatus';


import {User, UpdatedUser} from '../../models/users/user.model'
import {Organization, UpdatedOrg} from '../../models/organizations/organization.model'

import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  logo_dir: string = environment.LOGO_DIR;

  leadOrgs: Organization[] = [];
  volOrgs: Organization[] = [];
  adminOrgs: Organization[] = [];

  leadOrgsResults: Organization[] = [];
  volOrgsResults: Organization[] = [];
  adminOrgsResults: Organization[] = [];

  gridColumns: Number;
  dev: boolean = false;
  dataLoaded:boolean = false;
  userAgreementVersion: string = "1.0";

  errorMessage: string = "";
  displayErrorMsg: boolean = false;
  
  gridByBreakpoint = {
    xl: 4,
    lg: 4,
    md: 3,
    sm: 2,
    xs: 1
  }

  constructor(public orgService: OrganizationService, 
              private observableMedia: MediaObserver, 
              public dialog: MatDialog, 
              public userService: UserService,
              public router: Router,
              public ampService: AmplifyService
              ) {}

  checkUserAgreement(){
    var user: User = JSON.parse(sessionStorage.getItem('user'));

    if(user.userAgreements.length === 0) this.openUserAgreement(user)
    else {
      for(var i = 0; i < user.userAgreements.length; i++){
        if(user.userAgreements[i].version === this.userAgreementVersion){
          this.getOrgPermissions()
          return
        }
      }
      this.openUserAgreement(user)
    }
  }

  openUserAgreement(user: User){
    const dialogRef = this.dialog.open(UserAgreementDialog, {height: "90%", autoFocus: false, disableClose: true, data: {user, version: this.userAgreementVersion}});
    
    dialogRef.afterClosed().subscribe(
      (results: UpdatedUser) => {
        if(results.success){
          sessionStorage.setItem('user', JSON.stringify(results.user))
          this.getOrgPermissions()
        }else{
          sessionStorage.removeItem('user')
          this.router.navigate(['/']);
        }
      }
    );
  }

  getOrgPermissions(){
    var user: User = JSON.parse(sessionStorage.getItem('user'));
    
    this.dev = user.dev;
    this.orgService.getOrgPermissions(user).subscribe(
      (orgs: Organization[]) => {

        if(this.dev) {this.adminOrgs = orgs; this.adminOrgsResults = orgs}
        else{

          var adminOrgIDs: string[] = user.orgPermissions.map(function(orgPermission){ 
            if(orgPermission.level === "ADMINISTRATOR"){
              return orgPermission.orgID
            }
          })

          var leadOrgIDs: string[] = user.orgPermissions.map(function(orgPermission){ 
            if(orgPermission.level === "LEAD"){
              return orgPermission.orgID
            }
          })

          var volOrgIDs: string[] = user.orgPermissions.map(function(orgPermission){ 
            if(orgPermission.level === "VOLUNTEER"){
              return orgPermission.orgID
            }
          })

          this.leadOrgs = orgs.filter(org => {return leadOrgIDs.includes(org._id)})
          this.leadOrgsResults = orgs.filter(org => {return leadOrgIDs.includes(org._id)})
          this.adminOrgs = orgs.filter(org => {return adminOrgIDs.includes(org._id)})
          this.adminOrgsResults = orgs.filter(org => {return adminOrgIDs.includes(org._id)})
          this.volOrgs = orgs.filter(org => {return volOrgIDs.includes(org._id)})
          this.volOrgsResults = orgs.filter(org => {return volOrgIDs.includes(org._id)})
        }

        this.dataLoaded = true;
      },
      error =>{
        this.displayErrorMsg = true;
        this.errorMessage = "There was a problem fetching Organization Permissions."
        console.log(error)
      }
    )
  }

  enterOrganization(org: Organization){
    sessionStorage.setItem('orgID', org._id)
    this.router.navigate(['/organization']);
  }

  openCreateOrgForm(){
    const dialogRef = this.dialog.open(CreateOrgDialog, {width: '50%'});
    dialogRef.afterClosed().subscribe((results: UpdatedOrg) => {
      if(results) {
        this.getOrgPermissions()
      }
    });
  }

  openRequestOrgForm(){
    this.dialog.open(RequestOrgDialog);
  }

  openUserList(org: Organization){
    const dialogRef =this.dialog.open(OrgUserListDialog, {data: org, width: '50%'});
    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.getOrgPermissions()
      }
    });
  }

  editOrganization(org: Organization){
    const dialogRef = this.dialog.open(EditOrgDialog, {data: org,  width: '50%'});
    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.getOrgPermissions()
      }
    });
  }

  refreshUserProfile(){
    var oldUserProfile: User = JSON.parse(sessionStorage.getItem('user'));
    
    this.userService.getUser(oldUserProfile).subscribe(
      (user: User) => {
        sessionStorage.setItem('user', JSON.stringify(user))
        this.dev =  user.dev
        this.checkUserAgreement();
      }, 
      error =>{
        this.displayErrorMsg = true;
        this.errorMessage = "There was a problem fetching the user profile."
        console.log(error)
      }
    )
  }

  updateDevStatus(){
    const dialogRef = this.dialog.open(DevStatusDialog);
    dialogRef.afterClosed().subscribe(
      result => {
        if(result){
          this.refreshUserProfile()
        }
      }
    )
  }

  applyFilter(value: string) {
    if (value) {
      this.leadOrgs = this.leadOrgsResults;
      this.leadOrgs = this.leadOrgsResults.filter(org => org.name.toLowerCase().startsWith(value.toLowerCase()));

      this.volOrgs = this.volOrgsResults;
      this.volOrgs = this.volOrgsResults.filter(org => org.name.toLowerCase().startsWith(value.toLowerCase()));

      this.adminOrgs = this.adminOrgsResults;
      this.adminOrgs = this.adminOrgsResults.filter(org => org.name.toLowerCase().startsWith(value.toLowerCase()));
    } else {
      this.leadOrgs = this.leadOrgsResults;
      this.volOrgs = this.volOrgsResults;
      this.adminOrgs = this.adminOrgsResults;
    }
  }

  massGeocode(){
    this.ampService.massGeocode().subscribe(result =>{
      console.log(result)
    })
  }

  appendGeoids(){
    this.ampService.appendGeoids().subscribe(result =>{
      console.log(result)
    })
  }

  ngOnInit() {
    this.refreshUserProfile();

    if(sessionStorage.getItem('rdr')){
      console.log("You are being redirected.")
      this.processLink(sessionStorage.getItem('rdr'))
    }
  }

  processLink(dir: string){

    var user: User = JSON.parse(sessionStorage.getItem('user'));

    this.userService.processLink(dir).subscribe(
      result => {
        sessionStorage.setItem('campaignID', result['campaignID']);
        sessionStorage.setItem('orgID', result['orgID']);

        if(result['activityID']){
          sessionStorage.setItem('activityID', result['activityID'])
        }
        var route: string = result['route'];
        var exp: number = result['exp'];
        var orgID: string = result['orgID']

        if (exp > Math.floor(Date.now() / 1000)) {
          this.userService.createRdrUser(user, orgID).subscribe(result=>{console.log(result)})
          this.router.navigate([route]);
        }
      }
    )
  }

  ngAfterContentInit() {
    this.observableMedia.media$.subscribe((change: MediaChange) => {
      this.gridColumns = this.gridByBreakpoint[change.mqAlias];
    });
  }

}