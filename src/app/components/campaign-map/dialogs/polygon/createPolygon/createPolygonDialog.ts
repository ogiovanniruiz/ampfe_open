import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {GroupService} from '../../../../../services/group.service'
import {PolygonService} from '../../../../../services/shape/polygon.service'
import { EstimateResults, Group } from 'src/app/models/group.model';
import * as L from 'leaflet';
import { createBaseLayers, savedBaseLayer, saveBaseLayer } from '../../../../../utils/baseLayers';
import { createMarkerClusterGroup } from '../../../../../utils/markerClusters';
import { Polygon } from 'src/app/models/polygon.model';
import { EVERYONE_RULE_SET, polygonEstimate, polygonGroup, ruleSetName } from '../polygonGroupUtils';

// Shares the campaign map's remembered base map, since these dialogs open from it
const BASE_LAYER_KEY = 'amp.campaignMapBaseLayer'

@Component({
    templateUrl: './createPolygonDialog.html',
    styleUrls: ['../../../../../styles/dialog-common.scss', './createPolygonDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class CreatePolygonDialog implements OnInit{

    readonly everyone = EVERYONE_RULE_SET

    // data is the drawn/merged/precinct GeoJSON feature
    constructor(
        public dialogRef: MatDialogRef<CreatePolygonDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public polygonService: PolygonService,
        public groupService: GroupService,
        private snackBar: MatSnackBar) {}

    name: string = ''
    description: string = ''
    nameError: string = ''

    campaignGroups: Group[] = [];
    ruleSetID: string = EVERYONE_RULE_SET

    createGroupToo: boolean = false
    groupName: string = ''
    groupNameEdited: boolean = false
    groupNameError: string = ''

    saving: boolean = false
    estimating: boolean = false
    loadingGroups: boolean = false

    errorMessage: string = ''

    estimateResults: EstimateResults | null = null
    estimateStale: boolean = false

    // Set once the polygon is saved, so a failed group step doesn't lose it
    createdPolygon: Polygon | null = null
    createdPolygonExisted: boolean = false
    // The group asked for alongside the polygon was saved too
    groupMade: boolean = false

    map: L.Map | null = null
    private markers = createMarkerClusterGroup()

    // Base maps: only one on the map at a time (see utils/baseLayers)
    baseLayers = createBaseLayers()

    options = {
      layers: [this.baseLayers[savedBaseLayer(BASE_LAYER_KEY)]],
      zoom: 10,
      center: L.latLng(33.971839, -117.381739),
    };

    blueIcon = L.icon({
      iconUrl: '../../../assets/marker-icon.png',
      shadowUrl: '../../../assets/marker-shadow.png'
    });

    ngOnInit(){
      const precinctID = this.data?.properties?.precinctID
      if(precinctID) this.name = String(precinctID)
      this.syncGroupName()
      this.getAllCampaignGroups()
    }

    //////////////////////// DISPLAY ////////////////////////

    get sourceLabel(): string {
      const precinctID = this.data?.properties?.precinctID
      return precinctID ? `Precinct ${precinctID}` : 'Drawn shape'
    }

    get busy(): boolean {
      return this.saving || this.estimating
    }

    get selectedRuleSet(): Group | null {
      return this.campaignGroups.find(group => group._id === this.ruleSetID) || null
    }

    get ruleSetName(): string {
      return ruleSetName(this.selectedRuleSet)
    }

    get canCreate(): boolean {
      return !!this.name.trim() && !this.busy && (!this.createGroupToo || !!this.groupName.trim())
    }

    get createLabel(): string {
      if(this.createdPolygon) return 'Create group'
      return this.createGroupToo ? 'Create polygon & group' : 'Create polygon'
    }

    //////////////////////// FORM ////////////////////////

    onNameChange(){
      this.nameError = ''
      this.syncGroupName()
    }

    onGroupNameChange(){
      this.groupNameError = ''
      this.groupNameEdited = true
    }

    onRuleSetChange(){
      if(this.estimateResults) this.estimateStale = true
      this.syncGroupName()
    }

    // The group name follows the polygon name and rule set until the user types their own
    syncGroupName(){
      if(this.groupNameEdited) return
      this.groupName = `${this.ruleSetName}_${this.name.trim()}`
    }

    //////////////////////// MAP ////////////////////////

    onMapReady(map: L.Map){
      this.map = map
      this.markers.addTo(map)
      L.control.layers({'Streets': this.baseLayers.streets, 'Satellite': this.baseLayers.satellite}).addTo(map)
      map.on('baselayerchange', (event: L.LayersControlEvent) => {
        saveBaseLayer(BASE_LAYER_KEY, event.layer === this.baseLayers.satellite ? 'satellite' : 'streets')
      })
      setTimeout(() => {
        map.invalidateSize()
        const outline = L.geoJSON(this.data, {style: {fillColor: 'purple', color: 'black', opacity: 1, fillOpacity: 0.05, weight: 2}}).addTo(map)
        const bounds = outline.getBounds()
        if(bounds.isValid()) map.fitBounds(bounds, {padding: [20, 20]})
      })
    }

    showEstimateMarkers(){
      this.markers.clearLayers()
      const pins = (this.estimateResults?.locations || []).map(location => {
        const [lng, lat] = location['coordinates']
        return L.marker([lat, lng], {icon: this.blueIcon})
      })
      this.markers.addLayers(pins)
    }

    //////////////////////// ESTIMATE ////////////////////////

    getEstimate(){
      this.errorMessage = ''
      this.estimating = true
      this.groupService.getEstimate(polygonEstimate(this.selectedRuleSet, this.data)).subscribe((estimateResults: EstimateResults) =>{
          this.estimating = false
          this.estimateResults = estimateResults
          this.estimateStale = false
          this.showEstimateMarkers()
        },
        error =>{
          console.log(error)
          this.estimating = false
          this.errorMessage = "There was an error calculating the estimate."
        })
    }

    //////////////////////// CREATE ////////////////////////

    create(){
      if(!this.canCreate) return
      this.errorMessage = ''

      // The polygon already exists from an earlier attempt; only the group is left
      if(this.createdPolygon){
        this.createGroup(this.createdPolygon)
        return
      }

      const name = this.name.trim()
      if(!name){
        this.nameError = 'The polygon needs a name.'
        return
      }

      const user = JSON.parse(sessionStorage.getItem('user') || '{}')

      const polygonDetail = {
        properties: {
          name: name,
          orgID: sessionStorage.getItem('orgID'),
          description: this.description.trim(),
          campaignID: parseInt(sessionStorage.getItem('campaignID')),
          userID: user?._id,
        },
        geometry: this.data.geometry
      }

      this.saving = true

      this.polygonService.createPolygon(polygonDetail).subscribe(
        (results: any) => {
          const polygon: Polygon = results?.polygon

          if(polygon && !results.polygonExists){
            this.createdPolygon = polygon
            if(this.createGroupToo) this.createGroup(polygon)
            else this.finish()
            return
          }

          // An active polygon with this exact name can carry the new group; an overlapping
          // polygon with another name is a different shape, so it is never reused
          const sameName = polygon?.properties?.name === name
          if(polygon && this.createGroupToo && sameName && polygon.properties.active){
            this.createdPolygon = polygon
            this.createdPolygonExisted = true
            this.createGroup(polygon)
            return
          }

          this.saving = false
          const msg = results?.msg || 'The polygon could not be created.'
          if(/name/i.test(msg)) this.nameError = msg
          else this.errorMessage = msg
        },
        error =>{
          console.log(error)
          this.saving = false
          this.errorMessage = 'There was a problem creating the polygon. Please try again.'
        }
      )
    }

    createGroup(polygon: Polygon){
      this.saving = true

      this.groupService.createGroup(polygonGroup(this.selectedRuleSet, polygon._id, this.groupName)).subscribe(
        (created: Group)=>{
          if(!created) {
            this.saving = false
            this.groupNameError = 'A group with that name already exists in this campaign.'
            this.errorMessage = this.createdPolygonExisted
              ? 'Rename the group to try again.'
              : 'The polygon was saved, but the group was not. Rename the group to try again, or close to keep just the polygon.'
            return
          }
          this.groupMade = true
          this.finish()
        },
        error =>{
          console.log(error)
          this.saving = false
          this.errorMessage = 'The polygon was saved, but the group could not be created. Try again, or close to keep just the polygon.'
        }
      )
    }

    // existing: the polygon was already on the map, so the map must not draw it again
    finish(){
      // Closing after a failed group still keeps the new polygon, so say only what was saved
      const polygonName = this.createdPolygon?.properties?.name || this.name.trim()
      const message = !this.createdPolygon ? ''
        : this.createdPolygonExisted ? (this.groupMade ? `Group "${this.groupName}" created.` : '')
        : this.groupMade ? `Polygon "${polygonName}" and group "${this.groupName}" created.`
        : `Polygon "${polygonName}" created.`
      if(message) this.snackBar.open(message, 'Dismiss', {duration: 3000})
      this.dialogRef.close(this.createdPolygon ? {polygon: this.createdPolygon, existing: this.createdPolygonExisted} : undefined)
    }

    close(){
      if(this.saving) return
      this.finish()
    }

    //////////////////////// DATA ////////////////////////

    getAllCampaignGroups(){
      this.loadingGroups = true
      const campaignID = parseInt(sessionStorage.getItem('campaignID'));
      this.groupService.getAllCampaignGroups(campaignID).subscribe((groups: any[])=>{
          this.loadingGroups = false
          this.campaignGroups = groups.filter((group: Group) => group.campaignWide && group.active)
        },
        error =>{
          console.log(error)
          this.loadingGroups = false
        });
    }
}
