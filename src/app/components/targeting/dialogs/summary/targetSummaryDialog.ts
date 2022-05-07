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

    downloadingList: boolean = false;

    errorMessage: string = ''
    displayErrorMsg: boolean = false

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
          this.getOrgTargets();
        })

      }
    }

    downloadEmailPhoneList(target){
      var campaignID = parseInt(sessionStorage.getItem('campaignID'))
      var orgID = sessionStorage.getItem('orgID')

      var potentialActivity = {targetID: target._id, campaignID: campaignID, orgIDs: [orgID]}

      this.downloadingList = true
      
      this.targetService.downloadTargetList(potentialActivity).subscribe(
        people =>{
          let binaryData = ['firstName,lastName,phone,email\n'];

          for(var i = 0; i < people['length']; i++){

            binaryData.push(people[i]['name']['firstName'] + ',')
            binaryData.push(people[i]['name']['lastName'] + ',')

            if(people[i]['phones'][0]){
              binaryData.push(people[i]['phones'][0]['number'] + ',')
            }else{
              binaryData.push(',')
            }

            if(people[i]['emails'][0]){

              binaryData.push(people[i]['emails'][0] + '\n')
            }else{
              binaryData.push('\n')

            }
          }
        
          this.downloadingList = false;
          let downloadLink = document.createElement('a');
          
          let blob = new Blob(binaryData, {type: 'blob'});
          downloadLink.href = window.URL.createObjectURL(blob);

          var filename: string = target['properties']['name'] + '_EmailPhoneList.csv'
          downloadLink.setAttribute('download', filename );
          document.body.appendChild(downloadLink);
          downloadLink.click();

      },
      error =>{
        console.log(error)
        this.errorMessage = 'Server Error';
        this.displayErrorMsg = true;
        this.downloadingList = false;
      }
      
      )

    }

    downloadMailerList(target){
      var campaignID = parseInt(sessionStorage.getItem('campaignID'))
      var orgID = sessionStorage.getItem('orgID')

      var potentialActivity = {targetID: target._id, campaignID: campaignID, orgIDs: [orgID]}

      this.downloadingList = true
      this.targetService.downloadTargetList(potentialActivity).subscribe(houseHolds =>{
        let binaryData = ['firstName,lastName,address,city,state,zip,\n'];

        for(var i = 0; i < houseHolds['length']; i++){

          if(houseHolds[i]['houseHold']['_id']){

          var address = houseHolds[i]['houseHold']['_id']['streetNum'] + " " +
                        houseHolds[i]['houseHold']['_id']['prefix'] + " " +
                        houseHolds[i]['houseHold']['_id']['street'] + " " +
                        houseHolds[i]['houseHold']['_id']['suffix'] + " " +
                        houseHolds[i]['houseHold']['_id']['unit']

          if(houseHolds[i]['houseHold']['residents'].length > 1){

            binaryData.push(houseHolds[i]['houseHold']['residents'][0]['name']['lastName'] + ',')
            binaryData.push('FAMILY,')

            binaryData.push(address + ',')
            binaryData.push(houseHolds[i]['houseHold']['_id']['city'] + ',')
            binaryData.push(houseHolds[i]['houseHold']['_id']['state']['abbrv'] + ',')
            binaryData.push(houseHolds[i]['houseHold']['_id']['zip'] + '\n')

          }else{

            for(var k = 0; k < houseHolds[i]['houseHold']['residents'].length; k++){
              
              binaryData.push(houseHolds[i]['houseHold']['residents'][k]['name']['firstName'] + ',')
              binaryData.push(houseHolds[i]['houseHold']['residents'][k]['name']['lastName'] + ',')
              binaryData.push(address + ',')
              binaryData.push(houseHolds[i]['houseHold']['_id']['city'] + ',')
              binaryData.push(houseHolds[i]['houseHold']['_id']['state']['abbrv'] + ',')
              binaryData.push(houseHolds[i]['houseHold']['_id']['zip'] + '\n')
            
            
            }
          }

        }

        }

        this.downloadingList = false
      
        let downloadLink = document.createElement('a');
  
        let blob = new Blob(binaryData, {type: 'blob'});
        downloadLink.href = window.URL.createObjectURL(blob);

        var filename: string = target['properties']['name'] + '_MailerList.csv'
        downloadLink.setAttribute('download', filename);
        document.body.appendChild(downloadLink);
        downloadLink.click();

      },
      error =>{
        console.log(error)
        this.errorMessage = 'Server Error';
        this.displayErrorMsg = true;
        this.downloadingList = false;
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
