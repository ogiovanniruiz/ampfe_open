import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ReportService} from '../../../../services/report/report.service'
import { Sort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import {ScriptService} from '../../../../services/script/script.service';
import {FormControl} from '@angular/forms';


@Component({
    templateUrl: './scriptReportDialog.html',
  })

export class ScriptReportDialog implements OnInit {

    sortedScripts;
    pageEvent: PageEvent;
  
    currentPage: number = 0
    public pageSize: number = 5;
    public totalSize: number = 0;

    scripts = [];
    activityID: string = '';

    completed: boolean = true;

    @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
    @ViewChild('reportPickerStart', {static: false}) reportPickerStart: ElementRef;
    @ViewChild('reportPickerEnd', {static: false}) reportPickerEnd: ElementRef;

    today = new FormControl(new Date());

    constructor(public scriptService: ScriptService,
                public dialogRef: MatDialogRef<ScriptReportDialog>,
                @Inject(MAT_DIALOG_DATA) public data,
                public dialog: MatDialog,
                public reportService: ReportService,
              ) {}

    getScriptReport(){
        var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
        var orgID: string = sessionStorage.getItem('orgID');

        var reportPickerStart = '';
        if (this.reportPickerStart){var reportPickerStart = this.reportPickerStart['startAt'] ? new Date(this.reportPickerStart['startAt']).toISOString().slice(0, 10) : ''}
        else{
            reportPickerStart = new Date().toISOString().slice(0, 10)
        }
        
        var reportPickerEnd = '';
        if (this.reportPickerEnd){var reportPickerEnd = this.reportPickerEnd['startAt'] ? new Date(this.reportPickerEnd['startAt']).toISOString().slice(0, 10) : ''}

        var reportOrg = this.data.selectedOrg === true ? orgID : '';

        var data = {selectedActivityType: this.data.selectedActivityType, selectedScript: this.data.selectedScript, reportPickerStart, reportPickerEnd};
        this.completed = true;

        this.reportService.getScriptReport(campaignID, reportOrg, data).subscribe(
          async (report: unknown[]) =>{
              this.scripts = [];
              this.sortedScripts = [];

              for await (let selectedScript of this.data.selectedScript) {
                  for await (let questions of selectedScript.questions) {
                      var row = [];

                      for await (let reportType of report) {
                          if(reportType['_id'] === selectedScript._id){
                              for await (let responses of questions.responses) {
                                  for await (let data of reportType[responses.idType]) {
                                      if(data[questions._id] !== undefined) {
                                          row[responses.idType] = data[questions._id];
                                      }
                                  }
                              }
                          }
                      }

                      var newRow = {
                          'Very Positive': row['VERYPOSITIVE'] ? row['VERYPOSITIVE'] : 0,
                          'Positive': row['POSITIVE'] ? row['POSITIVE'] : 0,
                          'Neutral': row['NEUTRAL'] ? row['NEUTRAL'] : 0,
                          'Negative': row['NEGATIVE'] ? row['NEGATIVE'] : 0,
                          'Very Negative': row['VERYNEGATIVE'] ? row['VERYNEGATIVE'] : 0
                      };

                      await this.scripts.push({
                          'Script Name & Question': selectedScript.title + ' - ' + questions.question,
                          ...newRow,
                      });

                      this.sortedScripts = this.scripts.slice();
                      this.totalSize = this.scripts.length;
                      this.iterator();

                  }
              }

              if (!report.length && !reportPickerStart && !reportPickerEnd) {
                  this.completed = false;
              }
          }
        );
    }

    public handlePage(e: any) {
        this.currentPage = e.pageIndex;
        this.pageSize = e.pageSize;
        this.iterator();
        return e;
    }

    private iterator() {
        const end = (this.currentPage + 1) * this.pageSize;
        const start = this.currentPage * this.pageSize;
        const part = this.scripts.slice(start, end);
        this.sortedScripts = part;
    }

    sortData(sort: Sort) {
        const data = this.scripts.slice();
        if (!sort.active || sort.direction === '') {
            this.sortedScripts = data;
            return;
        }

        this.sortedScripts = data.sort((a, b) => {
            const isAsc = sort.direction === 'asc';
            return compare(a[sort.active], b[sort.active], isAsc)
        });

        this.sortedScripts.paginator = this.paginator;
    }

    filterByDate() {
        this.getScriptReport();
    }

    returnZero() {
        return 0;
    }

    ngOnInit() {
        this.getScriptReport()
    }
}

function compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
