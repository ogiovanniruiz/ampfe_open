import { Component, OnInit, ViewChild,AfterContentInit} from '@angular/core';

import { MediaChange, MediaObserver } from '@angular/flex-layout';
import {MatDialog} from '@angular/material/dialog';
import {Router} from "@angular/router";

import { MatGridList } from '@angular/material/grid-list';

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

  activeOrgs: Organization[];
  inactiveOrgs: Organization[];

  activeOrgResults: Organization[];

  dev: boolean = false;
  dataLoaded:boolean = false;
  userAgreementVersion: string = "1.0";

  user: User;

  errorMessage: string = "";
  displayErrorMsg: boolean = false;

  @ViewChild('orgGrid', {static: true}) orgGrid: MatGridList;
  @ViewChild('inactiveOrgGrid', {static: true }) inactiveOrgGrid: MatGridList;
  
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
    this.user = JSON.parse(sessionStorage.getItem('user'));
    
    this.dev = this.user.dev;
    this.orgService.getOrgPermissions(this.user).subscribe(
      (orgs: Organization[]) => {

        this.activeOrgs = orgs.filter(function(org) { return org['active'] });
        this.activeOrgResults = this.activeOrgs
        this.inactiveOrgs = orgs.filter(function(org) { return !org['active'] });

        if(this.user.homeOrgID && this.user.homeOrgID != ''){

          //sessionStorage.setItem('orgName', org.name)
          //sessionStorage.setItem('orgID', org._id)
          //this.router.navigate(['/organization']);

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

  checkOrgPermissions(permissions: any[], orgID: string){
    for(var i = 0; i < permissions.length; i++){
      if(permissions[i].orgID === orgID){
        return permissions[i].level === 'ADMINISTRATOR'
      }
    }
  }

  enterOrganization(org: Organization){
    this.userService.updateHomeOrg(org._id, this.user._id).subscribe(user =>{
      sessionStorage.setItem('user', JSON.stringify(user))
      sessionStorage.setItem('orgName', org.name)
      sessionStorage.setItem('orgID', org._id)
      this.router.navigate(['/organization']);
    })

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
      this.activeOrgs = this.activeOrgResults.filter(org => org.name.toLowerCase().startsWith(value.toLowerCase()));

    } else {
      this.activeOrgs = this.activeOrgResults;
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

    this.orgGrid.cols = 1;  
    this.inactiveOrgGrid.cols = 1;  

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

  openDistrictsMap(){
    this.router.navigate(['/districts']);
  }

  ngAfterContentInit() {
    this.observableMedia.media$.subscribe((change: MediaChange) => {
      this.orgGrid.cols = this.gridByBreakpoint[change.mqAlias]
      this.inactiveOrgGrid.cols = this.gridByBreakpoint[change.mqAlias]
    });
  }

}
