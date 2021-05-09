import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service'
import {MatPaginator} from '@angular/material/paginator';
import {OrganizationService} from '../../../../services/organization/organization.service'
import {MatTableDataSource} from '@angular/material/table';

import {Organization, UpdatedOrg} from '../../../../models/organizations/organization.model'
import {User} from '../../../../models/users/user.model'

@Component({
    templateUrl: './requestOrg.html',
})
  
export class RequestOrgDialog implements OnInit{

    displayedColumns: string[] = ['name', 'actions'];
    dataSource;
    dataSourceOriginal;

    applyFilter(filterValue: string) {
      if (filterValue.length > 1){
  
          this.dataSource = this.dataSourceOriginal
          this.dataSource.filter = filterValue.trim().toLowerCase();
      } else {
          this.dataSource = null;
          //this.dataSource.filter = '';
      }
    }

    displayMessage: boolean = false;
    userMessage: String = '';

    errorMessage: string = ''
    displayErrorMsg: boolean = false;
    mode: string = "REQUEST"
    
    @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;

    constructor(public dialogRef: MatDialogRef<RequestOrgDialog>, 
              public userService: UserService, 
              public orgService: OrganizationService) {
              }
  
    onNoClick(): void {this.dialogRef.close()}

    getAllOrgs(){
      this.orgService.getAllOrgs().subscribe(
          (orgs: Organization[]) => {
            this.dataSourceOriginal = new MatTableDataSource(orgs);
          },
          error=>{
            this.displayErrorMsg = true;
            this.errorMessage = 'Failed to fetch Org List due to server error.'
            console.log(error)
          }
      )
    }
    
    sendOrgRequest(org: any){
      var user: User = JSON.parse(sessionStorage.getItem('user'));

      this.orgService.requestOrganization(user, org).subscribe(
        (result: UpdatedOrg) => {  
          if(result.success){
            this.mode = "SUCCESS"
            this.displayMessage = false;
          } else{
            this.displayMessage = true;
            this.userMessage = result.msg
          }
        },
        error=>{
          this.displayErrorMsg = true;
          this.errorMessage = 'Failed to send to send Org Request due to server error.'
          console.log(error)
        }
      )
    }

    closeDialog(){this.dialogRef.close()}

    ngOnInit(){
      this.getAllOrgs()
    }
} 
