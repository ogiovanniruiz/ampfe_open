import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {GroupService} from '../../../../../services/group.service';
import {OrganizationService} from '../../../../../services/organization/organization.service';

import { SummaryService } from 'src/app/services/summary.service';

import {FormGroup, FormControl} from '@angular/forms';
import { SurveyService } from 'src/app/services/survey.service';
import { Survey } from 'src/app/models/survey.model';
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import { User } from 'src/app/models/user.model';
import { TOTALS_LABEL } from '../summaryTable/summaryTable';
import { MatSnackBar } from '@angular/material/snack-bar';
import { timeout, TimeoutError } from 'rxjs';
import { SLOW_LOAD_TIMEOUT_MS } from 'src/app/utils/loading';

interface KpiTile {
  label: string;
  value: string;
}

// Which totals become headline tiles, and for which activity types they mean something
const OVERVIEW_TILES: {key: string, label: string, types?: string[]}[] = [
  {key: 'All Activity Contacts', label: 'Total contacts'},
  {key: 'Households', label: 'Households'},
  {key: 'Residents', label: 'Residents'},
  {key: 'Call Attempts', label: 'Call attempts', types: ['Phonebank']},
  {key: 'Text Sent', label: 'Texts sent', types: ['Texting']},
  // Texts Delivered: hidden until it's ready to show; uncomment to turn on
  // {key: 'Text Delivered', label: 'Texts delivered', types: ['Texting']},
  {key: 'Text Responded', label: 'Texts responded', types: ['Texting']},
  {key: 'Contacts/Households', label: 'Contacts per household'},
];

const SURVEY_TILES: {key: string, label: string}[] = [
  {key: 'Contacts', label: 'Survey responses'},
  {key: 'Unique Contacts', label: 'Unique people'},
];

const SHEET_URL_STORAGE_KEY = 'orgSummarySheetURL'

const ACTIVITY_TYPE_LABELS = {
  all: 'All activity types',
  Phonebank: 'Phonebank',
  Canvass: 'Canvass',
  Texting: 'Texting',
  Petition: 'Petition',
};

@Component({
    templateUrl: './campaignSummaryDialog.html',
    styleUrls: ['../../../campaignMap.component.scss', './campaignSummaryDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
  
export class CampaignSummaryDialog implements OnInit{

    constructor(
        @Inject(MAT_DIALOG_DATA) public summaryType: string,
        public dialogRef: MatDialogRef<CampaignSummaryDialog>, 
        public groupService: GroupService,
        public orgService: OrganizationService,
        private summaryService: SummaryService,
        private surveyService: SurveyService,
        private snackBar: MatSnackBar

    ) {}

    userMessage: string = ""
    showUserMessage: boolean = false

    orgSurveys: Survey[] = []
    nonResponseSets: NonResponseSet[] = []

    surveySummary = []
    surveySummaryHeaders: string[] = [];
    surveyTiles: KpiTile[] = [];

    activitySummary = []
    activitySummaryHeaders: string[] = [];
    overviewTiles: KpiTile[] = [];

    nonResponseSummary = []
    nonResponseHeaders: string[] = []

    range = new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    });

    selectedStartDate: Date;
    selectedEndDate: Date;

    surveyID: string
    nonResponseSetID: string

    activityType: string = "all"
    orgFilter: string = 'myOrg'
    geoType: string = "person.address.city"
    userFilter: string = "allUsers"
    activityNameFilter: string = ""
    // The activity name that the loaded results were fetched with
    appliedActivityName: string = ""

    loadingSurveySummary: boolean = false
    loadingActivitySummary: boolean = false
    loadingNonresponseSummary: boolean = false

    users: User[] = [];

    // The org's uploaded service account; the sheet must be shared with it as an Editor.
    // '' when the org has no key, undefined while loading
    sheetsServiceAccount: string | undefined = undefined
    showSheetSync: boolean = false
    googleSheetURL: string = readStored(SHEET_URL_STORAGE_KEY)
    sheetName: string = ''
    // The tab name last filled in for the user; a name they typed themselves is kept
    lastDefaultSheetName: string = ''
    syncingSheet: boolean = false

    // Only data managers for this campaign (and devs) may switch the org filter to "All Orgs"
    dev: boolean = false
    dataManager: boolean = false

    ngOnInit(){
        this.getSheetsServiceAccount()
        this.getDataManagerStatus()
        this.getSurveys()
        this.getAllNonResponseSets()
        this.getActivitySummary()
        this.getOrgUsers()
    }

    getSheetsServiceAccount(){
        var orgID: string = sessionStorage.getItem('orgID')
        this.orgService.getOrgServiceAccount(orgID).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe(
          account => this.sheetsServiceAccount = account?.clientEmail || '',
          error => {
            console.log(error)
            this.sheetsServiceAccount = ''
          }
        )
    }

    getDataManagerStatus(){
        var user = JSON.parse(sessionStorage.getItem('user') || '{}')
        var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
        this.dev = !!user.dev
        this.dataManager = (user.dataManager || []).includes(campaignID)
    }

    getSurveys(){
        var orgID: string = sessionStorage.getItem('orgID')
        var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
        this.surveyService.getAllSurveys(orgID, campaignID).subscribe(
          (surveys: Survey[]) =>{
            this.orgSurveys = surveys.filter(survey =>{
              return (survey.campaignIDs.includes(campaignID)) && (survey.active)
            })
          },
          error=>{
            console.log(error)
          }
        )
    }

    getAllNonResponseSets(){
      var orgID: string = sessionStorage.getItem('orgID')
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
      this.surveyService.getAllNonResponseSets(orgID, campaignID).subscribe(
        (nonResponseSets: NonResponseSet[]) =>{
          this.nonResponseSets = nonResponseSets.filter(nonResponseSet => {
            return nonResponseSet.campaignIDs.includes(campaignID) && nonResponseSet.active;
          });
        },
        error=>{
          console.log(error)
        }
      )
    }

    return(){
      this.dialogRef.close()
    }

    //////////////////////// FILTERS ////////////////////////

    private get orgIDFilter(): string | undefined {
      return this.orgFilter === 'myOrg' ? sessionStorage.getItem('orgID') : undefined
    }

    private get userIDFilter(): string | undefined {
      return this.userFilter !== 'allUsers' ? this.userFilter : undefined
    }

    // Reloads every tab that has data, with the current filters
    applyFilters(){
      this.appliedActivityName = this.activityNameFilter.trim()
      this.getActivitySummary()
      if(this.nonResponseSetID) this.getNonresponseSummary(this.nonResponseSetID)
      if(this.surveyID) this.getSurveySummary(this.surveyID)
    }

    applyActivityName(){
      if(this.activityNameFilter.trim() !== this.appliedActivityName) this.applyFilters()
    }

    changeDateRange() {
      const start = this.range.value.start
      const end = this.range.value.end

      // Wait for the end date; picking only a start date is an unfinished range
      if(start && !end) return

      // Dates are shifted to Pacific midnight, and the end date is made inclusive
      this.selectedStartDate = start ? new Date(start.getTime() + (7 * 60 * 60 * 1000)) : undefined
      this.selectedEndDate = end ? new Date(end.getTime() + ((24 + 7) * 60 * 60 * 1000)) : undefined
      this.applyFilters()
    }

    clearDateRange(){
      this.range.reset()
      this.selectedStartDate = undefined
      this.selectedEndDate = undefined
      this.applyFilters()
    }

    resetFilters(){
      this.activityType = 'all'
      this.orgFilter = 'myOrg'
      this.geoType = 'person.address.city'
      this.userFilter = 'allUsers'
      this.activityNameFilter = ''
      this.range.reset()
      this.selectedStartDate = undefined
      this.selectedEndDate = undefined
      this.applyFilters()
    }

    get hasActiveFilters(): boolean {
      return this.activityType !== 'all' || this.orgFilter !== 'myOrg' || this.userFilter !== 'allUsers' ||
             !!this.appliedActivityName || !!this.selectedStartDate || !!this.selectedEndDate ||
             (this.summaryType === 'Geography' && this.geoType !== 'person.address.city')
    }

    // One readable line describing what the numbers cover
    get filterDescription(): string {
      const parts: string[] = [ACTIVITY_TYPE_LABELS[this.activityType] || this.activityType]

      const start = this.range.value.start
      const end = this.range.value.end
      if(start && end){
        const fmt = (d: Date) => d.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})
        parts.push(fmt(start) + ' – ' + fmt(end))
      } else {
        parts.push('All dates')
      }

      if(this.summaryType !== 'Organization') parts.push(this.orgFilter === 'myOrg' ? 'My org' : 'All orgs')
      if(this.appliedActivityName) parts.push('Activity "' + this.appliedActivityName + '"')
      if(this.userIDFilter){
        const user = this.users.find(u => u._id === this.userIDFilter)
        parts.push(user?.name?.fullName || 'One user')
      }
      if(this.summaryType === 'Geography'){
        parts.push({'person.address.city': 'By city', 'person.address.zip': 'By zip', 'person.registrationPrecinctID': 'By precinct'}[this.geoType])
      }
      return parts.join(' · ')
    }

    //////////////////////// DATA ////////////////////////

    getSurveySummary(surveyID: string){
      this.surveyID = surveyID
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

      this.loadingSurveySummary = true

      this.summaryService.getSurveySummary(campaignID, this.selectedStartDate, this.selectedEndDate,  surveyID, this.activityType, this.summaryType, this.appliedActivityName, this.orgIDFilter, this.geoType, this.userIDFilter).subscribe(
        (summary: {rows: unknown[], totalUniqueContacts: number}) =>{
          var surveySummary: any[] = summary?.rows
          this.loadingSurveySummary = false
          this.fillDefaultSheetName()

          if(!surveySummary || surveySummary.length === 0){
            this.surveySummary = []
            this.surveySummaryHeaders = []
            this.surveyTiles = []
            return
          }

          var totals: any = sumValues(surveySummary)
          totals[this.summaryType] = TOTALS_LABEL
          // People contacted in more than one row would be double-counted by the sum
          totals['Unique Contacts'] = summary.totalUniqueContacts
          surveySummary.unshift(totals)
  
          this.surveySummaryHeaders = collectHeaders(surveySummary, this.summaryType)
          this.surveySummary = surveySummary
          this.surveyTiles = buildTiles(totals, SURVEY_TILES)
        },
        error =>{
          console.log(error)
          this.loadingSurveySummary = false
        })
    }

    getNonresponseSummary(nonResponseSetID: string){
      this.nonResponseSetID = nonResponseSetID
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

      this.loadingNonresponseSummary = true

      this.summaryService.getNonresponseSummary(campaignID, this.orgIDFilter, this.selectedStartDate, this.selectedEndDate, nonResponseSetID, this.summaryType, this.appliedActivityName, this.geoType, this.activityType, this.userIDFilter).subscribe(
        (userNonResponseSummary: any[]) =>{
            this.loadingNonresponseSummary = false

            if(!userNonResponseSummary || userNonResponseSummary.length === 0){
              this.nonResponseSummary = []
              this.nonResponseHeaders = []
              return
            }

            var totals: any = sumValues(userNonResponseSummary)
            totals[this.summaryType] = TOTALS_LABEL

            userNonResponseSummary.unshift(totals)
    
            this.nonResponseHeaders = collectHeaders(userNonResponseSummary, this.summaryType)
            this.nonResponseSummary = userNonResponseSummary
        },
        error =>{
          console.log(error)
          this.loadingNonresponseSummary = false
        }
      )
    }

    getActivitySummary(){
      var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

      this.loadingActivitySummary = true

      this.summaryService.getActivitySummary(campaignID, this.orgIDFilter, this.selectedStartDate, this.selectedEndDate, this.appliedActivityName, this.summaryType, this.geoType, this.activityType, this.userIDFilter).subscribe(
        (activitySummary: any[]) =>{
          this.loadingActivitySummary = false

          if(!activitySummary || activitySummary.length === 0){
            this.activitySummary = []
            this.activitySummaryHeaders = []
            this.overviewTiles = []
            return
          }

          var totals: any = sumValues(activitySummary)
          totals[this.summaryType] = TOTALS_LABEL

          if(this.summaryType === "Activity"){
            totals['% Complete'] = "---"
          }

          totals['Unique Users'] = "---"

          totals['Contacts/Households'] = totals['Households'] ? Math.round((totals['All Activity Contacts']/totals['Households'])*100) + "%" : "---"
          totals['Contacts/Residents'] = totals['Residents'] ? Math.round((totals['All Activity Contacts']/totals['Residents'])*100) + "%" : "---"

          activitySummary.unshift(totals)
  
          this.activitySummaryHeaders = collectHeaders(activitySummary, this.summaryType)
          this.activitySummary = activitySummary

          const tiles = OVERVIEW_TILES.filter(tile => this.activityType === 'all' || !tile.types || tile.types.includes(this.activityType))
          this.overviewTiles = buildTiles(totals, tiles)
        },
        error =>{
          console.log(error)
          this.loadingActivitySummary = false
        }
      )
    }

  getOrgUsers(){
    var orgID: string = sessionStorage.getItem('orgID')

    this.orgService.getOrgUsers(orgID).subscribe(
      (users: User[]) => { this.users = users || [] },
      error =>{ console.log(error) }
    )
  }

  //////////////////////// EXPORT ////////////////////////

  exportTable(rows: any[], headers: string[], tableName: string){
    if(!rows.length) return

    const csv = convertToCSV(rows, headers)
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'})
    const url = window.URL.createObjectURL(blob)

    const dateFmt = (d: Date) => d.toISOString().split('T')[0]
    const datePart = [this.selectedStartDate, this.selectedEndDate].filter(Boolean).map(dateFmt).join('_')

    const filename = [datePart, this.summaryType, this.activityType, tableName].filter(Boolean).join('_') + '.csv'

    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.setAttribute('download', filename)
    document.body.appendChild(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    // Give the browser a moment to start the download before freeing the file
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  }

  //////////////////////// GOOGLE SHEETS ////////////////////////

  // e.g. "Voter ID_All" or "Voter ID_Phonebank"
  get defaultSheetName(): string {
    const surveyName = this.orgSurveys.find(survey => survey._id === this.surveyID)?.name || ''
    return surveyName + '_' + (this.activityType === 'all' ? 'All' : this.activityType)
  }

  private fillDefaultSheetName(){
    if(!this.sheetName.trim() || this.sheetName === this.lastDefaultSheetName){
      this.sheetName = this.defaultSheetName
    }
    this.lastDefaultSheetName = this.defaultSheetName
  }

  // Writes the survey results table to the named tab of the linked sheet, with the sync time under it
  syncSurveyToSheet(){
    if(this.syncingSheet || !this.sheetsServiceAccount) return

    const url = this.googleSheetURL.trim()
    const sheetName = this.sheetName.trim() || 'Sheet1'
    if(!url){
      this.snackBar.open('Paste a Google Sheet link first.', 'Dismiss', {duration: 4000})
      return
    }
    try {
      localStorage.setItem(SHEET_URL_STORAGE_KEY, url)
    } catch(e) {}

    const values: any[][] = [
      this.surveySummaryHeaders,
      ...this.surveySummary.map(row => this.surveySummaryHeaders.map(header => row[header] ?? 0)),
      [],
      ['Synced ' + new Date().toLocaleString()],
    ]

    this.syncingSheet = true
    this.summaryService.syncSheetValues(url, sheetName, values, sessionStorage.getItem('orgID')).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe(
      () => {
        this.syncingSheet = false
        this.snackBar.open('Google Sheet updated.', 'Dismiss', {duration: 4000})
      },
      error => {
        console.log(error)
        this.syncingSheet = false
        const message = error instanceof TimeoutError
          ? "Couldn't sync the sheet: the server didn't respond. Try again."
          : error?.error?.message || "Couldn't sync the sheet: the server had a problem. Try again."
        this.snackBar.open(message, 'Dismiss', {duration: 8000})
      }
    )
  }

  refreshSummaries() {
    this.applyFilters()
  }

  displayOnMap(){
    this.dialogRef.close({summaryData: this.surveySummary})
  }
}

function readStored(key: string): string {
  try { return localStorage.getItem(key) || '' } catch(e) { return '' }
}

function sumValues(objects) {
    const sumObject = {};
    objects.forEach(obj => {
        Object.keys(obj).forEach(key => {
            if (!sumObject[key]) {
                sumObject[key] = obj[key];
            } else {
                sumObject[key] += obj[key];
            }
        });
    });
    return sumObject;
}

// Every key that appears in any row (not just the widest row), label column first
function collectHeaders(rows: any[], labelColumn: string): string[] {
  const headers: string[] = []
  const seen = new Set<string>()
  for (const row of rows){
    for (const key of Object.keys(row)){
      if(!seen.has(key)){
        seen.add(key)
        headers.push(key)
      }
    }
  }
  return [labelColumn, ...headers.filter(header => header !== labelColumn)]
}

// Large values are compacted (12,900 -> 12.9K); percentages and text pass through
function formatTileValue(value: any): string {
  if (typeof value !== 'number') return String(value)
  if (Math.abs(value) >= 10000) {
    return new Intl.NumberFormat(undefined, {notation: 'compact', maximumFractionDigits: 1} as any).format(value)
  }
  return value.toLocaleString()
}

function buildTiles(totals: any, definitions: {key: string, label: string}[]): KpiTile[] {
  return definitions
    .filter(def => totals[def.key] !== undefined && totals[def.key] !== null && totals[def.key] !== 0 && totals[def.key] !== '---')
    .map(def => ({label: def.label, value: formatTileValue(totals[def.key])}))
}

function convertToCSV(rows: any[], headers: string[]) {
    const escape = (value: any) => {
      if (value === null || value === undefined) return ''
      const text = String(value)
      return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
    }
    const lines = rows.map(row => headers.map(header => escape(row[header] ?? 0)).join(','))
    return [headers.map(escape).join(','), ...lines].join('\n')
}
