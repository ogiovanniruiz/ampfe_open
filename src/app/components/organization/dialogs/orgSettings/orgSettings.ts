import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';


import {OrganizationService} from '../../../../services/organization/organization.service'

import { DomSanitizer } from '@angular/platform-browser';

import {UpdatedOrg, Organization} from '../../../../models/organizations/organization.model'
import {User} from '../../../../models/users/user.model'

@Component({
  templateUrl: './orgSettings.html',
  styleUrls: ['../../organization.component.scss']
})
  
export class OrgSettingsDialog implements OnInit{

  org: Organization;

  displayErrorMsg:boolean = false;
  errorMessage: string = '';

  userMessage: string = '';
  displayMessage: boolean = false;

  downloading: boolean = false;

  file: any;
  image: any;
  leads: User[];

  constructor(public dialogRef: MatDialogRef<OrgSettingsDialog>, 
              @Inject(MAT_DIALOG_DATA) public data: Organization, 
              private sanitizer: DomSanitizer,
              public orgService: OrganizationService, 
              public dialog: MatDialog) {
                this.org = data
              }
  
  onNoClick(): void {this.dialogRef.close()}
  closeDialog(): void{this.dialogRef.close()}

  fileChanged(e: any) {
    this.file = e.target.files[0];
  }

  upload(){

    if (this.file === undefined){
      this.displayMessage = true; 
      this.userMessage = "No File Selected."
      return
    } 

    var orgID: string = sessionStorage.getItem('orgID')  
    var formData = new FormData();
      
    formData.append('file', this.file);
    formData.append('orgID', orgID)

    this.uploadData(formData);
    this.displayMessage = false;      
  }

  uploadData(formData: FormData){
    this.orgService.uploadLogo(formData).subscribe(
      (result: UpdatedOrg)=>{
        if(result.success){
          this.getOrgLogo()
        }else{
          this.displayMessage = true;
          this.userMessage = result.msg
        }
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was a problem with the server."
        this.displayErrorMsg = true;
      }
    )
  }

  getOrgLogo(){
    var orgID = sessionStorage.getItem('orgID')
    this.orgService.getOrgLogo(orgID).subscribe(
      (data: string)=>{
        if(data){
          var JSONdata = JSON.parse(data)

          let TYPED_ARRAY = new Uint8Array(JSONdata.image.data);
          let STRING_CHAR = String.fromCharCode.apply(null, TYPED_ARRAY);
          let base64String = btoa(STRING_CHAR);
          this.image = this.sanitizer.bypassSecurityTrustUrl('data:image/jpg;base64, ' + base64String);
        }
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was a problem with the server."
        this.displayErrorMsg = true;
      }
    )
  }

  getOrgLeads(){
    this.orgService.getOrgUsers(this.org._id).subscribe(
      (users: User[]) =>{
        this.leads = users.filter(x => {
          for( var i = 0; i< x.orgPermissions.length; i++){
            if((x.orgPermissions[i].orgID === this.org._id) && (x.orgPermissions[i].level === "LEAD")){
              return true
            }
          }
          return false
        })        
      },
      error =>{
          console.log(error)
          this.displayErrorMsg = true;
          this.errorMessage = 'Failed to get user list due to server error.'
      }
    )
  }

  downloadOrgContactHistory(){
    this.downloading = true;
    var orgID = sessionStorage.getItem('orgID')
    this.orgService.downloadOrgContactHistory(orgID).subscribe(
      (result: unknown[]) =>{
        console.log(result)
        let binaryData = ['UserName, campaignID, activityType, affidavit, date, responseType, responses\n'];

        for(var i = 0; i < result.length; i++){
          if(result[i]['user']){
            binaryData.push(result[i]['user']['name']['fullName'] + ',')
          }else{
            binaryData.push("unknown,")
          }
          
          binaryData.push(result[i]['campaignID'] + ',')
          binaryData.push(result[i]['activityType'] + ',')
          
          if(result[i]['affidavit']){
            binaryData.push(result[i]['affidavit']+ ',')
          }else if(result[i]['person']){
            binaryData.push(result[i]['person']['resident']['affidavit']+ ',')
          }else{
            binaryData.push("unknown,")
          }
          
          binaryData.push(result[i]['date']+ ',')
          if(result[i]['scriptResponse']){
            binaryData.push('scriptResponse' + ',')
            for(var j = 0; j < result[i]['scriptResponse']['questionResponses'].length; j++){
              binaryData.push(result[i]['scriptResponse']['questionResponses'][j]['question']+ ":" +result[i]['scriptResponse']['questionResponses'][j]['responses'] + ',')

            }
            binaryData.push('\n')
          }
          
          if(result[i]['nonResponse']){
            binaryData.push('nonResponse' + ',')
            binaryData.push(result[i]['nonResponse']['nonResponse'] + '\n')
          }
          
        }


        let downloadLink = document.createElement('a');
  
        let blob = new Blob(binaryData, {type: 'blob'});
        downloadLink.href = window.URL.createObjectURL(blob);
        downloadLink.setAttribute('download', 'OrgContactList.csv');
        document.body.appendChild(downloadLink);
        downloadLink.click();
        this.downloading = false;
      }
    )
  }

  ngOnInit(){
    this.getOrgLogo()
    this.getOrgLeads();
  }
} 
