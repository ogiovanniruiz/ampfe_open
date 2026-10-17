import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {GroupService} from '../../../../../services/group.service';
import {OrganizationService} from '../../../../../services/organization/organization.service';
import { Sort } from '@angular/material/sort';
import { Group } from 'src/app/models/group.model';
import { PrecinctService } from 'src/app/services/shape/precinct.service';
import { RegistrationPrecinct } from 'src/app/models/precinct.model';
import { CampaignService } from 'src/app/services/campaign.service';
import { Campaign } from 'src/app/models/campaign.model';

@Component({
    templateUrl: './precinctPlanningSummary.html',
    styleUrls: ['../../../campaignMap.component.scss'],
    styles: [`
      .planning-content { width: 100%; }
      .section-title { margin: 0 0 8px; font-size: 15px; font-weight: 500; }
      .hint { margin: 0 0 8px; font-size: 13px; opacity: 0.65; }
      .saved-tables { margin-bottom: 8px; }
      .saved-row { display: flex; align-items: center; gap: 12px; padding: 6px 10px; margin-bottom: 6px;
                   border: 1px solid rgba(0, 0, 0, 0.12); border-left: 3px solid transparent; border-radius: 4px; }
      .saved-row.loaded { border-left-color: #193155; background: rgba(25, 49, 85, 0.06); }
      .row-icon { opacity: 0.6; }
      .group-name { flex: 1 1 auto; font-weight: 500; }
      .generate-field { margin-top: 8px; }
      .table-title { margin: 8px 0; font-size: 15px; }
      .table-title .count { opacity: 0.65; margin-left: 4px; }
      .table-wrapper { max-height: 55vh; overflow: auto; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 4px; }
      .precinct-table { width: 100%; border-collapse: collapse; }
      .precinct-table th, .precinct-table td { padding: 6px 12px; border-bottom: 1px solid rgba(0, 0, 0, 0.08); text-align: left; }
      .precinct-table thead th { position: sticky; top: 0; z-index: 1; background: #fafafa; font-weight: 600; }
      .precinct-table tbody tr:nth-child(even) { background: rgba(0, 0, 0, 0.02); }
      .precinct-table tbody tr:hover { background: rgba(25, 49, 85, 0.06); }
      .precinct-table .num { text-align: right; font-variant-numeric: tabular-nums; }
      .precinct-table .precinct-cell { white-space: nowrap; }
      .precinct-table .precinct-cell button { margin-right: 4px; }
      .precinct-table tfoot td { position: sticky; bottom: 0; background: #f0f2f5; font-weight: 600; border-top: 2px solid rgba(0, 0, 0, 0.2); }
      .empty-state { display: flex; flex-direction: column; align-items: center; padding: 32px 16px; text-align: center; color: rgba(0, 0, 0, 0.55); }
      .empty-state mat-icon { font-size: 48px; height: 48px; width: 48px; margin-bottom: 8px; opacity: 0.6; }
      .empty-state p { margin: 0; font-size: 15px; }
    `],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class PrecinctPlanningSummaryDialog implements OnInit{
  sortedData: any[] = [];
  loadingTable: boolean = false;

  campaignWideGroups: Group[] = [];
  
  selectedCampaignDefaultGroupID: string;

  loadedGroupByPrecinctTableGroup: Group;
  
  generatedGroupByPrecinctTableGroups: Group[] = []

  // Footer totals for the loaded table
  get totals(){
    return this.sortedData.reduce((t, p) => ({households: t.households + (Number(p.households) || 0), residents: t.residents + (Number(p.residents) || 0)}), {households: 0, residents: 0})
  }

  constructor(
        @Inject(MAT_DIALOG_DATA) public registrationPrecincts: RegistrationPrecinct[],
        public dialogRef: MatDialogRef<PrecinctPlanningSummaryDialog>, 
        public groupService: GroupService,
        public orgService: OrganizationService,
        private precinctService: PrecinctService,
        private campaignService: CampaignService,
        private snackBar: MatSnackBar,
    ) {}

  ngOnInit(){
    this.getAllCampaignGroups()
    this.getCampaign();
  }

  getAllCampaignGroups(){
    var campaignID = parseInt(sessionStorage.getItem('campaignID'));
    this.groupService.getAllCampaignGroups(campaignID).subscribe((groups: any[])=>{
      
      this.campaignWideGroups = groups.filter((group: Group) => {
        return (group.campaignWide) && group.active
      })
      this.getGeneratedGroupByPrecinctTables()
    });
  }

  generateNewGroupByPrecinctTable(group: Group){
    if(this.generatedGroupByPrecinctTableGroups.includes(group)) return;
    this.loadingTable = true;
    this.getPrecinctList(group)
  }

  loadGroupByPrecinctTable(group: Group){
    this.loadingTable = true;
    this.getPrecinctList(group)
  }

  updateCampaignDefaultGroup(group: any): void {
    this.selectedCampaignDefaultGroupID = group._id;

    this.campaignService.updateCampaignDefaultGroup(group.campaignID, group._id).subscribe(
      (campaign: Campaign) => {
        this.snackBar.open(`Default group set to "${group.name}".`, 'Dismiss', {duration: 2500})
      },
      (error) => {
        console.error('Error updating campaign default group:', error);
        this.snackBar.open("Couldn't change the default group. Please try again.", 'Dismiss', {duration: 3000})
      }
    );
  }

  getPrecinctList(group: Group){
    this.groupService.getGroupByPrecinct(group).subscribe(
      (results: any[]) =>{
        this.loadingTable = false
        this.loadedGroupByPrecinctTableGroup = group;
        this.sortedData = results || []
        // A newly generated table now appears in the saved list
        this.getGeneratedGroupByPrecinctTables()
      },
      error =>{
        console.log(error)
        this.loadingTable = false
      })
  }

  findOnMap(precinctID: string){
    this.precinctService.getPrecinct(precinctID).subscribe((precinct: any) =>{
      this.dialogRef.close({precinct: precinct});
    })
  }

  return(){
    this.dialogRef.close()
  }

  sortData(sort: Sort) {
    const data = this.sortedData.slice();
    if (!sort.active || sort.direction === '') {
      this.sortedData = data;
      return;
    }

    this.sortedData = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'precinctID':
          return compare(a.precinctID, b.precinctID, isAsc);
        case 'hh':
          return compare(a.households, b.households, isAsc);
        case 'res':
          return compare(a.residents, b.residents, isAsc);
        default:
          return 0;
      }
    });
  }


    exportPrecinctTable(){
      const csv = convertToCSV(this.sortedData);
      let downloadLink = document.createElement('a');
  
      let blob = new Blob([csv] , {type: 'blob'});
      downloadLink.href = window.URL.createObjectURL(blob);

      var filename: string = this.loadedGroupByPrecinctTableGroup ? this.loadedGroupByPrecinctTableGroup.name + '_precinct_table.csv' : 'precinct_table.csv';

      downloadLink.setAttribute('download', filename);
      document.body.appendChild(downloadLink);
      downloadLink.click();
    }

  displayOnMap(){
    this.dialogRef.close({result: this.sortedData})
  }

  clearTable(){
    this.loadingTable = true;
    this.groupService.clearGroupByPrecinct(this.loadedGroupByPrecinctTableGroup).subscribe(
      (result: any) =>{
        if(result){
          this.sortedData = []
          this.loadedGroupByPrecinctTableGroup = null
          this.getGeneratedGroupByPrecinctTables()
        }
        this.loadingTable = false;
      },
      error =>{
        console.log(error)
        this.loadingTable = false
      }
    )
  }

  getGeneratedGroupByPrecinctTables() {
    var campaignID = parseInt(sessionStorage.getItem('campaignID'));

    this.groupService.getGeneratedGroupByPrecinctTables(campaignID).subscribe(
      (groupIDs: string[]) => {
        this.generatedGroupByPrecinctTableGroups = this.campaignWideGroups.filter(group => {
          return groupIDs.includes(group._id.toString());
        });
      }
    );
  }

  getCampaign(){
    let campaignID = parseInt(sessionStorage.getItem('campaignID'));
    this.campaignService.getCampaign(campaignID).subscribe((campaign: Campaign) => {
      this.selectedCampaignDefaultGroupID = campaign.defaultCampaignWideGroupID;
    });
  }
}

function compare(a: number | string, b: number | string, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

function convertToCSV(data) {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(item =>
      headers.map(header => JSON.stringify(item[header], replacer)).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function replacer(key, value) {
  if (value === null) return '';
  return value;
}