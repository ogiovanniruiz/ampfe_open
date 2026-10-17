import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import { Incident } from 'src/app/models/hotline.model';
import { HotlineService } from 'src/app/services/hotline.service';
import { EditIncidentDialog } from '../editIncident/editIncident';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { User } from 'src/app/models/user.model';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    selector: 'app-hotline',
    templateUrl: './incidents.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class IncidentsDialog implements OnInit{


  constructor(public dialog: MatDialog, public hotlineService: HotlineService, public dialogRef: MatDialogRef<IncidentsDialog>, ) { }
  
  displayedColumns: string[] = ['categories', 'status', 'severity', 'active', 'created_by', 'location', 'created_on', 'edit', 'delete'];

  screenSize: string = '75%'

  incidents: Incident[] = []

  exportedIncidents: unknown[] = []

  dev: boolean = false;

  return(){this.dialogRef.close()}

  ngOnInit(){
    this.getIncidents();
        var user: User=  JSON.parse(sessionStorage.getItem('user'))
        this.dev = user.dev
        
  }

  getIncidents(){
    var orgID: string = sessionStorage.getItem('orgID')
    this.hotlineService.getIncidents(orgID).subscribe((incidents: Incident[]) => {
      this.incidents = incidents
    })
  }

  openEditIncidentDialog(incident: Incident){
    const dialogRef = this.dialog.open(EditIncidentDialog, {data: incident, autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
    dialogRef.afterClosed().subscribe((results) => {

      if(results){
        this.getIncidents()
      }
    })
  
  }

  async deleteIncident(incidentID: string){
    if((await confirmAction(this.dialog, {title: 'Delete this incident?', message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))){
      this.hotlineService.deleteIncident(incidentID).subscribe((result) => {
        this.getIncidents()
      })
    }
  }

  
  cleanIncidents(){
    this.exportedIncidents = this.incidents.map(incident => {

      return {
        ICE_ALERT: incident.categories.includes("ICE_ALERT"),
        DHS_ALERT: incident.categories.includes("DHS_ALERT"),
        SHERIFF_ALERT: incident.categories.includes("SHERIFF_ALERT"),
        OTHER_LAW_ENFORCEMENT: incident.categories.includes("OTHER_LAW_ENFORCEMENT"),
        status: incident.status,
        severity: incident.severity,
        firstReport: incident.reports[0].notes,
        numReports: incident.reports.length,
        active: incident.active,
        created_by: incident.user.name.fullName,
        created_on: incident.date_created,
        address: incident.address.address,
        city: incident.address.city,
        state: incident.address.state,
        zip: incident.address.zip,
      }

    })
  }

  exportIncidents(){
    this.cleanIncidents()

    const csv = convertToCSV(this.exportedIncidents);

    let downloadLink = document.createElement('a');

    let blob = new Blob([csv] , {type: 'blob'});
    downloadLink.href = window.URL.createObjectURL(blob);
    /*
    if(!this.selectedStartDate || !this.selectedStartDate){
      var filename: string = 'OutreachSummaryReport.csv'
    }else{
      var filename: string = this.selectedStartDate + '_' + this.selectedStartDate + '_OutreachSummaryReport.csv'
    }*/

    var filename = 'incidents.csv'

    downloadLink.setAttribute('download', filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
   
  }
}

function convertToCSV(data) {

  if (data.length === 0) return '';

  var objectWithMostAttributes =  findObjectWithMostAttributes(data)

  const headers = Object.keys(objectWithMostAttributes);

  const rows = data.map(item =>
      headers.map(header => JSON.stringify(item[header], replacer)).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function replacer(key, value) {
  if (value === null) return '';
  return value;
}

function findObjectWithMostAttributes(objects) {
  let maxAttributes = 0;
  let objectWithMostAttributes = null;

  objects.forEach(obj => {
      const numAttributes = Object.keys(obj).length;
      if (numAttributes > maxAttributes) {
          maxAttributes = numAttributes;
          objectWithMostAttributes = obj;
      }
  });

  return objectWithMostAttributes;
}