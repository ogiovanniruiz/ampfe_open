import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ReportService} from '../../../../services/report/report.service';
import { Sort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';


@Component({
    templateUrl: './precblockReportDialog.html',
  })

export class PrecBlockReportDialog implements OnInit {

    sortedPrecBlocks;
    pageEvent: PageEvent;

    currentPage: number = 0;
    public pageSize: number = 5;
    public totalSize: number = 0;

    precblocks = [];
    activityID: string = '';

    completed: boolean = true;

    @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
    @ViewChild('reportPickerStart', {static: false}) reportPickerStart: ElementRef;
    @ViewChild('reportPickerEnd', {static: false}) reportPickerEnd: ElementRef;

    constructor(public dialogRef: MatDialogRef<PrecBlockReportDialog>,
                @Inject(MAT_DIALOG_DATA) public data,
                public dialog: MatDialog,
                public reportService: ReportService) {}

    onNoClick(): void {this.dialogRef.close(); }

    getPrecBlocksReport(){
        var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
        var orgID: string = sessionStorage.getItem('orgID');

        var reportPickerStart = '';
        if (this.reportPickerStart){var reportPickerStart = this.reportPickerStart['startAt'] ? new Date(this.reportPickerStart['startAt']).toISOString().slice(0, 10) : ''}
        var reportPickerEnd = '';
        if (this.reportPickerEnd){var reportPickerEnd = this.reportPickerEnd['startAt'] ? new Date(this.reportPickerEnd['startAt']).toISOString().slice(0, 10) : ''}

        var reportOrg = this.data.selectedOrg === true ? orgID : '';

        var data = {selectedReportType: this.data.selectedReportType, selectedScript: this.data.selectedScript, selectedActivityType: this.data.selectedActivityType, reportPickerStart, reportPickerEnd};
        this.completed = true;

        this.reportService.getPrecBlockReport(campaignID, reportOrg, data).subscribe(
            async (report: unknown[]) =>{
                this.precblocks = [];
                this.sortedPrecBlocks = [];

                for(var i = 0; i < report.length; i++){
                    // Create arrays
                    report[i]['scripts'] = {};

                    // Add Precinct ir Blockgroup column
                    if(this.data.selectedReportType === 'Precinct'){
                        report[i]['scripts']['Precinct'] = report[i]['_id'];
                    }

                    if(this.data.selectedReportType === 'Blockgroup'){
                        report[i]['scripts']['Blockgroup'] = report[i]['_id'];
                    }

                    // Loop through scripts
                    for await (let questions of this.data.selectedScript.questions) {
                        if (questions.responses.length) {
                            for await (let response of questions.responses) {
                                for (let IDS of report[i][response.idType]) {
                                    if(IDS[questions._id] !== undefined){
                                        report[i]['scripts'][questions.question + ' - ' + response.response] = IDS[questions._id];
                                    }
                                }
                            }
                        }
                    }

                    report[i]['scripts']['IMP'] = report[i]['IMP'];
                    report[i]['scripts']['Invalid Phone'] = report[i]['INVALIDPHONE'];
                    report[i]['scripts']['DNC'] = report[i]['DNC'];
                    report[i]['scripts']['NonResponse'] = report[i]['NONRESPONSE'];

                    await this.precblocks.push({
                        ...report[i]['scripts'],
                    });

                    this.sortedPrecBlocks = this.precblocks.slice();
                    this.totalSize = this.precblocks.length;
                    this.iterator();
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
        return e
    }

    private iterator() {
        const end = (this.currentPage + 1) * this.pageSize;
        const start = this.currentPage * this.pageSize;
        const part = this.precblocks.slice(start, end);
        this.sortedPrecBlocks = part;
    }

    sortData(sort: Sort) {
        const data = this.precblocks.slice();
        if (!sort.active || sort.direction === '') {
            this.sortedPrecBlocks = data;
            return;
        }

        this.sortedPrecBlocks = data.sort((a, b) => {
            const isAsc = sort.direction === 'asc';
            return compare(a[sort.active], b[sort.active], isAsc)
        });

        this.sortedPrecBlocks.paginator = this.paginator;
    }

    filterByDate() {
        this.getPrecBlocksReport();
    }

    returnZero() {
        return 0;
    }

    async ngOnInit() {
        await this.getPrecBlocksReport();
    }
}

function compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
