import { Component, OnInit, ViewChild, HostListener, ElementRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { Alert, Dispatcher, Incident } from 'src/app/models/hotline.model';
import {MatDialog} from '@angular/material/dialog';
import { CallsDialog } from './dialogs/calls/calls';
import { IncidentsDialog } from './dialogs/incidents/incidents';
import { HotlineService } from 'src/app/services/hotline.service';
import * as L from 'leaflet';
import { CreateIncidentDialog } from './dialogs/createIncident/createIncident';
import { DispatchersDialogComponent } from './dialogs/dispatchers/dispatchers';
import { EditIncidentDialog } from './dialogs/editIncident/editIncident';
import { MessagesDialog } from './dialogs/messages/messages';
import { User } from 'src/app/models/user.model';
import { RespondersDialogComponent } from './dialogs/responders/responders';
import { ContactsDialog } from './dialogs/contacts/contacts';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';

@Component({
  selector: 'app-hotline',
  templateUrl: './hotline.component.html',
  styleUrls: ['./hotline.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class HotlineComponent implements OnInit {
    
  constructor(public dialog: MatDialog, 
              public hotlineService: HotlineService, 
              public zone: NgZone,
              private _snackBar: MatSnackBar
            ) {}

  client: any;
  incidents: Incident[] = []
  alerts: Alert[] = []
  screenSize: string = '75%'

  dispatcherAccount: Dispatcher;

  onDuty: boolean = false;

  yellowIcon = L.icon({
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
        iconUrl: '../../../assets/yellowMarker.png',
    shadowUrl: '../../../assets/marker-shadow.png'
  });

  orangeIcon = L.icon({
    iconSize: [25, 41],

    iconAnchor: [12.5, 41],
          iconUrl: '../../../assets/orangeMarker.png',
      shadowUrl: '../../../assets/marker-shadow.png'
  });

  redIcon = L.icon({
    iconSize: [25, 41],

    iconAnchor: [12.5, 41],
      iconUrl: '../../../assets/redMarker.png',
      shadowUrl: '../../../assets/marker-shadow.png'
  });

  map: any

  options = {
      layers: [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '...' })
              ],
      zoom: 10,
      center: [33.971839, -117.381739],
      
  };

  drawOptions = {
    position: 'topleft',
    draw: {
      marker: {icon: this.redIcon},
      polygon: false,
      polyline: false,
      circle: false,
      rectangle: false,
      circlemarker: false
    },
  };

  getDispatcherAccount(){
    var user: User = JSON.parse(sessionStorage.getItem('user'))

    this.hotlineService.getDispatcherAccount(user._id).subscribe((dispatcher: Dispatcher) =>{

      if(dispatcher){
        this.dispatcherAccount = dispatcher
        this.onDuty = dispatcher.on_duty
      }
    })
  }

  onMapReady(map: L.Map){
    this.map = map
  }

  onDrawCreated(draw: any){
    var coordinates = [draw.layer.editing._marker._latlng.lat, draw.layer.editing._marker._latlng.lng]
    this.createIncident(coordinates)
  }

  ngOnInit() {
    this.getDispatcherAccount()
    this.getIncidents()
  }

  openCallsDialog(){
    const dialogRef = this.dialog.open(CallsDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});

    dialogRef.afterClosed().subscribe((call: any) => {
      if(call){
        console.log("HERE")
      }
    })
  }

  openIncidentsDialog(){
    const dialogRef = this.dialog.open(IncidentsDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
    dialogRef.afterClosed().subscribe(() => {
      this.clearIncidentMap()
      this.getIncidents()
    })
  }

  openMessagesDialog(){
    const dialogRef = this.dialog.open(MessagesDialog, {data: this.selected, autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
  }

  createIncident(coordinates: Number[]){
    const dialogRef = this.dialog.open(CreateIncidentDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize, data: coordinates});

    dialogRef.afterClosed().subscribe((results) => {
      if(results){
        this.clearIncidentMap()
        this.getIncidents()
      }
    }) 
  }

  openDispatchersDialog(){
    const dialogRef = this.dialog.open(DispatchersDialogComponent, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
    dialogRef.afterClosed().subscribe(() => {
      this.getDispatcherAccount()
    }) 
  }

  openRespondersDialog(){
    const dialogRef = this.dialog.open(RespondersDialogComponent, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
    dialogRef.afterClosed().subscribe(() => {
      this.getDispatcherAccount()
    }) 
  }

  clearIncidentMap(){
    this.map.eachLayer((layer) => {
      if(!layer._url) {
         this.map.removeLayer(layer);
       }
   });
  }

  getIncidents(){
      var orgID: string = sessionStorage.getItem('orgID')
      this.hotlineService.getIncidents(orgID).subscribe((incidents: Incident[]) => {
        this.incidents = incidents
        this.getAlerts()

        for(var i = 0; i < incidents.length; i++){

          if(incidents[i].active){
            var toolTip = "<b>INCIDENT REPORTED</b><br><br>" + 
                        "<b>Category: </b> " + incidents[i].categories + "<br>" + 
                        "<b>Status:</b> " + incidents[i].status + "<br>" + 
                        "<b>Address: </b> " + incidents[i].address.address + " " + incidents[i].address.city + " " + incidents[i].address.zip + "<br>" +
                        "<b>Created On:</b> " +incidents[i].date_created + "<br><br>" +

                        "<b># Reports:</b> " +incidents[i].reports.length

            var iconUsed = this.redIcon

            if(incidents[i].severity === '1'){
              iconUsed = this.yellowIcon
            }

            if(incidents[i].severity === '2'){
              iconUsed = this.orangeIcon
            }

            var opacity = 1.0

            if(incidents[i].status === 'unconfirmed'){
              opacity = 0.5
            }

            var locationMarker = L.marker([incidents[i].location.coordinates[1], incidents[i].location.coordinates[0]], { icon:  iconUsed, opacity: opacity}).bindTooltip(toolTip).addTo(this.map);
            locationMarker.on('mouseup',this.openEditIncidentDialog, this).on('mousedown', this.getSelected, incidents[i])
          }
          }
      })
  }

  getAlerts(){
    var orgID: string = sessionStorage.getItem('orgID');

    var activeIncidentIDs: string[] = this.incidents.filter(item => item.active).map(item => item._id);

    this.hotlineService.getAlerts(orgID, activeIncidentIDs).subscribe((alerts: Alert[]) =>{
      this.alerts = alerts
      for(var i = 0; i < this.alerts.length; i++){
        var alertMarker = L.circle([this.alerts[i].coordinates[1], this.alerts[i].coordinates[0]], {radius: this.alerts[i].radius*1000, fillColor:'red', color: 'red'}).addTo(this.map);
      }
    })
  }

  get selected() {
    return window.GlobalSelected;
  }

  public getSelected() {
    window.GlobalSelected = this;
  }

  openEditIncidentDialog(){
    this.zone.run(() => {

      const dialogRef = this.dialog.open(EditIncidentDialog, {data: this.selected, autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
      dialogRef.afterClosed().subscribe((result) => {

        if(typeof result !== 'undefined'){
          this.clearIncidentMap()
          this.getIncidents()
        }
      })
    })
  }

  toggleOnDuty(check: boolean){

    if(!this.dispatcherAccount){
      return
    }
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id

    this.hotlineService.toggleOnDuty(userID, check).subscribe((dispatcher: Dispatcher) =>{
      this.dispatcherAccount = dispatcher
      this.onDuty = dispatcher.on_duty
    })
  }

  openContactsDialog(){
    const dialogRef = this.dialog.open(ContactsDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
  }
}