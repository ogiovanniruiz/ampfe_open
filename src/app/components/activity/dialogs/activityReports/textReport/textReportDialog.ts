import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import { Sort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { ActivityService } from '../../../../../services/activity/activity.service';
import { TextingService } from '../../../../../services/texting/texting.service';
import {log} from 'util';
import {Activity} from '../../../../../models/activities/activity.model'

@Component({
    templateUrl: './textReportDialog.html',
  })

  export class TextReportsDialog implements OnInit {

    pageEvent: PageEvent;

    activityID: string = '';
    activityPhoneNums = {};

    members = [];
    sortedMembers;

    currentPage: number = 0;
    public pageSize: number = 5;
    public totalSize: number = 0;

    completed: boolean = true;

    totalHouseHolds: number = 0
    totalResidents: number = 0

    downloading: boolean = false;

    @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
    @ViewChild('reportPickerStart', {static: false}) reportPickerStart: ElementRef;
    @ViewChild('reportPickerEnd', {static: false}) reportPickerEnd: ElementRef;

    constructor(public activityService: ActivityService,
                public textingService: TextingService,
                @Inject(MAT_DIALOG_DATA) public data: any,
        ) { 
          this.activityID = data.activity['_id']
        }

    getActivity(){
      this.activityService.getActivity(this.activityID).subscribe(
        (activity: Activity) =>{
          for(var i = 0; i < activity.textMetaData.activityPhonenums.length; i++){
            this.activityPhoneNums[activity.textMetaData.activityPhonenums[i]['userID']] = activity.textMetaData.activityPhonenums[i]['userFullName']
          }
          this.getTextingReport();
        }, error=>{
          console.log(error)
      })
    }

    getActivitySize(){
      this.activityService.getActivitySize(this.activityID).subscribe(
        (size: Object) =>{
          this.totalHouseHolds = size['totalHouseHolds']
        }
      )
    }

    getTextingReport(){
      var reportPickerStart = '';
      if (this.reportPickerStart){var reportPickerStart = this.reportPickerStart['startAt'] ? new Date(this.reportPickerStart['startAt']).toISOString().slice(0, 10) : ''}
      var reportPickerEnd = '';
      if (this.reportPickerEnd){var reportPickerEnd = this.reportPickerEnd['startAt'] ? new Date(this.reportPickerEnd['startAt']).toISOString().slice(0, 10) : ''}

      this.completed = true;
      this.textingService.getTextingReport(this.activityID, reportPickerStart, reportPickerEnd).subscribe(
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

                await this.members.push({
                    'User Name': this.activityPhoneNums[report['activities'][i]['_id']],
                    'Number Texts Sent': report['activities'][i]['sent'],
                    //'Number Texts Successful': report['activities'][i]['successful'],
                    'Number Texts Received': report['activities'][i]['received'],
                    ...report['activities'][i]['scripts'],
                });

                this.sortedMembers = this.members.slice();
                this.totalSize = this.members.length;
                this.iterator();
            }

            if (!report['activities'].length && !reportPickerStart && !reportPickerStart) {
                this.completed = false;
            }
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
        this.getTextingReport();
    }

    returnZero() {
        return 0;
    }

    ngOnInit(){
      
      this.getActivity()
      this.getActivitySize()
    }

    downloadTextContactHistory(){
      this.downloading = true;
      this.textingService.downloadTextContactHistory(this.activityID).subscribe(
        (result: unknown[]) =>{

          let binaryData = ['residentPhonenumber, userPhonenumber, userName, date,responseType, responses\n'];

          for(var i = 0; i < result.length; i++){
              binaryData.push(result[i]['residentPhonenum'] + ',')
              binaryData.push(result[i]['userPhonenum']+ ',')
              binaryData.push(result[i]['userName']['fullName'] + ',')
              var date = result[i]['textInitDate'].substring(0, 10);
              binaryData.push(date + ',')
              if(result[i]['scriptResponse']){
                binaryData.push('scriptResponse' + ',')
                for(var k = 0; k < result[i]['scriptResponse']['questionResponses'].length; k++){
                  binaryData.push(result[i]['scriptResponse']['questionResponses'][k]['question']+ ":" +result[i]['scriptResponse']['questionResponses'][k]['response'] + ',')
                }
                binaryData.push('\n')
              }else if (result[i]['nonResponses']){
                binaryData.push('nonResponse' + ',')
                for(var k = 0; k < result[i]['nonResponses'].length; k++){
                  binaryData.push(result[i]['nonResponses'][k]['nonResponse']+ ',')
                }
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
          downloadLink.setAttribute('download', 'TextContactHistory.csv');
          document.body.appendChild(downloadLink);
          downloadLink.click();

        },
        error =>{
          console.log(error)
        }
      )

    }
  }

  function compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
