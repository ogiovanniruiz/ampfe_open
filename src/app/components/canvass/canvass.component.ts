import { Component, OnInit, OnDestroy, ViewChild, NgZone, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, MISSING_ACTIVITY_MSG, loadErrorText } from '../../utils/loading';
import { MatSnackBar } from '@angular/material/snack-bar';
import {MatDialog} from '@angular/material/dialog';
import * as L from 'leaflet';
import Compass from 'leaflet-compass';
import {Router} from "@angular/router";


//SERVICES
import { ActivityService } from 'src/app/services/activity.service';
import { CanvassService } from 'src/app/services/canvass.service';
import { GroupService } from 'src/app/services/group.service';
import { SurveyService } from 'src/app/services/survey.service';

//DIALOGS
import {HouseholdDialog, householdDialogConfig} from './dialogs/householdDialog/householdDialog'
import {ComplexDialog} from './dialogs/complexDialog/complexDialog'
import { StreetListDialog } from './dialogs/streetListDialog/streetListDialog';

//MODELS
import {Activity, CanvasserLocations } from '../../models/activity.model'
import {CanvassDialogData,  ActivityHouseholdRecord, CanvassBuildingRecord} from 'src/app/models/contact.record.model'
import { Survey } from 'src/app/models/survey.model';
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import { Group } from 'src/app/models/group.model';
import { PolygonService } from 'src/app/services/shape/polygon.service';
import { EditHouseholdDialog, editHouseholdDialogConfig } from './dialogs/editHouseholdDialog/editHouseholdDialog';
import { CampaignService } from 'src/app/services/campaign.service';
import { Campaign } from 'src/app/models/campaign.model';
import { User } from 'src/app/models/user.model';
import { PlatformLocation } from '@angular/common';
import { syncBuildingStatus, formatAddress } from './canvassUtils';
import { setMapTooltip, mapTooltip, MapTooltip, TOOLTIP_OPTIONS } from '../../utils/mapTooltips';
import { createBaseLayers, savedBaseLayer, saveBaseLayer } from '../../utils/baseLayers';
import { createMarkerClusterGroup } from '../../utils/markerClusters';

// Remembered base map (streets or satellite) for this map, per device
const BASE_LAYER_KEY = 'amp.canvassBaseLayer'

declare global {
  interface Window { GlobalSelected: any; }
}

@Component({
  selector: 'app-canvass',
  templateUrl: './canvass.component.html',
  styleUrls: ['./canvass.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class CanvassComponent implements OnInit, OnDestroy {

  layersControl = {overlays: {}};

  @ViewChild('firstName', {static: false}) firstName: ElementRef
  @ViewChild('lastName', {static: false}) lastName: ElementRef
  @ViewChild('email', {static: false}) email: ElementRef
  @ViewChild('address', {static: false}) address: ElementRef
  @ViewChild('notes', {static: false}) notes: ElementRef
  
  activity: Activity
  activityInactive: boolean = false;
  errorMessage: string = '';
  displayErrorMsg: boolean = false;
  loading = true;
  tracking: boolean = false
  userPosition: Number[] = []

  map: any

  // Clusters turn green once every house in them is complete
  households = createMarkerClusterGroup(markers => markers.every((m: any) => m.isComplete) ? '#4CAF50' : '#2196F3');

  center;

  compass;

  zoom: number = 10;

  survey: Survey;
  nonResponseSet: NonResponseSet;

  buildingRecords: CanvassBuildingRecord[] = []

  sendingReceivingLocations: boolean = false;
  trackingID: number | null = null;
  // Bumped on every stop so location responses from an earlier session are ignored
  trackingSession: number = 0;

  trackinglayerIDs: number[] = []

  keepUserCentered: boolean = false;

  polygonID: string;

  intervalID = null;

  intervalTime: number = 30000
  // Resend an unchanged position this often so stationary canvassers stay on the map
  heartbeatTime: number = 5 * 60 * 1000
  lastSentTime: number = 0

  // [lat, lng] for Leaflet; converted to GeoJSON [lng, lat] when sent
  latestCoordinates: number[] = [];
  previousCoordinates: number[] = []

  selectedMarker: any;

  greenIcon = L.icon({
    iconUrl: '../../../assets/greenMarker.png',
    shadowUrl: '../../../assets/marker-shadow.png'
  });

  blueIcon = L.icon({
    iconUrl: '../../../assets/marker-icon.png',
    shadowUrl: '../../../assets/marker-shadow.png'
  });

  purpleIcon = L.icon({
    iconUrl: '../../../assets/purpleMarker.png',
    shadowUrl: '../../../assets/marker-shadow.png'
  });

  // Households a canvasser dropped on the map, until they're done
  orangeIcon = L.icon({
    iconUrl: '../../../assets/orangeMarker.png',
    shadowUrl: '../../../assets/marker-shadow.png'
  });

  locationIcon = L.icon({
    iconUrl: '../../../assets/here.png',
  });

  drawOptions = {
    position: 'topright',
    draw: {
      marker: false,
      polygon: {allowIntersection: false,
                shapeOptions: {
                color: 'red'
                }},
      polyline: true,
      circle: true,
      rectangle: false,
      circlemarker: false
    },
  };

  showNearestPollingLocations: boolean = false;
  showPartisan: boolean = false;

  constructor(
              private activityService: ActivityService,
              private polyonService: PolygonService,
              private groupService: GroupService,
              public zone: NgZone,
              public dialog: MatDialog,
              public router: Router,
              private canvassService: CanvassService,
              private surveyService: SurveyService,
              private campaignService: CampaignService,
              private snackBar: MatSnackBar,
              location: PlatformLocation
              ) { 
                location.onPopState(() => {
                  this.stopSendReceiveLocation()


                });

              }

  // Base maps: only one on the map at a time (see utils/baseLayers)
  baseLayers = createBaseLayers();

  options = {
    layers: [this.baseLayers[savedBaseLayer(BASE_LAYER_KEY)]],
    zoom: 10,
    center: [33.971839, -117.381739],
  };

  // The floating panel (desktop) and bottom bar (phones) sit inside the map container;
  // without this, taps and scrolls on them also drag or zoom the map
  @ViewChild('mapPanel', {static: true}) mapPanel: ElementRef<HTMLElement>;
  @ViewChild('mapBar', {static: true}) mapBar: ElementRef<HTMLElement>;

  // Doors counted per unit: done means complete or passed
  doorsDone: number = 0;
  doorsTotal: number = 0;

  get progressPercent(): number {
    return this.doorsTotal ? Math.round((this.doorsDone / this.doorsTotal) * 100) : 0
  }

  updateProgress(){
    let done = 0
    let total = 0
    for(const building of this.buildingRecords || []){
      for(const record of building.records || []){
        total++
        if(record.complete || record.passed) done++
      }
    }
    this.doorsDone = done
    this.doorsTotal = total
  }

  toggleSharing(){
    this.toggleBroadcastingLocation(!this.sendingReceivingLocations)
  }

  ////////////////NEW HOUSEHOLDS/////////////////////

  // While on, the next tap on the map drops a household there
  placingHousehold: boolean = false;

  // Only for activities that let canvassers opt people in to the community
  get canDropHousehold(): boolean {
    return !!this.activity?.optinOption && !this.activityInactive
  }

  togglePlacingHousehold(){
    if(this.placingHousehold) this.cancelPlacingHousehold()
    else this.startPlacingHousehold()
  }

  startPlacingHousehold(){
    if(!this.map || !this.canDropHousehold) return
    this.placingHousehold = true
    L.DomUtil.addClass(this.map.getContainer(), 'leaflet-crosshair')
    this.map.once('click', this.dropHousehold, this)
  }

  cancelPlacingHousehold(){
    this.placingHousehold = false
    if(!this.map) return
    L.DomUtil.removeClass(this.map.getContainer(), 'leaflet-crosshair')
    this.map.off('click', this.dropHousehold, this)
  }

  // The server reverse geocodes the spot; the new door opens right away so people can be added
  dropHousehold(event: L.LeafletMouseEvent){
    this.zone.run(() => {
      this.cancelPlacingHousehold()

      const activityID: string = sessionStorage.getItem('activityID')
      const user: User = JSON.parse(sessionStorage.getItem('user'))
      const {lat, lng} = event.latlng

      this.loading = true
      this.canvassService.createCanvassHousehold(activityID, [lng, lat], user?._id).subscribe(
        (buildingRecord: CanvassBuildingRecord) => {
          this.loading = false

          const marker = L.marker([lat, lng])
          this.refreshMarker(marker, buildingRecord)
          this.households.addLayer(marker)
          this.buildingRecords.push(buildingRecord)
          this.updateProgress()

          this.selectedMarker = marker
          this.getSelected.call(buildingRecord)
          this.openHouseholdDialog()
        },
        error => {
          console.log(error)
          this.loading = false
          this.notify("Couldn't create a household here. Try a spot closer to a building.")
        }
      )
    })
  }

  onMapReady(map: L.Map){
    for(const element of [this.mapPanel?.nativeElement, this.mapBar?.nativeElement]){
      if(!element) continue
      L.DomEvent.disableClickPropagation(element)
      L.DomEvent.disableScrollPropagation(element)
    }

    const baseLayers = {
      "Streets": this.baseLayers.streets,
      "Satellite": this.baseLayers.satellite,
    };

    this.map = map
    this.layersControl.overlays['Households'] = L.featureGroup();
    L.control.layers(baseLayers).addTo(this.map)
    map.on('baselayerchange', (event: L.LayersControlEvent) => {
      saveBaseLayer(BASE_LAYER_KEY, event.layer === this.baseLayers.satellite ? 'satellite' : 'streets')
    })
    map.addControl( new Compass );
  }

  getCampaign(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.campaignService.getCampaign(campaignID).subscribe(
      (campaign: Campaign) =>{
        // Optional extras; the defaults stand if the campaign can't be read
        this.showNearestPollingLocations = !!campaign?.showNearestPollingLocations;
        this.showPartisan = !!campaign?.showPartisan;
      },
      error => console.log(error)
    )
  }

  get selected() {
    return window.GlobalSelected;
  }

  public getSelected() {
    window.GlobalSelected = this;
  }


  getCanvassBuildingRecords(){
    var activityID = sessionStorage.getItem('activityID')

    this.canvassService.getCanvassBuildingRecords(activityID).subscribe(
      (buildingRecords: CanvassBuildingRecord[])=> {

        if(buildingRecords?.['inactive']){
          this.handleInactiveActivity()
          return
        }

        this.buildingRecords = buildingRecords

        buildingRecords.forEach((buildingRecord) => {
          if (!buildingRecord.records?.length) return;

          const [lng, lat] = buildingRecord.records[0].household.location.coordinates;
          const marker = L.marker([lat, lng]);

          this.refreshMarker(marker, buildingRecord, false);
          this.households.addLayer(marker)
        })

        // Clusters are built with the markers' current state when the group joins the map
        this.map.addLayer(this.households);
        this.layersControl.overlays['Households'] = this.households
        this.updateProgress();
        this.loading = false;

    }, error =>{
      console.error('Failed to load canvass building records', error);
      this.loading = false;
    })
  }

  // Door or building summary: address, residents, how much is done, and what a tap does
  private buildBuildingTooltip(buildingRecord: CanvassBuildingRecord): MapTooltip {
    const records = buildingRecord.records;
    const household = records[0].household;
    const numResidents = records.reduce((total, record) => total + (record.household?.residents?.length ?? 0), 0);
    const doneCount = records.filter(record => record.complete || record.passed).length;
    const finished = doneCount === records.length;
    const multiUnit = records.length > 1;

    const rows: [string, string | number][] = [['Residents', numResidents]];
    if(multiUnit){
      rows.push(['Done', `${doneCount} of ${records.length} units`]);
    } else {
      const record = records[0];
      rows.push(['Status', record.complete ? 'Done' : record.passed ? 'Passed' : 'To do']);
    }

    const highAccuracy = household.accuracyType === 'rooftop' || household.accuracyType === 'nearest_rooftop_match';
    const dropped = records.some(record => record.dropped);

    return {
      title: formatAddress(household._id, false) || household.fullAddress1 || 'Unknown address',
      subtitle: multiUnit ? `${records.length} units` : (household.fullAddress2 || undefined),
      rows,
      note: dropped ? 'Added by canvasser' : highAccuracy ? undefined : 'Approximate location',
      hint: finished ? 'Tap to review' : 'Tap to canvass',
    };
  }

  /**
   * Draws a building's marker from the state of all its units: green when every unit is
   * complete or passed, otherwise orange (dropped by a canvasser), purple (multi-unit) or blue. Clicking opens the
   * household dialogs for unfinished buildings and the edit dialogs for finished ones.
   */
  private refreshMarker(marker: any, buildingRecord: CanvassBuildingRecord, refreshClusters: boolean = true): void {
    const done = syncBuildingStatus(buildingRecord);
    const household = buildingRecord.records[0].household;

    const hasHighAccuracy = household.accuracyType === 'rooftop' || household.accuracyType === 'nearest_rooftop_match';
    // Dropped doors sit exactly where the canvasser tapped, so they're never shown as approximate
    const dropped = buildingRecord.records.some(record => record.dropped);

    let icon = buildingRecord.records.length > 1 ? this.purpleIcon : this.blueIcon;
    if(dropped) icon = this.orangeIcon;
    if(done) icon = this.greenIcon;

    marker.setIcon(icon);
    marker.setOpacity(hasHighAccuracy || dropped ? 1 : 0.5);
    setMapTooltip(marker, this.buildBuildingTooltip(buildingRecord));

    marker.buildingRecord = buildingRecord;
    marker.householdRecord = buildingRecord.records[0];
    marker.isComplete = done;

    marker.off('mouseup');
    marker.off('mousedown');

    marker.on('mousedown', (event) => {
      this.selectedMarker = event.target;
      this.getSelected.call(marker.buildingRecord);
    });
    marker.on('mouseup', done ? this.openEditHouseholdDialog : this.openHouseholdDialog, this);

    // refreshClusters only works once the group is on the map (not during the initial load or a reload)
    if(refreshClusters && this.map?.hasLayer(this.households)) this.households.refreshClusters(marker);
  }

  // Dialogs return either one household record (single door) or {building} (multi-unit)
  private applyDialogResult(result: any): void {
    const marker = this.selectedMarker;
    if (!result || !marker) return;

    const buildingRecord: CanvassBuildingRecord = result.building || marker.buildingRecord;

    if (!result.building) {
      const index = buildingRecord.records.findIndex(record => record._id === result._id);
      buildingRecord.records[index >= 0 ? index : 0] = result;
    }

    this.refreshMarker(marker, buildingRecord);
    this.updateProgress();
  }

  private surveyReady(): boolean {
    if (this.survey && this.nonResponseSet) return true;
    // A failed load won't finish on its own: say so instead of "still loading"
    const message = this.errorMessage || 'Still loading the survey. Please try again in a moment.'
    this.snackBar.open(message, 'Dismiss', {duration: 4000});
    return false;
  }

  // Loads again whatever failed: the activity, or just its survey / households (so the map isn't drawn twice)
  retryLoad(){
    this.errorMessage = ''
    this.displayErrorMsg = false
    if(!this.activity){
      this.loading = true
      this.getActivity()
      return
    }
    if(!this.survey) this.getSurvey(this.activity.surveyID)
    if(!this.nonResponseSet) this.getNonResponseSet(this.activity.nonResponseSetID)
    if(!this.buildingRecords?.length && !this.activityInactive){
      this.loading = true
      this.getGroup(this.activity.groupID)
    }
  }

  openHouseholdDialog(): void {
    this.zone.run(() => {
      if (!this.surveyReady()) return;

      const isSingleHousehold = this.selected.records.length === 1;

      const dialogData: CanvassDialogData = isSingleHousehold
        ? {
            activity: this.activity,
            survey: this.survey,
            nonResponseSet: this.nonResponseSet,
            canvassHouseholdRecord: this.selected.records[0],
            showNearestPollingLocations: this.showNearestPollingLocations, showPartisan: this.showPartisan
          }
        : {
            building: this.selected,
            activity: this.activity,
            survey: this.survey,
            nonResponseSet: this.nonResponseSet,
            showNearestPollingLocations: this.showNearestPollingLocations, showPartisan: this.showPartisan
          };

      let dialogRef;

      if (isSingleHousehold) {
        dialogRef = this.dialog.open(HouseholdDialog, householdDialogConfig(dialogData));
      } else {
        dialogRef = this.dialog.open(ComplexDialog, {
          autoFocus: false,
          data: dialogData,
          width: '100%',
          maxWidth: '100%',
          disableClose: true,
        });
      }

      dialogRef.afterClosed().subscribe((result) => this.applyDialogResult(result));
    });
  }

  openEditHouseholdDialog(): void {
    this.zone.run(() => {
      if (!this.surveyReady()) return;

      let records = this.selected.records;
      let dialogRef;
      let dialogData: CanvassDialogData;

      if(records.length === 1){
        dialogData = {
          activity: this.activity,
          survey: this.survey,
          nonResponseSet: this.nonResponseSet,
          canvassHouseholdRecord: records[0],
          showNearestPollingLocations: this.showNearestPollingLocations, showPartisan: this.showPartisan

        };

        dialogRef = this.dialog.open(EditHouseholdDialog, editHouseholdDialogConfig(dialogData));

      }else{

        dialogData = {
          activity: this.activity,
          survey: this.survey,
          nonResponseSet: this.nonResponseSet,
          building: this.selected,
          showNearestPollingLocations: this.showNearestPollingLocations, showPartisan: this.showPartisan
        };

        dialogRef = this.dialog.open(ComplexDialog, {
          autoFocus: false,
          data: dialogData,
          width: '100%',
          maxWidth: '100%',
          disableClose: true,
        });

      }

      dialogRef.afterClosed().subscribe((result) => this.applyDialogResult(result));
    });
  }

  // The activity was deactivated: load no more households
  handleInactiveActivity(){
    this.activityInactive = true
    this.loading = false
    this.buildingRecords = []
    this.updateProgress()
  }

  getActivity(){
    var activityID: string = sessionStorage.getItem('activityID');
    this.activityService.getActivity(activityID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (activity: Activity) =>{
          if(!activity){
            this.errorMessage = MISSING_ACTIVITY_MSG
            this.displayErrorMsg = true
            this.loading = false
            return
          }
          this.activity = activity

          if(activity.active === false){
            this.handleInactiveActivity()
            return
          }

          this.getGroup(this.activity.groupID)
          this.getSurvey(this.activity.surveyID)
          this.getNonResponseSet(this.activity.nonResponseSetID)
    }, error=>{
      this.errorMessage = loadErrorText('this activity', error);
      this.loading = false;
      this.displayErrorMsg = true;
      console.log(error)
    })
  }

  getSurvey(surveyID: string){
    this.surveyService.getSurvey(surveyID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (survey: Survey) =>{
        this.survey = survey
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.loading = false;
        this.errorMessage = loadErrorText('the survey', error);
      }
    )
  }
  
  getNonResponseSet(nonResponseSetID: string){
    this.surveyService.getNonResponseSet(nonResponseSetID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (nonResponseSet: NonResponseSet) =>{
        this.nonResponseSet = nonResponseSet
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.loading = false;
        this.errorMessage = loadErrorText('the survey', error);
      }
    )
  }

  getGroup(groupID: string){
    this.groupService.getGroup(groupID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (group: Group) =>{
        this.getCanvassBuildingRecords()

        if(!group?.queries?.polygons?.length){
          return
        }

        this.getPolygon(group.queries.polygons[0])
      },
      error =>{
        console.log(error)
        this.errorMessage = loadErrorText("this activity's households", error);
        this.displayErrorMsg = true;
        this.loading = false;
      }
    )
  }

  getPolygon(polygonID: string){
    this.polyonService.getPolygon(polygonID).subscribe((polygon: any) =>{
      let outer_layer = L.geoJSON(polygon, {onEachFeature: onEachFeature.bind(this)}).addTo(this.map)

      function onEachFeature(feature: any, layer: any){
        layer.setStyle({fillColor: 'purple', color: 'black', opacity: 1, fillOpacity: 0.0});
      }

      if(this.polygonID) return

      var center = outer_layer.getBounds().getCenter();
      
      setTimeout(() => {
          this.center = [center.lat, center.lng];
          this.map.fitBounds(outer_layer.getBounds());
          
      });

      this.polygonID = polygonID
    },
    // The households still show; only the area outline and centering are missing
    error => console.log(error))
  }

  reloadMap(){
    // One reload at a time, and only once the map exists
    if(this.loading || !this.map) return
    this.loading = true;
    this.cancelPlacingHousehold();

    if (this.households) {
      this.households.clearLayers();
      if (this.map.hasLayer(this.households)) {
        this.map.removeLayer(this.households);
      }
    }

    delete this.layersControl.overlays['Households'];

    if (this.polygonID) {
      this.map.eachLayer((layer: any) => {
        if (!layer._url && layer !== this.households) {
          this.map.removeLayer(layer);
        }
      });
    }

    this.getCanvassBuildingRecords();
    if (this.polygonID) this.getPolygon(this.polygonID);

  }

  ngOnInit(): void {
    this.households.on('clustermouseover', this.showClusterTooltip)
    this.households.on('clustermouseout', (event: any) => event.layer.closeTooltip())
    this.getActivity()
    this.getCampaign()

  }

  openStreetList(){
    if (!this.surveyReady()) return;

    const dialogRef = this.dialog.open(StreetListDialog, { autoFocus: false, 
                                         width: "100%",  
                                         maxWidth:"100%", 
                                         disableClose: true,
                                         data: {
                                                households: this.buildingRecords, 
                                                activity: this.activity, 
                                                survey: this.survey, 
                                                nonResponseSet: this.nonResponseSet,
                                                showNearestPollingLocations: this.showNearestPollingLocations, showPartisan: this.showPartisan
                                              }
                                        });

    // Doors finished from the street list aren't reflected on the map until it reloads
    dialogRef.afterClosed().subscribe((changed: boolean) => {
      if (changed) this.reloadMap();
    });
  }

  //////////////////////////////////////////////////////////////////////////
  ////////////////TRACKER FUNCTIONS////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////

  toggleBroadcastingLocation(checked: boolean){
    if(checked) this.startSendReceiveLocation()
    if(!checked) this.stopSendReceiveLocation()
  }

  startSendReceiveLocation(){
    if(this.trackingID !== null) return

    if (!navigator.geolocation){
      this.sendingReceivingLocations = false
      this.notify("Location sharing isn't supported by this browser.")
      return
    }

    this.sendingReceivingLocations = true
    this.trackingID = navigator.geolocation.watchPosition(
      this.updateUserPosition.bind(this),
      this.handlePositionError.bind(this),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    this.getCanvasserLocations()
    this.sendReceiveLocationsEveryInterval()
  }

  stopSendReceiveLocation(){
    const wasSharing = this.trackingID !== null

    this.sendingReceivingLocations = false
    this.keepUserCentered = false
    this.trackingSession++

    if(this.trackingID !== null) navigator.geolocation.clearWatch(this.trackingID)
    this.trackingID = null

    clearInterval(this.intervalID)
    this.intervalID = null

    this.latestCoordinates = []
    this.previousCoordinates = []
    this.lastSentTime = 0

    this.removeTrackingMarkers()

    if(wasSharing) this.removeCanvassLocation()
  }

  ngOnDestroy(){
    this.stopSendReceiveLocation()
    this.cancelPlacingHousehold()
  }

  ////////////////////////////////////////////

  sendReceiveLocationsEveryInterval(){
    clearInterval(this.intervalID)
    this.intervalID = setInterval(() => {
      this.sendLocationIfNeeded()
      if(this.keepUserCentered) this.centerUserLocation(this.latestCoordinates)
      this.getCanvasserLocations()
    }, this.intervalTime);
  }

  // Sends when the position changed, or as a heartbeat when it hasn't for a while
  sendLocationIfNeeded(){
    if(this.latestCoordinates.length !== 2) return

    const moved = this.latestCoordinates[0] !== this.previousCoordinates[0] ||
                  this.latestCoordinates[1] !== this.previousCoordinates[1]
    const heartbeatDue = Date.now() - this.lastSentTime >= this.heartbeatTime

    if(!moved && !heartbeatDue) return

    this.previousCoordinates = this.latestCoordinates
    this.lastSentTime = Date.now()
    this.updateCanvassLocation(this.latestCoordinates)
  }

  ///////////////////////////////////////////

  updateUserPosition(position){
    if(!this.sendingReceivingLocations) return

    const isFirstFix = this.latestCoordinates.length === 0
    this.latestCoordinates = [position.coords.latitude, position.coords.longitude]

    // Share right away instead of waiting for the next interval tick
    if(isFirstFix){
      this.sendLocationIfNeeded()
      this.getCanvasserLocations()
    }
  }

  handlePositionError(error: GeolocationPositionError){
    // Timeouts and temporary unavailability recover on their own
    if(error.code !== error.PERMISSION_DENIED) return

    this.zone.run(() => {
      this.stopSendReceiveLocation()
      this.notify("Location permission was denied. Allow location access in your browser settings to share your location.")
    })
  }

  /////////////////////////////////////////

  centerUserLocation(coordinates: number[]){
    if(coordinates.length !== 2 || !this.map) return
    this.map.flyTo(coordinates as L.LatLngTuple, 19);
  }

  toggleCenteringUserLocation(status: boolean){
    this.keepUserCentered = status
    if(status) this.centerUserLocation(this.latestCoordinates)
  }

  /////////////////////////////////////

  updateCanvassLocation(coordinates: number[]){
    var activityID: string = sessionStorage.getItem('activityID');
    var user: User = JSON.parse(sessionStorage.getItem('user'))
    if(!user) return

    const [lat, lng] = coordinates
    this.canvassService.updateCanvassLocation(activityID, user, [lng, lat]).subscribe(
      () => {},
      error => console.log(error)
    )
  }

  removeCanvassLocation(){
    var activityID: string = sessionStorage.getItem('activityID');
    var user: User = JSON.parse(sessionStorage.getItem('user'))
    if(!user) return

    this.canvassService.removeCanvassLocation(activityID, user._id).subscribe(
      () => {},
      error => console.log(error)
    )
  }

  removeTrackingMarkers(){
    if(!this.map) return
    this.map.eachLayer((layer) => {
      if(this.trackinglayerIDs.includes(layer._leaflet_id)) this.map.removeLayer(layer);
    });
    this.trackinglayerIDs = [];
  }

  getCanvasserLocations(){
    var activityID: string = sessionStorage.getItem('activityID');
    const session = this.trackingSession

    this.canvassService.getCanvassLocations(activityID).subscribe(
      (canvasserLocations: CanvasserLocations[])=>{
        // Sharing was stopped (or restarted) while this request was in flight
        if(session !== this.trackingSession || !this.sendingReceivingLocations || !this.map) return

        this.removeTrackingMarkers()

        for(const canvasserLocation of canvasserLocations){
          const latLng = this.toLatLng(canvasserLocation.location?.coordinates)
          if(!latLng) continue

          const locationMarker = L.marker(latLng, { icon: this.locationIcon })
            .bindTooltip(mapTooltip(this.buildCanvasserTooltip(canvasserLocation)), TOOLTIP_OPTIONS)
            .addTo(this.map);
          this.trackinglayerIDs.push(locationMarker['_leaflet_id'])
        }
      },
      error => console.log(error)
    )
  }

  // Stored as GeoJSON [lng, lat]. Records written before that change were [lat, lng];
  // a first value outside ±90 can only be a longitude, so use that to tell them apart.
  toLatLng(coordinates: number[]): L.LatLngTuple | null {
    if(!coordinates || coordinates.length !== 2) return null
    const [first, second] = coordinates
    return Math.abs(first) > 90 ? [second, first] : [first, second]
  }

  // mapTooltip escapes every value, so a canvasser's name can never be interpreted as HTML
  buildCanvasserTooltip(canvasserLocation: CanvasserLocations): MapTooltip {
    const updated = new Date(canvasserLocation.dateUpdated)
    let updatedText = 'Unknown'
    if(canvasserLocation.dateUpdated && !isNaN(updated.getTime())){
      const minutes = Math.max(0, Math.round((Date.now() - updated.getTime()) / 60000))
      const ago = minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} hr ago`
      updatedText = `${updated.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})} · ${ago}`
    }

    return {
      title: canvasserLocation.user?.name?.fullName || 'Canvasser',
      subtitle: 'Sharing location',
      rows: [['Updated', updatedText]],
    }
  }

  // Clusters say how many doors they hold and how many are done; bound the first time each is hovered
  private showClusterTooltip = (event: any) => {
    const cluster = event.layer
    let doors = 0
    let done = 0
    for(const marker of cluster.getAllChildMarkers()){
      for(const record of marker.buildingRecord?.records || []){
        doors++
        if(record.complete || record.passed) done++
      }
    }
    setMapTooltip(cluster, {
      title: `${doors} ${doors === 1 ? 'door' : 'doors'}`,
      rows: [['Done', `${done} of ${doors}`]],
      hint: 'Zoom in or tap to expand',
    })
    cluster.openTooltip(event.latlng)
  }

  private notify(message: string){
    this.snackBar.open(message, 'Dismiss', {duration: 6000})
  }

}