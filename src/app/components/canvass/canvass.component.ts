import { Component, OnInit,ViewChild, NgZone, ElementRef } from '@angular/core';
import { ActivityService } from 'src/app/services/activity/activity.service';
import { Router } from '@angular/router';
import { CanvassService } from 'src/app/services/canvass/canvass.service';
import * as L from 'leaflet';
import {MatDialog} from '@angular/material/dialog';
import {HouseHoldDialog} from './dialogs/houseHoldDialog'
import {ComplexDialog} from './dialogs/complexDialog/complexDilaog'
import {Activity} from '../../models/activities/activity.model'
import { TargetService } from 'src/app/services/target/target.service';
import { ScriptService } from 'src/app/services/script/script.service';


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
  errorMessage: string = '';
  displayErrorMsg: boolean = false;
  loading = true;
  tracking: boolean = false
  userPosition: Number[] = []

  map: any

  houseHolds: L.FeatureGroup = L.featureGroup()

  center;

  zoom: number = 10;

  script;
  nonResponseSet;

  constructor(
              private activityService: ActivityService,
              private router: Router,
              private targetService: TargetService,
              public zone: NgZone,
              public dialog: MatDialog,
              private canvassService: CanvassService,
              private scriptService: ScriptService
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

    //this.layersControl.overlays["HouseHolds"] = undefined
    //this.layersControl.overlays['HouseHolds'].removeLayer(this.layersControl.overlays['HouseHolds'].getLayers()[0]);
    //this.map.removeLayer(this.layersControl.overlays['HouseHolds'].getLayers()[0])

    var activityID = sessionStorage.getItem('activityID')

    this.canvassService.getCanvassHouseHolds(activityID).subscribe((hhRecords: any[])=> {



      for (var i = 0; i < hhRecords.length; i++) {
        var numResidents = 0

        for(var j = 0; j < hhRecords[i].records.length; j++){
          numResidents = numResidents + hhRecords[i].records[j].houseHold.residents.length
        }

        
        var toolTip = hhRecords[i].records[0].houseHold.fullAddress1 + '<br>' +
                      hhRecords[i].records[0].houseHold.fullAddress2 + '<br>' + 
                      "# Residents: " + numResidents

        var color = 'blue'
        var clickable = true;

        if(hhRecords[i].records.length > 1){
          var toolTip =  toolTip + "<br># Units: " + hhRecords[i].records.length
          color = 'purple'
          
          if(hhRecords[i].complete.length >= hhRecords[i].records.length){
            color = 'green'
            clickable = false
          }
        }else{

          if(hhRecords[i].complete[0] || hhRecords[i].passed[0]){
            color = 'green'
            clickable = false
          }
        }

        var marker = L.circle([hhRecords[i].records[0].houseHold.location.coordinates[1], hhRecords[i].records[0].houseHold.location.coordinates[0]], {color: color})
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

        var dialogData = {selected: this.selected.records[0], activity: this.activity, script: this.script, nonResponseSet: this.nonResponseSet}

        const dialogRef = this.dialog.open(HouseHoldDialog, {data: dialogData, width: "100%"});
        dialogRef.afterClosed().subscribe(result => {
          if(result){
            console.log("HERE")
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

      var dialogData = {selected: this.selected, activity: this.activity, script: this.script, nonResponseSet: this.nonResponseSet}

      const dialogRef = this.dialog.open(ComplexDialog, {data: dialogData, width: "50%"});
      
      dialogRef.afterClosed().subscribe(result => {

        if(result === undefined){
          return
        }

        this.selected.houseHold = result

        var dialogData = {selected: this.selected, activity: this.activity, script: this.script, nonResponseSet: this.nonResponseSet}
        const dialogRef2 = this.dialog.open(HouseHoldDialog, {data: dialogData, width: "100%"});

        dialogRef2.afterClosed().subscribe(result =>{
          if(result){
            this.getCanvassHouseHoldRecord(result.houseHold._id)
          }
        })
      })
    })
  }

  getCanvassHouseHoldRecord(houseHoldID){
    var activityID = sessionStorage.getItem('activityID')
    this.canvassService.getCanvassHouseHoldRecord(activityID, houseHoldID).subscribe(
      (result:any)=>{
      var layers = this.layersControl.overlays['HouseHolds']
      layers.eachLayer((layer) => {

        if(layer._latlng.lat === result[0]._id.location.coordinates[1] && 
           layer._latlng.lng === result[0]._id.location.coordinates[0]){

          layer.on('mouseup',this.openHouseHoldDialog, this).on('mousedown', this.getSelected, result[0]);

          if(result[0].complete.length >= result[0].records.length){
            layer.setStyle({fillColor: 'green', color: 'green'});
          }
        }
      })
    })
  }

  getActivity(){
    var activityID: string = sessionStorage.getItem('activityID');
    this.activityService.getActivity(activityID).subscribe(
      (activity: Activity) =>{
          this.activity = activity
          this.getTarget(this.activity.targetID)
          this.getScript(this.activity.scriptID)
          this.getNonResponseSet(this.activity.nonResponseSetID)
    }, error=>{
      this.errorMessage = "Sorry, could not get activity. Please refresh to try again.";
      this.loading = false;
      this.displayErrorMsg = true;
      console.log(error)
    })
  }

  getScript(scriptID: string){
    this.scriptService.getScript(scriptID).subscribe(
        (script: unknown) =>{
          this.script = script
        },
        error=>{
          console.log(error)
          this.displayErrorMsg = true;
          this.loading = false;
          this.errorMessage = 'There was a problem loading the script. Please refresh the page.';
        }
      )
    }
  
  getNonResponseSet(nonResponseSetID: string){
      this.scriptService.getNonResponseSet(nonResponseSetID).subscribe(
        (nonResponseSet: unknown) =>{
          this.nonResponseSet = nonResponseSet
        },
        error=>{
          console.log(error)
          this.displayErrorMsg = true;
          this.loading = false;
          this.errorMessage = 'There was a problem loading the script. Please refresh the page.';
        }
      )
    }

  getTarget(targetID: string){
    this.targetService.getTarget(targetID).subscribe(
      (target: any) =>{

        var bounderies: any = []

        for (var i = 0; i < target.properties.queries.rules.length; i++){
          if(target.properties.queries.rules[i].field === 'polygons'){
            bounderies.push(target.properties.queries.rules[i].geometry)
          }
        }

        let layer = L.geoJSON(bounderies, {onEachFeature: onEachFeature.bind(this)}).addTo(this.map)

        function onEachFeature(feature: any, layer: any){
          layer.setStyle({fillColor: 'purple', color: 'black', opacity: 1, fillOpacity: 0.0});
        }
        var center = layer.getBounds().getCenter();
        setTimeout(() => {
            this.center = [center.lat, center.lng];
            this.map.fitBounds(layer.getBounds());
            this.getCanvassHouseHolds()
        });
        this.layersControl.overlays['Campaign Boundary'] = layer;
      }
    )
  }

  reloadMap(){
    this.map.eachLayer((layer) => {
      //console.log(layer)
      if(!layer._url) this.map.removeLayer(layer);
    });

    delete this.layersControl.overlays['HouseHolds']
    this.getCanvassHouseHolds()

  }

  watchLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(this.showPosition.bind(this));
    } else {
      console.log("Geolocation is not supported by this browser.")
    }
  }

  showPosition(position){
    this.userPosition = [position.coords.latitude, position.coords.longitude]

    L.circle([position.coords.latitude, position.coords.longitude], {color: 'black'})
    .bindTooltip("You are here.")
    .addTo(this.map)

    if(this.tracking){
      this.center = this.userPosition

    }
  }

  centerUserPosition(){
    if(this.tracking){
      this.tracking = false;
      return
    }
    
    this.tracking = true
    this.center = this.userPosition
    
  }

  ngOnInit(): void {
    this.getActivity()
    this.watchLocation()
  }

}
