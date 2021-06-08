import { Component, OnInit,ViewChild, NgZone, ElementRef } from '@angular/core';
import { ActivityService } from 'src/app/services/activity/activity.service';
import { Router } from '@angular/router';
import { CanvassService } from 'src/app/services/canvass/canvass.service';
import * as L from 'leaflet';
import {MatDialog} from '@angular/material/dialog';
import {HouseholdDialog} from './dialogs/householdDilaog'
import {Activity} from '../../models/activities/activity.model'

declare global {
  interface Window { GlobalSelected: any; }
}

@Component({
  selector: 'app-canvass',
  templateUrl: './canvass.component.html',
  styleUrls: ['./canvass.component.scss']
})
export class CanvassComponent implements OnInit {

  @ViewChild('firstName', {static: false}) firstName: ElementRef
  @ViewChild('lastName', {static: false}) lastName: ElementRef
  @ViewChild('email', {static: false}) email: ElementRef
  @ViewChild('address', {static: false}) address: ElementRef
  @ViewChild('notes', {static: false}) notes: ElementRef
  
  activity: Activity
  status = "Loading Hotline..."
  errorMessage: string = '';
  displayErrorMsg: boolean = false;
  loading = true;
  showForm: boolean = false;
  activityName: string = ''
  tracking: boolean = false

  map: any

  constructor(
              private activityService: ActivityService,
              private router: Router,
              public zone: NgZone,
              public dialog: MatDialog,
              private canvassService: CanvassService
              ) { }

              options = {
                layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '...' })],
                zoom: 10,
                center: [33.971839, -117.381739],
              };

  onMapReady(map: L.Map){
    this.map = map
  }

  getCanvassHouseholds(){

    var activityID = sessionStorage.getItem('activityID')

    this.canvassService.getCanvassHouseholds(activityID).subscribe((hhRecords: any[])=> {
      for (var i = 0; i < hhRecords.length; i++) {

        var toolTip = hhRecords[i].houseHold.fullAddress1 + '<br>' +
                      hhRecords[i].houseHold.fullAddress2

        L.marker([hhRecords[i].houseHold.location.coordinates[1], hhRecords[i].houseHold.location.coordinates[0]])
        .bindTooltip(toolTip)
        .on('mouseup',this.openHouseholdDialog, this)
        .on('mousedown', this.getSelected, hhRecords[i])
        .addTo(this.map);
      }
    })
  }

  get selected() {
    return window.GlobalSelected;
  }

  public getSelected() {
    window.GlobalSelected = this;
  }

  openHouseholdDialog(){
    this.zone.run(() => {
      const dialogRef = this.dialog.open(HouseholdDialog, {data: {selected: this.selected, activity: this.activity}, width: "80%"});
      dialogRef.afterClosed().subscribe(result => {})
    })
  }

  getActivity(){
    var activityID: string = sessionStorage.getItem('activityID');
    this.activityService.getActivity(activityID).subscribe(
      (activity: Activity) =>{
          this.activity = activity
    }, error=>{
      this.errorMessage = "Sorry, could not get activity. Please refresh to try again.";
      this.loading = false;
      this.displayErrorMsg = true;
      console.log(error)
    })
  }

  ngOnInit(): void {
    this.getCanvassHouseholds()
    this.getActivity()
  }

}
