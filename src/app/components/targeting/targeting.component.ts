import { Component, OnInit, NgZone  } from '@angular/core';
import * as L from 'leaflet';
import {MatDialog} from '@angular/material/dialog';

import {ActivityService} from '../../services/activity/activity.service';
import {TargetSummaryDialog} from './dialogs/summary/targetSummaryDialog';
import {PolygonDialog} from './dialogs/polygon/polygonDialog';
import {BlockgroupDialog} from './dialogs/blockgroup/blockgroupDialog';
import { CampaignService } from 'src/app/services/campaign/campaign.service';
import {SearchDialog} from './dialogs/search/searchDialog';
import { LockingDialog } from './dialogs/precincts/lockingDialog';
import {TargetCreatorDialog} from './dialogs/targetCreator/targetCreatorDialog';
import {GeometryService} from '../../services/geometry/geometry.service';

import * as blockgroupIDSJSON from '../../../assets/blockgroupIDS.json';
import * as precinctIDSJSON from '../../../assets/precinctIDS.json';

import {AssetService} from '../../services/asset/asset.service'

import {ClinicDialog} from './dialogs/clinic/clinicDialog'

import 'leaflet-lasso';


declare global {
  interface Window { GlobalSelected: any; }
}

@Component({
  selector: 'app-targeting',
  templateUrl: './targeting.component.html',
  styleUrls: ['./targeting.component.scss']
})
export class TargetingComponent implements OnInit {

  constructor(public dialog: MatDialog,
              public zone: NgZone,
              public activityService: ActivityService,
              public campaignService: CampaignService,
              public geoService: GeometryService,
              public assetService: AssetService
  ) { }

  options = {
    layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '...' })],
    zoom: 10,
    center: [33.971839, -117.381739],
  };

  layersControl = {overlays: {}};
  orgName: string;

  filter;
  bounds: any;
  leafletMap: any;
  jsonPolygonCreated: any;
  map: any;

  center;
  zoom: number = 10;
  loadingZoomLevel: number = 12;
  marker;
  dragging: boolean = false;

  campaignBoundary;
  campaignBoundaryName;
  outReachReport: unknown[] = [];
  geographical: boolean;

  polys = [];
  polygons: L.FeatureGroup = L.featureGroup();
  loadPolys: boolean = false;

  clinics: L.FeatureGroup = L.featureGroup()

  clinicArray = []

  campaignBlockgroupIDS = [];
  blockgroupIDS = [];
  loadingBlockgroups: boolean = false;
  loadBlockgroups: boolean = false;

  campaignPrecinctIDS = [];
  precinctIDS = [];
  loadingPrecincts: boolean = false;
  loadPrecincts: boolean = false;

  drawsCreated;
  drawnItems: L.FeatureGroup = L.featureGroup();
  registeredPrecinctIDs: string[] = []

  lasso;

  selectedPrecincts: any[]

  drawOptions = {
    position: 'topright',
    draw: {
      marker: false,
      polygon: {allowIntersection: false,
                shapeOptions: {
                color: 'red'
                }},
      polyline: false,
      circle: false,
      rectangle: false,
      circlemarker: false
    },
    edit: {
      featureGroup: this.drawnItems
    }
  };

  onMapReady(map: L.Map){
    this.leafletMap = map;
    this.bounds = this.leafletMap.getBounds();

    this.leafletMap.createPane('bglock').style.zIndex = '604';
    this.leafletMap.createPane('bg').style.zIndex = '602';

    this.leafletMap.createPane('preclock').style.zIndex = '603';
    this.leafletMap.createPane('prec').style.zIndex = '601';

    this.leafletMap.createPane('precProp').style.zIndex = '600';

    map.on('overlayadd', this.overlayadd);
    map.on('overlayremove', this.onOverlayRemove);

    this.layersControl.overlays['Blockgroups'] = L.featureGroup();
    this.layersControl.overlays['Precincts'] = L.featureGroup();
    this.layersControl.overlays['Clinics'] = L.featureGroup();

    this.layersControl.overlays['Precinct Propensity'] = L.featureGroup();

    this.lasso = L.control.lasso({ intersect: true }).addTo(map).setPosition('topleft')

    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID');

    map.on('lasso.finished', (event: any) => {
      var polygonList = []
      for(var i = 0; i < event.layers.length; i++){
        if(event.layers[i].feature.properties.locked){
          for(var j = 0; j < event.layers[i].feature.properties.locked.length; j++){
            if(event.layers[i].feature.properties.locked[j].campaignID === campaignID && event.layers[i].feature.properties.locked[j].finished){
              return
            }
          }

        }

        if(event.layers[i].feature.properties.districtType != "COUNTY"){
          polygonList.push(event.layers[i].feature)
          event.layers[i].setStyle({color: 'red', opacity: 0.5, fillOpacity: 0.1})
        }
      }

      this.lockGeometries(polygonList)
    })
  }

  overlayadd = (e) =>{
    this.zoom = e.target._zoom;
    if(e.name === 'Blockgroups'){
      this.loadBlockgroups = true;
      if(this.zoom >= this.loadingZoomLevel) {
        this.bounds = this.leafletMap.getBounds();
        this.getBlockgroups(this.bounds);
      }
    }
    if(e.name === 'Precincts'){
      this.loadPrecincts = true;
      if(this.zoom >= this.loadingZoomLevel) {
        this.bounds = this.leafletMap.getBounds();
        this.getPrecincts(this.bounds);
      }
    }

    if(e.name === 'Precinct Propensity'){
      this.loadPrecincts= true;
      if(this.zoom >= this.loadingZoomLevel) {
        this.bounds = this.leafletMap.getBounds();
        this.getPrecincts(this.bounds);
      }
    }
    if(e.name === this.orgName){
      this.loadPolys = true;
    }
  }
  onOverlayRemove = (e) =>{
    if(e.name === 'Blockgroups'){
      this.loadBlockgroups = false;
    }
    if(e.name === 'Precincts'){
      this.loadPrecincts = false;
    }
    if(e.name === this.orgName){
      this.loadPolys = false;
    }
  }

  async mapStart(e: any){
    this.dragging = true;
  }
  async mapMoved(e: any){
    this.dragging = false;
    this.zoom = e.target._zoom;
    if (e.target._zoom >= this.loadingZoomLevel && !this.loadingBlockgroups && !this.loadingPrecincts){
      this.bounds = this.leafletMap.getBounds();
      await this.getBlockgroups(this.bounds);
      await this.getPrecincts(this.bounds);
    }
  }

  onDrawReady(drawControl: any) {
    this.map = drawControl.options.edit;
  }

  drawCreated(draw: any){
    if(this.drawnItems.getLayers().length){
      this.leafletMap.removeLayer(this.drawsCreated);
      this.drawnItems.removeLayer(this.drawsCreated);
      this.layersControl.overlays[this.orgName].removeLayer(this.drawsCreated);
    }
    this.jsonPolygonCreated = draw.layer.toGeoJSON();
    this.drawsCreated = draw.layer.on('click', this.createNewPoly, this).bindTooltip('Click to lock a new Poly.');
    this.drawnItems.addLayer(this.drawsCreated);

    this.layersControl.overlays[this.orgName].addLayer(this.drawsCreated);
    this.polygons = this.layersControl.overlays[this.orgName];
  }

  drawEdited(draw: any){
    this.jsonPolygonCreated = draw.layers.toGeoJSON().features[0]
  }

  onEachFeature(feature: any, layer: any){
    if(feature.properties.districtType) {
      var layerName: string = feature.properties.districtType + ' ' + feature.properties.name;
      layer.bindTooltip(layerName).setStyle({fillColor: 'purple', color: 'purple'});
    }
  }

  getCampaign(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    this.campaignService.getCampaign(campaignID).subscribe(
      (campaign: any) =>{
        this.campaignBoundary = campaign.boundary;
        this.campaignBoundaryName = campaign.boundary[0].properties.name;
        this.geographical = campaign.geographical;

        if(this.campaignBoundaryName !== 'NONE') {
          this.campaignBlockgroupIDS = campaign.blockgroupIDS;
          this.campaignPrecinctIDS = campaign.precinctIDS;

          if(!this.geographical){
            this.blockgroupIDS = campaign.blockgroupIDS;
            this.precinctIDS = campaign.precinctIDS;
          }

          let layer = L.geoJSON(this.campaignBoundary, {onEachFeature: this.onEachFeature.bind(this)}).addTo(this.leafletMap);
          var center = layer.getBounds().getCenter();

          setTimeout(() => {
            this.center = [center.lat, center.lng];
            this.leafletMap.fitBounds(layer.getBounds());
            this.getBlockgroupsTargeted();
            this.getPrecinctsTargeted();
            this.getPolygons();
          });

          this.layersControl.overlays['Campaign Boundary'] = layer;

        } else {
          if(!this.geographical) {
            this.blockgroupIDS = blockgroupIDSJSON['default'];
            this.precinctIDS = precinctIDSJSON['default'];
          }

          this.getBlockgroupsTargeted();
          this.getPrecinctsTargeted();
          this.getPolygons();
        }

      }
    );
  }

  async getPolygons(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID');

    this.geoService.getPolygons(campaignID, orgID).subscribe(
      (polys: any) =>{
        this.polys = polys[0].polys;

        for(var i = 0; i < polys.length; i++){
          if(polys[i].orgID === orgID){
            this.orgName = polys[i].orgName + ' Polygons';
          }

          let layerPoly = L.geoJSON(polys[i]['polys'], {onEachFeature: onEachFeature.bind(this)});
          this.layersControl.overlays[polys[i].orgName + ' Polygons'] = layerPoly;
        }

        function onEachFeature(feature, layerP){
          if(orgID === feature.properties.orgID){
            layerP.bindTooltip(feature.properties.name).setStyle({color: 'green'}).on('mouseup', this.selectedPolygon, this).on('mousedown', this.getSelected, feature);
          }else{
            layerP.bindTooltip(feature.properties.name).setStyle({color: 'orange'}).on('mouseup', this.selectedPolygon, this).on('mousedown', this.getSelected, feature);
          }
        }
    });
  }

  async getBlockgroupsTargeted(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID');

    this.geoService.getBlockgroups(this.campaignBlockgroupIDS, campaignID).subscribe((targets: any) => {
      let layerBlockgroup = L.geoJSON(targets, {pane: 'bglock', onEachFeature: onEachFeature.bind(this)});

      function onEachFeature(feature, layerBG) {
        var tractData = 'GeoID: ' + feature.properties.geoid;
        if (feature.properties.locked.some(locked => locked.campaignID === campaignID && locked.orgID === orgID && !locked.finished)) {
          layerBG.bindTooltip(tractData).setStyle({color: 'green'}).on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature);
          if(this.geographical){ this.blockgroupIDS.push(feature.properties.geoid); }
        } else if(feature.properties.locked.some(locked => locked.campaignID === campaignID && locked.orgID === orgID && locked.finished)){
          layerBG.bindTooltip(tractData).setStyle({color: 'purple'}).on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature);
        }else if(feature.properties.locked.some(locked => locked.campaignID === campaignID)){
          layerBG.bindTooltip(tractData).setStyle({color: 'blue'})
        } 
        else if (feature.properties.registered.some(registered => registered.campaignID === campaignID) && feature.properties.registered.some(registered => registered.orgID === orgID)) {
          layerBG.bindTooltip(tractData).setStyle({color: 'red'}).on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature);
        } else if (feature.properties.registered.some(registered => registered.campaignID === campaignID)) {
          layerBG.bindTooltip(tractData).setStyle({fillColor: '#862121', color: '#862121'}).on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature);
        }
      }

      layerBlockgroup.addTo(this.layersControl.overlays['Blockgroups']);
    });

  }

  async getBlockgroups(bounds){
    this.loadingBlockgroups = true;

    if(this.loadBlockgroups) {
      await this.geoService.getBlockgroupsByBounds(this.campaignBlockgroupIDS, bounds).subscribe(async (targets: any) => {

        let layerBlockgroup = await L.geoJSON(targets, {pane: 'bg', onEachFeature: onEachFeature.bind(this)});

        function onEachFeature(feature, layerBG) {
          var tractData = 'GeoID: ' + feature.properties.geoid + '<br>' + 
                          '% Full Vax: ' + feature.properties.demographics.percentFullVax;

          if(feature.properties.demographics.percentFullVax <= 25){
            layerBG.setStyle({color: 'brown'}).bindTooltip(tractData).on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature).bringToBack();
          }else if (feature.properties.demographics.percentFullVax > 25 && feature.properties.demographics.percentFullVax <= 50){
            layerBG.setStyle({color: 'orange'}).bindTooltip(tractData).on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature).bringToBack();
          }else if (feature.properties.demographics.percentFullVax > 50 && feature.properties.demographics.percentFullVax <= 75){
            layerBG.setStyle({color: 'yellow'}).bindTooltip(tractData).on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature).bringToBack();
          }else{
            layerBG.bindTooltip(tractData).on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature).bringToBack();
          }

        }

        this.layersControl.overlays['Blockgroups'].removeLayer(this.layersControl.overlays['Blockgroups'].getLayers()[1]);
        layerBlockgroup.addTo(this.layersControl.overlays['Blockgroups']);
        this.loadingBlockgroups = false;
      });
    } else {
      this.loadingBlockgroups = false;
    }
  }

  async getPrecinctsTargeted(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID');

    this.geoService.getPrecincts(this.campaignPrecinctIDS, campaignID).subscribe((targets: any) => {
      let layerPrecinct = L.geoJSON(targets, {pane: 'preclock', onEachFeature: onEachFeature.bind(this)});

      function onEachFeature(feature, layerPrec) {
        var tractData = 'Precinct Number: ' + feature.properties.precinctID;
        if (feature.properties.locked.some(locked => locked.campaignID === campaignID && locked.orgID === orgID && !locked.finished)) {
          layerPrec.bindTooltip(tractData).setStyle({color: 'green'})
                                          //.on('mouseup', this.selectBlock, this)
                                          //.on('mousedown', this.getSelected, feature);
          if(this.geographical){ this.precinctIDS.push(feature.properties.precinctID); }
        }else if(feature.properties.locked.some(locked => locked.campaignID === campaignID && locked.orgID === orgID && locked.finished)){
          layerPrec.bindTooltip(tractData).setStyle({color: 'purple'})
                                          .on('mouseup', this.selectBlock, this)
                                          .on('mousedown', this.getSelected, feature);

        }
        else if(feature.properties.locked.some(locked => locked.campaignID === campaignID)){
          layerPrec.bindTooltip(tractData).setStyle({color: 'black'})
          //.on('mouseup', this.selectBlock, this)
          //.on('mousedown', this.getSelected, feature);
        
        } //else if (feature.properties.registered.some(registered => registered.campaignID === campaignID) && feature.properties.registered.some(registered => registered.orgID === orgID)) {
          //layerPrec.bindTooltip(tractData).setStyle({color: 'red'})
                                          //.on('mouseup', this.selectBlock, this)
                                          //.on('mousedown', this.getSelected, feature);

        //} 
        //else if (feature.properties.registered.some(registered => registered.campaignID === campaignID)) {
         // layerPrec.bindTooltip(tractData).setStyle({fillColor: '#862121', color: '#862121'})
                                          //.on('mouseup', this.selectBlock, this)
                                          //.on('mousedown', this.getSelected, feature);
       // }
      }

      layerPrecinct.addTo(this.layersControl.overlays['Precincts']);
    });
  }

  async getPrecincts(bounds){
    this.loadingPrecincts = true;

    if(this.loadPrecincts) {
      await this.geoService.getPrecinctsByBounds(this.campaignPrecinctIDS, bounds).subscribe(async (targets: any) => {

        let layerPrecinct = await L.geoJSON(targets, {pane: 'prec', onEachFeature: onEachFeature.bind(this)});

        function onEachFeature(feature, layerPrec) {
          var tractData = 'Precinct Number: ' + feature.properties.precinctID;
          layerPrec.bindTooltip(tractData)
                   //.on('mouseup', this.selectBlock, this)
                   //.on('mousedown', this.getSelected, feature).bringToBack();
        }

        this.layersControl.overlays['Precincts'].removeLayer(this.layersControl.overlays['Precincts'].getLayers()[1]);
        layerPrecinct.addTo(this.layersControl.overlays['Precincts']);




        let layerPrecinctProp = await L.geoJSON(targets, {pane: 'prec', onEachFeature: onEachPropFeature.bind(this)});

        function onEachPropFeature(feature, layerPrec) {
          var tractData = 'Precinct Number: ' + feature.properties.precinctID + '<br>' +
                          'General Propenisty: ' + feature.properties.generalPropensity + '%<br>' +
                          'Primary Propensity: ' + feature.properties.primaryPropensity + "%"
          layerPrec.bindTooltip(tractData).bringToBack();

          if(feature.properties.generalPropensity >= 75){
            layerPrec.bindTooltip(tractData).setStyle({fillColor: 'green', color: 'green'}).bringToBack();
          }else if(feature.properties.generalPropensity < 75 && feature.properties.generalPropensity >= 50){
            layerPrec.bindTooltip(tractData).setStyle({fillColor: 'yellow', color: 'yellow'}).bringToBack();

          }else if(feature.properties.generalPropensity < 50){
            layerPrec.bindTooltip(tractData).setStyle({fillColor: 'red', color: 'red'}).bringToBack();

          }
        }

        this.layersControl.overlays['Precinct Propensity'].removeLayer(this.layersControl.overlays['Precinct Propensity'].getLayers()[0]);
        layerPrecinctProp.addTo(this.layersControl.overlays['Precinct Propensity'])

        this.loadingPrecincts = false;
      });
    } else {
      this.loadingPrecincts = false;
    }
  }

  get selected() {
    return window.GlobalSelected;
  }

  public getSelected() {
    window.GlobalSelected = this;
  }

  createNewPoly() {
    this.zone.run(() => {
      const dialogRef = this.dialog.open(PolygonDialog, {data: this.jsonPolygonCreated, width: "50%"});
      dialogRef.afterClosed().subscribe(result => {
        if(result && result['success']){

          L.geoJSON(result.polygon, {onEachFeature: function(feature, layerP){
              layerP.bindTooltip(feature.properties.name).setStyle({fillColor: 'green', color: 'green'}).on('mouseup', this.selectedPolygon, this).on('mousedown', this.getSelected, feature);
              this.layersControl.overlays[this.orgName].addLayer(layerP);
          }.bind(this)});

          this.layersControl.overlays[this.orgName].removeLayer(this.drawsCreated);
          this.polygons = this.layersControl.overlays[this.orgName];
          this.polys.push(result['polygon'])

        }
      });
    });
  }

  selectedPolygon(){
    var _id: string = this.selected._id;
    if (confirm('Would you like to delete this target from the database?')) {
      this.geoService.removePolygon(_id).subscribe(
        () => {

          var polygons = this.layersControl.overlays[this.orgName];
          for (var i = 0; i < polygons.getLayers().length; i++) {
            if (polygons.getLayers()[i].feature && polygons.getLayers()[i].feature._id === _id) {
              polygons.removeLayer(polygons.getLayers()[i]);
            }
          }
          this.polygons = polygons;

          for (var k = 0; k < this.polys.length; k++) {
            if (this.polys[k]['_id'] === _id) {
              this.polys.splice(k, 1);
            }
          }
        }
      );
    }
  }

  onEachFeatureBG(feature, layerBG) {
    var tractData = 'GeoID: ' + feature.properties.geoid;
    layerBG.bindTooltip(tractData).setStyle({color: 'red'}).on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature);
    this.layersControl.overlays['Blockgroups'].getLayers()[0].addLayer(layerBG);
  }

  onEachFeaturePREC(feature, layerPrec) {
    var tractData = 'Precinct Number: ' + feature.properties.precinctID;
    layerPrec.bindTooltip(tractData).setStyle({color: 'green'})//.on('mouseup', this.selectBlock, this).on('mousedown', this.getSelected, feature);
    this.layersControl.overlays['Precincts'].getLayers()[0].addLayer(layerPrec);
  }

  lockGeometries(polygonList){
    const dialogRef = this.dialog.open(LockingDialog, {data: polygonList});
    
    dialogRef.afterClosed().subscribe((result: any[]) =>{
      if(result){
        var layers1 = this.layersControl.overlays['Precincts'].getLayers()[1];
        var layers0 = this.layersControl.overlays['Precincts'].getLayers()[0];
        layers1.eachLayer((layer) => {
          for(var i = 0; i < result.length; i++){
            if(layer.feature._id === result[i].precinct._id){
              layer.feature.properties = result[i].precinct.properties;
            
              if(result[i].mode === 'Locked'){
                layer.setStyle({fillColor: 'green', color: 'green'});
                this.precinctIDS.push(result[i].precinct.properties.precinctID);
                L.geoJSON(layer.feature, {pane: 'preclock', onEachFeature: this.onEachFeaturePREC.bind(this)});
                return
              }

              if(result[i].mode === 'Finished'){
                layer.setStyle({fillColor: 'purple', color: 'purple'});
                this.precinctIDS = this.precinctIDS.filter(precinctID => {return precinctID !== result[i].precinct.properties.precinctID});
                L.geoJSON(layer.feature, {pane: 'preclock', onEachFeature: this.onEachFeaturePREC.bind(this)});
                return
                
              }
            }
          }
        })

        layers0.eachLayer((layer) => {
          for(var i = 0; i < result.length; i++){
            if(layer.feature._id === result[i].precinct._id){
              if(result[i].mode === 'Finished'){
                layer.feature.properties = result[i].precinct.properties;
                layer.setStyle({fillColor: 'purple', color: 'purple'});
              }

              if(result[i].mode === 'Locked'){
                layer.feature.properties = result[i].precinct.properties;
                layer.setStyle({fillColor: 'green', color: 'green'});

              }

            }
          }
        })
      }else{
        var layers1 = this.layersControl.overlays['Precincts'].getLayers()[1];
        for(var i = 0; i < polygonList.length; i++){
          layers1.eachLayer((layer) => {
            if(layer.feature._id === polygonList[i]._id){
              layer.setStyle({fillColor: 'blue', color: 'blue'});
            }
          })
        }
      }
    })
  }

  
  selectBlock() {
    if(!this.dragging) {
      this.zone.run(() => {
        const dialogRef = this.dialog.open(BlockgroupDialog, {data: this.selected});
        dialogRef.afterClosed().subscribe(result => {
          if (result && result.success) {

            if(result.type === 'Blockgroups'){ var layers = this.layersControl.overlays['Blockgroups'].getLayers()[0]; }
            if(result.type === 'Precincts'){ var layers = this.layersControl.overlays['Precincts'].getLayers()[0]; }

            if (layers.getLayers().some(layer => layer.feature._id === result.geometry._id)) {
              layers.eachLayer(function(layer) {
                if (layer.feature._id === result.geometry._id) {
                  layer.feature.properties = result.geometry.properties;
                  if (result.mode === 'locked') {
                    layer.setStyle({fillColor: 'green', color: 'green'});
                    return false;
                  }else if(result.mode === 'finished'){
                    layer.setStyle({fillColor: 'purple', color: 'purple'});
                    return false;
                  }
                  else if (result.mode === 'registered') {
                    layer.setStyle({fillColor: 'red', color: 'red'});
                    return false;
                  } else if (result.mode === 'unregister' || result.mode === 'unlocked') {
                    layers.removeLayer(layer);
                    return false;
                  }
                }
              });

              if (result.mode === 'locked' && this.geographical) {
                if(result.type === 'Blockgroups'){
                  this.blockgroupIDS.push(result.geometry.properties.geoid);
                }
                if(result.type === 'Precincts'){
                  this.precinctIDS.push(result.geometry.properties.precinctID);
                }
              }
              if (result.mode === 'unlocked' && this.geographical) {
                if(result.type === 'Blockgroups'){
                  this.blockgroupIDS = this.blockgroupIDS.filter(blockgroupID => {return blockgroupID !== result.geometry.properties.geoid});
                }
                if(result.type === 'Precincts'){
                  this.precinctIDS = this.precinctIDS.filter(precinctID => {return precinctID !== result.geometry.properties.precinctID});
                }
              }

              if (result.mode === 'finished' && this.geographical) {
                if(result.type === 'Blockgroups'){
                  this.blockgroupIDS = this.blockgroupIDS.filter(blockgroupID => {return blockgroupID !== result.geometry.properties.geoid});
                }
                if(result.type === 'Precincts'){
                  this.precinctIDS = this.precinctIDS.filter(precinctID => {return precinctID !== result.geometry.properties.precinctID});
                }
              }

            } else {
              if(result.type === 'Blockgroups'){
                L.geoJSON(result.geometry, {pane: 'bglock', onEachFeature: this.onEachFeatureBG.bind(this)});
              }
              if(result.type === 'Precincts'){
                L.geoJSON(result.geometry, {pane: 'preclock', onEachFeature: this.onEachFeaturePREC.bind(this)});
              }
            }
          }
        });
      });
    }
  }

  openTargetSummary() {
    this.zone.run(() => {
      this.dialog.open(TargetSummaryDialog, {data: this.campaignBoundary, width: '50%'});
    });
  }

  openTargetCreatorDialog() {
    this.zone.run(() => {
      this.dialog.open(TargetCreatorDialog, {data: {campaignBoundary: this.campaignBoundary,
                                                    precincts: this.precinctIDS.sort(),
                                                    blockgroups: this.blockgroupIDS.sort(),
                                                    polys: this.polys.sort(),
                                                    outReachReport: this.outReachReport
                                                  },
                                             width: '50%'});
    })
  }

  openSearchDialog() {

    if(this.campaignBoundaryName !== 'NONE'){
      var blockgroups = this.campaignBlockgroupIDS.sort();
      var precincts = this.campaignPrecinctIDS.sort();
    } else {
      var blockgroups = blockgroupIDSJSON['default'];
      var precincts = precinctIDSJSON['default'];
    }

    this.zone.run(() => {
      const dialogRef = this.dialog.open(SearchDialog, {data: {campaignBoundary: this.campaignBoundary, precincts: precincts, blockgroups: blockgroups}, width: "50%"});
      dialogRef.afterClosed().subscribe(
          async (results: unknown[]) => {
          if(results){

            var customIcon = L.icon({
              iconUrl: '../../../assets/marker-icon.png',
              shadowUrl: '../../../assets/marker-shadow.png'
            });

            if (this.marker) {
              this.marker.clearLayers();
            }

            if(!results['type']){
              this.marker = L.featureGroup();
              var group = [];

              for( var i = 0; i < results.length; i ++){
                var addressString: string = '';

                addressString = results[i]['_id']['streetNum'];

                if(results[i]['_id']['prefix']) addressString += " " + results[i]['_id']['prefix'];
                if(results[i]['_id']['street']) addressString += " " + results[i]['_id']['street'];
                if(results[i]['_id']['suffix']) addressString += " " + results[i]['_id']['suffix'];
                if(results[i]['_id']['city']) addressString += " " + results[i]['_id']['city'];

                var groupMArker = L.marker([parseFloat(results[i]['location'].coordinates[1]),parseFloat(results[i]['location'].coordinates[0])], { icon: customIcon }).addTo(this.marker);
                group.push(groupMArker);
              }

              if(group.length){
                this.marker.addTo(this.leafletMap);
                this.leafletMap.flyToBounds(this.marker.getBounds());
              }
            } else {
              const onEachFeature = function(feature, layer) {
                this.leafletMap.flyToBounds(layer['_bounds']);

                this.marker = L.layerGroup().addTo(this.leafletMap);
                L.marker(layer.getBounds().getCenter(), { icon: customIcon }).addTo(this.marker);
              }

              L.geoJSON(results['value'], {onEachFeature: onEachFeature.bind(this)});
            }
          }
        }
      );
    });
  }

  getClinics(){

    var icon = L.icon({
      iconUrl: '../assets/clinic.png',    
      iconSize:     [30, 30], // size of the icon
      shadowSize:   [50, 64], // size of the shadow
      iconAnchor:   [22, 22], // point of the icon which will correspond to marker's location
      shadowAnchor: [4, 62],  // the same for the shadow
      popupAnchor:  [-3, -26] // point from which the popup should open relative to the iconAnchor
    });
    this.assetService.getClinics().subscribe((results: any[]) =>{
      for( var i = 0; i < results.length; i ++){
        var tooltip = "Provider: " + results[i]['provider'] + '<br>' + "Address: " + results[i]['address']
        var marker = L.marker([parseFloat(results[i]['_id']['location'].coordinates[1]),parseFloat(results[i]['_id']['location'].coordinates[0])] , {icon: icon})

        marker.bindTooltip(tooltip).on('mouseup', this.openClinicDialog, this).on('mousedown', this.getSelected, results[i]);
        this.clinics.addLayer(marker)
        
      }
      this.layersControl.overlays['Clinics'] = this.clinics  
    })
  
  }

  openClinicDialog(){
    this.zone.run(() => {
      this.dialog.open(ClinicDialog, {data: this.selected, width: "50%"});
    })
  }

  ngOnInit(): void {
    this.getCampaign();
    this.getClinics();
  }

}
