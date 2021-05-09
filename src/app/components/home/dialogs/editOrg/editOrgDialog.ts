import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service'
import {CampaignService} from '../../../../services/campaign/campaign.service'
import {OrganizationService} from '../../../../services/organization/organization.service'

import {UpdatedOrg} from '../../../../models/organizations/organization.model'

@Component({
    templateUrl: './editOrgDialog.html',
})
  
export class EditOrgDialog implements OnInit{

  @ViewChild('editOrgName', {static: true}) editOrgName: ElementRef
  @ViewChild('editOrgDescription', {static: true}) editOrgDescription: ElementRef

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

  editOrganization(command: String){
    var orgName: string = this.editOrgName.nativeElement.value
    if(orgName === ""){
      this.displayMessage = true;
      this.userMessage = "Organization needs a name."
      return
    }

    var orgDescription: string = this.editOrgDescription.nativeElement.value
    var orgID: string = this.data._id

    this.orgService.editOrganization(orgName, orgDescription, orgID, command).subscribe(
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
    this.editOrgName.nativeElement.value = this.data.name
    this.editOrgDescription.nativeElement.value = this.data.description
  }
  
  return(){this.dialogRef.close()}
  
  ngOnInit(){
    this.prefillOrgData();

  }
} 
