import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service'
import {Sort} from '@angular/material/sort';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {OrganizationService} from '../../../../services/organization/organization.service'

import {Organization, UpdatedOrg} from '../../../../models/organizations/organization.model'

import {User} from '../../../../models/users/user.model'

@Component({
    templateUrl: './orgUserList.html',
})

export class OrgUserListDialog implements OnInit{

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  orgMembers: User[] = []
  org: Organization;

  errorMessage: string = ''
  displayErrorMsg: boolean = false;
  
  sortedUsers: any;
  sortedUsersOriginal: any;

  dev: boolean = false;

  orgLevel: String = '';
  orgName: String = '';

  loading: boolean = true;
  
  currentPage: number = 0
  public pageSize: number = 10;
  public totalSize: number = 0;
  pageEvent: PageEvent;

  constructor(public dialogRef: MatDialogRef<OrgUserListDialog>, 
      @Inject(MAT_DIALOG_DATA) public data: any, 
      public userService: UserService, 
      public orgService: OrganizationService) {

        this.org = data
        this.orgName = this.org.name
     
        this.getOrg(this.org._id);
    
        this.dev =  JSON.parse(sessionStorage.getItem('user')).dev;
      }

  getUserList(org: Organization){
    var currentUserID = JSON.parse(sessionStorage.getItem('user'))._id;

    this.loading = true;
    this.dialogRef.updateSize('500px');
      this.orgService.getOrgUsers(org._id).subscribe(
        (users: User[]) =>
          {
            if(!this.dev){
              users = users.filter(user => {return user._id != currentUserID});
            }

            var totalList = users;
            this.orgMembers= totalList;
            this.sortedUsers = this.orgMembers.slice();
            this.totalSize = this.orgMembers.length;
            this.iterator();
            this.loading = false;
          },
        error =>{
          console.log(error)
          this.displayErrorMsg = true;
          this.errorMessage = 'Failed to get user list due to server error.'
        }
      )
  }

  updateUserOrgLevel(user:Object, org: Organization, status: string){
    this.loading =  true;
    this.userService.updateUserOrgLevel(user, org, status).subscribe(
      (results: UpdatedOrg)=>{
        if(results.success){
          this.org = results.org;
          this.getUserList(results.org)
        }
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'Failed to update user due to server error.'
      }
    )
  }

  getOrgLevel(){
    var orgID: string = sessionStorage.getItem('orgID')
    var user: User = JSON.parse(sessionStorage.getItem('user'));

    for (var i = 0; i < user.orgPermissions.length; i++){
      if(user.orgPermissions[i].orgID === orgID){
        this.orgLevel = user.orgPermissions[i].level
      }
    }
  }

  refreshUserProfile(){
    var user: User = JSON.parse(sessionStorage.getItem('user'));
      
    this.userService.getUser(user).subscribe(
      (newUserProfile: User)=>{
        this.dev = newUserProfile.dev 
        sessionStorage.setItem('user', JSON.stringify(newUserProfile))
        this.getOrgLevel()
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'Failed to get user profile due to server error.'
      }
    )
  }

  getOrg(orgID: string){
    this.orgService.getOrganization(orgID).subscribe(
      (updatedOrg: Organization)=>{
        if(updatedOrg){
          this.org = updatedOrg;
          this.getUserList(updatedOrg)
        }
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'Failed to get Org due to server error.'
      }
    )
  }

  onNoClick(): void {this.dialogRef.close()}

  return(){
    this.dialogRef.close()
  }

  ngOnInit(){}

  public handlePage(e: any) {
      this.currentPage = e.pageIndex;
      this.pageSize = e.pageSize;
      this.iterator();
      return e
  }

  private iterator() {
      const end = (this.currentPage + 1) * this.pageSize;
      const start = this.currentPage * this.pageSize;
      const part = this.orgMembers.slice(start, end);
      this.sortedUsers = part;
  }

  sortData(sort: Sort) {
      const data = this.orgMembers.slice();
      if (!sort.active || sort.direction === '') {
        this.sortedUsers= data;
        return;
      }
      this.sortedUsers = data.sort((a, b) => {
        const isAsc = sort.direction === 'asc';
        switch (sort.active) {
          case 'firstName': return compare(a.name.firstName, b.name.firstName, isAsc);
          case 'lastName': return compare(a.name.lastName, b.name.lastName, isAsc);
          default: return 0;
        }
      });
      this.sortedUsers.paginator = this.paginator;
  }

  setFilter(value: string) {
    if (!value) {
      this.sortedUsersOriginal = this.sortedUsers;
    }
  }

  applyFilter(value: string) {
    this.sortedUsers = this.orgMembers.filter(singleItem => singleItem.name.firstName.toLowerCase().includes(value.toLowerCase()));
  }
}

function compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

