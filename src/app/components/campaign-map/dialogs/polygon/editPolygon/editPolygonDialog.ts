import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {GroupService} from '../../../../../services/group.service'
import {PolygonService} from '../../../../../services/shape/polygon.service'
import { EstimateResults, Group } from 'src/app/models/group.model';
import { Activity } from 'src/app/models/activity.model';
import { Polygon } from 'src/app/models/polygon.model';
import * as L from 'leaflet';
import { createBaseLayers, savedBaseLayer, saveBaseLayer } from '../../../../../utils/baseLayers';
import { createMarkerClusterGroup } from '../../../../../utils/markerClusters';
import { EVERYONE_RULE_SET, polygonEstimate, polygonGroup, ruleSetName } from '../polygonGroupUtils';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';

// Shares the campaign map's remembered base map, since these dialogs open from it
const BASE_LAYER_KEY = 'amp.campaignMapBaseLayer'

@Component({
    templateUrl: './editPolygonDialog.html',
    styleUrls: ['../../../../../styles/dialog-common.scss', '../createPolygon/createPolygonDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class EditPolygonDialog implements OnInit{

  readonly everyone = EVERYONE_RULE_SET

  // data is the polygon feature from the map layer
  constructor(
    public dialogRef: MatDialogRef<EditPolygonDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public polygonService: PolygonService,
    public groupService: GroupService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog) {}

  savedName: string = ''
  savedDescription: string = ''
  name: string = ''
  description: string = ''
  nameError: string = ''

  polygonGroups: Group[] = []
  polygonActivities: Activity[] = []
  loadingUsage: boolean = false
  usageError: string = ''

  campaignGroups: Group[] = [];
  ruleSetID: string = EVERYONE_RULE_SET
  loadingGroups: boolean = false

  groupName: string = ''
  groupNameEdited: boolean = false
  groupNameError: string = ''

  saving: boolean = false
  archiving: boolean = false
  creatingGroup: boolean = false
  estimating: boolean = false

  errorMessage: string = ''

  estimateResults: EstimateResults | null = null
  estimateStale: boolean = false

  // What the map needs to refresh once the dialog closes
  savedPolygon: Polygon | null = null
  groupCreated: boolean = false

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
    this.savedName = this.data?.properties?.name || ''
    this.savedDescription = this.data?.properties?.description || ''
    this.name = this.savedName
    this.description = this.savedDescription
    this.syncGroupName()

    this.getPolygonUsage()
    this.getAllCampaignGroups()
  }

  //////////////////////// DISPLAY ////////////////////////

  get busy(): boolean {
    return this.saving || this.archiving || this.creatingGroup
  }

  get hasChanges(): boolean {
    return this.name.trim() !== this.savedName || this.description.trim() !== this.savedDescription
  }

  get canSave(): boolean {
    return this.hasChanges && !!this.name.trim() && !this.busy
  }

  get activeGroups(): Group[] {
    return this.polygonGroups.filter(group => group.active)
  }

  // Archiving is blocked while active groups target the polygon, and until usage is known
  get canArchive(): boolean {
    return !this.busy && !this.loadingUsage && !this.usageError && this.activeGroups.length === 0
  }

  get archiveTooltip(): string {
    if(this.loadingUsage) return 'Checking which groups use this polygon…'
    if(this.usageError) return 'Couldn\'t check which groups use this polygon'
    if(this.activeGroups.length) return 'Archive or remove the active groups using this polygon first'
    return ''
  }

  get selectedRuleSet(): Group | null {
    return this.campaignGroups.find(group => group._id === this.ruleSetID) || null
  }

  get ruleSetName(): string {
    return ruleSetName(this.selectedRuleSet)
  }

  get canCreateGroup(): boolean {
    return !!this.groupName.trim() && !this.busy
  }

  //////////////////////// FORM ////////////////////////

  onRuleSetChange(){
    if(this.estimateResults) this.estimateStale = true
    this.syncGroupName()
  }

  onGroupNameChange(){
    this.groupNameError = ''
    this.groupNameEdited = true
  }

  // The group name follows the saved polygon name and rule set until the user types their own
  syncGroupName(){
    if(this.groupNameEdited) return
    this.groupName = `${this.ruleSetName}_${this.savedName}`
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

  //////////////////////// SAVE ////////////////////////

  save(){
    if(!this.canSave) return
    const name = this.name.trim()
    if(!name){
      this.nameError = 'The polygon needs a name.'
      return
    }

    const polygonDetail = {
      _id: this.data._id,
      properties: {
        name: name,
        description: this.description.trim(),
        campaignID: parseInt(sessionStorage.getItem('campaignID'))
      },
    }

    this.saving = true
    this.errorMessage = ''
    this.nameError = ''

    this.polygonService.editPolygon(polygonDetail).subscribe(
      (result: any) => {
        this.saving = false
        if(!result?.polygon){
          const msg = result?.msg || 'The polygon could not be saved.'
          if(/name/i.test(msg)) this.nameError = msg
          else this.errorMessage = msg
          return
        }

        this.savedPolygon = result.polygon
        this.savedName = result.polygon.properties.name
        this.savedDescription = result.polygon.properties.description || ''
        this.name = this.savedName
        this.description = this.savedDescription
        this.syncGroupName()
        this.snackBar.open('Polygon saved.', 'Dismiss', {duration: 2500})
      },
      error =>{
        console.log(error)
        this.saving = false
        this.errorMessage = 'There was a problem with the server. Please try again.'
      }
    )
  }

  async archivePolygon(){
    if(!this.canArchive) return
    if(!(await confirmAction(this.dialog, {title: `Archive "${this.savedName}"?`, message: "It can't be used in new groups, and it's removed from the map. You can restore it from the Polygon Allocation List.", confirmLabel: 'Archive', cancelLabel: 'Cancel', danger: true}))) return

    this.archiving = true
    this.errorMessage = ''

    this.polygonService.archivePolygon(this.data._id, false).subscribe(
      (polygon: any) => {
        this.archiving = false
        this.snackBar.open(`"${this.savedName}" archived.`, 'Dismiss', {duration: 3000})
        this.dialogRef.close({polygon: polygon, archived: true, group: this.groupCreated});
      },
      error =>{
        console.log(error)
        this.archiving = false
        this.errorMessage = 'Couldn\'t archive the polygon. Please try again.'
      }
    )
  }

  //////////////////////// ESTIMATE + GROUP ////////////////////////

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

  // Stays open afterwards so the new group shows under "Used by"
  createGroup(){
    if(!this.canCreateGroup) return
    this.errorMessage = ''
    this.creatingGroup = true

    this.groupService.createGroup(polygonGroup(this.selectedRuleSet, this.data._id, this.groupName)).subscribe(
      (group: Group)=>{
        this.creatingGroup = false
        if(!group) {
          this.groupNameError = 'A group with that name already exists in this campaign.'
          return
        }

        this.groupCreated = true
        this.polygonGroups = [group, ...this.polygonGroups]
        this.groupNameEdited = false
        this.syncGroupName()
        this.snackBar.open(`Group "${group.name}" created.`, 'Dismiss', {duration: 3000})
      },
      error =>{
        console.log(error)
        this.creatingGroup = false
        this.errorMessage = 'Couldn\'t create the group. Please try again.'
      })
  }

  //////////////////////// CLOSE ////////////////////////

  copyID(){
    navigator.clipboard?.writeText(this.data._id).then(
      () => this.snackBar.open('Polygon ID copied.', 'Dismiss', {duration: 2500}),
      () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
    )
  }

  async close(){
    if(this.busy) return
    if(this.hasChanges && !(await confirmAction(this.dialog, {title: 'Discard unsaved changes?', message: 'Your edits to this polygon will be lost.', danger: true}))) return
    const result = {polygon: this.savedPolygon, group: this.groupCreated}
    this.dialogRef.close(this.savedPolygon || this.groupCreated ? result : undefined)
  }

  //////////////////////// DATA ////////////////////////

  getPolygonUsage(){
    this.loadingUsage = true
    this.usageError = ''
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

    this.polygonService.getPolygonUsage(this.data._id, campaignID).subscribe((result: any)=>{
        this.loadingUsage = false
        this.polygonGroups = result?.groups || []
        this.polygonActivities = result?.activities || []
      },
      error =>{
        console.log(error)
        this.loadingUsage = false
        this.usageError = 'Couldn\'t load the groups and activities using this polygon.'
      })
  }

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
