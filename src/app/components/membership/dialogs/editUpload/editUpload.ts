import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UntypedFormControl} from '@angular/forms';

import {UserService} from '../../../../services/user.service';
import {OrganizationService} from '../../../../services/organization/organization.service';

import {MembershipService} from '../../../../services/membership.service';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
  templateUrl: './editUpload.html',
  styleUrls: ['../../membership.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class EditUploadDialog implements OnInit{

    selectedTags = new UntypedFormControl();
    selectedHeader1 = new UntypedFormControl();
    selectedHeader2 = new UntypedFormControl();
    selectedHeader3 = new UntypedFormControl();
    selectedHeader4 = new UntypedFormControl();
    selectedHeader5 = new UntypedFormControl();
    selectedHeader6 = new UntypedFormControl();
    selectedHeader7 = new UntypedFormControl();
    selectedHeader8 = new UntypedFormControl();
    selectedHeader9 = new UntypedFormControl();
    selectedHeader10 = new UntypedFormControl();
    selectedHeader11 = new UntypedFormControl();

    tags: string[] = [];

    file: any;

    displayErrorMsg: boolean = false;
    errorMessage: string = '';

    userMessage: string = '';
    displayMessage: boolean = false;

    uploadText: string | ArrayBuffer = '';

    uploading: boolean = false;
    ourHeaders: string[] = ['full name', 'first name', 'middle name', 'last name', 'phone', 'email', 'address', 'city', 'state', 'zip', 'ethnicity', 'tag'];
    theirHeaders: string[] = [];

    headerMapping: any = {};

    dropdownChangedList: any = {};

    uploads = []

    overwriteStatus: string = "false";

    @ViewChild('uploadName', {static: true}) uploadName: ElementRef;


    constructor(public dialogRef: MatDialogRef<EditUploadDialog>,
                @Inject(MAT_DIALOG_DATA) public data: any,
                public userService: UserService,
                public memberService: MembershipService,
                public orgService: OrganizationService,
                private dialog: MatDialog,
                private snackBar: MatSnackBar) {}

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

    updateOverwriteStatus(status: boolean){
      this.overwriteStatus = status.toString()
    }

    fileChanged(event: any) {
        this.file = event.target.files[0];
        this.displayMessage = false;

        let reader = new FileReader();
        
        reader.onloadend = () => {
              this.constructHeaderObject(reader.result);
        }
        reader.readAsText(this.file);

    }

    constructHeaderObject(text: string | ArrayBuffer){
      if(typeof(text) === 'string'){
          var lines = text.split('\n')
          this.theirHeaders = lines[0].split(',');
      }
    }

    checkUpload(){
      if (this.file === undefined){
        this.displayMessage = true;
        this.userMessage = 'No File Selected.';
        return;
      }

      if(this.uploadName.nativeElement.value === "" || !this.uploadName.nativeElement.value){
        this.displayMessage = true;
        this.userMessage = 'Upload Name is needed.';
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
        this.userMessage = 'Member address needs a city and zip';
        return;
      }

      this.uploading = true;

      var formData = new FormData();

      var orgID = sessionStorage.getItem('orgID');
      var userID: string = JSON.parse(sessionStorage.getItem('user'))['_id'];
      formData.append('file', this.file);
      formData.append('orgID', orgID);
      formData.append('userID', userID);
      formData.append('uploadName', this.uploadName.nativeElement.value)
      formData.append('voterOverwrite', this.overwriteStatus)
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
          //this.getUploads()
          this.snackBar.open('Upload complete.', 'Dismiss', {duration: 3000})
          this.dialogRef.close("Uploaded")
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
      this.uploadName.nativeElement.value = this.data.uploadName
    }

    editUpload(){

      if(this.uploadName.nativeElement.value === "" || !this.uploadName.nativeElement.value){
          this.displayMessage = true;
          this.userMessage = 'Upload Name is needed.';
          return;
      }

      var uploadID = this.data._id
      var newUploadName = this.uploadName.nativeElement.value
      this.memberService.editUpload(uploadID, newUploadName).subscribe(
        (result: any)=>{
            this.snackBar.open('Upload renamed.', 'Dismiss', {duration: 2500})
            this.dialogRef.close("Edited")
        }
      )

    }

    async deleteUpload(){
        if((await confirmAction(this.dialog, {title: 'Delete this upload?', message: "Its data will be permanently deleted. This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))){
          this.memberService.deleteUpload(this.data._id).subscribe(
            result =>{ 
                this.snackBar.open('Upload deleted.', 'Dismiss', {duration: 3000})
                this.dialogRef.close("Deleted")
            }
          )
        }
      }
  
}