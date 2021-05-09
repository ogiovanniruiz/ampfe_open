import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormControl} from '@angular/forms';
import { CampaignService } from 'src/app/services/campaign/campaign.service';
import { ScriptService} from '../../../services/script/script.service'

//import {UserService} from '../../../../services/user/user.service'
//import {OrganizationService} from '../../../../services/organization/organization.service'

//import {PersonService} from '../../../../services/person/person.service'

@Component({
  templateUrl: './uploadDialog.html',
})

export class UploadDialog implements OnInit{
    
    selectedTags = new FormControl()
    tags: string[] = []

    file: any;

    displayErrorMsg = false;
    errorMessage = ""

    userMessage: string = '';
    displayMessage: boolean = false;
    
    uploading: boolean = false;
    scripts: unknown[];
    nonResponseSets: unknown[];
    nonResponseSetsAvailable: boolean = false;

    constructor(public dialogRef: MatDialogRef<UploadDialog>, 
                @Inject(MAT_DIALOG_DATA) public data: any,
                //public userService: UserService,
                //public personService: PersonService,
                //public orgService: OrganizationService
                public scriptService: ScriptService,
                public campaignService: CampaignService
                ) {}

    onNoClick(): void {this.dialogRef.close("CLOSED")}

    fileChanged(e: any) {
        this.file = e.target.files[0];
      }
    
    checkUpload(){
      if (this.file === undefined){
        this.displayMessage = true; 
        this.userMessage = "No File Selected."
        return
      } 
      
      var formData = new FormData();
        
      var orgID = sessionStorage.getItem('orgID')
      formData.append('file', this.file);
      formData.append('orgID', orgID)
  
      if(this.selectedTags){
        formData.append('selectedTags', this.selectedTags.toString())
      }
  
      this.uploadData(formData);
      this.uploading = true;
      this.displayMessage = false;     
    }
    
    uploadData(formData: FormData){

      this.campaignService.uploadContactList(formData).subscribe(
        result =>{
          console.log(result)

        },
        error =>{
          console.log(error)
        }
      )

      /*
      this.personService.uploadContactList(formData).subscribe(
        result =>{
          console.log(result)
          //this.getMembers()
        },
        error =>{
          console.log(error)
          this.displayErrorMsg = true;
          this.errorMessage = "There was a problem with the server."

        }
      )*/
    }

    getScripts(){
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      var orgID: string = sessionStorage.getItem('orgID')

      this.scriptService.getAllScripts(orgID, campaignID).subscribe(
        (scripts: unknown[]) =>{
          this.scripts = scripts
        },
        error =>{
          console.log(error)
        }
      )
    }

    getAllNonResponseSets(){
      var orgID: string = sessionStorage.getItem('orgID')
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
      this.scriptService.getAllNonResponseSets(orgID, campaignID).subscribe(
          (nonResponseSets: unknown[]) =>{
            if(nonResponseSets.length){
               this.nonResponseSetsAvailable = true;
            }
            this.nonResponseSets = nonResponseSets.filter(nonResponseSet => {
              return nonResponseSet['campaignIDs'].includes(campaignID) && nonResponseSet['orgStatus'].active
            })
          },
          error=>{
            console.log(error)
            this.displayErrorMsg = true;
            this.errorMessage = 'There was a problem with the server.';
          }
      );
    }


    cancel(){this.dialogRef.close()}

    ngOnInit(){
      this.getScripts()
      this.getAllNonResponseSets()
    }
}
