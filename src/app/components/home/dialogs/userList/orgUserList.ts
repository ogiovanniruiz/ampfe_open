import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service'
import {OrganizationService} from '../../../../services/organization/organization.service'
import {Organization, UpdatedOrg} from '../../../../models/organizations/organization.model'
import {User} from '../../../../models/users/user.model'

@Component({
    templateUrl: './orgUserList.html',
})

export class OrgUserListDialog implements OnInit{

  org: Organization;

  errorMessage: string = ''
  displayErrorMsg: boolean = false;
  
  dev: boolean = false;
  currentUser: User;

  orgName: string = '';
  orgID: string = ''

  loading: boolean = true;
  approvedUsers: User[] = []
  approvedUsersOriginal: User[] = []
  requests: User[] = []  

  constructor(public dialogRef: MatDialogRef<OrgUserListDialog>, 
      @Inject(MAT_DIALOG_DATA) public data: any, 
      public userService: UserService, 
      public orgService: OrganizationService) {


        this.orgName = data.name
        this.orgID = data._id
    
        this.dev =  JSON.parse(sessionStorage.getItem('user')).dev;
        this.currentUser =  JSON.parse(sessionStorage.getItem('user'))
      }

  getApprovedUsers(){
    //var currentUser = JSON.parse(sessionStorage.getItem('user'));

    this.loading = true;
    this.dialogRef.updateSize('500px');
      this.orgService.getOrgUsers(this.orgID).subscribe(
        (users: User[]) =>
          {
            if(!this.dev){
              users = users.filter(user => {return user._id != this.currentUser._id});
            }

            this.approvedUsersOriginal = users

            this.approvedUsers = users
            this.loading = false;
          },
        error =>{
          console.log(error)
          this.displayErrorMsg = true;
          this.errorMessage = 'Failed to get user list due to server error.'
        }
      )
  }

  getOrgUserRequests(){
    this.orgService.getOrgUserRequests(this.orgID).subscribe( 
      (users: User[])=>{
        this.requests = users
        this.loading = false;

    },error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'Failed to get user list due to server error.'
      }
    )

  }

  updateUserOrgLevel(userID: string, status: string){
    this.loading =  true;
    this.userService.updateUserOrgLevel(userID, this.orgID, status).subscribe(
      (results: UpdatedOrg)=>{
        if(results.success){
          this.org = results.org;
          this.getOrgUserRequests()
          this.getApprovedUsers()
        }
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'Failed to update user due to server error.'
      }
    )
  }

  getOrgLevel(user: User){
    for (var i = 0; i < user.orgPermissions.length; i++){
      if(user.orgPermissions[i].orgID === this.orgID){
        return user.orgPermissions[i].level
      }
    }
  }

  return(){
    this.dialogRef.close()
  }

  ngOnInit(){
    this.getOrgUserRequests()
    this.getApprovedUsers()

  }

  setFilter(value: string) {
    if (!value) {
      this.approvedUsers = this.approvedUsersOriginal
    }
  }

  applyFilter(value: string) {
    this.approvedUsers = this.approvedUsers.filter(singleItem => singleItem.name.firstName.toLowerCase().includes(value.toLowerCase()));
  }
}


