import { Component, OnInit, NgZone, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { FitMode } from '../../directives/fitLabels.directive';
import * as L from 'leaflet';
import { setMapTooltip, MapTooltip, truncate, humanizeKey } from '../../utils/mapTooltips';
import { createBaseLayers, savedBaseLayer, saveBaseLayer } from '../../utils/baseLayers';

// Remembered base map (streets or satellite) for this map, per device
const BASE_LAYER_KEY = 'amp.campaignMapBaseLayer';
import {MatDialog} from '@angular/material/dialog';
import { ActivationStart, Router } from '@angular/router';
//import * as turf from '@turf/turf';
import union from '@turf/union';
import area from '@turf/area';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import 'leaflet-lasso';
import { ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, SLOW_LOAD_TIMEOUT_MS, loadErrorText } from '../../utils/loading';

//DIALOGS
import {CreatePolygonDialog} from './dialogs/polygon/createPolygon/createPolygonDialog';
import { EditPolygonDialog } from './dialogs/polygon/editPolygon/editPolygonDialog';
import {SearchDialog} from './dialogs/search/searchAddress/searchDialog';
import { PermissionsDialog } from './dialogs/permissions/permissionsDialog';
import { CampaignBillingDialog } from './dialogs/billing/campaignBillingDialog';
import { CreateSurveyDialog } from './dialogs/surveys/createSurvey/createSurveyDialog';
import { CreateNonresponseSetDialog } from './dialogs/nonresponsesets/createNonresponseSet/createNonresponseSet';
import { GroupCreatorDialog } from './dialogs/groups/createGroup/groupCreatorDialog';
import { GroupReviewDialog } from './dialogs/groups/otherGroups/otherGroupsDialog';
import { SearchVoterListDialog } from './dialogs/search/searchVoterLIst/searchVoterList';
import { RawContactDataDialog } from './dialogs/summary/rawContactData/rawContactDataDialog';
import { EditSurveyDialog } from './dialogs/surveys/editSurvey/editSurveyDialog';
import { EditNonResponseDialog } from './dialogs/nonresponsesets/editNonresponseSet/editNonResponseDialog';
import { OtherSurveysDialog } from './dialogs/surveys/otherSurveys/otherSurveysDialog';
import { OtherNonresponseSetsDialog } from './dialogs/nonresponsesets/otherNonresponseSets/otherNonresponseSets';
import { GroupEditorDialog } from './dialogs/groups/editGroup/groupEditorDialog';
import { DistrictDataSummaryDialog } from './dialogs/summary/districtDataSummary/districtDataSummaryDialog';
import { CampaignSummaryDialog } from './dialogs/summary/campaignSummary/campaignSummaryDialog';
import { PrecinctPlanningSummaryDialog } from './dialogs/summary/precinctPlanningSummary/precinctPlanningSummary';
import { CreateActivityDialog } from '../activity/dialogs/createActivity/createActivityDialog';
import { EditActivityDialog } from '../activity/dialogs/editActivity/editActivityDialog';
import { ActivityReportDialog } from '../activity/dialogs/activityReports/activityReportDialog';

import { SearchPrecinctsDialog } from './dialogs/search/searchPrecincts/searchPrecincts';

//SERVICES
import {CampaignService } from 'src/app/services/campaign.service';
import { OrganizationService } from 'src/app/services/organization/organization.service';
import {PrecinctService} from '../../services/shape/precinct.service';
import {PolygonService} from '../../services/shape/polygon.service';
import {ActivityService} from '../../services/activity.service';
import { GroupService } from 'src/app/services/group.service';
import { SurveyService } from 'src/app/services/survey.service';
import { AmplifyService } from 'src/app/services/amplify.service';

//MODELS
import { Organization } from 'src/app/models/organization.model';
import {Group} from '../../models/group.model'
import { Survey } from 'src/app/models/survey.model';
import { Polygon } from 'src/app/models/polygon.model';
import { RegistrationPrecinct } from 'src/app/models/precinct.model';
import { Activity } from 'src/app/models/activity.model';
import { Campaign } from 'src/app/models/campaign.model';
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import { MorePolygonsDialog } from './dialogs/polygon/morePolygons/morePolygonsDialog';
import { DemographicSummaryDialog } from './dialogs/summary/demographicSummary/demographicSummary';
import { RawGroupDataDialog } from './dialogs/summary/rawGroupData/rawGroupDataDialog';


declare global {
  interface Window { GlobalSelected: any; }
}

// Each other organization's polygons get their own shade of orange
const orgNameToColor = (orgName: string = ''): string => {
  let hash = 0;
  for (let i = 0; i < orgName.length; i++) {
    hash = orgName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lightness = 20 + (Math.abs(hash) % 60);
  return `hsl(30, 100%, ${lightness}%)`;
};

// Geographic Summary column used to shade precincts
const SUMMARY_FILTER = 'Unique Contacts'

// Party bar colors in precinct tooltips
const PARTY_COLORS = {dem: '#2a78d6', rep: '#d64545', dcl: '#8a8f98', other: '#c9ccd1'}

// Toolbar fitting (ampFitLabels): room kept for the title, and the width below which actions always go behind the ⋮ menu
const TOOLBAR_TITLE_MIN = 180
const TOOLBAR_MENU_BELOW = 600

@Component({
  selector: 'app-campaignMap',
  templateUrl: './campaignMap.component.html',
  styleUrls: ['./campaignMap.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class CampaignMapComponent implements OnInit {

  constructor(public dialog: MatDialog,
              private snackBar: MatSnackBar,
              public zone: NgZone,
              public activityService: ActivityService,
              public campaignService: CampaignService,
              public precinctService: PrecinctService,
              public polygonService: PolygonService,
              public orgService: OrganizationService,
              public router: Router,
              public groupService: GroupService,
              private changeDetectorRef: ChangeDetectorRef,
              public surveyService: SurveyService,
              private cdr: ChangeDetectorRef,
              private amplifyService: AmplifyService
  ) { }

  // Base maps: only one on the map at a time (see utils/baseLayers)
  baseLayers = createBaseLayers();

  options = {
    layers: [this.baseLayers[savedBaseLayer(BASE_LAYER_KEY)]],
    zoom: 10,
    center: [33.971839, -117.381739],
  };

  // ngx-leaflet renders this as one control: Streets/Satellite radios plus the overlay checkboxes
  layersControl: {baseLayers: {[name: string]: L.Layer}, overlays: {[name: string]: any}} = {
    baseLayers: {
      'Streets': this.baseLayers.streets,
      'Satellite': this.baseLayers.satellite,
    },
    overlays: {},
  };
  orgName: string = '';
  myOrgName: string = '';

  bounds: any;
  leafletMap: any;
  jsonPolygonCreated: any;
  map: any;

  center;
  zoom: number = 10;
  loadingZoomLevel: number = 11;
  hhLoadingZoomLevel: number = 17;
  marker;

  campaignBoundary: any[] = [];

  gettingCampaignBoundary: boolean = true;

  geographical: boolean = false;

  myOrgsPolygons: Polygon[] = [];

  polygons: L.FeatureGroup = L.featureGroup();
  loadPolys: boolean = false;
  polygonsLoaded: boolean = false;

  dataManager: boolean = false;

  loadingPrecinctLayer: boolean = false;

  precinctLayerLoaded: boolean = false;

  precinctOverlayData: any[]

  drawsCreated;
  drawnItems: L.FeatureGroup = L.featureGroup();

  lasso;

  downloading: boolean = false

  campaignActive: boolean = false

  subscription: string = ''

  dev: boolean = false

  campaignName: string = '';

  screenSize: string = '50%'

  campaignGroups: Group[] = [];
  orgGroups: Group[] = [];
  archivedGroups: Group[] = []

  surveys: Survey[] = []
  nonResponseSets: NonResponseSet[] = [];

  registrationPrecincts: RegistrationPrecinct[] = []

  canvassActivityPolygonIDs: string[] = []

  phonebanks: Activity[] = []
  canvasses: Activity[] = []
  textbanks: Activity[] = []
  petitions: Activity[] = []

  // Drawer panels, one per activity type
  readonly activityPanels = [
    {type: 'Phonebank', title: 'Phonebanks', icon: 'phone', create: 'Create a phonebank'},
    {type: 'Canvass', title: 'Canvasses', icon: 'directions_walk', create: 'Create a canvass'},
    {type: 'Texting', title: 'Textbanks', icon: 'sms', create: 'Create a textbank'},
    {type: 'Petition', title: 'Petitions', icon: 'assignment', create: 'Create a petition'},
  ]

  loadAllOrgPolygons: boolean = false;

  loadingPolygons: boolean = false;

  
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
    map.on('baselayerchange', (event: L.LayersControlEvent) => {
      saveBaseLayer(BASE_LAYER_KEY, event.layer === this.baseLayers.satellite ? 'satellite' : 'streets')
    })
    this.bounds = this.leafletMap.getBounds();    

    this.leafletMap.createPane('registrationPrecincts').style.zIndex = '400';
    this.leafletMap.createPane('polygons').style.zIndex = '600';

    map.on('overlayadd', this.overlayadd);
    map.on('overlayremove', this.onOverlayRemove);

    this.layersControl.overlays['Registration Precincts'] = L.featureGroup();

    this.lasso = L.control.lasso({ intersect: true }).addTo(map).setPosition('topright')

    map.on('lasso.finished', (event: any) => {
      
      var polygonList = []

      for(var i = 0; i < event.layers.length; i++){
        if(!event.layers[i].feature.properties.districtType){
          polygonList.push(event.layers[i])
          event.layers[i].remove()
        }
      }

      this.jsonPolygonCreated = unify(polygonList).toGeoJSON()['features'][0];
      
      this.drawsCreated = unify(polygonList).on('click', this.openNewPolygonDialog, this).setStyle({color: 'red', opacity: 0.5, fillOpacity: 0.1});
      this.markDraft(this.drawsCreated, 'Click to merge into one polygon')
      this.drawnItems.addLayer(this.drawsCreated);
      this.layersControl.overlays[this.orgName].addLayer(this.drawsCreated);

    })
  }

  overlayadd = (e: any) =>{

    if(e.name === "Registration Precincts"){
      if(!this.precinctLayerLoaded) this.getRegistrationPrecincts('standard');
    }

    if(e.name === this.orgName){
      this.loadPolys = true;
    }

    // A group turned back on is drawn over everything; restore the size order
    if(e.name.endsWith(' Polygons')) this.orderPolygons()
  }
  onOverlayRemove = (e: any) =>{
    if(e.name === this.orgName){
      this.loadPolys = false;
    }
  }

  async mapStart(e: any){}
  async mapMoved(e: any){}

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
    this.drawsCreated = draw.layer.on('click', this.openNewPolygonDialog, this);
    this.markDraft(this.drawsCreated, 'Click to name and save it')
    this.drawnItems.addLayer(this.drawsCreated);

    this.layersControl.overlays[this.orgName].addLayer(this.drawsCreated);
    this.polygons = this.layersControl.overlays[this.orgName];
  }

  drawEdited(draw: any){
    this.jsonPolygonCreated = draw.layers.toGeoJSON().features[0]
  }

  getCampaignBoundary(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    this.gettingCampaignBoundary = true;

    this.campaignService.getCampaignBoundary(campaignID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (boundary: any) =>{

        if(!boundary || (Array.isArray(boundary) && !boundary.length)){
          this.gettingCampaignBoundary = false;
          this.showMapError("This campaign has no boundary, so the map can't be centered or show polygons.")
          return
        }
        this.campaignBoundary = boundary;

        this.gettingCampaignBoundary = false;

        let layer = L.geoJSON(this.campaignBoundary, {onEachFeature: onEachFeature.bind(this)}).addTo(this.leafletMap)

        function onEachFeature(feature: any, layer: any){
          if(feature.properties.districtType) {
            setMapTooltip(layer, {title: feature.properties.name, subtitle: feature.properties.districtType})
            layer.setStyle({fillColor: 'purple', color: 'black', opacity: 1, fillOpacity: 0.0, weight: 5});
          }
        }
        var center = layer.getBounds().getCenter();
        const bounds = layer.getBounds();

        setTimeout(() => {
            this.center = [center.lat, center.lng];
            this.zoom = this.leafletMap.getBoundsZoom(bounds, false, L.point(50, 50)) - 1;

            if(this.loadAllOrgPolygons){
              this.getPolygons("all");
            }else{
              this.getPolygons("campaign");
            }
        });
        this.layersControl.overlays['Campaign Boundary'] = layer;
      }, error =>{
          console.log(error)
          this.gettingCampaignBoundary = false;
          this.showMapError(loadErrorText('the campaign boundary', error), () => this.getCampaignBoundary())
      }
    );
  }

  // Map loads have no page to fall back on, so failures show as a snackbar, with Retry when it can help
  showMapError(message: string, retry?: () => void){
    this.zone.run(() => {
      const ref = this.snackBar.open(message, retry ? 'Retry' : 'Dismiss', {duration: retry ? 15000 : 8000})
      if(retry) ref.onAction().subscribe(() => retry())
    })
  }

  async getPolygons(mode: string) {
    let campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    let orgID: string = sessionStorage.getItem('orgID') || '';

    this.loadingPolygons = true;

    this.polygonService.getPolygons(campaignID, orgID, mode).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe({
      next: (polygons: any[]) => {

      this.loadingPolygons = false;
      polygons = polygons || []

      for (var i = 0; i < polygons.length; i++) {

        if (polygons[i].orgID === orgID) {
          this.orgName = polygons[i].orgName + ' Polygons';
          this.myOrgsPolygons = polygons[i].polys;
        }

        const activePolygons = polygons[i].polys.filter(polygon => polygon.properties.active === true);

        let layerPoly = L.geoJSON(activePolygons, { onEachFeature: onEachFeature.bind(this) }).addTo(this.leafletMap);
        this.layersControl.overlays[polygons[i].orgName + ' Polygons'] = layerPoly;
      }

      this.orderPolygons()
      this.polygonsLoaded = true;

      function onEachFeature(polygon: Polygon, layerP) {
        this.stylePolygon(layerP, polygon)
        this.bindPolygonHover(layerP)
        if (orgID === polygon.properties.orgID) {
          layerP.on('dblclick', this.onPolygonDblClick, this).on('mousedown', this.getSelected, polygon)
        }
      }
      },
      error: error => {
        console.log(error)
        this.loadingPolygons = false;
        this.showMapError(loadErrorText('the polygons', error), () => this.getPolygons(mode))
      }
    });
}

  getCanvassActivities(){
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    const orgID: string = sessionStorage.getItem('orgID') || '';

    this.polygonService.getPolygonsByIDs(campaignID, orgID, "Canvass").subscribe(
        async (polygonIDs: string[]) => {
          this.canvassActivityPolygonIDs = polygonIDs || []
          // Polygons may have loaded first; apply the canvass highlight now
          if(this.polygonsLoaded) this.restyleOwnPolygons()
      }, 
      error =>{
        console.log(error)
      }
    )
  }

  //////////////////////// POLYGON + PRECINCT TOOLTIPS ////////////////////////

  // Own polygons: green outline, filled purple when a canvass uses them. Others: one shade per org.
  stylePolygon(layer: any, polygon: any){
    const orgID: string = sessionStorage.getItem('orgID') || '';
    const properties = polygon?.properties || {}
    const own = properties.orgID === orgID
    const inCanvass = own && this.canvassActivityPolygonIDs.includes(polygon._id)

    layer.ampAlsoHere = ''
    setMapTooltip(layer, this.polygonTooltip(polygon))

    // Canvass fill stays see-through so polygons underneath still show
    if(own){
      layer.setStyle({fillColor: inCanvass ? 'purple' : 'green', color: inCanvass ? 'black' : 'green', opacity: 1, fillOpacity: inCanvass ? 0.35 : 0, weight: 3})
    } else {
      const orgColor = orgNameToColor(properties.orgName)
      layer.setStyle({color: orgColor, fillColor: orgColor, weight: 3})
    }
    layer.ampWeight = 3
  }

  // alsoHere: names of the other polygons under the pointer
  polygonTooltip(polygon: any, alsoHere: string[] = []): MapTooltip {
    const orgID: string = sessionStorage.getItem('orgID') || '';
    const properties = polygon?.properties || {}
    const own = properties.orgID === orgID
    const inCanvass = own && this.canvassActivityPolygonIDs.includes(polygon._id)
    const description = (properties.description || '').trim()

    const rows: [string, string][] = inCanvass ? [['Status', 'Used in a canvass']] : []
    if(alsoHere.length){
      const shown = alsoHere.slice(0, 4).map(name => truncate(name, 40)).join(', ')
      rows.push(['Also here', alsoHere.length > 4 ? `${shown} +${alsoHere.length - 4} more` : shown])
    }

    return {
      title: properties.name || 'Unnamed polygon',
      subtitle: own ? 'Your organization' : properties.orgName,
      rows,
      note: description ? truncate(description, 120) : undefined,
      hint: own ? 'Double-click to edit' : undefined,
    }
  }

  //////////////////////// OVERLAPPING POLYGONS ////////////////////////

  // Saved polygons of every org group currently shown; unsaved drafts have no _id
  private visiblePolygonLayers(): any[] {
    const layers: any[] = []
    Object.keys(this.layersControl.overlays).forEach(name => {
      const group = this.layersControl.overlays[name]
      if(!name.endsWith(' Polygons') || !this.leafletMap.hasLayer(group)) return
      group.eachLayer((layer: any) => { if(layer.feature?._id) layers.push(layer) })
    })
    return layers
  }

  private isOwnPolygon(layer: any): boolean {
    return layer.feature?.properties?.orgID === (sessionStorage.getItem('orgID') || '')
  }

  // Computed once per layer; geometry doesn't change while it is on the map
  private polygonArea(layer: any): number {
    if(layer.ampArea === undefined){
      try { layer.ampArea = area(layer.feature) } catch { layer.ampArea = 0 }
    }
    return layer.ampArea
  }

  // Back to front: other orgs before own, then largest first
  private drawOrder = (a: any, b: any): number =>
    (Number(this.isOwnPolygon(a)) - Number(this.isOwnPolygon(b))) || (this.polygonArea(b) - this.polygonArea(a))

  // Small polygons go in front of the big ones around them, so every polygon can be hovered and clicked
  orderPolygons(){
    this.visiblePolygonLayers().sort(this.drawOrder).forEach(layer => layer.bringToFront())
  }

  // Polygons under a point, topmost first
  polygonsAt(latlng: L.LatLng): any[] {
    const point = [latlng.lng, latlng.lat]
    return this.visiblePolygonLayers()
      .filter(layer => {
        if(!layer.getBounds().contains(latlng)) return false
        try { return booleanPointInPolygon(point, layer.feature) } catch { return false }
      })
      .sort(this.drawOrder)
      .reverse()
  }

  // Hover: thicker outline, and the tooltip lists any other polygons under the pointer
  bindPolygonHover(layer: any){
    layer.on('mouseover', () => layer.setStyle({weight: (layer.ampWeight ?? 3) + 2}))
    layer.on('mouseout', () => layer.setStyle({weight: layer.ampWeight ?? 3}))
    layer.on('mousemove', (e: L.LeafletMouseEvent) => {
      const others = this.polygonsAt(e.latlng)
        .filter(other => other !== layer)
        .map(other => other.feature.properties.name || 'Unnamed polygon')
      const key = others.join('\n')
      if(key === layer.ampAlsoHere) return
      layer.ampAlsoHere = key
      setMapTooltip(layer, this.polygonTooltip(layer.feature, others))
    })
  }

  // Double-click edits the polygon; where several of the org's polygons overlap, pick which one first
  onPolygonDblClick(e: L.LeafletMouseEvent){
    L.DomEvent.stop(e as any)

    const own = this.polygonsAt(e.latlng).filter(layer => this.isOwnPolygon(layer))
    if(own.length <= 1){
      this.openEditPolygonDialog(own[0]?.feature ?? e.target.feature)
      return
    }

    // Built from DOM nodes with textContent, since polygon names come from users
    const content = L.DomUtil.create('div', 'amp-pc')
    L.DomUtil.create('div', 'amp-pc-title', content).textContent = `${own.length} polygons here`
    L.DomUtil.create('div', 'amp-pc-subtitle', content).textContent = 'Choose one to edit'

    const popup = L.popup({className: 'amp-polygon-chooser', maxWidth: 280, minWidth: 180, autoPanPadding: L.point(16, 16)})

    own.forEach(layer => {
      const option = L.DomUtil.create('button', 'amp-pc-option', content) as HTMLButtonElement
      option.type = 'button'
      option.textContent = layer.feature.properties.name || 'Unnamed polygon'
      // Outline the polygon this option stands for
      L.DomEvent.on(option, 'mouseenter', () => layer.setStyle({weight: (layer.ampWeight ?? 3) + 2}))
      L.DomEvent.on(option, 'mouseleave', () => layer.setStyle({weight: layer.ampWeight ?? 3}))
      L.DomEvent.on(option, 'click', () => {
        layer.setStyle({weight: layer.ampWeight ?? 3})
        this.leafletMap.closePopup(popup)
        this.openEditPolygonDialog(layer.feature)
      })
    })

    popup.setLatLng(e.latlng).setContent(content).openOn(this.leafletMap)
  }

  restyleOwnPolygons(){
    const ownLayer = this.orgName ? this.layersControl.overlays[this.orgName] : null
    ownLayer?.eachLayer((layer: any) => {
      if(layer.feature?._id) this.stylePolygon(layer, layer.feature)
    })
  }

  // Unsaved drawn/lassoed shapes; flagged so they can be cleared once a polygon is saved
  markDraft(layer: any, hint: string){
    layer.ampDraft = true
    setMapTooltip(layer, {title: 'New polygon', hint})
  }

  // Largest values in the overlay, computed once per render instead of once per precinct
  private overlayMaxima(mode: string): {residents: number, households: number, summary: number} {
    const rows = this.precinctOverlayData || []
    const max = (values: number[]) => values.reduce((m, v) => (typeof v === 'number' && v > m ? v : m), 0)
    if(mode === 'summary'){
      return {residents: 0, households: 0, summary: max(rows.filter(r => r['Geography'] !== 'TOTALS').map(r => r[SUMMARY_FILTER]))}
    }
    return {residents: max(rows.map(r => r.residents)), households: max(rows.map(r => r.households)), summary: 0}
  }

  // Internal IDs and database fields aren't shown in precinct tooltips
  private overlayRows(result: any, skipKeys: string[]): [string, string | number][] {
    const hidden = new Set([...skipKeys, 'groupID', '_id', '__v'])
    return Object.keys(result).filter(key => !hidden.has(key)).map(key => [humanizeKey(key), result[key]] as [string, string | number])
  }

  overlayGroupDataOnPrecincts(feature: RegistrationPrecinct, maxima: {residents: number, households: number}){
    const result = this.precinctOverlayData.find(precinct => precinct['precinctID'] === feature.properties.precinctID);
    const tooltip: MapTooltip = {title: 'Precinct ' + feature.properties.precinctID, subtitle: 'Group overlay', hint: 'Double-click to create a polygon'}

    if(!result) return {tooltip: {...tooltip, note: 'No data for this precinct'}, color: '#000000', normalized_opacity: 0}

    tooltip.rows = this.overlayRows(result, ['precinctID'])
    const normalized_opacity = maxima.residents > 0 ? (result.residents || 0) / maxima.residents : 0
    const color = this.getPercentPrecinctGradientColor(maxima.households > 0 ? ((result.households || 0) / maxima.households) * 100 : 0)
    return {tooltip, color, normalized_opacity}
  }

  overlaySummaryDataOnPrecincts(feature: RegistrationPrecinct, maxima: {summary: number}){
    const result = this.precinctOverlayData.find(obj => obj['Geography'] === feature.properties.precinctID);
    const tooltip: MapTooltip = {title: 'Precinct ' + feature.properties.precinctID, subtitle: 'Contact summary', hint: 'Double-click to create a polygon'}

    if(!result) return {tooltip: {...tooltip, note: 'No contacts in this precinct'}, color: '#FFFFFF', normalized_opacity: 0}

    const value = result[SUMMARY_FILTER] || 0
    tooltip.rows = this.overlayRows({...result, [SUMMARY_FILTER]: value}, ['Geography'])
    const share = maxima.summary > 0 ? value / maxima.summary : 0
    return {tooltip, color: this.getPercentPrecinctGradientColor(share * 100), normalized_opacity: share}
  }

  overlayStandardDataOnPrecincts(feature: RegistrationPrecinct){
    const data = feature.properties.registrationData
    const total = data?.totalReg || 0
    const percent = (count: number) => total > 0 ? ((count || 0) / total) * 100 : 0
    const dem = percent(data?.dem), rep = percent(data?.rep), dcl = percent(data?.dcl)

    const tooltip: MapTooltip = {
      title: 'Precinct ' + feature.properties.precinctID,
      rows: [['Registered', total], ['Households', data?.totalHH ?? '—']],
      bar: total > 0 ? [
        {label: 'Dem', value: dem, color: PARTY_COLORS.dem},
        {label: 'Rep', value: rep, color: PARTY_COLORS.rep},
        {label: 'DTS/NPP', value: dcl, color: PARTY_COLORS.dcl},
        {label: 'Other', value: Math.max(0, 100 - dem - rep - dcl), color: PARTY_COLORS.other},
      ] : [],
      note: total > 0 ? undefined : 'No registration data',
      hint: 'Double-click to create a polygon',
    }

    const normalized_opacity = (data?.totalHH || 0) / 2000
    return {tooltip, color: this.getRegistrationGradientColor(dem), normalized_opacity}
  }

  assignDataToPrecincts(precincts: any, mode: string){

    // The default campaign-wide group overlay replaces the plain registration view; summary and group modes are kept
    if(mode === 'standard' && this.precinctOverlayData) mode = 'group'
    const maxima = this.overlayMaxima(mode)

    // Leaflet types features as plain GeoJSON; these are registration precincts
    const onEachFeature = (geoFeature: any, layerPrec: any) => {
      const feature = geoFeature as RegistrationPrecinct
      const result = mode === 'group' ? this.overlayGroupDataOnPrecincts(feature, maxima)
                   : mode === 'summary' ? this.overlaySummaryDataOnPrecincts(feature, maxima)
                   : this.overlayStandardDataOnPrecincts(feature)

      setMapTooltip(layerPrec, result.tooltip)
      layerPrec.setStyle({ weight: 1, fillColor: result.color, color: "black", fillOpacity: result.normalized_opacity})
               .on('dblclick', this.createPolygonFromPrecinct, this)
    }

    let layerPrecinct = L.geoJSON(precincts, {pane: 'registrationPrecincts', onEachFeature});

      if(this.layersControl.overlays['Registration Precincts'].getLayers()[0]){
        this.layersControl.overlays['Registration Precincts'].removeLayer(this.layersControl.overlays['Registration Precincts'].getLayers()[0]);
      }

      layerPrecinct.addTo(this.layersControl.overlays['Registration Precincts']);
      this.precinctLayerLoaded = true
      if(mode != 'standard') layerPrecinct.addTo(this.leafletMap)

    this.loadingPrecinctLayer = false;
    this.changeDetectorRef.detectChanges();

  }


  getRegistrationPrecincts(mode: string){
    this.loadingPrecinctLayer = true;
    this.changeDetectorRef.detectChanges();
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');

    if(this.precinctLayerLoaded){
      this.assignDataToPrecincts(this.registrationPrecincts, mode)
      return
    }

    const failed = (error: any) => {
      console.log(error)
      this.loadingPrecinctLayer = false;
      this.changeDetectorRef.detectChanges();
      this.showMapError(loadErrorText('the precincts', error), () => this.getRegistrationPrecincts(mode))
    }

    if(!this.campaignBoundary?.[0]){
      this.loadingPrecinctLayer = false;
      this.changeDetectorRef.detectChanges();
      this.showMapError("Precincts can't be shown until the campaign boundary loads.")
      return
    }

    if(this.campaignBoundary[0].properties.districtType === "COUNTY"){
      this.precinctService.getGeoJsonPrecincts().then( (geojson: GeoJSON.FeatureCollection) => {
        this.registrationPrecincts = geojson.features as unknown as RegistrationPrecinct[]
        this.assignDataToPrecincts(geojson.features, mode)
      }).catch(failed)

    }else{
        this.precinctService.getRegistrationPrecinctsByBounds(campaignID).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe({
          next: (precincts: any) => {
            this.registrationPrecincts = precincts || []
            this.assignDataToPrecincts(this.registrationPrecincts, mode)
          },
          error: failed
        })
    }
  }

  get selected() {
    return window.GlobalSelected;
  }

  public getSelected() {
    window.GlobalSelected = this;
  }

  createPolygonFromPrecinct(feature){
      this.jsonPolygonCreated = feature.sourceTarget.feature
      this.openNewPolygonDialog()
  }

  openNewPolygonDialog() {
    this.zone.run(() => {

      const dialogRef = this.dialog.open(CreatePolygonDialog, {autoFocus: false, disableClose: true, data: this.jsonPolygonCreated, width: this.screenSize, maxWidth: this.screenSize === '100%' ? '100vw' : '94vw'});
      dialogRef.afterClosed().subscribe(results => {

        if(!results) return
        this.getAllCampaignGroups()

        // An existing polygon was reused for a new group; it is already on the map
        if(!results.existing){
          L.geoJSON(results.polygon, {onEachFeature: (feature, polygonLayer: any) => {
            this.stylePolygon(polygonLayer, feature)
            this.bindPolygonHover(polygonLayer)
            polygonLayer.on('dblclick', this.onPolygonDblClick, this).on('mousedown', this.getSelected, feature);
            this.layersControl.overlays[this.orgName].addLayer(polygonLayer);
          }});

          this.polygons = this.layersControl.overlays[this.orgName];
          this.myOrgsPolygons.push(results.polygon)
          this.orderPolygons()
        }

        if(this.drawsCreated) this.layersControl.overlays[this.orgName].removeLayer(this.drawsCreated);
        
        this.leafletMap.eachLayer((layer: any) => {
          if(layer.ampDraft) layer.remove();
        });
      });
    });
  }

  openEditPolygonDialog(poly){

    var polygon_selected;

    if(poly.properties){
      polygon_selected = poly
      var _id: string = poly._id;
    }else{
      var _id: string = this.selected._id;
      polygon_selected = this.selected
    }

    this.zone.run(() =>{
      const dialogRef = this.dialog.open(EditPolygonDialog, {autoFocus: false, disableClose: true, data: polygon_selected, width: this.screenSize, maxWidth: this.screenSize === '100%' ? '100vw' : '94vw'})
      dialogRef.afterClosed().subscribe(results => {
        if(!results) return

        if(results.deleted || results.archived){
          var polygons = this.layersControl.overlays[this.orgName];
          for (var i = 0; i < polygons.getLayers().length; i++) {
            if (polygons.getLayers()[i].feature && polygons.getLayers()[i].feature._id === _id) {
              polygons.removeLayer(polygons.getLayers()[i]);
            }
          }
          this.polygons = polygons;

          for (var k = 0; k < this.myOrgsPolygons.length; k++) {
            if (this.myOrgsPolygons[k]._id === _id) {
              this.myOrgsPolygons.splice(k, 1);
            }
          }
        }

        if(results.polygon && !results.archived){
          var polygons = this.layersControl.overlays[this.orgName];
          for(var i = 0; i < polygons.getLayers().length; i++){
            const polygonLayer = polygons.getLayers()[i]
            if (polygonLayer.feature && polygonLayer.feature._id === results.polygon._id) {
              polygonLayer.feature.properties.name = results.polygon.properties.name
              polygonLayer.feature.properties.description = results.polygon.properties.description
              this.stylePolygon(polygonLayer, polygonLayer.feature)
            }
          }
        }

        if(results.group){
          this.getAllCampaignGroups()
        }
      })
    })

  }

  openMorePolygonsDialog(){


    this.zone.run(() => {
      this.cdr.detectChanges();
      
      var dialogRef = this.dialog.open(MorePolygonsDialog, { autoFocus: false , 
                                                             data: {loadAllOrgPolygons: this.loadAllOrgPolygons},
                                                             maxHeight: '190vh',
                                                             disableClose: true,

                                                             width: this.screenSize,
                                                             maxWidth: this.screenSize
      })

      // {changed, loadAllOrgPolygons}; the dialog saves the setting on the campaign
      dialogRef.afterClosed().subscribe(results => {
        if(!results?.changed) return

        this.loadAllOrgPolygons = !!results.loadAllOrgPolygons
        this.reloadPolygons()

      })

    })
  }

  openGroupCreatorDialog(){
    this.zone.run(() => {
      var dialogRef = this.dialog.open(GroupCreatorDialog, { autoFocus: false , disableClose: true,
                                                             data: {campaignBoundary: this.campaignBoundary, polygons: this.myOrgsPolygons, precincts: this.registrationPrecincts},
                                                             maxHeight: '190vh',
                                                             width: this.screenSize,
                                                             maxWidth: this.screenSize
      } )

      dialogRef.afterClosed().subscribe((group) =>{
        if(group) this.getAllCampaignGroups()
      })
    })
  }

  openGroupReviewDialog(){
    this.zone.run(() => {
      const dialogRef = this.dialog.open(GroupReviewDialog, { autoFocus: false , 
                                            data: {districts: this.campaignBoundary, polygons: this.myOrgsPolygons, surveys: this.surveys, screenSize: this.screenSize},
                                            maxHeight: '190vh',
                                            width: this.screenSize,
                                            maxWidth: this.screenSize
      } )

      dialogRef.afterClosed().subscribe((changed) =>{
        if(changed) this.getAllCampaignGroups()
      })
    })

  }

  openGroupEditorDialog(group: Group){
    this.zone.run(()=>{
      const dialogRef = this.dialog.open(GroupEditorDialog, {autoFocus: false, disableClose: true, maxHeight: '190vh',
        data: {group, polygons: this.myOrgsPolygons, surveys: this.surveys, districts: this.campaignBoundary},
        width: this.screenSize,
        maxWidth: this.screenSize })

      dialogRef.afterClosed().subscribe((changed) =>{
        if(changed) this.getAllCampaignGroups()
      })
    })
  }

  // Search results share one pin and one precinct outline, each replaced by the next search
  searchHighlight: L.GeoJSON;

  private showSearchPin(latLng: L.LatLngTuple, lines: string[]){
    const customIcon = L.icon({
      iconUrl: '../../../assets/marker-icon.png',
      shadowUrl: '../../../assets/marker-shadow.png'
    });

    if (this.marker) {
      this.marker.clearLayers();
      this.leafletMap.removeLayer(this.marker);
    }
    this.marker = L.featureGroup();

    // Popup text built from DOM nodes so names and addresses are never read as HTML
    const popup = document.createElement('div');
    lines.filter(Boolean).forEach((line, index) => {
      const row = document.createElement(index === 0 ? 'b' : 'div');
      row.textContent = line;
      popup.appendChild(row);
    });

    L.marker(latLng, { icon: customIcon }).bindPopup(popup).addTo(this.marker);
    this.marker.addTo(this.leafletMap);
    this.leafletMap.flyTo(latLng, 18);
    this.marker.eachLayer((layer: any) => layer.openPopup && layer.openPopup());
  }

  openAddressSearchDialog() {
    this.zone.run(() => {
      const dialogRef = this.dialog.open(SearchDialog, {autoFocus: false , data: {campaignBoundary: this.campaignBoundary}, width: this.screenSize , maxWidth: this.screenSize});
      dialogRef.afterClosed().subscribe((result: any) => {
        if(!result) return

        // {coordinates: [lng, lat], label}; older builds returned the bare [lng, lat] array
        const coordinates = Array.isArray(result) ? result : result.coordinates
        if(!Array.isArray(coordinates) || coordinates.length !== 2) return

        this.showSearchPin([parseFloat(coordinates[1]), parseFloat(coordinates[0])], [result.label || 'Search result'])
      });
    });
  }

  openSearchVoterListDialog(){
    this.zone.run(() => {
      const dialogRef = this.dialog.open(SearchVoterListDialog, {autoFocus: false , data: {campaignBoundary: this.campaignBoundary}, width: this.screenSize , maxWidth: this.screenSize});
      dialogRef.afterClosed().subscribe((result: any) => {
        const coordinates = result?.voter?.location?.coordinates
        if(result?.type !== 'voter' || !Array.isArray(coordinates) || coordinates.length !== 2) return

        // People locations are GeoJSON [lng, lat]
        this.showSearchPin([coordinates[1], coordinates[0]], [result.name, result.address])
      });
    });
  }

  openSearchPrecinctsDialog(){
    this.zone.run(() => {
      const dialogRef = this.dialog.open(SearchPrecinctsDialog, {autoFocus: false , data: {campaignBoundary: this.campaignBoundary}, width: this.screenSize , maxWidth: this.screenSize});
      dialogRef.afterClosed().subscribe((precinct: any) => {
        if(!precinct?.geometry) return

        if(this.searchHighlight) this.leafletMap.removeLayer(this.searchHighlight)

        // Outline only, so the precinct's own data underneath stays visible
        this.searchHighlight = L.geoJSON(precinct, {
          style: {color: '#ff6f00', weight: 4, fill: false}
        }).addTo(this.leafletMap)

        const id = precinct.properties?.precinctID
        if(id) setMapTooltip(this.searchHighlight, {title: 'Precinct ' + id, subtitle: 'Search result'})

        this.leafletMap.flyToBounds(this.searchHighlight.getBounds(), {padding: [40, 40]})
      });
    });
  }

  openRawContactDataDialog(){
    this.dialog.open(RawContactDataDialog, {autoFocus: false ,  width: "100%" , maxWidth: "100%", data: this.campaignBoundary})
  }

  openRawGroupDataDialog(){
    this.dialog.open(RawGroupDataDialog, {autoFocus: false ,  width: "100%" , maxWidth: "100%", data: this.campaignBoundary})
  }

  openDistrictDataSummary(){
    this.dialog.open(DistrictDataSummaryDialog , {autoFocus: false , width: this.screenSize , maxWidth: this.screenSize});
  }

  openUserSummary(){
    this.dialog.open(CampaignSummaryDialog , {autoFocus: false , width: "100%" , maxWidth: "100%", data: 'User'});
  }

  openActivitySummary(){
    this.dialog.open(CampaignSummaryDialog , {autoFocus: false , width: "100%" , maxWidth: "100%", data: 'Activity'});
  }

  openOrgSummary(){
    this.dialog.open(CampaignSummaryDialog , {autoFocus: false , width: "100%" , maxWidth: "100%", data: 'Organization'});
  }

  openDateSummary(){
    this.dialog.open(CampaignSummaryDialog , {autoFocus: false , width: "100%" , maxWidth: "100%", data: 'Date'});
  }

  openDemographicSummary(){
    this.dialog.open(DemographicSummaryDialog , {autoFocus: false , width: "100%" , maxWidth: "100%", data: 'Demographic'});
  }

  openGeoSummary(){
    this.zone.run(() => {
      let dialogRef = this.dialog.open(CampaignSummaryDialog , {autoFocus: false , width: "100%" , maxWidth: "100%", disableClose: true, data: "Geography"});
      
      dialogRef.afterClosed().subscribe((result) => {
        if(result && result.summaryData){
          this.precinctOverlayData = result.summaryData
          this.getRegistrationPrecincts('summary')
        }
      })
    
    })
  }

  getDefaultPrecinctOverlayData(defaultCampaignWideGroupID: string){

    const group = this.campaignGroups.find(g => g._id === defaultCampaignWideGroupID);

    if(!group) return

    this.groupService.getGroupByPrecinct(group).subscribe(
      (results: any[]) =>{
        this.precinctOverlayData = results
    })
  }

  //////////////////////// TOOLBAR ////////////////////////

  readonly toolbarTitleMin = TOOLBAR_TITLE_MIN
  readonly toolbarMenuBelow = TOOLBAR_MENU_BELOW

  // labels: icon + text buttons, icons: icon-only buttons, menu: actions behind the ⋮ menu (set by ampFitLabels)
  toolbarMode: FitMode = 'labels'

  ngOnInit(): void {

    this.getCampaign()

    this.getCampaignBoundary();
    this.getSubscribedStatus()
    this.getDataManagerStatus()
    this.getAllSurveys();
    this.getAllNonResponseSets();

    this.getCanvassActivities()
    this.getActivities()

    if(this.dev) this.getCityWards()
  }

  calculateDemographics(data: any[]){
    if(data.length === 0) return {}

    const newTotalPop = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.totalPop,0); 
    const acvap = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.acvap,0); 
    const lcvap = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.lcvap,0);
    const cvap = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.cvap,0);
    const bcvap = data.reduce((partial_sum, a) => partial_sum + a.feature.properties.demographics.bcvap,0);

    return {totalPop: newTotalPop, cvap: cvap, acvap: acvap, bcvap: bcvap, lcvap: lcvap}
  }

  openPermissionsDialog(){
    this.dialog.open(PermissionsDialog,{ autoFocus: false , width: this.screenSize, maxWidth: this.screenSize});
  }

  openCampaignBillingDialog(){
    this.dialog.open(CampaignBillingDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
  }

  getSubscribedStatus(){
    var orgID: string = sessionStorage.getItem('orgID');    
    this.orgService.getOrganization(orgID).subscribe(
      (org: Organization)=>{
      this.myOrgName = org.name
       this.subscription = org.subscription
      },
      error =>{
        console.log(error)
      }
    )
  }

  getDataManagerStatus(){
    var user: any = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.dev = user.dev
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    for (var i = 0; i< user.dataManager.length; i++){
      if(user.dataManager[i] === campaignID ){
        this.dataManager = true;
        return
      }
    }
  }

  getCampaign(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    this.campaignService.getCampaign(campaignID).subscribe(
      (campaign: Campaign)=>{
        this.campaignName = campaign.name
        this.campaignActive = campaign.active
        this.loadAllOrgPolygons = campaign.allOrgPolygons 
        sessionStorage.setItem('geographical', String(campaign.geographical))
        this.getAllCampaignGroups(campaign);


      },
      error =>{
        console.log(error)
      }
    )
  }

  ngAfterContentInit() {
    if (window.innerWidth < 768) {
      this.screenSize = '100%'   
    }
  }

  @HostListener("window:resize", []) updateDays() {  
    if (window.innerWidth < 768) {
      this.screenSize = '100%'   
    }
    if (window.innerWidth > 768) {
      this.screenSize = '50%'   
    }
  }

  blueGradient = {
    "0": "#FFFFFF",
    "1": "#E2E2F2",
    "2": "#AAAAD8",
    "3": "#7171BE",
    "4": "#3838A4",
    "5": "#00008B"
  }

  getRegistrationGradientColor(percentDem: number){
    if(percentDem < 10){
      return this.blueGradient[0];
    }
    if(percentDem >= 10 && percentDem <20){
      return this.blueGradient[1];
    }
    if(percentDem >= 20 && percentDem < 25){
      return this.blueGradient[2];
    }
    if(percentDem >= 25 && percentDem < 30){
      return this.blueGradient[3];
    }
    if(percentDem >= 30 && percentDem < 35){
      return this.blueGradient[4];
    }
    if(percentDem >= 35){
      return this.blueGradient[5];
    }
  }

  getPercentPrecinctGradientColor(percentMax: number){
    if(percentMax < 15){
      return this.blueGradient[0];
    }
    if(percentMax >= 15 && percentMax <30){
      return this.blueGradient[1];
    }
    if(percentMax >= 30 && percentMax < 45){
      return this.blueGradient[2];
    }
    if(percentMax >= 45 && percentMax < 60){
      return this.blueGradient[3];
    }
    if(percentMax >= 60 && percentMax < 75){
      return this.blueGradient[4];
    }
    if(percentMax >= 75){
      return this.blueGradient[5];
    }
  }


  getAllCampaignGroups(campaign?: Campaign){
    var campaignID = parseInt(sessionStorage.getItem('campaignID') || '-1');
    var orgID = sessionStorage.getItem('orgID') || '';
    this.groupService.getAllCampaignGroups(campaignID).subscribe((groups: any[])=>{
      this.campaignGroups = groups.filter((group: Group) => {
        return (group.campaignWide) && group.active
      })

      this.orgGroups = groups.filter((group: Group) =>{
        return ((group.orgID === orgID) && (group.active) && (!group.campaignWide))
      })
      
      this.archivedGroups = groups.filter((group: Group) =>{
        return (group.orgID === orgID) && (!group.active)
      })

      if(campaign){
        this.getDefaultPrecinctOverlayData(campaign.defaultCampaignWideGroupID)
      }

    });

  }

  openCreateSurveyDialog(){
    // disableClose: the dialog's own X asks before discarding a half-built survey
    const dialogRef = this.dialog.open(CreateSurveyDialog , {autoFocus: false , width: this.screenSize , maxWidth: this.screenSize, disableClose: true});
    dialogRef.afterClosed().subscribe(() => {this.getAllSurveys()});
  }

  openCreateNonresponseSetDialog(){
    const dialogRef = this.dialog.open(CreateNonresponseSetDialog , {autoFocus: false , width: this.screenSize , maxWidth: this.screenSize, disableClose: true, data:{screenSize: this.screenSize}});
    // The new set wasn't showing until the page was reloaded
    dialogRef.afterClosed().subscribe(result => {
      if(result?.success) this.getAllNonResponseSets()
    });
  }

  openOtherNonresponseSetsDialog(){
    const dialogRef = this.dialog.open(OtherNonresponseSetsDialog , {autoFocus: false , width: this.screenSize , maxWidth: this.screenSize, data: {screenSize: this.screenSize}});
    // Archiving, restoring or editing in there changes which sets the map lists
    dialogRef.afterClosed().subscribe(changed => {
      if(changed) this.getAllNonResponseSets()
    });
  }

  getAllSurveys(){
    var orgID: string = sessionStorage.getItem('orgID') || '';
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    this.surveyService.getAllSurveys(orgID, campaignID).subscribe(
      (surveys: Survey[]) =>{
        this.surveys = surveys.filter(survey => {
          return  survey.campaignIDs.includes(campaignID) && survey.active
        })
      },
      error=>{
        console.log(error)
      }
    )
  }

  getAllNonResponseSets(){
    var orgID: string = sessionStorage.getItem('orgID') || '';
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    this.surveyService.getAllNonResponseSets(orgID, campaignID).subscribe(
      (nonResponseSets: NonResponseSet[]) =>{

        this.nonResponseSets = nonResponseSets.filter(nonResponseSet =>{
          return (nonResponseSet.campaignIDs.includes(campaignID)) && (nonResponseSet.active)
        })
    
      },
      error=>{
        console.log(error)
      }
    )
  }

  openEditSurveyDialog(survey: Survey){
    // disableClose: the dialog's own X asks before discarding unsaved changes
    const dialogRef = this.dialog.open(EditSurveyDialog, {data: survey, width: this.screenSize, autoFocus: false, maxWidth:  this.screenSize, disableClose: true });
    dialogRef.afterClosed().subscribe(() => {this.getAllSurveys()});
  }

  openOtherSurveysDialog(){
    const dialogRef = this.dialog.open(OtherSurveysDialog, {width: this.screenSize, autoFocus: false, maxWidth:  this.screenSize, data: {screenSize: this.screenSize} });
    // Archiving, restoring or editing in there changes which surveys the map lists
    dialogRef.afterClosed().subscribe(changed => {
      if(changed) this.getAllSurveys()
    });
  }

  openEditNonResponseSetDialog(nonResponseSet: NonResponseSet){
        const dialogRef = this.dialog.open(EditNonResponseDialog, {autoFocus: false , data: nonResponseSet, width: this.screenSize, maxWidth: this.screenSize});
        dialogRef.afterClosed().subscribe(result => {
          if(result){}
          this.getAllNonResponseSets()
        });
  }

  ///////////////////////////////////////
  openPrecinctPlanningSummary(){
    const dialogRef = this.dialog.open(PrecinctPlanningSummaryDialog, {width: this.screenSize, autoFocus: false, maxWidth:  this.screenSize, data: this.registrationPrecincts });

    dialogRef.afterClosed().subscribe(
      async (result: any) => {
          if(result && result.precinct){
            var groupMArker = L.polygon(result.precinct.geometry.coordinates);
            var center = [groupMArker.getBounds().getCenter().lng, groupMArker.getBounds().getCenter().lat]
            this.leafletMap.flyTo(center, 14);
          }
          
        if(result && result.result){
          this.precinctOverlayData = result.result
          this.getRegistrationPrecincts('group')
        }
      }
    );
  }

  getActivities(){
    var activityTypes = ["Phonebank", "Canvass", "Texting", "Petition"]
    for(var i = 0; i < activityTypes.length; i++){
      this.getActivityByType(activityTypes[i])
    }
  }
  
  getActivityByType(activityType: string) {
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    const orgID: string = sessionStorage.getItem('orgID') || '';

    this.activityService.getActivities(campaignID, orgID, activityType).subscribe(
      async (activities: Activity[]) => {
          
        if(activityType === "Phonebank"){
          this.phonebanks = activities.filter(function (activity) { return activity.active});
        }

        if(activityType === "Canvass"){
          this.canvasses = activities.filter(function (activity) { return activity.active});
        }

        if(activityType === "Texting"){
          this.textbanks = activities.filter(function (activity) { return activity.active});
        }

        if(activityType === "Petition"){
          this.petitions = activities.filter(function (activity) { return activity.active});
        }

      }, error =>{
        console.log(error)
      }
    )
  }

  createActivity(activityType: string) {
    sessionStorage.setItem('activityType', activityType)
    const dialogRef = this.dialog.open(CreateActivityDialog, {autoFocus: false, disableClose: true, width: this.screenSize === "100%" ? "100vw" : "820px", maxWidth: this.screenSize === "100%" ? "100vw" : "94vw", data: {}});
    dialogRef.afterClosed().subscribe(result => {this.getActivities()});
  }

  editActivity(activity: Activity) {
    const dialogRef = this.dialog.open(EditActivityDialog, {autoFocus: false, disableClose: true, width: this.screenSize === "100%" ? "100vw" : "820px", maxWidth: this.screenSize === "100%" ? "100vw" : "94vw", data: activity});
    dialogRef.afterClosed().subscribe(result => {this.getActivities()});
  }

  // Notes can be saved from the report, so the lists refresh on close
  openActivityReport(activity: Activity) {
    const dialogRef = this.dialog.open(ActivityReportDialog, {autoFocus: false, width: this.screenSize === "100%" ? "100vw" : "960px", maxWidth: this.screenSize === "100%" ? "100vw" : "94vw", data: activity});
    dialogRef.afterClosed().subscribe(result => {this.getActivities()});
  }

  activitiesOf(activityType: string): Activity[] {
    if(activityType === 'Phonebank') return this.phonebanks
    if(activityType === 'Canvass') return this.canvasses
    if(activityType === 'Texting') return this.textbanks
    if(activityType === 'Petition') return this.petitions
    return []
  }

  trackById(index: number, item: {_id?: string}){
    return item._id ?? index
  }

  // Remove the drawn polygon layers before fetching, or polygons are drawn twice and archived ones stay
  reloadPolygons(){
    this.leafletMap.eachLayer(function(layer: L.Layer){
      if(layer['feature'] && !layer['feature'].properties.districtType){
        layer.remove();
      }
    });

    this.getPolygons(this.loadAllOrgPolygons ? 'all' : 'campaign');
  }

  getCityWards(){
    this.amplifyService.getCityShapes().subscribe(
      (wards: any[]) =>{
        L.geoJSON(wards, {onEachFeature: onEachFeature.bind(this)}).addTo(this.leafletMap)

        function onEachFeature(feature: any, layer: any){
          if(feature.properties.identifier){
            setMapTooltip(layer, {title: feature.properties.identifier, subtitle: 'City ward'})
            layer.setStyle({fillColor: 'yellow', color: 'black', opacity: 0.5, fillOpacity: 0.0, weight: 5});
          }
        }
      }
    )
  }

    enterActivityDashboard(activityType: string){
    sessionStorage.setItem("campaignName", this.campaignName)
    sessionStorage.setItem('activityType', activityType)
    this.router.navigate(['/activity']);
  }

}

function unify(polyList: any[]) {
  for (var i = 0; i < polyList.length; ++i) {
    if (i == 0) {
      var unionTemp = polyList[i].toGeoJSON();
    } else {
      unionTemp = union(unionTemp, polyList[i].toGeoJSON());
    }
  }
  return L.geoJSON(unionTemp);
}