import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormControl} from '@angular/forms';

import {UserService} from '../../../../services/user/user.service';
import {OrganizationService} from '../../../../services/organization/organization.service';

import {MembershipService} from '../../../../services/membership/membership.service';

@Component({
  templateUrl: './uploadDialog.html',
})

export class UploadDialog implements OnInit{

    selectedTags = new FormControl();
    selectedHeader1 = new FormControl();
    selectedHeader2 = new FormControl();
    selectedHeader3 = new FormControl();
    selectedHeader4 = new FormControl();
    selectedHeader5 = new FormControl();
    selectedHeader6 = new FormControl();
    selectedHeader7 = new FormControl();
    selectedHeader8 = new FormControl();
    selectedHeader9 = new FormControl();
    selectedHeader10 = new FormControl();
    selectedHeader11 = new FormControl();

    tags: string[] = [];

    file: any;

    displayErrorMsg: boolean = false;
    errorMessage: string = '';

    userMessage: string = '';
    displayMessage: boolean = false;

    uploadText: string | ArrayBuffer = '';

    uploading: boolean = false;
    ourHeaders: string[] = ['full name', 'first name', 'middle name', 'last name', 'phone', 'email', 'address', 'city', 'state', 'zip', 'dob', 'affidavit', 'ethnicity', 'tag'];
    theirHeaders: string[] = [];

    headerMapping: any = {};

    dropdownChangedList: any = {};

    constructor(public dialogRef: MatDialogRef<UploadDialog>,
                @Inject(MAT_DIALOG_DATA) public data: any,
                public userService: UserService,
                public memberService: MembershipService,
                public orgService: OrganizationService) {}

    getOrgTags(){
      var orgID: string = sessionStorage.getItem('orgID');
      this.orgService.getOrgTags(orgID).subscribe(
        (tags: string[]) =>{
          this.tags = tags;
        },error =>{
          console.log(error)
          this.displayErrorMsg = true;
          this.errorMessage = 'There was a problem with the server.';
        }
      );
    }

    fileChanged(event: any) {
        this.file = event.target.files[0];
        this.displayMessage = false;

        let input = event.target;
        for (var index = 0; index < input.files.length; index++) {
            let reader = new FileReader();
            reader.onload = () => {
              this.constructHeaderObject(reader.result);
            }
            reader.readAsText(input.files[index]);
        }
    }

    constructHeaderObject(text: string | ArrayBuffer){
      if(typeof(text) === 'string'){
          var lines = text.replace(/[\n|,](?=[^"]*"(?:[^"]*"[^"]*")*[^"]*$)/g, '').replace(/"/g, '').split('\n');
          this.theirHeaders = lines[0].split(',');
      }
    }

    checkUpload(){
      if (this.file === undefined){
        this.displayMessage = true;
        this.userMessage = 'No File Selected.';
        return;
      }

      var mapping1Found = false;
      var mapping2Found = false;
      var mappingAddress = false;
      var mappingCity = false;
      var mappingZip = false;

      for (var key in this.headerMapping) {
        if (this.headerMapping[key] === 'full name' || this.headerMapping[key] === 'first name') {
           mapping1Found = true;
        }
        if (this.headerMapping[key] === 'phone' || this.headerMapping[key] === 'email' || this.headerMapping[key] === 'address') {
           mapping2Found = true;
        }
        if (this.headerMapping[key] === 'address') {
           mappingAddress = true;
        }
        if (this.headerMapping[key] === 'city') {
           mappingCity = true;
        }
        if (this.headerMapping[key] === 'zip') {
           mappingZip = true;
        }
      }

      if (!mapping1Found) {
        this.displayMessage = true;
        this.userMessage = 'Members need a full name or first name';
        return;
      }
      if (!mapping2Found) {
        this.displayMessage = true;
        this.userMessage = 'Members need either a phone, email or an address';
        return;
      }
      if (mappingAddress && (!mappingCity || !mappingZip)) {
        this.displayMessage = true;
        this.userMessage = 'Members address needs a city and zip';
        return;
      }

      this.uploading = true;

      var formData = new FormData();

      var orgID = sessionStorage.getItem('orgID');
      var userID: string = JSON.parse(sessionStorage.getItem('user'))['_id'];
      formData.append('file', this.file);
      formData.append('orgID', orgID);
      formData.append('userID', userID);
      for ( var key in this.headerMapping ) {
        formData.append(key.trim(), this.headerMapping[key]);
      }

      if(this.selectedTags.value){
        formData.append('selectedTags', this.selectedTags.value.toString());
      }

      if(this.tags){
        formData.append('orgTags', this.tags.toString());
      }

      this.uploadData(formData);
      this.displayMessage = false;
    }

    uploadData(formData: FormData){

      this.memberService.uploadMembership(formData).subscribe(
        result =>{
          this.uploading = false;
          this.dialogRef.close(result);
        },
        error =>{
          console.log(error)
          this.displayErrorMsg = false;
          this.errorMessage = 'There was a problem with the server.';
        }
      );
    }

    allocateHeader(ourHeader: string, theirHeader: string){
      this.headerMapping[theirHeader] = ourHeader;

      if(ourHeader === 'full name'){
          for (var key in this.headerMapping) {
              if (this.headerMapping[key] === 'first name' || this.headerMapping[key] === 'middle name' || this.headerMapping[key] === 'last name'){
                  this.dropdownChangedList[this.headerMapping[key]].source.value = '';
                  this.dropdownChangedList[this.headerMapping[key]].source._value = '';
                  delete this.headerMapping[key];
              }
          }
      }

      if(ourHeader === 'first name' || ourHeader === 'middle name' || ourHeader === 'last name'){
          for (var key in this.headerMapping) {
              if (this.headerMapping[key] === 'full name'){
                  this.dropdownChangedList[this.headerMapping[key]].source.value = '';
                  this.dropdownChangedList[this.headerMapping[key]].source._value = '';
                  delete this.headerMapping[key];
              }
          }
      }

    }

    dropdownChanged(event){
        this.dropdownChangedList[event.value] = event;
    }


    cancel(){this.dialogRef.close()}

    ngOnInit(){
      this.getOrgTags();
    }
}
