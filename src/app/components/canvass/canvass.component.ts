import { Component, OnInit,ViewChild, NgZone, ElementRef } from '@angular/core';
import { ActivityService } from 'src/app/services/activity/activity.service';
import { Router } from '@angular/router';
import { CanvassService } from 'src/app/services/canvass/canvass.service';
import * as L from 'leaflet';
import {MatDialog} from '@angular/material/dialog';
import {HouseHoldDialog} from './dialogs/houseHoldDialog'
import {ComplexDialog} from './dialogs/complexDialog/complexDilaog'
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

  layersControl = {overlays: {}};

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

  houseHolds: L.FeatureGroup = L.featureGroup()

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
    this.layersControl.overlays['HouseHolds'] = L.featureGroup();
  }

  getCanvassHouseHolds(){

    var activityID = sessionStorage.getItem('activityID')

    this.canvassService.getCanvassHouseHolds(activityID).subscribe((hhRecords: any[])=> {

      for (var i = 0; i < hhRecords.length; i++) {
        var toolTip = hhRecords[i].houseHold.fullAddress1 + '<br>' +
                      hhRecords[i].houseHold.fullAddress2

        var color = 'blue'
        var clickable = true;
        if(hhRecords[i].records.length > 1){
          color = 'purple'
          
          if(hhRecords[i].complete.length >= hhRecords[i].records.length){
            color = 'green'
            clickable = false
          }
        }else{

          if(hhRecords[i].complete[0] === true){
            color = 'green'
            clickable = false
          }
        }

        var marker = L.circle([hhRecords[i].houseHold.location.coordinates[1], hhRecords[i].houseHold.location.coordinates[0]], {color: color})
        .bindTooltip(toolTip)
        .addTo(this.map)

        if(clickable){
          marker.on('mouseup',this.openHouseHoldDialog, this).on('mousedown', this.getSelected, hhRecords[i])
        }

        this.houseHolds.addLayer(marker)
        
      }

      this.layersControl.overlays['HouseHolds'] = this.houseHolds  
    })
  }

  get selected() {
    return window.GlobalSelected;
  }

  public getSelected() {
    window.GlobalSelected = this;
  }

  openHouseHoldDialog(){
    this.zone.run(() => {
      if(this.selected.records.length === 1){
        const dialogRef = this.dialog.open(HouseHoldDialog, {data: {selected: this.selected, activity: this.activity}, width: "80%"});
        dialogRef.afterClosed().subscribe(result => {
          if(result){
            var layers = this.layersControl.overlays['HouseHolds']
            layers.eachLayer(function(layer) {
              if(layer._latlng.lat === result.houseHold.location.coordinates[1] && 
                 layer._latlng.lng === result.houseHold.location.coordinates[0]){
                layer.setStyle({fillColor: 'green', color: 'green'});
              }
            })
          }

        })
        return
      }

      const dialogRef = this.dialog.open(ComplexDialog, {data: {selected: this.selected, activity: this.activity}, width: "80%"});
      dialogRef.afterClosed().subscribe(result => {

        if(result === undefined){
          return
        }
        this.selected.houseHold = result
        const dialogRef2 = this.dialog.open(HouseHoldDialog, {data: {selected: this.selected, activity: this.activity}, width: "80%"});

        dialogRef2.afterClosed().subscribe(result =>{
          if(result){
            var layers = this.layersControl.overlays['HouseHolds']
            layers.eachLayer(function(layer) {
              /*
              if(layer._latlng.lat === result.houseHold.location.coordinates[1] && 
                 layer._latlng.lng === result.houseHold.location.coordinates[0]){
                layer.setStyle({fillColor: 'green', color: 'green'});
              }*/

            })
          }
        })
      })
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
    this.getCanvassHouseHolds()
    this.getActivity()
  }

}
