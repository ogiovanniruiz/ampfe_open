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
    public pageSize: number = 10;
    public totalSize: number = 0;

    scripts = [];
    activityID: string = '';

    completed: boolean = true;

    @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
    @ViewChild('reportPickerStart', {static: false}) reportPickerStart: ElementRef;
    @ViewChild('reportPickerEnd', {static: false}) reportPickerEnd: ElementRef;

    //today = new FormControl(new Date());

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
        //else{
            //reportPickerStart = new Date().toISOString().slice(0, 10)
        //}
        
        var reportPickerEnd = '';
        if (this.reportPickerEnd){var reportPickerEnd = this.reportPickerEnd['startAt'] ? new Date(this.reportPickerEnd['startAt']).toISOString().slice(0, 10) : ''}

        var reportOrg = this.data.selectedOrg === true ? orgID : '';

        var data = {selectedActivityType: this.data.selectedActivityType, selectedScript: this.data.selectedScript, reportPickerStart, reportPickerEnd};
        this.completed = true;

        this.reportService.getScriptReport(campaignID, reportOrg, data).subscribe(
          async (report: unknown[]) =>{
              //console.log(report)

              this.scripts = [];
              this.sortedScripts = [];

              for await (let selectedScript of this.data.selectedScript) {

                      var row = [];

                      for await (let scriptReport of report['ids']) {
                          if(scriptReport['_id'] === selectedScript._id){
                            row['ids'] = scriptReport['ids']
                            //row['contacts'] = scriptReport['ids'] + scriptReport['dncs']
                          }
                      }

                      for await (let scriptReport of report['dncs']) {
                        if(scriptReport['_id'] === selectedScript._id){
                          row['dncs'] = scriptReport['dncs']
                        }
                    }

                      for await (let scriptReport of report['attempts']) {
                        if(scriptReport['scriptID'] === selectedScript._id){
                          row['attempts'] = scriptReport['attempts']
                        }
                    }

                    if(row['dncs'] === undefined){
                        row['dncs'] = 0
                    }

                    row['contacts'] = row['ids']  + row['dncs']


                      var newRow = {
                          
                          'Attempts': row['attempts'] ? row['attempts'] : 0,
                          'Contacts': row['contacts'] ? row['contacts'] : 0,
                          'IDs': row['ids'] ? row['ids'] : 0,
                      };

                      this.scripts.push({
                          'Script Name': selectedScript.title,
                          '_id': selectedScript._id,
                          ...newRow,
                      });


                      this.sortedScripts = this.scripts.slice();
                      this.totalSize = this.scripts.length;
                      this.iterator();

                  
              }

              if (!report.length && !reportPickerStart && !reportPickerEnd) {
                  //this.completed = false;
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

    downloadNotes(scripts){
        this.reportService.downloadNotes(scripts).subscribe((report: unknown[])=>{

            console.log(report)

            let binaryData = ['FirstName, LastName, Script, Response\n'];
            for(var i = 0; i < report.length; i++){

                //if()
                binaryData.push(report[i]['firstName'] + ',')
                binaryData.push(report[i]['lastName'] + ',')

                for (let selectedScript of this.data.selectedScript) {
                    if( report[i]['scriptID'] === selectedScript._id){
                        binaryData.push(selectedScript.title + ',')

                    }
                }
                binaryData.push(report[i]['response']+ '\n')
            }

            let downloadLink = document.createElement('a');
  
            let blob = new Blob(binaryData, {type: 'blob'});
            downloadLink.href = window.URL.createObjectURL(blob);

            var filename = 'emails.csv'
            downloadLink.setAttribute('download', filename);
            document.body.appendChild(downloadLink);
            downloadLink.click();
            //this.downloading = false;
        })

    }
}

function compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
