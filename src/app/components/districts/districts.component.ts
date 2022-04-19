import { Component, OnInit, NgZone, ViewChild, ElementRef, AfterViewInit, HostListener, ViewEncapsulation} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import * as L from 'leaflet';

import {AmplifyService} from '../../services/amplify/amplify.service';

declare global {
  interface Window { GlobalSelected: any; }
}

@Component({
  selector: 'app-districts',
  templateUrl: './districts.component.html',
  styleUrls: ['./districts.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class DistrictsComponent implements OnInit {

  constructor(public zone: NgZone,
    public dialog: MatDialog,
    //public assetService: AssetService,
    //public geoService: GeometryService,
    //public campaignService: CampaignService,
    //public orgService: OrganizationService,
    private ampService: AmplifyService
    ) { }

  options = {
    layers: [L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '...' })],
    zoom: 10,
    center: [33.971839, -117.381739],
  };

  leafletMap: any;

  layersControl = {overlays: {}};
  loadingMap = false;

  districtTypeSelection: string = ""

  onMapReady(map: L.Map){
    this.leafletMap = map;

    this.layersControl.overlays['Senate'] = L.featureGroup();
    this.layersControl.overlays['Congress'] = L.featureGroup();
    this.layersControl.overlays['Assembly'] = L.featureGroup();

    this.leafletMap.createPane('SENATE').style.zIndex = '603';
    this.leafletMap.createPane('CONGRESS').style.zIndex = '602';
    this.leafletMap.createPane('ASSEMBLY').style.zIndex = '601';

  }

  getDistricts(value){
    console.log(value)
    this.loadingMap = true
    this.layersControl.overlays['Congress'].removeLayer(this.layersControl.overlays['Congress'].getLayers()[0]);
    this.layersControl.overlays['Senate'].removeLayer(this.layersControl.overlays['Senate'].getLayers()[0]);
    this.layersControl.overlays['Assembly'].removeLayer(this.layersControl.overlays['Assembly'].getLayers()[0]);
    
    this.ampService.getDistricts(value).subscribe((result: any) =>{
      console.log(result)
      let layer = L.geoJSON(result, {pane: value, onEachFeature: onEachFeature.bind(this)}).addTo(this.leafletMap)
      this.layersControl.overlays['Congress'].removeLayer(layer)
      function onEachFeature(feature: any, layer: any){
        var layerName: string = feature.properties.districtType + ' ' + feature.properties.name;

        
        
        if(feature.properties.districtType === 'SENATE') {
          layer.addTo(this.layersControl.overlays['Senate']);
          layer.bindTooltip(layerName).setStyle({fillColor: 'purple', color: 'black', opacity: 1, fillOpacity: 0.3});
        
        }
        if(feature.properties.districtType === 'CONGRESSIONAL') {
          layer.addTo(this.layersControl.overlays['Congress']);
          layer.bindTooltip(layerName).setStyle({fillColor: 'blue', color: 'black', opacity: 1, fillOpacity: 0.3});
        }
        if(feature.properties.districtType === 'ASSEMBLY') {
          layer.addTo(this.layersControl.overlays['Assembly']);
          layer.bindTooltip(layerName).setStyle({fillColor: 'green', color: 'black', opacity: 1, fillOpacity: 0.3});
        }

        
      }

      //
      this.loadingMap = false

      
    })




  }

  districtTypeSelected(value){
    this.getDistricts(value)
  }


  ngOnInit(): void {

    //this.getDistricts()
  }




  ngAfterViewInit() {
  }


}
