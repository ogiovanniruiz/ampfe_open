import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {OrganizationService} from '../../../../services/organization/organization.service';
import {GeometryService} from '../../../../services/geometry/geometry.service'


@Component({
    templateUrl: './lockingDialog.html',
  })

  export class LockingDialog implements OnInit{
    orgID: string;
    dev: boolean = false;
    dataManager: boolean = false;
    dataLoaded: boolean = false;

    geoOrgs: unknown[];

    registered: boolean = false;
    locked: boolean = false;

    userMessage: string;
    displayMessage: boolean = false;
    finished: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<LockingDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public geoService: GeometryService,
        public orgService: OrganizationService) {}

    onNoClick(): void {
      this.dialogRef.close();
    }

    async getGeometryOrgsList() { //Why is this function async?
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      var orgID: string = sessionStorage.getItem('orgID');

      var orgIDs = [];

      for (var locked of this.data.properties.locked) {
        if (locked.campaignID === campaignID) {
          await orgIDs.push(locked.orgID);
          this.locked = true;
          this.finished = locked.finished
        }
      }

      if (!orgIDs.length) {
        for (var registered of this.data.properties.registered) {
          if (registered.campaignID === campaignID) {
            await orgIDs.push(registered.orgID);
            if (registered.orgID === orgID) {
              this.registered = true;
            }
          }
        }
      }

      if (orgIDs.length) {
        await this.getOrgsDetails(orgIDs);
      }

      this.dataLoaded = true;
    }

    getOrgsDetails(orgIDs){
      this.orgService.getAllOrgsByIDs(orgIDs).subscribe(
        (organizations:  unknown[]) => {
          this.geoOrgs = organizations;
          this.dataLoaded = true;
        },
        error => {
          console.log(error)
        }
      );
    }

    getDataManagerStatus(){
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      var user = JSON.parse(sessionStorage.getItem('user'));

      for (var i = 0; i < user.dataManager.length; i++){
        if(user.dataManager[i] === campaignID ){
          this.dataManager = true;
          break
        }
      }
    }

    ngOnInit(){
        this.orgID = sessionStorage.getItem('orgID');
        this.dev = JSON.parse(sessionStorage.getItem('user')).dev;
        
        //this.getDataManagerStatus();

     }

     lockGeometries(){
       var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

       this.geoService.lockGeometries(this.data, this.orgID, campaignID).subscribe(result =>{
         this.dialogRef.close(result);
       })

     }

}
