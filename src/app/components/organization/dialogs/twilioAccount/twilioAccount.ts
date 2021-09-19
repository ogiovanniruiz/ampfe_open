import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MatDialog} from '@angular/material/dialog';
import {OrganizationService} from '../../../../services/organization/organization.service'


import {TwilioAccount, UpdatedOrg, TwilioNumber} from '../../../../models/organizations/organization.model'
import {User} from '../../../../models/users/user.model'

@Component({
  templateUrl: './twilioAccount.html',
})
  
export class TwilioAccountDialog implements OnInit{

  displayErrorMsg: boolean = false;
  errorMessage: string = '';
  
  phoneNumbers: Object
  accountExists: boolean = false;
  needsAreaCode = false;

  userMessage: string = '';
  displayMessage: boolean = false;

  loading: boolean = true;

  user: User;

  @ViewChild("areaCode", {static: false}) areaCode: ElementRef;

  constructor(public dialogRef: MatDialogRef<TwilioAccountDialog>, 
              public orgService: OrganizationService, 
              public dialog: MatDialog) {
              }
  
  createTwilioAccount(){
    this.loading = true;
    var orgID: string = sessionStorage.getItem('orgID')
    this.orgService.createTwilioSubAccount(orgID).subscribe(
      (result: UpdatedOrg) =>{
        if(result.success) this.checkTwilioAccount()
        else{
          this.errorMessage = "There was an unknown error. Please contact developers."
          this.displayErrorMsg = true;
        }
      }, 
      error =>{
        console.log(error)
        this.errorMessage = "There was an unknown error with the server."
        this.displayErrorMsg = true;
      }
    )
  }

  checkTwilioAccount(){
    var orgID: string = sessionStorage.getItem('orgID')
    this.orgService.checkTwilioAccount(orgID).subscribe(
      (result: TwilioAccount) =>{
        this.accountExists = result.status
        if(this.accountExists) this.getOrgPhoneNumbers()
        else this.loading = false;
      }, 
      error =>{
        console.log(error)
        this.errorMessage = "There was an unknown error with the server."
        this.displayErrorMsg = true;
      }
    )
  }

  buyPhoneNumber(){
    var areaCode: any = this.areaCode.nativeElement.value
    
    if(areaCode === ""){
      this.displayMessage = true;
      this.userMessage = "An area code is needed."
      return
    }

    if(isNaN(areaCode)){
      this.displayMessage = true;
      this.userMessage = "Area code should be a number."
      return
    }
    this.loading = true;

    var orgID: string = sessionStorage.getItem('orgID')
    
    this.orgService.buyPhoneNumber(orgID, areaCode).subscribe(
      (result: UpdatedOrg) =>{
        if(result.success){
          this.displayMessage = false;
          this.getOrgPhoneNumbers()
        }else{
          this.userMessage = result.msg
          this.displayMessage = true;
          this.loading = false;
        }
      },
      error => {
        console.log(error)
        this.errorMessage = "There was an unknown error with the server."
        this.displayErrorMsg = true;
      }
    )
  }
  
  getOrgPhoneNumbers(){
    var orgID: string = sessionStorage.getItem('orgID')

    this.orgService.getOrgPhoneNumbers(orgID, null).subscribe(
      (phonenumbers: TwilioNumber[])  =>{
        this.phoneNumbers = phonenumbers;
        this.loading = false;
      }, 
      error =>{
        console.log(error)
        this.errorMessage = "There was an unknown error with the server."
        this.displayErrorMsg = true;
      }
    )
  }

  releasePhoneNumber(number: TwilioNumber){
    this.loading = true

    var orgID: string = sessionStorage.getItem('orgID')
    this.orgService.releasePhoneNumber(number, orgID).subscribe(
      (result: UpdatedOrg) =>{
        if(result.success){
          this.getOrgPhoneNumbers();
        }
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was an unknown error with the server."
        this.displayErrorMsg = true;
      }
    )
  }

  updateTwilioAccount(){
    var orgID: string = sessionStorage.getItem('orgID')

    this.orgService.updateTwilioAccount(orgID).subscribe(
      result =>{
        this.getOrgPhoneNumbers();
      }
    )

  }


  ngOnInit(){
    this.checkTwilioAccount()
    this.user = JSON.parse(sessionStorage.getItem('user'));

  }
} 
