import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {OrganizationService} from '../../../../services/organization/organization.service'
import {Organization, UpdatedOrg} from '../../../../models/organizations/organization.model'
import {User, UpdatedUser} from '../../../../models/users/user.model'

@Component({
  templateUrl: './orgBilling.html',
})

export class OrgBillingDialog implements OnInit{
  displayMessage: boolean = false;
  userMessage: string = "";

  displayErrorMsg: boolean = false
  errorMessage: string = '';
  funded: boolean = false;
  subscribed: boolean = false;
  dev: boolean = false;

  constructor(public dialogRef: MatDialogRef<OrgBillingDialog>,
              @Inject(MAT_DIALOG_DATA) public data: Organization, 
              public orgService: OrganizationService) {
                this.funded = this.data.funded
                this.subscribed = this.data.subscribed
              }
              
  closeDialog(): void{this.dialogRef.close()}

  toggleFundedStatus(toggle: boolean){
    var orgID: string = this.data._id
    this.orgService.updateFundedStatus(orgID, toggle).subscribe(
      (result: UpdatedOrg) =>{
        if(result.success){
          this.funded = toggle
        }
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was a problem with the server."
        this.displayErrorMsg = true;
      }
    )
  }

  toggleSubscribedStatus(toggle: boolean){
    var orgID: string = this.data._id

    this.orgService.updateSubscribedStatus(orgID, toggle).subscribe(
      (result: UpdatedOrg) =>{
        if(result.success){
          this.subscribed = toggle
        }
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was a problem with the server."
        this.displayErrorMsg = true;
      }
    )



  }

  ngOnInit(){
    var user: User = JSON.parse(sessionStorage.getItem('user'));
    this.dev = user.dev

  }
} 
