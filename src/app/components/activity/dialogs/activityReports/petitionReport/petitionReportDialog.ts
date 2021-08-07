import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import { Sort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { ActivityService } from '../../../../../services/activity/activity.service';
import {PetitionService} from '../../../../../services/petition/petition.service'
import {OrganizationService} from '../../../../../services/organization/organization.service'
import {User} from '../../../../../models/users/user.model'


@Component({
    templateUrl: './petitionReportDialog.html',
  })

  export class PetitionReportsDialog implements OnInit {

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


    @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
    @ViewChild('reportPickerStart', {static: false}) reportPickerStart: ElementRef;
    @ViewChild('reportPickerEnd', {static: false}) reportPickerEnd: ElementRef;

    constructor(public activityService: ActivityService,
                @Inject(MAT_DIALOG_DATA) public data: any,
                public petitionService: PetitionService,
                public orgService: OrganizationService
        ) { 
            this.activityID = data.activity._id
        }

    getActivityReport(){
      var reportPickerStart = '';
      if (this.reportPickerStart){var reportPickerStart = this.reportPickerStart['startAt'] ? new Date(this.reportPickerStart['startAt']).toISOString().slice(0, 10) : ''}
      var reportPickerEnd = '';
      if (this.reportPickerEnd){var reportPickerEnd = this.reportPickerEnd['startAt'] ? new Date(this.reportPickerEnd['startAt']).toISOString().slice(0, 10) : ''}

      this.completed = true;
      this.petitionService.getPetitionReport(this.activityID, reportPickerStart, reportPickerEnd).subscribe(
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
                                report['activities'][i]['scripts'][questions.question + ' - ' + response.response] = report['activities'][i][response.idType];
                            }
                        }
                    }
                }

                report['activities'][i]['scripts']['IMP'] = report['activities'][i]['IMP'];
                report['activities'][i]['scripts']['Invalid Phone'] = report['activities'][i]['INVALIDPHONE'];
                report['activities'][i]['scripts']['DNC'] = report['activities'][i]['DNC'];
                report['activities'][i]['scripts']['NonResponse'] = report['activities'][i]['NONRESPONSE'];

                await this.members.push({
                    'User Name': this.userList[report['activities'][i]['_id']],
                    //'Number Calls Attempted': report['activities'][i]['called'],
                    //'Average Call Length(sec)': report['activities'][i]['avgCallLength'],
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

    getOrgUsers(){
      var orgID = sessionStorage.getItem('orgID')

      this.orgService.getOrgUsers(orgID).subscribe(
        (users: User[]) =>
          {
            for(var i = 0; i < users.length; i++){
              this.userList[users[i]._id] = users[i].name.firstName + " " + users[i].name.lastName
            }

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
      this.getOrgUsers();
      this.getActivityReport();
    }
  }

  function compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
