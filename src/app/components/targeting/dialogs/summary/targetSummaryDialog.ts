import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TargetService} from '../../../../services/target/target.service';
import {OrganizationService} from '../../../../services/organization/organization.service';

@Component({
    templateUrl: './targetSummaryDialog.html',
  })
  
  export class TargetSummaryDialog implements OnInit{

    @ViewChild('targetName', {static: false}) targetName:ElementRef;
    @ViewChild('targetType', {static: false}) targetType: ElementRef;

    loadingData = true;
    showErrorMsg = false;
    dataManager: boolean = false;

    orgTargets = []
    campaignWideTargets = []
    allCampaignTargets = []
    dev: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<TargetSummaryDialog>, 
        public targetService: TargetService,
        public orgService: OrganizationService) {
        }

    getOrgTargets(){
      var campaignID = parseInt(sessionStorage.getItem('campaignID'));
      var orgID = sessionStorage.getItem('orgID');

      this.targetService.getOrgTargets(campaignID, orgID).subscribe((targets: [])=>{
        this.orgTargets = targets;
        this.getCampaignWideTargets();
      });
    };

    getCampaignWideTargets(){
      var campaignID = parseInt(sessionStorage.getItem('campaignID'))

      this.targetService.getCampaignWideTargets(campaignID).subscribe((targets: []) =>{
        this.campaignWideTargets = targets;
        this.getAllCampaignTargets();
      });
    };

    getAllCampaignTargets(){
      var campaignID = parseInt(sessionStorage.getItem('campaignID'))

      this.targetService.getAllCampaignTargets(campaignID).subscribe((targets: []) =>{
        this.allCampaignTargets = targets;
        this.loadingData = false;
      });
    };

    removeTarget(targetID: string){
      if(confirm('Are you sure you want to delete the target? This needs to check if any activites are using.')){
        this.targetService.removeTarget(targetID).subscribe(result =>{
          console.log(result)
          this.getOrgTargets();
        })

      }
    }

    downloadAsSocialMediaList(targetID: string){
      var campaignID = parseInt(sessionStorage.getItem('campaignID'))
      var activityType = 'Social Media'

      var potentialActivity = {targetID: targetID, campaignID: campaignID, activityType: activityType, _id: "string"}
      this.targetService.downloadTarget(potentialActivity).subscribe(houseHolds =>{
        let binaryData = ['firstName,lastName,phone,email\n'];

        for(var i = 0; i < houseHolds['length']; i++){
          for(var j = 0; j < houseHolds[i]['houseHold']['residents'].length; j++){

            if(houseHolds[i]['houseHold']['residents'][j]['phones'][0] ||houseHolds[i]['houseHold']['residents'][j]['emails'][0]){
              binaryData.push(houseHolds[i]['houseHold']['residents'][j]['name']['firstName'] + ',')
              binaryData.push(houseHolds[i]['houseHold']['residents'][j]['name']['lastName'] + ',')
  
              if(houseHolds[i]['houseHold']['residents'][j]['phones'][0]){
                binaryData.push(houseHolds[i]['houseHold']['residents'][j]['phones'][0]['number'] + ',')
              }else{
                binaryData.push(',')
              }

              if(houseHolds[i]['houseHold']['residents'][j]['emails'][0]){

                binaryData.push(houseHolds[i]['houseHold']['residents'][j]['emails'][0] + '\n')
              }else{
                binaryData.push('\n')

              }
            }
          }
        }
      
        let downloadLink = document.createElement('a');
  
        let blob = new Blob(binaryData, {type: 'blob'});
        downloadLink.href = window.URL.createObjectURL(blob);
        downloadLink.setAttribute('download', 'EmailPhoneList.csv');
        document.body.appendChild(downloadLink);
        downloadLink.click();

      })

    }

    downloadTarget(targetID: string){
      var campaignID = parseInt(sessionStorage.getItem('campaignID'))
      var activityType = 'Mailer'


      var potentialActivity = {targetID: targetID, campaignID: campaignID, activityType: activityType, _id: "string"}


      this.targetService.downloadTarget(potentialActivity).subscribe(houseHolds =>{
        console.log(houseHolds)
        let binaryData = ['firstName,lastName,address,city,state,zip,\n'];

        for(var i = 0; i < houseHolds['length']; i++){

          var address = houseHolds[i]['_id']['streetNum'] + " " +
                        houseHolds[i]['_id']['prefix'] + " " +
                        houseHolds[i]['_id']['street'] + " " +
                        houseHolds[i]['_id']['suffix'] + " " +
                        houseHolds[i]['_id']['unit']

          if(houseHolds[i]['residents'].length > 1){

            binaryData.push(houseHolds[i]['residents'][0]['name']['lastName'] + ',')
            binaryData.push('FAMILY,')

            binaryData.push(address + ',')
            binaryData.push(houseHolds[i]['_id']['city'] + ',')
            binaryData.push(houseHolds[i]['_id']['state']['abbrv'] + ',')
            binaryData.push(houseHolds[i]['_id']['zip'] + '\n')

          }else{

            for(var k = 0; k < houseHolds[i]['residents'].length; k++){
              
              binaryData.push(houseHolds[i]['residents'][k]['name']['firstName'] + ',')
              binaryData.push(houseHolds[i]['residents'][k]['name']['lastName'] + ',')
              binaryData.push(address + ',')
              binaryData.push(houseHolds[i]['_id']['city'] + ',')
              binaryData.push(houseHolds[i]['_id']['state']['abbrv'] + ',')
              binaryData.push(houseHolds[i]['_id']['zip'] + '\n')
            
            
            }
          }
        }
      
        let downloadLink = document.createElement('a');
  
        let blob = new Blob(binaryData, {type: 'blob'});
        downloadLink.href = window.URL.createObjectURL(blob);
        downloadLink.setAttribute('download', 'MailerList.csv');
        document.body.appendChild(downloadLink);
        downloadLink.click();

      })
    }

    getDataManagerStatus(){

      var user = JSON.parse(sessionStorage.getItem('user'))
      this.dev = user.dev

      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
  
      for (var i = 0; i< user.dataManager.length; i++){
        if(user.dataManager[i] === campaignID ){
          this.dataManager = true;
        }
      }
    }

    ngOnInit(){
      this.getOrgTargets();
      this.getDataManagerStatus()
    }
}
