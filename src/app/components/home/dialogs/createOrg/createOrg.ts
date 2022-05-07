import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {OrganizationService} from '../../../../services/organization/organization.service'

import {UpdatedOrg} from '../../../../models/organizations/organization.model'


@Component({
    templateUrl: './createOrg.html',
    styleUrls: ['../../home.component.scss']
})
  
export class CreateOrgDialog implements OnInit{

    displayMessage: boolean = false;
    userMessage: string = "";

    displayErrorMsg: boolean = false;
    errorMessage: string = "";

    @ViewChild('orgName', {static: true}) orgName: ElementRef
    @ViewChild('orgDescription', {static: true}) orgDescription: ElementRef
    @ViewChild('cost', {static: true}) cost: ElementRef
    @ViewChild('date', {static: true}) date: ElementRef

    constructor( public dialogRef: MatDialogRef<CreateOrgDialog>, 
                 public orgService: OrganizationService) {}
  
    onNoClick(): void {this.dialogRef.close()}

    createOrganization(){
      this.displayMessage = false;

      var orgName: string = this.orgName.nativeElement.value;
      if(orgName === ''){
        this.displayMessage = true;
        this.userMessage = 'Organization needs a name.';
        return
      }

      var expDate: Date = this.date.nativeElement.value
      var cost: number = this.cost.nativeElement.value

      var orgDescription: string = this.orgDescription.nativeElement.value;

      this.orgService.createOrganization(orgName, orgDescription, cost, expDate).subscribe(
        (results: UpdatedOrg) => {
          if(results.success) {
            this.dialogRef.close(results);
          }else{
            this.displayMessage = true;
            this.userMessage = results.msg;
          }
        },
        error=>{
          console.log(error);
          this.errorMessage = 'A problem with the server prevented Org Creation';
          this.displayErrorMsg = true;
        }
      )
    }
    
    closeDialog(){this.dialogRef.close()}

    ngOnInit(){}
} 
