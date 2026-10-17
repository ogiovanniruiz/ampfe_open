import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, OnDestroy, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { MatRadioGroup } from '@angular/material/radio';
import { FormControl, FormGroup, FormArray, FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';

import * as L from 'leaflet';
import { createBaseLayers, savedBaseLayer, saveBaseLayer } from '../../../../../utils/baseLayers';
import { createMarkerClusterGroup } from '../../../../../utils/markerClusters';

//MODELS
import {Group, Estimate, EstimateResults} from '../../../../../models/group.model'
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import { Survey } from 'src/app/models/survey.model';

//SERVICES
import {AmplifyService} from '../../../../../services/amplify.service';
import {OrganizationService} from '../../../../../services/organization/organization.service'
import {SurveyService} from '../../../../../services/survey.service'
import {MembershipService} from '../../../../../services/membership.service'
import { GroupService } from 'src/app/services/group.service';
import { PolygonService } from 'src/app/services/shape/polygon.service';

//TEMPLATES
import {indivContactConfigTemplate, indivGeneralConfigTemplate, indivVoteHistoryConfigTemplate, indivGeoConfigTemplate, memberConfigTemplate} from './groupConfigs/indivConfig'
import {hhConfigTemplate} from './groupConfigs/hhConfig';
import { TagDefinition } from 'src/app/models/organization.model';

const GROUP_BY_LABELS: {[groupBy: string]: string} = {
  HOUSEHOLD: 'Households',
  INDIVIDUAL: 'Individuals',
  MEMBERSHIP: 'Members',
}

// Rule values of false (e.g. "No Unit Number") are real selections, so only these count as unset
const isEmptyValue = (value: any) => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

// Shares the campaign map's remembered base map, since this dialog opens from it
const BASE_LAYER_KEY = 'amp.campaignMapBaseLayer'

@Component({
    templateUrl: './groupCreatorDialog.html',
    styleUrls: ['../../../../../styles/dialog-common.scss', './groupCreatorDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class GroupCreatorDialog implements OnInit, OnDestroy{

  groupBy: string = "INDIVIDUAL";

  ruleOptions: any[] = []
  contactRuleOptions: any[] = []
  voteHistoryRuleOptions: any[] = []
  geographicRuleOptions: any[] = []
  membershipRuleOptions: any[] = []
  // Tags with values, for the Tag values filter
  tagDefinitions: TagDefinition[] = []
  addedRules: any[] = []

  // The templates are shared module objects (the group editor reads them too), so options loaded here are reset on open
  indivGeneralConfig = indivGeneralConfigTemplate
  hhConfig = hhConfigTemplate
  memberConfig = memberConfigTemplate
  indivContactConfig = indivContactConfigTemplate
  indivVoteHistoryConfig = indivVoteHistoryConfigTemplate
  indivGeoConfig = indivGeoConfigTemplate

  form: FormGroup;
  formChanges: Subscription;

  campaignBoundary: any;

  name: string = ''
  campaignWide: boolean = false

  creating: boolean = false
  estimating: boolean = false
  gettingZips: boolean = false

  errorMessage: string = ''
  nameError: string = ''
  // Empty rules are only highlighted once the user tries to estimate or create
  showEmptyRules: boolean = false
  skippedRulesMessage: string = ''

  estimateResults: EstimateResults | null = null
  estimateStale: boolean = false

  dev: boolean = false
  dataManager: boolean = false

  campaignGroups: Group[] = [];

  precinctCsvMessage: string = '';
  pdiCsvMessage: string = '';

  constructor(
        public dialogRef: MatDialogRef<GroupCreatorDialog>,
        public surveyService: SurveyService,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public groupService: GroupService,
        public orgService: OrganizationService,
        public ampService: AmplifyService,
        public memberService: MembershipService,
        private formBuilder: FormBuilder,
        private polygonService: PolygonService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        ) {
            this.campaignBoundary = data.campaignBoundary || [];
            this.form = this.formBuilder.group({});
            this.formChanges = this.form.valueChanges.subscribe(() => {
              if(this.estimateResults) this.estimateStale = true
            })

            this.indivGeoConfig.districts.options = []
            this.indivGeoConfig.polygons.options = []
            this.indivGeoConfig.zips.options = []
            this.indivGeoConfig.cities.options = []

            this.memberConfig.uploads.options = []
            this.memberConfig.activities.options = []
            this.memberConfig.tags.options = []

            const activePolygons = (data.polygons || []).filter(polygon => polygon.properties.active === true);
            const precincts = [...(data.precincts || [])].sort((a, b) => a.properties.precinctID.localeCompare(b.properties.precinctID))
            this.indivGeoConfig.precincts.options = precincts.map(precinct => ({name: precinct.properties.precinctID, value: precinct.properties.precinctID}))
            this.indivGeoConfig.polygons.options = activePolygons.map(polygon => ({name: polygon.properties.name, value: polygon._id}))
            this.indivGeoConfig.districts.options = this.campaignBoundary.map(district => ({name: district.properties.name, value: district.properties.identifier}))

            this.setRuleOptions()
        }

  // Base maps: only one on the map at a time (see utils/baseLayers)
  baseLayers = createBaseLayers()
  private markers = createMarkerClusterGroup()

  options = {
            layers: [this.baseLayers[savedBaseLayer(BASE_LAYER_KEY)]],
            zoom: 10,
            center: [33.971839, -117.381739],
          };

    blueIcon = L.icon({
      iconUrl: '../../../assets/marker-icon.png',
      shadowUrl: '../../../assets/marker-shadow.png'
    });

  center: L.LatLngExpression = [33.971839, -117.381739];
  zoom: number = 10;

  showMap: boolean = false;
  // The polygon the shown estimate was calculated for
  estimatePolygonID: string | null = null

  map: L.Map | null = null;

  ngOnInit(){
    this.getAllCampaignGroups()
    this.getSurveys();
    this.getDataManagerStatus()
    this.getOrgTags()
    this.getUploads()
    this.getMemberActivities()
    this.getNonResponseSets()
    this.getOrgUsers()
  }

  ngOnDestroy(){
    this.formChanges?.unsubscribe()
  }

  //////////////////////// DISPLAY ////////////////////////

  get groupByLabel(): string {
    return GROUP_BY_LABELS[this.groupBy] || this.groupBy
  }

  get canSetCampaignWide(): boolean {
    return this.dev || this.dataManager
  }

  get busy(): boolean {
    return this.creating || this.estimating
  }

  get hasWork(): boolean {
    return !!this.name.trim() || this.addedRules.length > 0
  }

  get emptyRuleCount(): number {
    return this.addedRules.filter(rule => this.isRuleEmpty(rule)).length
  }

  get canCreate(): boolean {
    return !!this.name.trim() && !this.busy
  }

  isRuleEmpty(rule: any): boolean {
    const array = this.form.get(rule.value) as FormArray
    if(!array) return true
    if(rule.date) return isEmptyValue(array.at(0)?.value) && isEmptyValue(array.at(1)?.value)
    if(rule.tagValues) return !this.tagValueRows(rule).some(row => row.label)
    return isEmptyValue(array.at(0)?.value)
  }

  // Community member groups normally only include members inside the campaign district
  get entireMembership(): boolean {
    return this.groupBy === 'MEMBERSHIP' && this.isRuleAdded('ignoreDistrict')
  }

  setEntireMembership(on: boolean){
    if(on) this.addRule({value: 'ignoreDistrict'})
    else {
      const rule = this.addedRules.find(r => r.value === 'ignoreDistrict')
      if(rule) this.removeRule(rule)
    }
    if(this.estimateResults) this.estimateStale = true
  }

  isRuleAdded(value: string): boolean {
    return this.addedRules.some(rule => rule.value === value)
  }

  //////////////////////// RULES ////////////////////////

  setRuleOptions(){
    this.ruleOptions = Object.values(this.groupBy === "HOUSEHOLD" ? this.hhConfig : this.indivGeneralConfig)
    this.contactRuleOptions = Object.values(this.indivContactConfig)
    this.voteHistoryRuleOptions = Object.values(this.indivVoteHistoryConfig)
    this.geographicRuleOptions = Object.values(this.indivGeoConfig)
    this.membershipRuleOptions = this.groupBy === "MEMBERSHIP" ? Object.values(this.memberConfig).filter((rule: any) => !rule.hidden) : []
  }

  // Shared keys keep using the individual configs (the server expects their value shapes);
  // household-only rules such as single_party_household are only in hhConfig
  configForKey(key: string): any {
    const configs = [this.indivGeneralConfig, this.indivContactConfig, this.indivVoteHistoryConfig, this.indivGeoConfig, this.memberConfig, this.hhConfig]
    return configs.map(config => config[key]).find(entry => !!entry) ?? null
  }

  // Rule pickers act as menus: add the rule, then clear the picker
  pickRule(event: MatSelectChange){
    if(event.value) this.addRule(event.value)
    event.source.value = null
  }

  addRule(rule: any): boolean {

      if(this.isRuleAdded(rule.value)) return true

      const entry = this.configForKey(rule.value)
      if(!entry) return false

      if(rule.value === "zips"){
        this.getZips()
      }

      if(rule.value === "cities"){
        if(this.groupBy === "MEMBERSHIP") this.getCommunityListCities()
        else this.getCities()
      }

      this.addedRules.unshift(entry)

      // Stored as [selected, ''] and dates as [start, end, '']; the server and the group editor read this shape
      let controls: FormControl[]
      if (entry.date) {
        controls = [new FormControl(rule.selectedOptions?.[0] ?? null), new FormControl(rule.selectedOptions?.[1] ?? null)]
      } else if (entry.tagValues) {
        // A list of {label, values} rows, starting with one empty row
        const saved = Array.isArray(rule.selectedOptions) ? rule.selectedOptions[0] : null
        controls = [new FormControl(Array.isArray(saved) && saved.length ? saved : [{label: null, values: []}])]
      } else {
        let selected = Array.isArray(rule.selectedOptions) ? rule.selectedOptions[0] : rule.selectedOptions
        // A rule with a single choice (e.g. "Yes") is complete as soon as it's added
        if(selected === undefined && !entry.multiple && entry.options?.length === 1) selected = entry.options[0].value
        controls = [new FormControl(selected ?? null)]
      }
      controls.push(new FormControl(''))

      this.form.addControl(rule.value, new FormArray(controls));
      return true
    }

    removeRule(rule: any){
      this.form.removeControl(rule.value)
      this.addedRules = this.addedRules.filter(item => item.value !== rule.value);

      if(rule.value === 'precincts'){
        this.precinctCsvMessage = '';
      }

      if(rule.value === 'pdiIDs'){
        this.pdiCsvMessage = '';
      }
    }

    clearForm(){
      Object.keys(this.form.controls).forEach(controlName => {
        this.form.removeControl(controlName);
      });
      this.addedRules = []
      this.precinctCsvMessage = ''
      this.pdiCsvMessage = ''
      this.skippedRulesMessage = ''
      this.showEmptyRules = false
    }

    async changeGroupBy(groupBy: string, radio: MatRadioGroup){
      if(groupBy === this.groupBy) return
      if(this.addedRules.length && !(await confirmAction(this.dialog, {title: 'Change who this group targets?', message: 'Its filters will be cleared.', confirmLabel: 'Change', danger: true}))){
        radio.value = this.groupBy
        return
      }

      const wasMembership = this.groupBy === "MEMBERSHIP"
      this.groupBy = groupBy
      this.clearForm()
      this.resetEstimate()

      // Members use the community list's cities, voters use the campaign's
      if(wasMembership !== (groupBy === "MEMBERSHIP")) this.indivGeoConfig.cities.options = []

      this.setRuleOptions()
      this.getAllCampaignGroups()
    }

    async applyGroupQuery(group: Group, picker: MatSelect){
      picker.value = null
      if(this.addedRules.length && !(await confirmAction(this.dialog, {title: 'Replace the current filters?', message: `They'll be replaced with the filters from "${group.name}".`, confirmLabel: 'Replace', danger: true}))) return

      this.clearForm()
      const skipped: string[] = []
      // Both tag filters (older name-only Tags, and Tags rows) become one Tags filter
      const tagRows = this.tagRowsFrom(group.queries)
      for (const property in group.queries) {
        if(property === 'tags' || property === 'tagValues') continue
        if(!this.addRule({value: property, selectedOptions: group.queries[property]})) skipped.push(property)
      }
      if(tagRows.length) this.addRule({value: 'tagValues', selectedOptions: [tagRows, '']})
      if(skipped.length){
        this.skippedRulesMessage = `Some filters from "${group.name}" can't be edited here and were left out: ${skipped.join(', ')}.`
      }
    }

    //////////////////////// TAG VALUES ////////////////////////

    tagValueRows(rule: any): {label: string | null, values: string[]}[] {
      const value = (this.form.get(rule.value) as FormArray)?.at(0)?.value
      return Array.isArray(value) ? value : []
    }

    private setTagValueRows(rule: any, rows: {label: string | null, values: string[]}[]){
      (this.form.get(rule.value) as FormArray)?.at(0)?.setValue(rows)
    }

    // Picking another tag clears the values, since they belong to the old tag
    setTagValueLabel(rule: any, index: number, label: string){
      const rows = [...this.tagValueRows(rule)]
      rows[index] = {label, values: []}
      this.setTagValueRows(rule, rows)
    }

    setTagValueValues(rule: any, index: number, values: string[]){
      const rows = [...this.tagValueRows(rule)]
      rows[index] = {...rows[index], values: values || []}
      this.setTagValueRows(rule, rows)
    }

    addTagValueRow(rule: any){
      this.setTagValueRows(rule, [...this.tagValueRows(rule), {label: null, values: []}])
    }

    removeTagValueRow(rule: any, index: number){
      const rows = this.tagValueRows(rule).filter((_, i) => i !== index)
      this.setTagValueRows(rule, rows.length ? rows : [{label: null, values: []}])
    }

    // The tag's values and colors; undefined for a plain tag
    tagDefinitionFor(label: string): TagDefinition | undefined {
      return this.tagDefinitions.find(d => d.label === label)
    }

    // The org's tags that no other row uses
    availableTagsFor(rule: any, index: number): string[] {
      const used = new Set(this.tagValueRows(rule).filter((_, i) => i !== index).map(row => row.label))
      return (this.memberConfig.tags.options || []).map((option: any) => option.value).filter((label: string) => !used.has(label))
    }

    // A saved group's tag filters as Tags rows: older name-only tags become rows with any value
    private tagRowsFrom(queries: any): {label: string, values: string[]}[] {
      const rows: {label: string, values: string[]}[] = []
      const add = (label: string, values: string[]) => { if(label && !rows.some(r => r.label === label)) rows.push({label, values: values || []}) }
      ;(Array.isArray(queries?.tagValues?.[0]) ? queries.tagValues[0] : []).forEach((row: any) => add(row?.label, row?.values))
      ;(Array.isArray(queries?.tags?.[0]) ? queries.tags[0] : []).forEach((label: string) => add(label, []))
      return rows
    }

    trackIndex(index: number){
      return index
    }

    compareValues(option: any, selected: any): boolean {
      if (option && selected && typeof option === 'object' && typeof selected === 'object') {
        if(selected.nonResponse){
          return (option._id === selected._id && option.nonResponse === selected.nonResponse);
        }
        return (option._id === selected._id && option.response === selected.response && option.question === selected.question);
      }
      return option === selected;
    }

    //////////////////////// CSV IMPORTS ////////////////////////

    onPrecinctCsvSelected(event: any){
      const file = event.target.files[0];
      if(!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        const text = reader.result as string;
        const rawIDs = text
          .split(/\r?\n/)
          .map(line => line.split(',')[0])
          .map(value => value.trim().replace(/^"+|"+$/g, ''))
          .filter(value => value.length > 0);

        const validOptions = new Map(
          this.indivGeoConfig.precincts.options.map(o => [String(o.value).toLowerCase(), o.value])
        );

        const matched = new Set<string>();
        let unmatchedCount = 0;

        for(const rawID of rawIDs){
          const match = validOptions.get(rawID.toLowerCase());
          if(match !== undefined){
            matched.add(match);
          } else {
            unmatchedCount++;
          }
        }

        const precinctsArray = this.form.get('precincts') as FormArray;
        if(!precinctsArray) return
        const currentSelection: string[] = precinctsArray.at(0).value ?? [];
        const merged = Array.from(new Set([...currentSelection, ...matched]));
        precinctsArray.at(0).setValue(merged);

        this.precinctCsvMessage = `Imported ${matched.size} precinct(s).` +
          (unmatchedCount > 0 ? ` ${unmatchedCount} row(s) skipped (not recognized).` : '');
      };
      reader.readAsText(file);

      event.target.value = '';
    }

    get pdiIdCount(): number {
      const pdiArray = this.form.get('pdiIDs') as FormArray;
      return pdiArray?.at(0)?.value?.length ?? 0;
    }

    // PDI IDs can't be checked against a list here like precincts; the server matches them
    onPdiCsvSelected(event: any){
      const file = event.target.files[0];
      if(!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        const text = reader.result as string;
        const rows = text
          .split(/\r?\n/)
          .map(line => line.split(',')[0])
          .map(value => value.trim().replace(/^"+|"+$/g, '').trim().toUpperCase());

        // Skip a header row such as "pdiID" or "PDI ID"
        if(rows.length && rows[0].includes('PDI')) rows.shift();

        const pdiArray = this.form.get('pdiIDs') as FormArray;
        if(!pdiArray) return
        const currentIDs: string[] = pdiArray.at(0).value ?? [];
        const merged = new Set<string>(currentIDs);
        let skippedCount = 0;

        for(const id of rows){
          if(!id || merged.has(id)){
            skippedCount++;
          } else {
            merged.add(id);
          }
        }

        const addedCount = merged.size - currentIDs.length;
        pdiArray.at(0).setValue(Array.from(merged));

        this.pdiCsvMessage = `Imported ${addedCount} PDI ID(s).` +
          (skippedCount > 0 ? ` ${skippedCount} duplicate/blank row(s) skipped.` : '');
      };
      reader.readAsText(file);

      event.target.value = '';
    }

    //////////////////////// ESTIMATE ////////////////////////

    // Unset rules would reach the server as {$in: null}
    private checkRules(): boolean {
      if(this.emptyRuleCount === 0) return true
      this.showEmptyRules = true
      this.errorMessage = this.emptyRuleCount === 1
        ? 'One filter has no value. Choose a value or remove it.'
        : `${this.emptyRuleCount} filters have no value. Choose values or remove them.`
      return false
    }

    resetEstimate(){
      this.estimateResults = null
      this.estimateStale = false
      this.showMap = false
      this.map = null
      this.estimatePolygonID = null
    }

    getEstimate(){
      this.errorMessage = '';
      if(!this.checkRules()) return

      const estimate: Estimate = {
          orgID: sessionStorage.getItem('orgID'),
          campaignID: parseInt(sessionStorage.getItem('campaignID')),
          queries: this.form.value,
          groupBy: this.groupBy,
          campaignWide: this.campaignWide
      }

      const polygonID: string | null = this.form.value.polygons?.[0] || null

      this.estimating = true

      this.groupService.getEstimate(estimate).subscribe((estimateResults: EstimateResults) =>{
          this.estimating = false;
          this.estimateResults = estimateResults
          this.estimateStale = false
          this.estimatePolygonID = polygonID

          if(polygonID){
            // A new map draws itself in onMapReady; an existing one is redrawn here
            if(this.showMap && this.map) setTimeout(() => this.drawEstimateMap())
            this.showMap = true
          }else{
            this.showMap = false
            this.map = null
          }
      },
        error =>{
          console.log(error)
          this.estimating = false;
          this.errorMessage = "There was an error calculating the estimate."
        })
    }

    onMapReady(map: L.Map){
      this.map = map
      L.control.layers({'Streets': this.baseLayers.streets, 'Satellite': this.baseLayers.satellite}).addTo(map)
      map.on('baselayerchange', (event: L.LayersControlEvent) => {
        saveBaseLayer(BASE_LAYER_KEY, event.layer === this.baseLayers.satellite ? 'satellite' : 'streets')
        // The map is rebuilt on each estimate (*ngIf), so the next one starts on this base map
        this.options.layers = [event.layer as L.TileLayer]
      })
      setTimeout(() => this.drawEstimateMap())
    }

    drawEstimateMap(){
      if(!this.map || !this.showMap || !this.estimateResults) return

      // The cluster group goes as a whole first, so its cluster icons aren't removed one by one
      this.markers.remove()
      this.map.eachLayer((layer: any) => {
        if(!layer._url) this.map.removeLayer(layer);
      });
      this.map.invalidateSize();
      this.displayLocationsOnMiniMap()
      if(this.estimatePolygonID) this.getPolygon(this.estimatePolygonID)
    }

    getPolygon(polygonID: string){
      this.polygonService.getPolygon(polygonID).subscribe((polygon: any) =>{
        if(!this.map) return
        const outerLayer = L.geoJSON(polygon, {style: {fillColor: 'purple', color: 'black', opacity: 1, fillOpacity: 0.0}}).addTo(this.map)
        setTimeout(() => this.map?.fitBounds(outerLayer.getBounds()));
      })
    }

    displayLocationsOnMiniMap(){
      // drawEstimateMap took the cluster group off the map, so it is refilled and re-added
      this.markers.clearLayers()
      const pins = (this.estimateResults?.locations || []).map(location => {
        const [lng, lat] = location['coordinates']
        return L.marker([lat, lng], { icon: this.blueIcon})
      })
      this.markers.addLayers(pins)
      this.markers.addTo(this.map)
    }

    //////////////////////// CREATE ////////////////////////

    createGroup(){
      this.errorMessage = ''
      this.nameError = ''

      const groupName = this.name.trim()
      if(!groupName){
        this.nameError = "The group needs a name.";
        return
      }
      if(!this.checkRules()) return

      const group: Group = {
        name: groupName,
        groupBy: this.groupBy,
        queries: this.form.value,
        campaignID: parseInt(sessionStorage.getItem('campaignID')),
        orgID: sessionStorage.getItem('orgID'),
        campaignWide: this.campaignWide,
        includesPolygon: "polygons" in this.form.value,
        includesSurvey: "surveys" in this.form.value,
        active: true,
      }

      this.creating = true

      this.groupService.createGroup(group).subscribe(
        (group: Group)=>{
          this.creating = false
          if(!group) {
            this.nameError = "A group with that name already exists in this campaign.";
            return
          }

          this.snackBar.open(`Group "${group.name}" created.`, 'Dismiss', {duration: 3000})
          this.dialogRef.close(group)
        },
        error =>{
          console.log(error)
          this.creating = false;
          this.errorMessage = 'There was a problem creating the group. Please try again.'
        }
      )
    }

    async close(){
      if(this.creating) return
      if(this.hasWork && !(await confirmAction(this.dialog, {title: 'Discard this group?', message: 'Its name and filters will be lost.', danger: true}))) return
      this.dialogRef.close()
    }

    //////////////////////// DATA ////////////////////////

    getSurveys(){
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      var orgID: string = sessionStorage.getItem('orgID')

      this.surveyService.getAllSurveys(orgID, campaignID).subscribe(
        (surveys: Survey[]) =>{

          surveys = surveys.filter(survey => {
            return  survey.campaignIDs.includes(campaignID) && survey.active
          })

          this.indivContactConfig.or_surveys.options = []
          this.indivContactConfig.and_surveys.options = []
          this.indivContactConfig.not_surveys.options = []

          this.indivContactConfig.or_survey_contacts.options = []
          this.indivContactConfig.and_survey_contacts.options = []
          this.indivContactConfig.not_survey_contacts.options = []

          for(var i = 0; i < surveys.length; i++){
              for(var j = 0; j < surveys[i].questions.length; j++){
                for(var k = 0; k < surveys[i].questions[j].responses.length; k++){

                  var name = surveys[i].name + " - " +
                             surveys[i].questions[j]['question'].substring(0, 50) + "... - " +
                             surveys[i].questions[j]['responses'][k]['response']

                  var value = {name: surveys[i].name,
                               question: surveys[i].questions[j]['question'],
                               response: surveys[i].questions[j]['responses'][k]['response'],
                               _id: surveys[i]._id,
                              }

                  this.indivContactConfig.or_surveys.options.push({name: name, value: value})
                  this.indivContactConfig.and_surveys.options.push({name: name, value: value})
                  this.indivContactConfig.not_surveys.options.push({name: name, value: value})

                }
              }

              this.indivContactConfig.or_survey_contacts.options.push({name: surveys[i].name, value: surveys[i]._id })
              this.indivContactConfig.and_survey_contacts.options.push({name: surveys[i].name, value: surveys[i]._id })
              this.indivContactConfig.not_survey_contacts.options.push({name: surveys[i].name, value: surveys[i]._id })

          }
        },
        error =>{
          console.log(error)
        }
      )
    }

    getNonResponseSets(){
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
      var orgID: string = sessionStorage.getItem('orgID')

      this.surveyService.getAllNonResponseSets(orgID, campaignID).subscribe(
        (nonResponseSets: NonResponseSet[]) =>{

          nonResponseSets = nonResponseSets.filter(nonResponseSet => {
            return  nonResponseSet.campaignIDs.includes(campaignID) && nonResponseSet.active
          })

          this.indivContactConfig.or_nonResponseSets.options = []
          this.indivContactConfig.not_nonResponseSets.options = []

          var excudedNonResponseTypes = ["INVALIDADDRESS", "DNC", "INVALIDPHONE"]

          for(var i = 0; i < nonResponseSets.length; i++){
            for(var j = 0; j < nonResponseSets[i].nonResponses.length; j++){

              if(!excudedNonResponseTypes.includes(nonResponseSets[i].nonResponses[j].nonResponseType)){
                var name = nonResponseSets[i].name + "-" + nonResponseSets[i].nonResponses[j].nonResponse

                var value = {name: nonResponseSets[i].name,
                            _id: nonResponseSets[i]._id,
                            nonResponse: nonResponseSets[i].nonResponses[j].nonResponse
                            }

                this.indivContactConfig.or_nonResponseSets.options.push({name: name, value: value})
                this.indivContactConfig.not_nonResponseSets.options.push({name: name, value: value})

              }
            }
          }
        },
        error =>{
          console.log(error)
        })
    }

    getDataManagerStatus(){
      const user = JSON.parse(sessionStorage.getItem('user') || '{}')
      const campaignID = parseInt(sessionStorage.getItem('campaignID'))
      this.dev = !!user?.dev
      this.dataManager = (user?.dataManager || []).includes(campaignID)
    }

    getUploads(){
      var orgID: string = sessionStorage.getItem('orgID')
      this.memberService.getUploads(orgID).subscribe((uploads: any[]) =>{
        this.memberConfig.uploads.options = uploads.map(upload => ({name: upload.uploadName, value: upload._id}))
      },
      error =>{
        console.log(error)
      })
    }

    // Activities that added or opted in members, for the Membership "Activities" rule
    getMemberActivities(){
      var orgID: string = sessionStorage.getItem('orgID')
      this.memberService.getMemberActivities(orgID).subscribe((activities: any[]) =>{
        this.memberConfig.activities.options = activities.map(activity => ({
          name: activity.activityType ? `${activity.name} (${activity.activityType})` : activity.name,
          value: activity._id
        }))
      },
      error =>{
        console.log(error)
      })
    }

    getOrgUsers(){
      var orgID: string = sessionStorage.getItem('orgID')

      this.orgService.getOrgUsers(orgID).subscribe(
        (users: any[]) =>{
          this.indivContactConfig.contacted_by.options = []
          for(var i = 0; i < users.length; i++){
            var name = [users[i].name?.firstName, users[i].name?.lastName].filter(part => part).join(' ')
            this.indivContactConfig.contacted_by.options.push({name: name || users[i].loginEmail, value: users[i]._id})
          }
        },
        error =>{
          console.log(error)
        }
      )
    }

    getOrgTags(){
      var orgID: string = sessionStorage.getItem('orgID')

      this.orgService.getTagDefinitions(orgID).subscribe(
        (definitions: TagDefinition[]) => this.tagDefinitions = (definitions || []).filter(d => d.values?.length),
        error => console.log(error)
      )

      this.orgService.getOrgTags(orgID).subscribe(
        (tags: string[]) =>{
          this.memberConfig.tags.options = tags.map(tag => ({name: tag, value: tag}))
        },
        error =>{
          console.log(error)
        }
      )
    }

    private loadLocationOptions(rule: 'zips' | 'cities', request: any){
      if(this.indivGeoConfig[rule].options.length > 0) return

      this.gettingZips = true
      request.subscribe((values: string[]) =>{
        this.indivGeoConfig[rule].options = values.filter(value => value != "").map(value => ({name: value, value: value}))
        this.gettingZips = false
      },
      error =>{
        console.log(error)
        this.gettingZips = false
        this.errorMessage = `Couldn't load the ${rule === 'zips' ? 'zip codes' : 'cities'}. Remove the filter and add it again to retry.`
      })
    }

    getZips(){
      this.loadLocationOptions('zips', this.ampService.getZips(this.campaignBoundary))
    }

    getCities(){
      this.loadLocationOptions('cities', this.ampService.getCities(this.campaignBoundary))
    }

    getCommunityListCities(){
      this.loadLocationOptions('cities', this.ampService.getCommunityListCities(sessionStorage.getItem('orgID')))
    }

    getAllCampaignGroups(){
      var campaignID = parseInt(sessionStorage.getItem('campaignID'));
      this.groupService.getAllCampaignGroups(campaignID).subscribe((groups: any[])=>{
        this.campaignGroups = groups.filter((group: Group) => {
          return (group.campaignWide) && group.active && (group.groupBy === this.groupBy)
        })
      },
      error =>{
        console.log(error)
      });
    }
}
