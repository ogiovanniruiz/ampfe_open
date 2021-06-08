import { Component, OnInit, NgZone, ViewChild, ElementRef, AfterViewInit, HostListener, ViewEncapsulation} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import * as L from 'leaflet';
import {CreateCOIDialog} from './dialogs/createCOIDialog';
import {AssetService} from '../../services/asset/asset.service';
import {User} from '../../models/users/user.model';
import {ShepherdService} from 'angular-shepherd';

import {EditCOIDialog} from './dialogs/editCOIDialog/editCOIDialog';
import {CloneCOIDialog} from './dialogs/cloneDialog/cloneCOIDialog';
import {GeometryService} from '../../services/geometry/geometry.service';
import {CampaignService} from 'src/app/services/campaign/campaign.service';
import {OrganizationService} from '../../services/organization/organization.service';
import {SearchDialog} from './dialogs/search/searchDialog';
import {TutorialDialog} from './dialogs/tutorial/tutorialDialog';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet-lasso';

import * as JSZip from 'jszip';

import domtoimage from 'dom-to-image';

declare var shpwrite: any;

import { createCOI, cloneCOI, editCOI, deleteCOI, defaultStepOptions} from './tutorial-data';
import { createCOI_spanish, cloneCOI_spanish, editCOI_spanish, deleteCOI_spanish} from './tutorial-data_spanish';
import * as blockgroupIDSJSON from '../../../assets/blockgroupIDS.json';
import * as turf from '@turf/turf';

declare global {
  interface Window { GlobalSelected: any; }
}

@Component({
  selector: 'app-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AssetsComponent implements OnInit {

  constructor(public zone: NgZone,
    public dialog: MatDialog,
    public assetService: AssetService,
    public geoService: GeometryService,
    public campaignService: CampaignService,
    public orgService: OrganizationService,
    private shepherdService: ShepherdService
    ) { }

  options = {
    layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '...' })],
    zoom: 10,
    center: [33.971839, -117.381739],
  };

  @ViewChild('container', {static: true}) container: ElementRef;

  layersControl = {overlays: {}};
  orgNames = {};
  map: L.Map;
  bounds: any;
  marker;

  center;
  campaignBoundary;

  coiIDS = {};
  cois: L.FeatureGroup = L.featureGroup();
  counties: L.FeatureGroup = L.featureGroup();
  cities: L.FeatureGroup = L.featureGroup();
  jsonPolygonCreated: any;
  orgLevel: string;

  blockgroups: L.FeatureGroup = L.featureGroup();
  campaignBoundaryName;
  campaignBlockgroupIDS = [];
  loadingBlockgroups: boolean = false;
  loadBlockgroups: boolean = false;
  loadingCities: boolean = false;
  loadCities: boolean = false;
  editMode: boolean = false;

  editGeometryMode: boolean = false;
  editDetailsMode: boolean = false;

  layerLoaded = false;
  lasso;

  langMode: string = 'ENGLISH';
  innerWidth: number;
  innerHeight: number;

  downloading: boolean = false;

  dragging: boolean = false;

  rectangleLayer;

  zoom: number = 10;

  loadingZoomLevel: number = 12;

  selectedCOIName: string = ''

  totalPop: number = 0

  percentWhiteEthnicity: number = 0
  percentBlackEthnicity: number = 0
  percentHispanicEthnicity: number = 0
  percentAsianEthnicity: number = 0
  percentPIEthnicity: number = 0

  percentMale: number = 0
  percentFemale: number = 0

  shapeCreated: boolean = false

  showLassoDisclaimer: boolean = false;

  @HostListener('window:resize', ['$event'])

  onResize(event) {
    this.innerWidth = event.target.innerWidth;
    this.innerHeight = event.target.innerHeight;
  }

  toggleLangMode(){
    if(this.langMode === 'ENGLISH'){
      this.langMode = 'SPANISH';
      return;
    }

    this.langMode = 'ENGLISH';
  }

  async mapStart(e: any){
    this.dragging = true;
  }

  onMapReady(map: L.Map){
    this.map = map;
    this.bounds = map.getBounds();

    map.on('lasso.finished', (event: any) => {
      this.showLassoDisclaimer = false
      var polygonList = []

      var toolTip: string = 'Click to disolve blockgroups into a new COI.';

      if(this.langMode === 'SPANISH'){
        toolTip = "Haga clic para disolver las capas en un nuevo comunidad de interés";
      }

      //this.map.dragging.disable();
      this.layerLoaded = false;
      for(var i = 0; i < event.layers.length; i++){
        if(!event.layers[i].feature.properties.districtType){
          polygonList.push(event.layers[i])

          //console.log (event.layers[i].feature.properties.demographics)
          event.layers[i].setStyle({color: 'red', opacity: 0.5, fillOpacity: 0.1})
                         .on('click', this.createNewPoly, this)
                         .bindTooltip(toolTip);

        }
      }

      this.jsonPolygonCreated = unify(polygonList).toGeoJSON()['features'][0];
      this.calculateDemographics(polygonList)

      if (this.shepherdService.isActive){
        this.shepherdService.next();
      }
    });

    map.on('lasso.enabled', (event:any) =>{
      console.log(event)
      this.showLassoDisclaimer = true
    })

    function unify(polyList) {
      for (var i = 0; i < polyList.length; ++i) {
        if (i == 0) {
          var unionTemp = polyList[i].toGeoJSON();
        } else {
          unionTemp = turf.union(unionTemp, polyList[i].toGeoJSON());
        }
      }
      return L.geoJSON(unionTemp);
    }

    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: true,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
      drawMarker: false,
    });

    this.lasso = L.control.lasso({ intersect: true }).addTo(map).setPosition('topleft')

    map.on('pm:create', this.drawCreated);
    map.on('overlayadd', this.overlayadd);
    map.on('overlayremove', this.onOverlayRemove);

    this.layersControl.overlays['Blockgroups'] = L.featureGroup();
    this.layersControl.overlays['Cities'] = L.featureGroup();
    this.layersControl.overlays['Counties'] = L.featureGroup();
    this.getCountyDistrictBounderies()
  }

  overlayadd = (e) =>{
    this.zoom = e.target._zoom;
    if(e.name === 'Blockgroups'){
      this.loadBlockgroups = true;
      if(this.zoom >= this.loadingZoomLevel) {
        this.bounds = this.map.getBounds();
        this.getBlockgroups(this.bounds);
      }
    }
    if(e.name === 'Cities'){
      this.loadCities = true;
      if(this.zoom >= this.loadingZoomLevel) {
        this.bounds = this.map.getBounds();
        this.getCityDistrictBounderies(this.bounds);
      }
    }
  }

  onOverlayRemove = (e) =>{
    var orgID: string = sessionStorage.getItem('orgID')

    if(orgID === getKeyByValue(this.orgNames, e.name) ){
      this.editMode = false
      setTimeout(() => {
        var center = this.map.getCenter()
        this.map.panTo(center)
      })
    }

    function getKeyByValue(object, value) {
      return Object.keys(object).find(key => object[key] === value);
    }

    if(e.name === 'Blockgroups'){
      this.loadBlockgroups = false;
    }
    if(e.name === 'Cities'){
      this.loadCities = false;
    }
  }

  toggleDetailsEditing(){
    if(this.editDetailsMode){
      this.editDetailsMode = false;
      this.getCOIs();
      return;
    }

    this.editDetailsMode = true;
    this.editMode = false;
    this.getCOIs();
  }

  toggleEditing(){
    if(this.editMode){
      this.editMode = false;
      this.totalPop = 0
      this.percentAsianEthnicity = 0
      this.percentBlackEthnicity = 0
      this.percentHispanicEthnicity = 0
      this.percentWhiteEthnicity = 0
      this.percentPIEthnicity = 0

      this.percentFemale = 0
      this.percentMale = 0

      this.selectedCOIName = ''
      this.map.addControl(this.lasso);
      this.getCOIs()

      return;
    }
    this.editMode = true;
    this.editDetailsMode = false
    this.map.removeControl(this.lasso);
    this.getCOIs();
  }

  async mapMoved(e: any){
    this.dragging = false;
    this.zoom = e.target._zoom
    if (e.target._zoom >= this.loadingZoomLevel && this.layerLoaded){
      this.layerLoaded = false;
      this.bounds = this.map.getBounds();
      this.getBlockgroups(this.bounds);
    }

    if (e.target._zoom >= (this.loadingZoomLevel -1)){
      this.bounds = this.map.getBounds();
      this.getCityDistrictBounderies(this.bounds);
    }
  }


  drawCreated = (draw: any) =>{
    this.jsonPolygonCreated = draw.layer.toGeoJSON();

    var toolTip: string = 'Click to create new community of interest.';

    if(this.langMode === 'SPANISH'){
      toolTip = 'Haga clic para crear una nueva comunidad de interés';
    }

    draw.layer.on('click', this.createNewPoly, this)
              .bindTooltip(toolTip)
              .setStyle({fillColor: 'red', color: 'red', opacity: 0.5, fillOpacity: 0.1})
              .on('pm:edit', this.drawEdited, this);


    this.assetService.getNewCOIDemographics(this.jsonPolygonCreated).subscribe(
      result =>{
        this.zone.run(()=>{
          this.shapeCreated = true
          this.totalPop = result['demographics']['totalPop']
          this.percentMale = result['demographics']['percentMale']
          this.percentFemale = result['demographics']['percentFemale']
          this.percentAsianEthnicity = result['demographics']['percentAsian']
          this.percentWhiteEthnicity = result['demographics']['percentWhite']
          this.percentHispanicEthnicity = result['demographics']['percentHispanic']
          this.percentPIEthnicity = result['demographics']['percentPI']
          this.percentBlackEthnicity = result['demographics']['percentBlack']
          
          console.log(result)
      
        })

      }
    )

    if (this.shepherdService.isActive){
      Array.from(document.getElementsByClassName('leaflet-interactive')).reverse().forEach((el) => {
        if ((el['_leaflet_id']-1) === draw.layer['_leaflet_id']){
          el.classList.add('regTutorial');
          this.shepherdService.next();
        }
      });
    }

  }

  drawEdited = (draw: any) =>{
    this.assetService.editCOIGeometry(draw.layer.toGeoJSON()).subscribe(
      properties =>{
        this.zone.run(() => {
          this.totalPop = properties['demographics']['totalPop']
          this.percentAsianEthnicity = properties['demographics']['percentAsian']
          this.percentBlackEthnicity = properties['demographics']['percentBlack']
          this.percentWhiteEthnicity = properties['demographics']['percentWhite']
          this.percentHispanicEthnicity = properties['demographics']['percentHispanic']
          this.percentPIEthnicity = properties['demographics']['percentPI']
          this.percentMale = properties['demographics']['percentMale']
          this.percentFemale = properties['demographics']['percentFemale']
          this.selectedCOIName = properties['name']
        
        })
      }
    );
  }

  onEachFeature(feature: any, layer: any) {
    if (feature.properties.districtType) {
      var layerName: string = feature.properties.districtType + " " + feature.properties.name;
      layer.bindTooltip(layerName).setStyle({fillColor: 'purple', color: 'purple', opacity: 0.5, fillOpacity: 0.1}).bringToBack();
    }
  }


  getCampaign(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    this.campaignService.getCampaign(campaignID).subscribe(
        (campaign: any) =>{
          this.campaignBoundary = campaign.boundary;
          this.campaignBoundaryName = campaign.boundary[0].properties.name;

          if(campaign.boundary[0].properties.name !== 'NONE') {
            this.campaignBlockgroupIDS = campaign.blockgroupIDS;

            let layer = L.geoJSON(this.campaignBoundary, {onEachFeature: this.onEachFeature.bind(this)}).addTo(this.map);
            var center = layer.getBounds().getCenter();

            setTimeout(() => {
              this.center = [center.lat, center.lng];
              this.map.fitBounds(layer.getBounds());
              this.getCOIs();
            });

            this.layersControl.overlays['Campaign Boundary'] = layer;
          } else {
            this.getCOIs();
          }
        }
    );
  }

  getCOIs(){
    this.cois.clearLayers();
    this.coiIDS = {};
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id

      this.assetService.getCOIs(campaignID).subscribe(
        (features: any[]) =>{

          for(var i = 0; i < features.length; i++){
            var layer;
            if(features[i].orgID === orgID){
              layer = L.geoJSON(features[i]['cois'], {onEachFeature: onEachMyOrgFeature.bind(this)}).addTo(this.map)
              if(this.editMode){
                layer.pm.enable({limitMarkersToCount: 3});
              }
            }else{
              layer = L.geoJSON(features[i]['cois'], {onEachFeature: onEachOtherOrgFeature.bind(this), pmIgnore: true}).addTo(this.map);
            }

            this.orgNames[features[i].orgID] = features[i].orgName;
            this.layersControl.overlays[features[i].orgName] = layer;

          }

          function onEachMyOrgFeature(feature, layerPoly){

            var coiData = 'COI Name: ' + feature.properties.name + '<br>'

            if(feature.properties['demographics'] && !this.editMode){
              coiData = coiData +
              'ACS Estimates: <br>' +
              'Total Pop: ' + feature.properties.demographics.totalPop + '<br>' +
              '% Asian Ethnicity: ' + feature.properties.demographics.percentAsian + '<br>' +
              '% White Ethnicity: ' + feature.properties.demographics.percentWhite + '<br>' +
              '% Black Ethnicity: ' + feature.properties.demographics.percentBlack + '<br>' +
              '% Pacific Islander Ethnicity: ' + feature.properties.demographics.percentPI + '<br>' +
              '% Hispanic Ethnicity: ' + feature.properties.demographics.percentHispanic + '<br>' +
              '% Male: ' + feature.properties.demographics.percentMale + '<br>' +
              '% Female: ' + feature.properties.demographics.percentFemale;
            }

            if(this.editDetailsMode && (userID === feature.properties.userID || this.orgLevel === 'ADMINISTRATOR' || this.orgLevel === 'LEAD') ){
              layerPoly.bindTooltip(coiData)
              .setStyle({color: 'green', opacity: 0.5, fillOpacity: 0.1})
              .on('mouseup', this.editPolygon, this)
              .on('mousedown', this.getSelected, feature)
              .on('pm:edit', this.drawEdited, this)
            }else if(this.editMode && (userID === feature.properties.userID || this.orgLevel === 'ADMINISTRATOR' || this.orgLevel === 'LEAD') ){
              layerPoly.bindTooltip(coiData)
              .setStyle({color: 'green', opacity: 0.5, fillOpacity: 0.1})
              .on('pm:edit', this.drawEdited, this)

            }else{

              layerPoly.bindTooltip(coiData)
              .setStyle({color: 'green', opacity: 0.5, fillOpacity: 0.1})
            }
            this.coiIDS[feature._id] = feature.properties.name;

            this.cois.addLayer(layerPoly);
          }

          function onEachOtherOrgFeature(feature, layerPoly){
            if(this.editDetailsMode){
              layerPoly.bindTooltip(feature.properties.name)
              .setStyle({color: 'orange', opacity: 0.5, fillOpacity: 0.1})
              .on('mouseup', this.clonePolygon, this)
              .on('mousedown', this.getSelected, feature);

            }else{
              layerPoly.bindTooltip(feature.properties.name)
              .setStyle({color: 'orange', opacity: 0.5, fillOpacity: 0.1});
            }
            this.coiIDS[feature._id] = feature.properties.name;

            this.cois.addLayer(layerPoly);
          }

        this.layerLoaded = true;
        this.map.dragging.enable();

        },
        error =>{
          console.log(error)
        }
      );

  }

  getBlockgroups(bounds){

    this.blockgroups.clearLayers();
    this.layersControl.overlays['Blockgroups'].clearLayers();

    if(this.loadBlockgroups) {
      this.map.dragging.disable();
      this.loadingBlockgroups = true;

      this.geoService.getBlockgroupsByBounds(this.campaignBlockgroupIDS, bounds).subscribe((targets: any) => {

        let layerBlockgroup = L.geoJSON(targets, {onEachFeature: onEachFeature.bind(this)});

        function onEachFeature(feature, layerBG) {
          var tractData = 'GeoID: ' + feature.properties.geoid + '<br>' +
                          'ACS Estimates: <br>' +
                          'Total Pop: ' + feature.properties.demographics.totalPop + '<br>' +
                          '% Asian Ethnicity: ' + feature.properties.demographics.percentAsian + '<br>' +
                          '% White Ethnicity: ' + feature.properties.demographics.percentWhite + '<br>' +
                          '% Black Ethnicity: ' + feature.properties.demographics.percentBlack + '<br>' +
                          '% Pacific Islander Ethnicity: ' + feature.properties.demographics.percentPI + '<br>' +
                          '% Hispanic Ethnicity: ' + feature.properties.demographics.percentHispanic + '<br>' +
                          '% Male: ' + feature.properties.demographics.percentMale + '<br>' +
                          '% Female: ' + feature.properties.demographics.percentFemale;

          layerBG.bindTooltip(tractData).setStyle({opacity: 0.5, fillOpacity: 0.1}).bringToBack();
        }

        this.blockgroups.addLayer(layerBlockgroup)
        layerBlockgroup.addTo(this.layersControl.overlays['Blockgroups']);

        this.getCOIs();

        this.loadingBlockgroups = false;

      });
    } else {
      this.layerLoaded = true;
    }
  }

  getCityDistrictBounderies(bounds){

    this.cities.clearLayers();
    this.layersControl.overlays['Cities'].clearLayers();

    if(this.loadCities && this.loadingCities === false) {
      this.loadingCities = true;

      this.geoService.getCityDistrictBounderies(bounds).subscribe((result: any) =>{

        let layer = L.geoJSON(result, {onEachFeature: onEachFeature.bind(this)});

        function onEachFeature(feature, layerPoly){

          layerPoly.bindTooltip(feature.properties.name)
              .setStyle({color: 'blue', opacity: 0.1, fillOpacity: 0.1});
        }
        this.cities.addLayer(layer)
        layer.addTo(this.layersControl.overlays['Cities']);
        this.loadingCities = false;
      });

    }

  }

  getCountyDistrictBounderies(){
    this.counties.clearLayers();
    this.layersControl.overlays['Counties'].clearLayers();
    this.geoService.getCountyDistrictBounderies().subscribe((result: any) =>{
      let layer = L.geoJSON(result, {onEachFeature: onEachFeature.bind(this)});
      function onEachFeature(feature, layerPoly){

        layerPoly.bindTooltip(feature.properties.name)
            .setStyle({color: 'blue', opacity: 0.5, fillOpacity: 0.1})
      }
      this.counties.addLayer(layer)
      layer.addTo(this.layersControl.overlays['Counties']);
    })
  }


  get selected() {
    return window.GlobalSelected;
  }

  public getSelected() {
    window.GlobalSelected = this;
  }

  createNewPoly(){
    this.zone.run(() => {
      if (this.shepherdService.isActive){
        this.shepherdService.next();
      }

      const dialogRef = this.dialog.open(CreateCOIDialog, {data: {polygonCreated: this.jsonPolygonCreated, langMode: this.langMode}, width: "80%"});
      dialogRef.afterClosed().subscribe(coi => {
        if(coi){
          this.shapeCreated = false;



          if (this.shepherdService.isActive){
            if (coi === 'cancel'){
              this.shepherdService.back();
              return;
            }

            this.shepherdService.next();

            this.map.eachLayer(function(layer: L.Layer){
              if(layer.getTooltip()){
                if(layer.getTooltip()['_content'] === 'Click to create new community of interest.' ||
                    layer.getTooltip()['_content'] === 'Click to disolve blockgroups into a new COI.' ||
                    layer.getTooltip()['_content'] === 'Haga clic para disolver los grupos de bloques en un nuevo COI' ||
                    layer.getTooltip()['_content'] === 'Haga clic para crear una nueva comunidad de interés'){
                  layer.remove();
                }
              }
            });

            return;
          }

          if(coi === 'cancel'){
            this.map.eachLayer(function(layer: L.Layer){
              if(layer.getTooltip()){
                if(layer.getTooltip()['_content'] === 'Click to create new community of interest.' ||
                    layer.getTooltip()['_content'] === 'Click to disolve blockgroups into a new COI.' ||
                    layer.getTooltip()['_content'] === 'Haga clic para disolver los grupos de bloques en un nuevo COI' ||
                    layer.getTooltip()['_content'] === 'Haga clic para crear una nueva comunidad de interés'){
                  layer.remove();
                }
              }
            });
            return
          }

          let layerPoly = L.geoJSON(coi, {onEachFeature: function(feature, layerPoly){

            var coiData = 'COI Name: ' + feature.properties.name + '<br>'

            if(feature.properties['demographics'] && !this.editMode){
              coiData = coiData +
              'ACS Estimates: <br>' +
              'Total Pop: ' + feature.properties.demographics.totalPop + '<br>' +
              '% Asian Ethnicity: ' + feature.properties.demographics.percentAsian + '<br>' +
              '% White Ethnicity: ' + feature.properties.demographics.percentWhite + '<br>' +
              '% Black Ethnicity: ' + feature.properties.demographics.percentBlack + '<br>' +
              '% Pacific Islander Ethnicity: ' + feature.properties.demographics.percentPI + '<br>' +
              '% Hispanic Ethnicity: ' + feature.properties.demographics.percentHispanic + '<br>' +
              '% Male: ' + feature.properties.demographics.percentMale + '<br>' +
              '% Female: ' + feature.properties.demographics.percentFemale;
            }

              layerPoly.bindTooltip(coiData)
                  .setStyle({fillColor: 'green', color: 'green', opacity: 0.5, fillOpacity: 0.1})

              if(this.editDetailsMode){
                layerPoly.on('mouseup', this.editPolygon, this)
                    .on('mousedown', this.getSelected, feature)
              }

              this.coiIDS[feature._id] = feature.properties.name;

            }.bind(this)}).addTo(this.map);

          if(this.editMode){
            layerPoly.pm.enable();
          }

          this.cois.addLayer(layerPoly);
          this.layersControl.overlays[this.orgNames[coi.properties.orgID]].addLayer(layerPoly);

          this.map.eachLayer(function(layer: L.Layer){
            if(layer.getTooltip()){
              if(layer.getTooltip()['_content'] === 'Click to create new community of interest.' ||
                  layer.getTooltip()['_content'] === 'Click to disolve blockgroups into a new COI.' ||
                  layer.getTooltip()['_content'] === 'Haga clic para disolver las capas en un nuevo comunidad de interés' ||
                  layer.getTooltip()['_content'] === 'Haga clic para crear una nueva comunidad de interés'){
                layer.remove();
              }
            }
          });

        } else {
          if (this.shepherdService.isActive){
            this.shepherdService.back();
          }
        }
      });
    });
  }

  clonePolygon(){
    if(!this.dragging) {
      this.zone.run(() => {
        if (this.shepherdService.isActive){
          setTimeout(() => {this.shepherdService.next()}, 300);
        }
        const dialogRef = this.dialog.open(CloneCOIDialog, {data: {selected: this.selected, langMode: this.langMode}, width: "80%"});
        dialogRef.afterClosed().subscribe(coi => {
          if(coi){

            if (this.shepherdService.isActive){
              this.shepherdService.next();
              return;
            }

            L.geoJSON(coi, {onEachFeature: function(feature, layerPoly){

              if(this.editDetailsMode){
                layerPoly.bindTooltip(feature.properties.name)
                .setStyle({fillColor: 'green', color: 'green', opacity: 0.5, fillOpacity: 0.1})
                .on('mouseup', this.editPolygon, this)
                .on('mousedown', this.getSelected, feature);
              }
              else{
                layerPoly.bindTooltip(feature.properties.name)
                .setStyle({fillColor: 'green', color: 'green', opacity: 0.5, fillOpacity: 0.1})
              }

              this.cois.addLayer(layerPoly);
              this.layersControl.overlays[this.orgNames[feature.properties.orgID]].addLayer(layerPoly);
            }.bind(this)});
          }
        });
      });
    }
  }

  editPolygon(){
    if(!this.dragging) {
      this.zone.run(() => {
        if (this.shepherdService.isActive){
          setTimeout(() => {this.shepherdService.next()}, 300);
        }
        const dialogRef = this.dialog.open(EditCOIDialog, {data: {selected: this.selected, langMode: this.langMode}, width: "80%"});
        dialogRef.afterClosed().subscribe(
          (result: unknown) => {
            if(result){

              if (this.shepherdService.isActive){
                this.shepherdService.next();
                return;
              }

              if(result['delete']){
                this.deletePolygon();
              }else{
                for(var i = 0; i < this.cois.getLayers().length; i++){
                  if (this.cois.getLayers()[i]['feature']._id === this.selected._id) {
                        this.cois.getLayers()[i]['feature'].properties = result['selectedCOI'].properties;
                        console.log(result)
                        var coiData = 'Name: ' + result['selectedCOI']['properties'].name
                        this.cois.getLayers()[i].bindTooltip(coiData);
                        this.coiIDS[this.selected._id] = this.selected.properties.name;
                        return;
                  }
                }
              }

            } else {
              if (this.shepherdService.isActive){
                this.shepherdService.back();
              }
            }
        });
      });
    }
  }

  deletePolygon(){

    var orgID: string = sessionStorage.getItem('orgID')
    for (var i = 0; i < this.cois.getLayers().length; i++) {
      if (this.cois.getLayers()[i]['feature']._id === this.selected._id) {
          this.cois.removeLayer(this.cois.getLayers()[i])
          delete this.coiIDS[this.selected._id];
      }
    }

    for (var k = 0; k < this.layersControl.overlays[this.orgNames[orgID]].getLayers().length; k++) {
      if (this.layersControl.overlays[this.orgNames[orgID]].getLayers()[k].feature._id === this.selected._id) {
        this.layersControl.overlays[this.orgNames[orgID]].removeLayer(this.layersControl.overlays[this.orgNames[orgID]].getLayers()[k])
      }
    }
  }


  getOrgLevel(){
    var orgID: string = sessionStorage.getItem('orgID')
    var user: User = JSON.parse(sessionStorage.getItem('user'))

    for (var i = 0; i< user.orgPermissions.length; i++){
      if(user.orgPermissions[i].orgID === orgID){
        this.orgLevel = user.orgPermissions[i].level;
        return;
      }
    }
  }

  openSearchDialog() {

    if(this.campaignBoundaryName !== 'NONE'){
      var blockgroups = this.campaignBlockgroupIDS.sort();
    } else {
      var blockgroups = blockgroupIDSJSON['default'];
    }

    this.zone.run(() => {
      const dialogRef = this.dialog.open(SearchDialog, {data: {campaignBoundary: this.campaignBoundary, blockgroups: blockgroups, cois: this.coiIDS, langMode: this.langMode}, width: "50%"});
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

              if(results['type'] === 'location'){

                console.log(results)
                this.map.flyTo([results['value'][1], results['value'][0]], results['zoom'])

                this.marker = L.layerGroup().addTo(this.map);
                L.marker([results['value'][1], results['value'][0]], { icon: customIcon }).addTo(this.marker);
                return
              }

              const onEachFeature = function(feature, layer) {
                console.log(layer)
                this.map.flyToBounds(layer['_bounds']);

                this.marker = L.layerGroup().addTo(this.map);
                L.marker(layer.getBounds().getCenter(), { icon: customIcon }).addTo(this.marker);
              }

              //console.log(results)

              L.geoJSON(results['value'], {onEachFeature: onEachFeature.bind(this)});
            }
          }
      );
    });
  }

  download(){

    this.downloading = true;

    const zip = new JSZip();

    var options = {
      folder: 'shapefiles',
      types: {
        point: 'points',
        polygon: 'polygons'
      }
    }

    var orgID: string = sessionStorage.getItem('orgID')

    for(var i = 0; i < this.cois.getLayers().length; i ++){

      if(!this.cois.getLayers()[i]['feature']){
        return;
      }


      if(this.cois.getLayers()[i]['feature'].properties.orgID === orgID){

        var folder = zip.folder(this.cois.getLayers()[i]['feature'].properties.name);

        var geoJSON = {features: [this.cois.toGeoJSON()['features'][i]], type: "FeatureCollection"}

        folder = shpwrite.zip(geoJSON, options, folder)

        var COI_Details_string = "";

        for(var j = 0; j < this.cois.getLayers()[i]['feature'].properties.questions.length; j++){
          COI_Details_string += "Question: " + this.cois.getLayers()[i]['feature'].properties.questions[j].question + '\n' +
              "Answer: " + this.cois.getLayers()[i]['feature'].properties.questions[j].answer + '\n'
        }

        folder.file("COI_Details.txt", COI_Details_string);

        var geoidStrings = ""

        for(var j = 0; j < this.cois.getLayers()[i]['feature'].properties.geoids.length; j++){
          geoidStrings += this.cois.getLayers()[i]['feature'].properties.geoids[j] + "\n"
        }

        var demographics = "Total Pop: " + this.cois.getLayers()[i]['feature'].properties.demographics.totalPop + "\n" +
                           "% Asian Ethnicity: " + this.cois.getLayers()[i]['feature'].properties.demographics.percentAsian + "\n" +
                           "% Black Ethinicity: " + this.cois.getLayers()[i]['feature'].properties.demographics.percentBlack + "\n" +
                           "% White Ethnicity: " + this.cois.getLayers()[i]['feature'].properties.demographics.percentWhite + "\n" +
                           "% Pacific Island Ethnicity: " + this.cois.getLayers()[i]['feature'].properties.demographics.percentPI + "\n" +
                           "% Male: " + this.cois.getLayers()[i]['feature'].properties.demographics.percentMale + "\n" +
                           "% Female: " + this.cois.getLayers()[i]['feature'].properties.demographics.percentFemale + "\n"

        folder.file("COI_Blockgroups.txt", geoidStrings)
        folder.file("ACS Demographic Estimates", demographics)

      }

    }

    zip.generateAsync({ type: 'blob' }).then((content) => {

      let downloadLink = document.createElement('a');
      downloadLink.href = window.URL.createObjectURL(content);
      downloadLink.setAttribute('download', 'COIs.zip');
      document.body.appendChild(downloadLink);
      downloadLink.click();
      this.downloading = false;
    });

    /*

    function filter (node) {
      return (node.tagName !== 'div');
    }

    setTimeout(()=>{
      domtoimage.toBlob(this.container.nativeElement, {width: this.innerWidth, height: (this.innerHeight - 100), filter: filter})
      .then((blob) => {
        let downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(blob);
        downloadLink.setAttribute('download', 'Map.png');
        document.body.appendChild(downloadLink);
        downloadLink.click();
        this.downloading = false;
      })
      .catch(function (error) {
        console.error('oops, something went wrong!', error);
      });
    })*/
  }


  tutorialPoly(tutorial) {

    if(this.editMode){
      this.editMode = false;
      this.map.addControl(this.lasso);
    }

    var rectangle: any;
    var currentPoint = this.map.getCenter();
    var southWest = L.point((currentPoint.lat - 150), (currentPoint.lng - 125));
    var northEast = L.point((currentPoint.lat + 150), (currentPoint.lng + 125));
    var bounds = L.latLngBounds(this.map.containerPointToLatLng(southWest), this.map.containerPointToLatLng(northEast));

    if(tutorial === 'cloneCOI'){

      rectangle = L.rectangle(bounds)
          .bindTooltip('COI')
          .setStyle({color: 'orange', opacity: 0.5, fillOpacity: 0.1})
          .on('mouseup', this.clonePolygon, this)
          .bringToFront()
          .addTo(this.map);

    } else if(tutorial === 'editCOI'){

      rectangle = L.rectangle(bounds)
          .bindTooltip('COI')
          .setStyle({color: 'green', opacity: 0.5, fillOpacity: 0.1})
          .on('pm:edit', this.tutorialNext, this)
          .bringToFront()
          .addTo(this.map);
      rectangle.pm.enable({limitMarkersToCount: 3});

      this.rectangleLayer = rectangle;

    } else if(tutorial === 'deleteCOI'){
      rectangle = L.rectangle(bounds)
          .bindTooltip('COI')
          .setStyle({color: 'green', opacity: 0.5, fillOpacity: 0.1})
          .on('mouseup', this.editPolygon, this)
          .bringToFront()
          .addTo(this.map);
    }

    Array.from(document.getElementsByClassName('leaflet-interactive')).reverse().forEach((el) => {
      if ((el['_leaflet_id']-1) === rectangle['_leaflet_id']){
        el.classList.add('tutorialPoly');
      }
    });

    this.map.fitBounds(rectangle.getBounds(), {padding: [80, 80]});

    if(tutorial === 'cloneCOI') {

      if(this.langMode === 'ENGLISH'){
        this.shepherdService.addSteps(cloneCOI);
      }else if(this.langMode === 'SPANISH'){
        this.shepherdService.addSteps(cloneCOI_spanish);
      }

    } else if(tutorial === 'editCOI') {

      if(this.langMode === 'ENGLISH'){
        this.shepherdService.addSteps(editCOI);
      }else if(this.langMode === 'SPANISH'){
        this.shepherdService.addSteps(editCOI_spanish);
      }

    } else if(tutorial === 'deleteCOI'){
      if(this.langMode === 'ENGLISH'){
        this.shepherdService.addSteps(deleteCOI);
      }else if(this.langMode === 'SPANISH'){
        this.shepherdService.addSteps(deleteCOI_spanish);
      }
    }

    ['close', 'cancel'].forEach(event => this.shepherdService.tourObject.on(event, () => {
      this.map.removeLayer(rectangle);
    }));
  }

  tutorialNext(){
    if(this.rectangleLayer['_leaflet_id']){
      this.rectangleLayer.pm.disable();
      this.rectangleLayer.on('mouseup', this.editPolygon, this);
    }
    this.shepherdService.next();
  }

  startTutorial() {
    this.zone.run(() => {
      const dialogRef = this.dialog.open(TutorialDialog, {data: {langMode: this.langMode}});
      dialogRef.afterClosed().subscribe(
          async (tutorial: string) => {
            if(tutorial) {
              if (this.shepherdService.isActive) {
                this.shepherdService.complete();
              }

              if (tutorial === 'createCOI') {
                if(this.langMode === 'ENGLISH'){
                  this.shepherdService.addSteps(createCOI);
                }else if(this.langMode === 'SPANISH'){
                  this.shepherdService.addSteps(createCOI_spanish);
                }
                
                if(document.getElementsByClassName('regTutorial').length){
                  document.getElementsByClassName('regTutorial')[0].classList.remove('regTutorial');
                }
              } else if (tutorial === 'cloneCOI') {
                this.tutorialPoly('cloneCOI');
              } else if (tutorial === 'editCOI') {
                this.tutorialPoly('editCOI');
              } else if (tutorial === 'deleteCOI') {
                this.tutorialPoly('deleteCOI');
              }

              this.shepherdService.start();
            }
          }
      );
    });
  }


  ngOnInit(): void {
    this.getOrgLevel();
    this.getCampaign();
    this.innerWidth = window.innerWidth;
    this.innerHeight = window.innerHeight;

    sessionStorage.removeItem('rdr');
  }

  ngAfterViewInit() {
    this.shepherdService.defaultStepOptions = defaultStepOptions;
    this.shepherdService.modal = true;
    this.shepherdService.confirmCancel = false;
  }

  calculateDemographics(data: any[]){
    var totalPop = 0
    var totalPercentAsian = 0
    var totalPercentWhite = 0
    var totalPercentBlack = 0
    var totalPercentPI = 0
    var totalPercentHispanic = 0
    var totalPercentMale = 0
    var totalPercentFemale = 0

    for(var i = 0; i < data.length; i++){
      totalPop = totalPop + data[i].feature.properties.demographics.totalPop
      totalPercentAsian = totalPercentAsian + data[i].feature.properties.demographics.percentAsian
      totalPercentWhite = totalPercentWhite + data[i].feature.properties.demographics.percentWhite
      totalPercentBlack = totalPercentBlack + data[i].feature.properties.demographics.percentBlack
      totalPercentPI = totalPercentPI + data[i].feature.properties.demographics.percentPI
      totalPercentHispanic = totalPercentHispanic + data[i].feature.properties.demographics.percentHispanic
      totalPercentMale = totalPercentMale + data[i].feature.properties.demographics.percentMale
      totalPercentFemale = totalPercentFemale + data[i].feature.properties.demographics.percentFemale
      
    }

    this.totalPop = totalPop

    this.percentAsianEthnicity = Number((totalPercentAsian/data.length).toFixed(2))
    this.percentWhiteEthnicity = Number((totalPercentWhite/data.length).toFixed(2))
    this.percentBlackEthnicity = Number((totalPercentBlack/data.length).toFixed(2))
    this.percentPIEthnicity = Number((totalPercentPI/data.length).toFixed(2))
    this.percentHispanicEthnicity = Number((totalPercentHispanic/data.length).toFixed(2))
    this.percentMale = Number((totalPercentMale/data.length).toFixed(2))
    this.percentFemale = Number((totalPercentFemale/data.length).toFixed(2))
    this.shapeCreated = true;

  }

}
