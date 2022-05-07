import { Component, OnInit, NgZone  } from '@angular/core';
import * as L from 'leaflet';
import * as geojson from 'geojson';
import {MatDialog} from '@angular/material/dialog';

import {ActivityService} from '../../services/activity/activity.service';
import {TargetSummaryDialog} from './dialogs/summary/targetSummaryDialog';
import {CreatePolygonDialog} from './dialogs/polygon/createPolygon/createPolygonDialog';
import { EditPolygonDialog } from './dialogs/polygon/editPolygon/editPolygonDialog';
import {CampaignService } from 'src/app/services/campaign/campaign.service';
import {SearchDialog} from './dialogs/search/searchDialog';

import {TargetCreatorDialog} from './dialogs/targetCreator/targetCreatorDialog';
import {GeometryService} from '../../services/geometry/geometry.service';

import * as turf from '@turf/turf';

import 'leaflet-lasso';

import * as JSZip from 'jszip';

declare var shpwrite: any;

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

  outReachReport: unknown[] = [];
  geographical: boolean;

  polys = [];
  polygons: L.FeatureGroup = L.featureGroup();
  loadPolys: boolean = false;

  loadingBlockgroups: boolean = false;
  loadBlockgroups: boolean = false;

  loadingBlocks: boolean = false;
  loadBlocks: boolean = false;

  loadingPrecincts: boolean = false;
  loadPrecincts: boolean = false;

  drawsCreated;
  drawnItems: L.FeatureGroup = L.featureGroup();

  lasso;

  downloading: boolean = false

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
    
    this.leafletMap.createPane('b').style.zIndex = '603';
    this.leafletMap.createPane('bg').style.zIndex = '602';
    this.leafletMap.createPane('prec').style.zIndex = '601';

    map.on('overlayadd', this.overlayadd);
    map.on('overlayremove', this.onOverlayRemove);

    this.layersControl.overlays['Blockgroups'] = L.featureGroup();
    this.layersControl.overlays['Blocks'] = L.featureGroup();
    this.layersControl.overlays['Precincts'] = L.featureGroup();

    this.lasso = L.control.lasso({ intersect: true }).addTo(map).setPosition('topright')

    map.on('lasso.finished', (event: any) => {
      
      var polygonList = []

      var toolTip: string = 'Click to disolve layers into a Polygon.';
      for(var i = 0; i < event.layers.length; i++){
        if(!event.layers[i].feature.properties.districtType){
          polygonList.push(event.layers[i])
          event.layers[i].remove()
        }
      }

      this.jsonPolygonCreated = unify(polygonList).toGeoJSON()['features'][0];

      if(polygonList[0].feature.properties.type === "BLOCKGROUP"){
        this.jsonPolygonCreated.properties.demographics = this.calculateDemographics(polygonList)
      }

      this.drawsCreated = unify(polygonList).on('click', this.openNewPolygonDialog, this).setStyle({color: 'red', opacity: 0.5, fillOpacity: 0.1}).bindTooltip(toolTip);
      this.drawnItems.addLayer(this.drawsCreated);
      this.layersControl.overlays[this.orgName].addLayer(this.drawsCreated);

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

    if(e.name === 'Blocks'){
      this.loadBlocks = true;
      if(this.zoom >= this.loadingZoomLevel) {
        this.bounds = this.leafletMap.getBounds();
        this.getBlocks(this.bounds);
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
    if (e.target._zoom >= this.loadingZoomLevel && !this.loadingBlockgroups && !this.loadingPrecincts && !this.loadingBlocks){
      this.bounds = this.leafletMap.getBounds();
      this.getBlockgroups(this.bounds);
      this.getBlocks(this.bounds);
      this.getPrecincts(this.bounds);
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
    this.drawsCreated = draw.layer.on('click', this.openNewPolygonDialog, this).bindTooltip('Click to create a new Polygon.');
    this.drawnItems.addLayer(this.drawsCreated);

    this.layersControl.overlays[this.orgName].addLayer(this.drawsCreated);
    this.polygons = this.layersControl.overlays[this.orgName];
  }

  drawEdited(draw: any){
    this.jsonPolygonCreated = draw.layers.toGeoJSON().features[0]
  }

  getCampaignBoundary(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    this.campaignService.getCampaignBoundary(campaignID).subscribe(
      (boundary: any) =>{
        this.campaignBoundary = boundary;
        //console.log(this.campaignBoundary)

        //var geometry = this.campaignBoundary.map(x => {return x.geometry.coordinates})

       //console.log(geometry)

        //var polygonLayer = L.polygon(geometry).toGeoJSON()
        //console.log(polygonLayer)

        

        let layer = L.geoJSON(this.campaignBoundary, {onEachFeature: onEachFeature.bind(this)}).addTo(this.leafletMap)

        function onEachFeature(feature: any, layer: any){
          if(feature.properties.districtType) {
            var layerName: string = feature.properties.districtType + ' ' + feature.properties.name;
            layer.bindTooltip(layerName).setStyle({fillColor: 'purple', color: 'black', opacity: 1, fillOpacity: 0.0});
          }
        }
        var center = layer.getBounds().getCenter();
        setTimeout(() => {
            this.center = [center.lat, center.lng];
            this.leafletMap.fitBounds(layer.getBounds());
            this.getPolygons();
        });
        this.layersControl.overlays['Campaign Boundary'] = layer;
      }
    );
  }

  async getPolygons(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID');

    this.geoService.getPolygons(campaignID, orgID).subscribe(
      (polys: any) =>{

        //this.polys = polys[0].polys;

        for(var i = 0; i < polys.length; i++){
          if(polys[i].orgID === orgID){
            this.orgName = polys[i].orgName + ' Polygons';
            this.polys = polys[i].polys;
          }

          let layerPoly = L.geoJSON(polys[i]['polys'], {onEachFeature: onEachFeature.bind(this)});
          this.layersControl.overlays[polys[i].orgName + ' Polygons'] = layerPoly;
        }

        function onEachFeature(feature, layerP){
          if(orgID === feature.properties.orgID){

            var tool_tip = feature.properties.name

            //if(feature.properties.demographics){
              //tool_tip = tool_tip + '<br>' + "Total Households: "  + feature.properties.demographics.total_hh
           // }

            layerP.bindTooltip(tool_tip).setStyle({color: 'green'}).on('mouseup', this.openEditPolygonDialog, this).on('mousedown', this.getSelected, feature);
          }else{
            layerP.bindTooltip(feature.properties.name).setStyle({color: 'orange'});
          }
        }
    });
  }

  async getBlockgroups(bounds: any){
    this.loadingBlockgroups = true;
 

    if(this.loadBlockgroups) {
      this.geoService.getBlockgroupsByBounds(bounds).subscribe(async (targets: any) => {

        let layerBlockgroup = L.geoJSON(targets, {pane: 'bg', onEachFeature: onEachFeature.bind(this)});

        function onEachFeature(feature, layerBG) {
          var tractData = 'GeoID: ' + feature.properties.geoid    
          layerBG.bindTooltip(tractData)

        }

        this.layersControl.overlays['Blockgroups'].removeLayer(this.layersControl.overlays['Blockgroups'].getLayers()[0]);
        layerBlockgroup.addTo(this.layersControl.overlays['Blockgroups']);
        this.loadingBlockgroups = false;
      });
    } else {
      this.loadingBlockgroups = false;
    }
  }

  async getBlocks(bounds: any){
    this.loadingBlocks = true;

    if(this.loadBlocks) {

      this.geoService.getBlocksByBounds(bounds).subscribe(async (targets: any) => {

        let layerBlock = L.geoJSON(targets, {pane: 'b', onEachFeature: onEachFeature.bind(this)});

        function onEachFeature(feature, layerB) {
          var tractData = 'GeoID: ' + feature.properties.geoid
          
          if(feature.properties.demographics.cvap/feature.properties.demographics.lcvap < 2){
            layerB.bindTooltip(tractData).setStyle({fillcolor:'blue',color: "Orange"})
          }else{
            layerB.bindTooltip(tractData)
          }
        }

        this.layersControl.overlays['Blocks'].removeLayer(this.layersControl.overlays['Blocks'].getLayers()[0]);
        layerBlock.addTo(this.layersControl.overlays['Blocks']);
        this.loadingBlocks = false;
      });
    } else {
      this.loadingBlocks = false;
    }
  }

  async getPrecincts(bounds: any){
    this.loadingPrecincts = true;

    if(this.loadPrecincts) {
      this.geoService.getPrecinctsByBounds(bounds).subscribe(async (targets: any) => {

        let layerPrecinct = L.geoJSON(targets, {pane: 'prec', onEachFeature: onEachFeature.bind(this)});

        function onEachFeature(feature, layerPrec) {
          var tractData = 'Precinct Number: ' + feature.properties.precinctID;
          layerPrec.bindTooltip(tractData)
        }

        this.layersControl.overlays['Precincts'].removeLayer(this.layersControl.overlays['Precincts'].getLayers()[0]);
        layerPrecinct.addTo(this.layersControl.overlays['Precincts']);

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

  openNewPolygonDialog() {
    this.zone.run(() => {
      const dialogRef = this.dialog.open(CreatePolygonDialog, {data: this.jsonPolygonCreated, width: "50%"});
      dialogRef.afterClosed().subscribe(results => {

        if(!results) return

        L.geoJSON(results.polygon, {onEachFeature: function(feature, polygonLayer){
          polygonLayer.bindTooltip(feature.properties.name).setStyle({fillColor: 'green', color: 'green'}).on('mouseup', this.openEditPolygonDialog, this).on('mousedown', this.getSelected, feature);
          this.layersControl.overlays[this.orgName].addLayer(polygonLayer);
        }.bind(this)});

        this.layersControl.overlays[this.orgName].removeLayer(this.drawsCreated);
        this.polygons = this.layersControl.overlays[this.orgName];
        this.polys.push(results.polygon)
        
        this.leafletMap.eachLayer(function(layer: L.Layer){
          if(layer.getTooltip()){
            if(layer.getTooltip()['_content'] === 'Click to disolve layers into a Polygon.' ||
               layer.getTooltip()['_content'] === 'Click to create a new Polygon.'
            ){
              layer.remove();
            }
          }
        });
      });
    });
  }

  openEditPolygonDialog(){
    var _id: string = this.selected._id;

    this.zone.run(() =>{
      const dialogRef = this.dialog.open(EditPolygonDialog, {data: this.selected, width: "50%"})
      dialogRef.afterClosed().subscribe(results => {
        if(!results) return

        if(results.delete){
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

        if(results.polygon){
          var polygons = this.layersControl.overlays[this.orgName];
          for(var i = 0; i < polygons.getLayers().length; i++){
            if (polygons.getLayers()[i].feature && polygons.getLayers()[i].feature._id === results.polygon._id) {
              polygons.getLayers()[i]._tooltip._content = results.polygon.properties.name
              polygons.getLayers()[i].feature.properties.name = results.polygon.properties.name
              polygons.getLayers()[i].feature.properties.description = results.polygon.properties.description
            }
          }
        }
      })
    })

  }

  openTargetSummary() {
    this.zone.run(() => {
      this.dialog.open(TargetSummaryDialog, {data: this.campaignBoundary, width: '50%'});
    });
  }

  openTargetCreatorDialog() {
    this.zone.run(() => {
      this.dialog.open(TargetCreatorDialog, {data: {campaignBoundary: this.campaignBoundary,
                                                    polys: this.polys.sort()},
                                             width: '50%'});
    })
  }

  openSearchDialog() {

    this.zone.run(() => {
      const dialogRef = this.dialog.open(SearchDialog, {width: "50%"});
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

  ngOnInit(): void {
    this.getCampaignBoundary();
  }

  downloadPolygons(){
    this.downloading = true;

    const zip = new JSZip();

    var features = []

    var options = {
      folder: 'shapefiles',
      types: {
        point: 'mypoints',
        MultiPolygon: 'mypolygons',
        polygon: 'mergedPolygons'
      }
    }

    for( var i = 0; i < this.polys.length; i++){

      if(this.polys[i].properties.demographics){
        
        var old_properties = this.polys[i].properties
        var demographics = this.polys[i].properties.demographics

        this.polys[i].porperties = {}

        var flat_properties = Object.assign(old_properties, demographics);

        this.polys[i].properties = flat_properties
  
      }
      features.push(this.polys[i])

      
    }

    var folder = zip.folder('mergedPolygons');
    var geoJSON = {features: features, type: "FeatureCollection"}
    folder = shpwrite.zip(geoJSON, options, folder)

    
    zip.generateAsync({ type: 'blob' }).then((content) => {
      let downloadLink = document.createElement('a');
      downloadLink.href = window.URL.createObjectURL(content);
      downloadLink.setAttribute('download', 'MergedPolygons.zip');
      document.body.appendChild(downloadLink);
      downloadLink.click();
      this.downloading = false;
    });
  }

  calculateDemographics(data: any[]){

    console.log(data)
    if(data.length === 0) return {}

    const newTotalPop = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.totalPop,0); 
    const percentAsian = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.percentAsian,0); 

    const percentHispanic = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.percentHispanic,0);
    const percentWhite = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.percentWhite,0);
    const percentBlack = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.percentBlack,0);
    const percentIndig = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.percentIndig,0);
    const percentPI = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.percentPI,0);

    var AsianEthnicity = Number((percentAsian/data.length).toFixed(2))
    var WhiteEthnicity = Number((percentWhite/data.length).toFixed(2))
    var BlackEthnicity = Number((percentBlack/data.length).toFixed(2))
    var PIEthnicity = Number((percentPI/data.length).toFixed(2))
    var HispanicEthnicity = Number((percentHispanic/data.length).toFixed(2))
    var IndigEthnicity = Number((percentIndig/data.length).toFixed(2))

    return {totalPop: newTotalPop, percentAsian: AsianEthnicity, percentBlack: BlackEthnicity, percentHispanic: HispanicEthnicity, percentPI: PIEthnicity, percentWhite: WhiteEthnicity,percentIndig: IndigEthnicity }

  }
}

function unify(polyList: any[]) {
  for (var i = 0; i < polyList.length; ++i) {
    if (i == 0) {
      var unionTemp = polyList[i].toGeoJSON();
    } else {
      unionTemp = turf.union(unionTemp, polyList[i].toGeoJSON());
    }
  }
  return L.geoJSON(unionTemp);
}
