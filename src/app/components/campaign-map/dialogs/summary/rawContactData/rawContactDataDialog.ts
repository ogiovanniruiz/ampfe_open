import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { SummaryService } from 'src/app/services/summary.service';
import { SurveyService } from 'src/app/services/survey.service';
import { Survey } from 'src/app/models/survey.model';
import { Sort } from '@angular/material/sort';
import { FormBuilder } from '@angular/forms';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

interface FieldOption {
  key: string;
  label: string;
}

// Columns the server can add for each contact, grouped for the picker
const FIELD_GROUPS: {title: string, fields: FieldOption[]}[] = [
  {title: 'Name', fields: [
    {key: 'firstName', label: 'First name'},
    {key: 'middleName', label: 'Middle name'},
    {key: 'lastName', label: 'Last name'},
  ]},
  {title: 'Contact', fields: [
    {key: 'email', label: 'Email'},
    {key: 'phone', label: 'Phone'},
  ]},
  {title: 'Address', fields: [
    {key: 'address', label: 'Street address'},
    {key: 'city', label: 'City'},
    {key: 'zip', label: 'Zip'},
    {key: 'county', label: 'County'},
    {key: 'precinct', label: 'Precinct'},
  ]},
  {title: 'Demographics', fields: [
    {key: 'age', label: 'Age'},
    {key: 'ethnicity', label: 'Ethnicity'},
    {key: 'party', label: 'Party'},
  ]},
  {title: 'Activity', fields: [
    {key: 'org', label: 'Organization'},
    {key: 'activityType', label: 'Activity type'},
    {key: 'User', label: 'Contacted by'},
    {key: 'creationDate', label: 'Date contacted'},
  ]},
  {title: 'IDs', fields: [
    {key: 'ampID', label: 'Amp ID'},
    {key: 'voterID', label: 'Voter ID'},
    {key: 'pdiID', label: 'PDI ID'},
  ]},
  {title: 'History', fields: [
    {key: 'voteHistory', label: 'Vote history'},
  ]},
];

const ALL_FIELD_KEYS = FIELD_GROUPS.flatMap(group => group.fields).map(field => field.key);

// Org allowed to push survey data to BigQuery
const BIGQUERY_ORG_ID = '5f6905163ff2f50019f5e243';

// Org allowed to push C3 2026 opt-ins to BigQuery
const BIGQUERY_OPTIN_ORG_ID = '5f6903323ff2f50019f5e212';

@Component({
    templateUrl: './rawContactDataDialog.html',
    styleUrls: ['../../../campaignMap.component.scss', './rawContactDataDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class RawContactDataDialog implements OnInit{

  orgSurveys: Survey[] = []
  loadingSurveys: boolean = true

  selectedSurveyID: string = null
  mode: string = 'SINGLESELECT'
  orgFilter: string = 'myOrg'
  includeNonResponses: boolean = false

  fieldGroups = FIELD_GROUPS
  fields = this._formBuilder.group(Object.fromEntries(ALL_FIELD_KEYS.map(key => [key, false])));

  // Loaded preview, and the settings it was loaded with
  rawSurveyData: any[] = []
  sortedData: any[] = []
  headers: string[] = []
  previewKey: string = null

  // Rendering every row freezes the dialog on large surveys; export still uses the full data
  previewLimit: number = 200

  loading: boolean = false
  resultMessage: string = ''
  resultIsError: boolean = false

  dev: boolean = false
  dataManager: boolean = false
  orgID: string

  constructor(
    @Inject(MAT_DIALOG_DATA) public campaignBoundary: unknown[],
    public dialogRef: MatDialogRef<RawContactDataDialog>, 
    private summaryService: SummaryService,
    private surveyService: SurveyService,
    private _formBuilder: FormBuilder
  ) {}

  ngOnInit(){
    this.getSurveys()
    this.getDataManagerStatus()
  }

  return(){
    this.dialogRef.close()
  }

  getSurveys(){
    this.orgID = sessionStorage.getItem('orgID')
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

    this.surveyService.getAllSurveys(this.orgID, campaignID).subscribe({
      next: (surveys: Survey[]) => {
        this.loadingSurveys = false
        this.orgSurveys = (surveys || []).filter(survey => survey.campaignIDs.includes(campaignID) && survey.active)
      },
      error: (error) => {
        this.loadingSurveys = false
        this.showResult('Could not load surveys. Please try again.', true, error)
      }
    });
  }

  getDataManagerStatus(){
    const user: any = JSON.parse(sessionStorage.getItem('user') || '{}');
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    this.dev = !!user.dev
    this.dataManager = (user.dataManager || []).includes(campaignID)
  }

  //////////////////////// SETTINGS ////////////////////////

  get selectedFields(): string[] {
    const values = this.fields.getRawValue()
    return ALL_FIELD_KEYS.filter(key => values[key])
  }

  setAllFields(checked: boolean){
    this.fields.setValue(Object.fromEntries(ALL_FIELD_KEYS.map(key => [key, checked])))
  }

  get canFetch(): boolean {
    return !!this.selectedSurveyID && !this.loading
  }

  // Shown, and usable in production, only for BIGQUERY_ORG_ID
  get showBigQuery(): boolean {
    return this.orgID === BIGQUERY_ORG_ID
  }

  // Development only
  get showOptinSync(): boolean {
    return !environment.production && this.orgID === BIGQUERY_OPTIN_ORG_ID
  }

  // Everything that changes what the server returns
  private settingsKey(): string {
    return JSON.stringify([this.selectedSurveyID, this.mode, this.includeNonResponses, this.orgFilter, this.selectedFields])
  }

  get hasPreview(): boolean {
    return this.previewKey !== null
  }

  get previewStale(): boolean {
    return this.hasPreview && this.previewKey !== this.settingsKey()
  }

  get previewData(): any[] {
    return this.sortedData.slice(0, this.previewLimit)
  }

  get surveyName(): string {
    return this.orgSurveys.find(survey => survey._id === this.selectedSurveyID)?.name || 'survey'
  }

  //////////////////////// DATA ////////////////////////

  private showResult(message: string, isError: boolean, error?: any){
    if(error) console.log(error)
    this.resultMessage = message
    this.resultIsError = isError
  }

  // Fetches rows for the current settings; cells are flattened for display and CSV
  private fetchData(): Observable<any[]> {
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    const orgID = this.orgFilter === 'myOrg' ? sessionStorage.getItem('orgID') : undefined

    this.loading = true
    this.resultMessage = ''

    return this.summaryService.getRawSurveyData(campaignID, this.selectedSurveyID, this.mode, orgID, this.selectedFields, this.includeNonResponses).pipe(
      map((rows: any[]) => (rows || []).map(row => {
        const flat = {}
        // Multi-select answers arrive as arrays; keep them in one cell
        Object.keys(row).forEach(key => flat[key] = Array.isArray(row[key]) ? row[key].join('; ') : row[key])
        return flat
      })),
      catchError(error => {
        this.showResult('Could not load contact data. Please try again.', true, error)
        return throwError(() => error)
      }),
      finalize(() => this.loading = false)
    )
  }

  loadPreview(){
    if(!this.canFetch) return
    const key = this.settingsKey()

    this.fetchData().subscribe(rows => {
      this.rawSurveyData = rows
      this.sortedData = rows
      this.headers = collectHeaders(rows)
      this.previewKey = key
      if(rows.length === 0) this.showResult('No contacts found for these settings.', true)
    }, () => {})
  }

  // Always fetches with the current settings, so the file never has stale columns
  exportCSV(){
    if(!this.canFetch) return

    this.fetchData().subscribe(rows => {
      if(rows.length === 0){
        this.showResult('No contacts found for these settings.', true)
        return
      }
      const orgName = sessionStorage.getItem('orgName') || 'org'
      const filename = safeFilename(`${orgName}_${this.surveyName}`) + '.csv'
      const headers = collectHeaders(rows)
      downloadCSV(filename, toCSV(headers, rows.map(row => headers.map(header => row[header]))))
      this.showResult(`Exported ${rows.length.toLocaleString()} ${rows.length === 1 ? 'row' : 'rows'} to ${filename}.`, false)
    }, () => {})
  }

  sortData(sort: Sort) {
    const data = this.rawSurveyData.slice();
    if (!sort.active || sort.direction === '') {
      this.sortedData = data;
      return;
    }
    const direction = sort.direction === 'asc' ? 1 : -1
    this.sortedData = data.sort((a, b) => compareValues(a[sort.active], b[sort.active]) * direction);
  }

  //////////////////////// SYNC ////////////////////////

  // Sends the loaded preview, so only allowed when it matches the current settings
  syncBigQuery(){
    if(this.loading || !this.showBigQuery) return
    this.loading = true

    // Server pushes every contact record in the campaign, independent of the preview
    this.summaryService.syncBigQuerySurveyData({
      campaignID: parseInt(sessionStorage.getItem('campaignID')),
      orgID: this.orgID
    }).subscribe(
      result => {
        this.loading = false
        this.showResult(result ? 'BigQuery sync successful.' : 'BigQuery sync failed.', !result)
      },
      error => {
        this.loading = false
        this.showResult('BigQuery sync failed.', true, error)
      }
    )
  }

  // Pushes C3 2026 General Survey people who said Yes to voting and the opt-in and have an email
  syncOptins(){
    if(this.loading || !this.showOptinSync) return
    this.loading = true

    this.summaryService.syncBigQueryOptins(this.orgID).subscribe(
      result => {
        this.loading = false
        this.showResult(result ? 'Opt-in sync successful.' : 'Opt-in sync failed.', !result)
      },
      error => {
        this.loading = false
        this.showResult('Opt-in sync failed.', true, error)
      }
    )
  }

  syncGoogleSheets(googleSheetURL: string){
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

    if(!googleSheetURL || googleSheetURL.trim() === ''){
      this.showResult('Please provide a Google Sheet URL.', true)
      return;
    }

    this.loading = true
    this.summaryService.syncGoogleSheets(campaignID, this.selectedSurveyID, this.mode, googleSheetURL, this.orgID).subscribe(
      result => {
        this.loading = false
        this.showResult(result ? 'Google Sheet sync successful.' : 'Google Sheet sync failed.', !result)
      },
      error => {
        this.loading = false
        this.showResult('Google Sheet sync failed.', true, error)
      }
    )
  }

  trackHeader(index: number, header: string){ return header }
}

//////////////////////// HELPERS ////////////////////////

// Every key that appears in any row, in first-seen order
function collectHeaders(rows: any[]): string[] {
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
  return headers
}

function compareValues(a: any, b: any): number {
  const empty = (value: any) => value === null || value === undefined || value === ''
  if(empty(a) && empty(b)) return 0
  if(empty(a)) return 1
  if(empty(b)) return -1
  if(typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, {numeric: true, sensitivity: 'base'})
}

// Quote values that contain commas, quotes or newlines, doubling any quotes
function csvEscape(value: any): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}

function toCSV(headers: string[], rows: any[][]): string {
  return [headers.map(csvEscape).join(','), ...rows.map(row => row.map(csvEscape).join(','))].join('\n')
}

function downloadCSV(filename: string, csv: string){
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'})
  const url = window.URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  downloadLink.href = url
  downloadLink.setAttribute('download', filename)
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  // Give the browser a moment to start the download before freeing the file
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

function safeFilename(name: string): string {
  return (name || 'export').replace(/[\\/:*?"<>|]+/g, '').trim()
}
