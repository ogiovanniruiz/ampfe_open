import { Component, OnInit, ViewChild} from '@angular/core';
import { MatGridList } from '@angular/material/grid-list';
import { MediaChange, MediaObserver } from '@angular/flex-layout';
import {ReportService} from '../../services/report/report.service';
import {MatDialog} from '@angular/material/dialog';
import {UserReportDialog} from './dialogs/userReportDialog/userReportDialog';
import {OrgReportDialog} from './dialogs/orgReportDialog/orgReportDialog';
import {PrecBlockReportDialog} from './dialogs/precblockReportDialog/precblockReportDialog';
import {ScriptReportDialog} from './dialogs/scriptReportDialog/scriptReportDialog';
import {ScriptService} from '../../services/script/script.service';
import { CampaignService } from 'src/app/services/campaign/campaign.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {

  @ViewChild('grid', {static: true}) grid: MatGridList;
  @ViewChild('selectedUserReportScript', {static: true}) selectedUserReportScript;
  @ViewChild('selectedUserReportActivityType', {static: true}) selectedUserReportActivityType;

  @ViewChild('selectedOrgReportScript', {static: true}) selectedOrgReportScript;
  @ViewChild('selectedOrgReportActivityType', {static: true}) selectedOrgReportActivityType;


  @ViewChild('selectedPrecBlockReportReportType', {static: true}) selectedPrecBlockReportReportType;
  @ViewChild('selectedPrecBlockReportScript', {static: true}) selectedPrecBlockReportScript;
  @ViewChild('selectedPrecBlockReportActivityType', {static: true}) selectedPrecBlockReportActivityType;
  @ViewChild('selectedPrecBlockReportOrg', {static: true}) selectedPrecBlockReportOrg;

  @ViewChild('selectedScriptsReportActivityType', {static: true}) selectedScriptsReportActivityType;
  @ViewChild('selectedScriptsReportOrg', {static: true}) selectedScriptsReportOrg;

  userReportMessage: string = '';
  displayUserReportMessage: boolean = false;

  orgReportMessage: string = '';
  displayOrgReportMessage: boolean = false;

  precblockReportMessage: string = '';
  displayPrecBlockReportMessage: boolean = false;

  scriptsReportMessage: string = '';
  displayScriptsReportMessage: boolean = false;

  scripts: unknown[] = [];

  downloading: boolean = false;

  gridByBreakpoint = {
    xl: 3,
    lg: 2,
    md: 2,
    sm: 1,
    xs: 1
  };

  constructor(private observableMedia: MediaObserver,
              public reportService: ReportService,
              public dialog: MatDialog, 
              public scriptService: ScriptService,
              public campaignService: CampaignService
    
    ) { }

  openUserReportDialog(){

    if(!this.selectedUserReportScript.value){
      this.userReportMessage = 'Report Needs a Script.';
      this.displayUserReportMessage = true;
      return;
    }

    if(!this.selectedUserReportActivityType.value){
      this.userReportMessage = 'Report Needs an Activity Type.';
      this.displayUserReportMessage = true;
      return;
    }

    this.displayUserReportMessage = false;

    const dialogRef = this.dialog.open(UserReportDialog, {data: {selectedScript: this.selectedUserReportScript.value,
                                                                 selectedActivityType: this.selectedUserReportActivityType.value}});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        console.log("CLOSED...")
      }
    });

  }

  openOrgReportDialog(){

    if(!this.selectedOrgReportScript.value){
      this.orgReportMessage = 'Report Needs a Script.'
      this.displayOrgReportMessage = true;
      return;
    }

    if(!this.selectedOrgReportActivityType.value){
      this.orgReportMessage = 'Report Needs an Activity Type.'
      this.displayOrgReportMessage = true;
      return;
    }

    this.displayOrgReportMessage = false;

    const dialogRef = this.dialog.open(OrgReportDialog, {data: {selectedScript: this.selectedOrgReportScript.value,
                                                                 selectedActivityType: this.selectedOrgReportActivityType.value}});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        console.log('CLOSED...');
      }
    });

  }


  openPrecBlockReportDialog(){

    if(!this.selectedPrecBlockReportReportType.value) {
      this.precblockReportMessage = 'Report Needs a Report Type.';
      this.displayPrecBlockReportMessage = true;
      return;
    }

    if(!this.selectedPrecBlockReportScript.value) {
      this.precblockReportMessage = 'Report Needs a Script.';
      this.displayPrecBlockReportMessage = true;
      return;
    }

    if(!this.selectedPrecBlockReportActivityType.value) {
      this.precblockReportMessage = 'Report Needs an Activity Type.';
      this.displayPrecBlockReportMessage = true;
      return;
    }

    this.displayPrecBlockReportMessage = false;

    const dialogRef = this.dialog.open(PrecBlockReportDialog, {data: {selectedReportType: this.selectedPrecBlockReportReportType.value,
                                                                      selectedScript: this.selectedPrecBlockReportScript.value,
                                                                      selectedActivityType: this.selectedPrecBlockReportActivityType.value,
                                                                      selectedOrg: this.selectedPrecBlockReportOrg.checked}});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        console.log('CLOSED...');
      }
    });

  }

  openScriptsReportDialog(){

    if(!this.selectedScriptsReportActivityType.value){
      this.scriptsReportMessage = 'Report Needs an Activity Type.';
      this.displayScriptsReportMessage = true;
      return;
    }

    this.displayScriptsReportMessage = false;

    const dialogRef = this.dialog.open(ScriptReportDialog, {data: {selectedScript: this.scripts,
                                                                  selectedActivityType: this.selectedScriptsReportActivityType.value,
                                                                  selectedOrg: this.selectedScriptsReportOrg.checked}});
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        console.log('CLOSED...');
      }
    });

  }

  getCampaignScripts(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID')

    this.scriptService.getCampaignScripts(orgID, campaignID).subscribe(
      (scripts: unknown[])=>{
        this.scripts = scripts
      }
    );

  }

  ngOnInit(): void {
    this.grid.cols = 1;
    this.getCampaignScripts();
    this.selectedPrecBlockReportOrg.checked = true;
    this.selectedScriptsReportOrg.checked = true;
  }
  ngAfterContentInit() {
    this.observableMedia.media$.subscribe((change: MediaChange) => {
      this.grid.cols = this.gridByBreakpoint[change.mqAlias];
    });
  }

  wipeCampaignReport(){
    let campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    if(confirm("Are you sure?")){
      this.campaignService.wipeReport(campaignID).subscribe(result =>{
        console.log(result)
      })
    }
  }

  downloadCampaignContactHistory(){

    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    this.campaignService.downloadCampaignContactHistory(campaignID).subscribe(
      (report: unknown[])=>{

        let binaryData = ['UserName, campaignID, activityType, affidavit, date, responseType, responses\n'];

        for(var i = 0; i < report.length; i++){
          binaryData.push(report[i]['user']['name']['fullName'] + ',')
          binaryData.push(report[i]['campaignID'] + ',')
          binaryData.push(report[i]['activityType'] + ',')
          //binaryData.push(report[i]['person']['resident']['affidavit']+ ',')

          if(report[i]['affidavit']){
            binaryData.push(report[i]['affidavit']+ ',')
          }else if(report[i]['person']){
            binaryData.push(report[i]['person']['resident']['affidavit']+ ',')
          }else{
            binaryData.push("unknown,")
          }

          binaryData.push(report[i]['date']+ ',')
          if(report[i]['scriptResponse']){
            binaryData.push('scriptResponse' + ',')
            for(var j = 0; j < report[i]['scriptResponse']['questionResponses'].length; j++){
              if(report[i]['scriptResponse']['questionResponses'][j]['response']){
                binaryData.push(report[i]['scriptResponse']['questionResponses'][j]['question']+ ":" +report[i]['scriptResponse']['questionResponses'][j]['response'] + ',')
              }else{
                binaryData.push(report[i]['scriptResponse']['questionResponses'][j]['question']+ ":" +report[i]['scriptResponse']['questionResponses'][j]['idType'] + ',')
              }
            }
            binaryData.push('\n')
          }
          
          if(report[i]['nonResponse']){
            binaryData.push('nonResponse' + ',')
            binaryData.push(report[i]['nonResponse']['nonResponse'] + '\n')
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
    );

  }

}
