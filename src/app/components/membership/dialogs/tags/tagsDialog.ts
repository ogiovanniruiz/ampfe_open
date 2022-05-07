import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormControl} from '@angular/forms';

import {UserService} from '../../../../services/user/user.service'
import {OrganizationService} from '../../../../services/organization/organization.service'

import {PersonService} from '../../../../services/person/person.service'

import {UpdatedOrg} from '../../../../models/organizations/organization.model'

@Component({
  templateUrl: './tagsDialog.html',
  styleUrls: ['../../membership.component.scss']
})

export class TagManagementDialog implements OnInit{

  selectedTags = new FormControl();
  tags: string[] = [];

  displayErrorMsg: boolean = false;
  errorMessage: string = '';
  uploading = false;

  userMessage: string = '';
  displayMessage: boolean = false;

  @ViewChild('newTag', {static: true}) newTag: ElementRef;

  constructor(public dialogRef: MatDialogRef<TagManagementDialog>,
                @Inject(MAT_DIALOG_DATA) public data: any,
                public userService: UserService,
                public personService: PersonService,
                public orgService: OrganizationService) {}

  onNoClick(): void {this.dialogRef.close('CLOSED')}

  getOrgTags(){
    var orgID: string = sessionStorage.getItem('orgID')
    this.orgService.getOrgTags(orgID).subscribe(
      (tags: string[]) =>{
        this.tags = tags;
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    );
  }

  createNewTag(){
    var tag: string = this.newTag.nativeElement.value.trim();

    if(tag === ''){
      this.displayMessage = true;
      this.userMessage = 'Tag Text is required.';
      return
    }

    var orgID: string = sessionStorage.getItem('orgID');

    this.orgService.createTag(orgID, tag).subscribe(
      (results: UpdatedOrg) =>{
        if(results.success){
          this.newTag.nativeElement.value = '';
          this.getOrgTags();
        }else{
          this.displayMessage = true;
          this.userMessage = results.msg;
        }
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  deleteTag(tag: string){
    var orgID: string = sessionStorage.getItem('orgID');

    if(confirm('Are you sure you want to remove this tag from all of your data? NOT RECOVERABLE')){
      this.orgService.deleteTag(orgID, tag).subscribe(
        (results: UpdatedOrg) =>{
          if(results.success){
            this.getOrgTags();
          }else{
            this.displayMessage = true;
            this.userMessage = results.msg;
          }
        },
        error=>{
          console.log(error)
          this.displayErrorMsg = true;
          this.errorMessage = 'There was a problem with the server.';
        }
      );
    }
  }

  cancel(){this.dialogRef.close()}

  ngOnInit(){
    this.getOrgTags();
  }
}
