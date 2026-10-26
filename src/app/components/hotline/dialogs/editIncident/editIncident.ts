import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Alert, Incident } from 'src/app/models/hotline.model';
import { User } from 'src/app/models/user.model';
import { HotlineService } from 'src/app/services/hotline.service';
import { CreateAlertDialog } from '../createAlert/createAlert';

@Component({
    selector: 'app-hotline',
    templateUrl: './editIncident.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class EditIncidentDialog implements OnInit{

  constructor(public dialog: MatDialog, 
             public hotlineService: HotlineService, 
             public dialogRef: MatDialogRef<EditIncidentDialog>, 
            @Inject(MAT_DIALOG_DATA) public incident: Incident,
            ) { }
  
  @ViewChild('categories', {static: true}) categories: ElementRef;
  @ViewChild('status', {static: true}) status: ElementRef;
  @ViewChild('severity', {static: true}) severity: ElementRef;

  @ViewChild('address', {static: true}) address: ElementRef;
  @ViewChild('address2', {static: true}) address2: ElementRef;
  @ViewChild('city', {static: true}) city: ElementRef;
  @ViewChild('state', {static: true}) state: ElementRef;
  @ViewChild('county', {static: true}) county: ElementRef;
  @ViewChild('zip', {static: true}) zip: ElementRef;
  @ViewChild('new_report', {static: true}) new_report: ElementRef;

  displayedColumns: string[] = ['categories', 'status', 'created_by', 'location', 'created_on'];

  disableAnimation = true;

  alerts: Alert[] = []

  userMessage: string = ""
  displayMessage: boolean = false

  active: boolean;

  screenSize: string = '75%'

  
  ngOnInit(){
    this.prefillIncidentData()
    this.getAlerts()
  }

  return(){
    this.dialogRef.close()
  }

  prefillIncidentData(){
    this.severity['value'] = this.incident.severity
    this.categories['value'] = this.incident.categories
    this.state['value'] = this.incident.address.state
    this.status['value'] = this.incident.status
    this.county['value'] = this.incident.address.county

    this.address.nativeElement.value = this.incident.address.address
    this.address2.nativeElement.value = this.incident.address.address2
    this.city.nativeElement.value = this.incident.address.city
    this.zip.nativeElement.value = this.incident.address.zip

  }

  saveChanges(){

    if(this.address.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = "Address Needed."
      return
    } 

    if(this.city.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = "City Needed."
      return
    } 

    if(this.zip.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = "Zip Needed."
      return
    } 

    if(!this.categories['value'] || this.categories['value'].length === 0){
      this.displayMessage = true;
      this.userMessage = "Categories Needed."
      return
    } 

    if(!this.status['value']){
      this.displayMessage = true;
      this.userMessage = "Status Needed."
      return
    } 

    if(!this.severity['value']){
      this.displayMessage = true;
      this.userMessage = "Severity Needed."
      return
    } 

    if(!this.state['value']){
      this.displayMessage = true;
      this.userMessage = "State Needed."
      return
    } 

    if(!this.county['value']){
      this.displayMessage = true;
      this.userMessage = "County Needed."
      return
    } 

    var orgID: string = sessionStorage.getItem('orgID')
    var user: User = JSON.parse(sessionStorage.getItem('user'))
    
    var newIncidentAddress = {address: this.address.nativeElement.value, 
                              address2: this.address2.nativeElement.value,
                              city: this.city.nativeElement.value,
                              state: this.state['value'],
                              county: this.county['value'],
                              zip: this.zip.nativeElement.value,
                            }

    var newIncident: Incident = {
      categories: this.categories['value'],
      status: this.status['value'],
      severity: this.severity['value'],
      orgID: orgID,
      _id: this.incident._id, 
      user: user,
      address: newIncidentAddress,
      active: this.active,
      reports: this.incident.reports
    }

    if(this.new_report.nativeElement.value != ""){
      newIncident.reports.push({notes: this.new_report.nativeElement.value, userID: user._id, userName: user.name.fullName})
    } 

    this.hotlineService.editIncident(newIncident).subscribe((incident: Incident) =>{
      if(incident){
        this.dialogRef.close(incident)
      }
    })
  }

  toggleActive(check: boolean){
    this.active = check
  }

  openCreateAlertDialog(){
    const dialogRef = this.dialog.open(CreateAlertDialog, {autoFocus: false, width: this.screenSize, data: this.incident, maxWidth: this.screenSize});
    dialogRef.afterClosed().subscribe((alert: Alert) => {
      if(alert){
        this.dialogRef.close(alert)
      }
    })
    
  }

    getAlerts(){
      var orgID: string = sessionStorage.getItem('orgID');
  
      var activeIncidentIDs: string[] = [this.incident._id]
  
      this.hotlineService.getAlerts(orgID, activeIncidentIDs).subscribe((alerts: Alert[]) =>{
        this.alerts = alerts

      })
    }
  
}