import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service'
import {Router} from "@angular/router";

import {UpdatedUser} from '../../../../models/users/user.model'

@Component({
    templateUrl: './userAgreement.html',
    styleUrls: ['../../home.component.scss']
})

export class UserAgreementDialog implements OnInit{

  constructor(public dialogRef: MatDialogRef<UserAgreementDialog>, 
      @Inject(MAT_DIALOG_DATA) public data: any, 
      public userService: UserService, 
      public router: Router) {}

  version: string = this.data.version
  errorMessage: string = ''
  displayErrorMsg: boolean = false;
  checked = false;

  submitAgreement(){
    this.userService.submitAgreement(this.data).subscribe(
      (results: UpdatedUser) =>{
        if(results.success){
          this.dialogRef.close(results)
        }
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'Failed to submit user agreement due to server error.'
      }
    )
  }

  cancel(){
    this.dialogRef.close({success: false})
  }

  ngOnInit(){}


}

