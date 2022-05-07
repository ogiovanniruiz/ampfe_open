import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service'
import {CampaignService} from '../../../../services/campaign/campaign.service'
import {OrganizationService} from '../../../../services/organization/organization.service'

import {UpdatedOrg} from '../../../../models/organizations/organization.model'

@Component({
    templateUrl: './editOrgDialog.html',
    styleUrls: ['../../home.component.scss']
})
  
export class EditOrgDialog implements OnInit{

  @ViewChild('editOrgName', {static: true}) editOrgName: ElementRef
  @ViewChild('editOrgDescription', {static: true}) editOrgDescription: ElementRef
  @ViewChild('cost', {static: true}) cost: ElementRef
  @ViewChild('date', {static: true}) date: ElementRef

  userMessage: string = ""
  displayMessage: boolean = false;

  errorMessage: string = ""
  displayErrorMsg: boolean = false;

  constructor(public dialogRef: MatDialogRef<EditOrgDialog>, 
            @Inject(MAT_DIALOG_DATA) public data: any, 
            public userService: UserService, 
            public campaignService: CampaignService,
            public orgService: OrganizationService) {}

  onNoClick(): void {this.dialogRef.close("CLOSED")}

  editOrganization(command: string){
    var orgName: string = this.editOrgName.nativeElement.value
    if(orgName === ""){
      this.displayMessage = true;
      this.userMessage = "Organization needs a name."
      return
    }

    var orgDescription: string = this.editOrgDescription.nativeElement.value
    var orgID: string = this.data._id
    var expDate: Date = this.date.nativeElement.value
    var cost: number = this.cost.nativeElement.value

    var org = {name: orgName, 
               description: orgDescription,
              subscription: {expDate: expDate, cost: cost}
              }

    this.orgService.editOrganization(orgName, orgDescription, cost, expDate, orgID, command).subscribe(
      (result: UpdatedOrg)=>{
        if(result.success){
          this.dialogRef.close(result)
        }else{
          this.displayMessage = true;
          this.userMessage = result.msg
        }
    }, error=>{
      console.log(error)
      this.displayErrorMsg = true;
      this.errorMessage = "A problem with the server prevented Organization Update."
    })
  }

  prefillOrgData(){
    console.log(this.data)
    this.editOrgName.nativeElement.value = this.data.name
    this.editOrgDescription.nativeElement.value = this.data.description
    this.cost.nativeElement.value = this.data.subscription.cost
    this.date.nativeElement.value =this.data.subscription.expDate
  }
  
  return(){this.dialogRef.close()}
  
  ngOnInit(){
    this.prefillOrgData();

  }
} 
