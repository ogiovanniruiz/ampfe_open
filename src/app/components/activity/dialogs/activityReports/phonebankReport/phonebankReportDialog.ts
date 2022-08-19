import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import { Sort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { ActivityService } from '../../../../../services/activity/activity.service';
import {PhonebankService} from '../../../../../services/phonebank/phonebank.service'
import {OrganizationService} from '../../../../../services/organization/organization.service'
import {User} from '../../../../../models/users/user.model'
import {Activity} from '../../../../../models/activities/activity.model'



@Component({
    templateUrl: './phonebankReportDialog.html',
  })

  export class PhonebankReportsDialog implements OnInit {

    pageEvent: PageEvent;

    activityID: string = '';
    activityPhoneNums = {};

    members = [];
    sortedMembers;

    currentPage: number = 0;
    public pageSize: number = 5;
    public totalSize: number = 0;

    completed: boolean = true;

    userList = {}
    totalHouseHolds: number = 0
    //totalResidents: number = 0

    downloading: boolean = false;

    activityName: string = ''

    @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
    @ViewChild('reportPickerStart', {static: false}) reportPickerStart: ElementRef;
    @ViewChild('reportPickerEnd', {static: false}) reportPickerEnd: ElementRef;

    constructor(public activityService: ActivityService,
                @Inject(MAT_DIALOG_DATA) public data: any,
                public phonebankService: PhonebankService,
                public orgService: OrganizationService
        ) { 
            this.activityID = data.activity._id
            this.activityName = data.activity.name

        }
    getActivitySize(){
      this.activityService.getActivitySize(this.activityID).subscribe(
        (size: Object)=>{
          this.totalHouseHolds = size['totalHouseHolds']
          //this.totalResidents = size['totalResidents']
          this.getOrgUsers(); 
        }
      )
    }

    getActivityReport(){
      var reportPickerStart = '';
      if (this.reportPickerStart){var reportPickerStart = this.reportPickerStart['startAt'] ? new Date(this.reportPickerStart['startAt']).toISOString().slice(0, 10) : ''}
      var reportPickerEnd = '';
      if (this.reportPickerEnd){var reportPickerEnd = this.reportPickerEnd['startAt'] ? new Date(this.reportPickerEnd['startAt']).toISOString().slice(0, 10) : ''}

      this.completed = true;
      this.phonebankService.getPhonebankReport(this.activityID, reportPickerStart, reportPickerEnd).subscribe(
          async (report: unknown[]) =>{
            this.members = [];
            this.sortedMembers = [];
            for(var i = 0; i < report['activities'].length; i++){
                // Create arrays
                report['activities'][i]['scripts'] = {};

                // Loop through scripts
                if (report['script']._id) {
                    for await (let questions of report['script'].questions) {
                        if (questions.responses.length) {
                            for await (let response of questions.responses) {
                                for (let IDS of report['activities'][i][response.idType]) {
                                    if(IDS[questions._id] !== undefined){
                                        report['activities'][i]['scripts'][questions.question + ' - ' + response.response] = IDS[questions._id];
                                    }
                                }
                            }
                        }
                    }
                }

                report['activities'][i]['scripts']['IMP'] = report['activities'][i]['IMP'];
                report['activities'][i]['scripts']['Invalid Phone'] = report['activities'][i]['INVALIDPHONE'];
                report['activities'][i]['scripts']['DNC'] = report['activities'][i]['DNC'];
                report['activities'][i]['scripts']['NonResponse'] = report['activities'][i]['NONRESPONSE'];

                var avgLengthOfCall = 0
                if(report['activities'][i]['avgCallLength']){
                  avgLengthOfCall = report['activities'][i]['avgCallLength']
                }

                if(this.userList[report['activities'][i]['_id']]){
                  await this.members.push({
                    'User Name': this.userList[report['activities'][i]['_id']],
                    'Number Calls Attempted': report['activities'][i]['called'],
                    'Number Calls Connected': report['activities'][i]['successful'],
                    'Average Call Length(sec)': avgLengthOfCall,
                    ...report['activities'][i]['scripts'],
                  });

                }

                this.sortedMembers = this.members.slice();

                this.totalSize = this.members.length;
                this.iterator();
            }

            if (!report['activities'].length && !reportPickerStart && !reportPickerStart) {
                this.completed = false;
            }
        }
      ), error =>{
        this.sortedMembers = [];

      }
    }

    getOrgUsers(){
      var orgID = sessionStorage.getItem('orgID')

      this.orgService.getOrgUsers(orgID).subscribe(
        (users: User[]) =>{
            for(var i = 0; i < users.length; i++){
              this.userList[users[i]._id] = users[i].name.firstName + " " + users[i].name.lastName
            }
            this.getActivityReport();
          },
        error =>{
          console.log(error)
          //this.displayErrorMsg = true;
          //this.errorMessage = 'Failed to get user list due to server error.'
        }
      )

    }

    public handlePage(e: any) {
        this.currentPage = e.pageIndex;
        this.pageSize = e.pageSize;
        this.iterator();
        return e
    }

    private iterator() {
        const end = (this.currentPage + 1) * this.pageSize;
        const start = this.currentPage * this.pageSize;
        const part = this.members.slice(start, end);
        this.sortedMembers = part;
    }
    
    sortData(sort: Sort) {
        const data = this.members.slice();
        if (!sort.active || sort.direction === '') {
          this.sortedMembers = data;
          return;
        }
    
        this.sortedMembers = data.sort((a, b) => {
          const isAsc = sort.direction === 'asc';
          return compare(a[sort.active], b[sort.active], isAsc)
        });
    
        this.sortedMembers.paginator = this.paginator;
    }

    filterByDate() {
      this.getActivityReport();
    }

    returnZero() {
        return 0;
    }

    ngOnInit(){
      this.getActivitySize()
    }

    downloadPhonebankContactHistory(){
      this.downloading = true;
      this.phonebankService.downloadPhonebankContactHistory(this.activityID).subscribe(
        (result: unknown[])=>{

          let binaryData = ['residentPhonenumber, userPhonenumber, userName, date, responseType, responses\n'];

          for(var i = 0; i < result.length; i++){
              binaryData.push(result[i]['residentPhonenum'] + ',')
              binaryData.push(result[i]['userPhonenum']+ ',')
              binaryData.push(result[i]['userName']['fullName'] + ',')
              var date = result[i]['callInitTime'].substring(0, 10);
              binaryData.push(date + ',')
              if(result[i]['scriptResponse']){
                if(result[i]['scriptResponse']['questionResponses'].length > 1){
                  console.log(result[i]['scriptResponse'])

                }
                
                binaryData.push('scriptResponse' + ',')
                for(var k = 0; k < result[i]['scriptResponse']['questionResponses'].length; k++){
                  if(result[i]['scriptResponse']['questionResponses'][k]['response']){
                    binaryData.push(result[i]['scriptResponse']['questionResponses'][k]['question']+ ":" +result[i]['scriptResponse']['questionResponses'][k]['response'] + ',')
                  }else{
                    binaryData.push(result[i]['scriptResponse']['questionResponses'][k]['question']+ ":" +result[i]['scriptResponse']['questionResponses'][k]['idType'] + ',')

                  }
                }
                binaryData.push('\n')
              }else if (result[i]['nonResponse']){
                binaryData.push('nonResponse' + ',')
                binaryData.push(result[i]['nonResponse']['nonResponse'])
                binaryData.push('\n')
              }else{
                
                binaryData.push('none' + ',')
                binaryData.push('none' + '\n')
              }
          }

          this.downloading = false;

          let downloadLink = document.createElement('a');
  
          let blob = new Blob(binaryData, {type: 'blob'});
          downloadLink.href = window.URL.createObjectURL(blob);
          downloadLink.setAttribute('download', 'PhonecontactHistory.csv');
          document.body.appendChild(downloadLink);
          downloadLink.click();
      
        }, 
        error =>{
          console.log(error)
        }
      )
    }

    downloadPhonebankCORDReport(){
      var reportPickerStart = '';
      if (this.reportPickerStart){var reportPickerStart = this.reportPickerStart['startAt'] ? new Date(this.reportPickerStart['startAt']).toISOString().slice(0, 10) : ''}
      var reportPickerEnd = '';
      if (this.reportPickerEnd){var reportPickerEnd = this.reportPickerEnd['startAt'] ? new Date(this.reportPickerEnd['startAt']).toISOString().slice(0, 10) : ''}

      this.completed = true;
      this.phonebankService.getPhonebankReport(this.activityID, reportPickerStart, reportPickerEnd).subscribe(
        async (report: unknown[]) =>{

          var totalCallsAttempted = 0
          var totalCallsSuccessful = 0

          var data = {}

          let binaryData = []


          if (report['script']._id) {              
            for await (let questions of report['script'].questions) {
              if (questions.responses.length) {
                  for await (let response of questions.responses) {
                    data[questions.question + ' - ' + response.response] = 0
                  }
              }
            }
          }

          for(var i = 0; i < report['activities'].length; i++){
            totalCallsAttempted = totalCallsAttempted + report['activities'][i]['called']
            totalCallsSuccessful = totalCallsSuccessful + report['activities'][i]['successful']

            if (report['script']._id) {
              for await (let questions of report['script'].questions) {
                  if (questions.responses.length) {
                      for await (let response of questions.responses) {
                          for (let IDS of report['activities'][i][response.idType]) {
                              if(IDS[questions._id] !== undefined){
                                  data[questions.question + ' - ' + response.response] = data[questions.question + ' - ' + response.response] + IDS[questions._id]
                              }
                          }
                      }
                  }
              }
            }
          }

          data['startDate'] = reportPickerStart
          data['endDate'] = reportPickerEnd

          data['totalCallsAttempted'] = totalCallsAttempted
          data['totalCallsSuccesful'] = totalCallsSuccessful

          for(let key of Object.keys(data)){
            binaryData.push(key + ',')
          }
          binaryData.push('\n')
          for( let value of Object.values(data)){
            binaryData.push(value + ',')
          }

          let downloadLink = document.createElement('a');
          var filename = "Aggregated_" + this.activityName + "_" + reportPickerStart + "_Phonebank_Report.csv"
  
          let blob = new Blob(binaryData, {type: 'blob'});
          downloadLink.href = window.URL.createObjectURL(blob);
          downloadLink.setAttribute('download', filename );
          document.body.appendChild(downloadLink);
          downloadLink.click();

        })

    }


    /*
    downloadPhonebankCORDReport(){
      this.downloading = true;
      this.activityService.downloadCordReport(this.activityID, 'Phonebank').subscribe(
        (data: unknown[])=>{

          var result = data['report']

          let binaryData = ['firstName, lastName, organization, date, responses\n'];

          for(var i = 0; i < result.length; i++){

            if(result[i]['scriptResponse']){

              binaryData.push(result[i]['userName']['firstName'] + ',')
              binaryData.push(result[i]['userName']['lastName'] + ',')
              binaryData.push(result[i]['orgName']+ ',')
              var date = result[i]['callInitTime'].substring(0, 10);
              binaryData.push(date + ',')

              for(var k = 0; k < result[i]['scriptResponse']['questionResponses'].length; k++){
                var question = result[i]['scriptResponse']['questionResponses'][k]['question'].replace(/,/g,"")

                var answer = result[i]['scriptResponse']['questionResponses'][k]['idType']

                if(result[i]['scriptResponse']['questionResponses'][k]['response']){
                  answer = result[i]['scriptResponse']['questionResponses'][k]['response']
                }

                if(answer != "NONE"){
                  binaryData.push(question + ":" + answer + ',')
                }
              }

              binaryData.push('\n')
            }

          }

          this.downloading = false;

          let downloadLink = document.createElement('a');

          var filename = data['activityName'] + "_" + "phonebank.csv"
  
          let blob = new Blob(binaryData, {type: 'blob'});
          downloadLink.href = window.URL.createObjectURL(blob);
          downloadLink.setAttribute('download', filename );
          document.body.appendChild(downloadLink);
          downloadLink.click();
        }
      )
    }
  */

  
  }

  function compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
