import { Component, OnInit, ViewChild, ElementRef, Inject, ComponentFactoryResolver} from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
//import {UserService} from '../../services/user/user.service'
//import {CampaignService} from '../../services/campaign/campaign.service'


@Component({
    templateUrl: './userProfile.html',
  })
  
export class UserProfileDialog implements OnInit{

  isDev= false;
  userProfile: Object;
  @ViewChild('firstName', {static: true}) firstName: ElementRef
  @ViewChild('lastName', {static: true}) lastName: ElementRef
  @ViewChild('email', {static: true}) email: ElementRef
  @ViewChild('phone', {static: true}) phone: ElementRef
  @ViewChild('city', {static: true}) city: ElementRef
  
  constructor(public dialogRef: MatDialogRef<UserProfileDialog>, 
              @Inject(MAT_DIALOG_DATA) public data: any, 
             // public userService: UserService, 
              //public campaignService: CampaignService
              ) {
        
              }
  
  onNoClick(): void {this.dialogRef.close("CLOSED")}

  closeSettings(){
    this.dialogRef.close("CLOSED")
  }

  getUserProfile(){

    this.userProfile = JSON.parse(sessionStorage.getItem('userProfile'))
    console.log(this.userProfile)

    this.firstName.nativeElement.value = this.userProfile['firstName']
    this.lastName.nativeElement.value = this.userProfile['lastName']
    this.email.nativeElement.value = this.userProfile['emails']
    this.phone.nativeElement.value = this.userProfile['phones']
  
  }

  saveEdits(){
    var newUserDetails = {firstName: this.firstName.nativeElement.value, 
                          lastName: this.lastName.nativeElement.value,
                          emails: this.email.nativeElement.value,
                          phones: this.phone.nativeElement.value
                        }

    var userID = this.userProfile['user']._id

    //this.userService.editUser(userID, newUserDetails).subscribe(result => {
    //  console.log(result)
    //})
  }

  ngOnInit(){
    this.getUserProfile();
  }

} 
