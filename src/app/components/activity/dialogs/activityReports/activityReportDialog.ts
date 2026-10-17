import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormGroup, FormControl} from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import {Chart} from 'chart.js/auto';

//SERVICES
import { ActivityService } from '../../../../services/activity.service';
import { ContactRecordService } from 'src/app/services/contact.record.service';
import { SurveyService } from 'src/app/services/survey.service';

//MODELS
import {Activity} from '../../../../models/activity.model'
import { Survey } from 'src/app/models/survey.model';
import { PhonebankTextResponsesDialog } from '../phonebankTextResponses/phonebankTextResponsesDialog';
import { EditActivityEntriesDialog } from '../editActivityEntries/editActivityEntries';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

// One per-user table (activity, survey answers, nonresponses)
interface Report {
  rows: any[]
  totals: any | null
  headers: string[]
  loading: boolean
  error: string
  token: number
}

const emptyReport = (): Report => ({rows: [], totals: null, headers: [], loading: false, error: '', token: 0})

// Single-series bar color (dataviz reference palette, categorical slot 1)
const BAR_COLOR = '#2a78d6'

@Component({
    templateUrl: './activityReportDialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class ActivityReportDialog implements OnInit, OnDestroy{

  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>
  private chart: Chart | null = null

  // Activity size (not used by petitions)
  totalHouseHolds: number = 0
  totalResidents: number = 0
  density: number = 0
  loadingSize: boolean = false

  // When the figures were last fetched (shown in the Refresh tooltip)
  lastUpdated: Date = new Date()

  activityReport: Report = emptyReport()
  surveyReport: Report = emptyReport()
  nonResponseReport: Report = emptyReport()

  survey: Survey | null = null
  surveyLoaded: boolean = false
  selectedQuestion: string = ''

  selectedTab: number = 0

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });
  selectedStartDate: Date | undefined
  selectedEndDate: Date | undefined

  notes: string = ''
  savedNotes: string = ''
  savingNotes: boolean = false

  errorMessage: string = ''

  constructor(public activityService: ActivityService,
              @Inject(MAT_DIALOG_DATA) public activity: Activity,
              public dialogRef: MatDialogRef<ActivityReportDialog>,
              public contactRecordService: ContactRecordService,
              public surveyService: SurveyService,
              public dialog: MatDialog,
              private snackBar: MatSnackBar,
        ) {}

  ngOnInit(){
    this.notes = this.activity.notes || ''
    this.savedNotes = this.notes

    this.getSurvey()
    if(this.isPetition) this.loadingSize = false
    else this.getActivitySize()
    this.loadReports()
  }

  ngOnDestroy(){
    this.chart?.destroy()
    this.chart = null
  }

  //////////////////////// DISPLAY ////////////////////////

  get isPetition(): boolean {
    return this.activity.activityType === 'Petition'
  }

  get showsPasses(): boolean {
    return ['Phonebank', 'Canvass', 'Texting'].includes(this.activity.activityType)
  }

  get dateRangeSelected(): boolean {
    return !!(this.selectedStartDate || this.selectedEndDate)
  }

  // Headline count for the stat tiles, from the activity totals
  get contactsTile(): {label: string, value: number} | null {
    const totals = this.activityReport.totals
    if(!totals) return null
    if(typeof totals['Contacts'] === 'number') return {label: 'Contacts', value: totals['Contacts']}
    if(typeof totals['Texts Sent'] === 'number') return {label: 'Texts sent', value: totals['Texts Sent']}
    return null
  }

  // Tab order matches the template; petitions have no nonresponse tab
  get tabKeys(): string[] {
    return this.isPetition ? ['activity', 'survey', 'notes'] : ['activity', 'survey', 'nonresponse', 'notes']
  }

  get currentReport(): Report | null {
    const key = this.tabKeys[this.selectedTab]
    if(key === 'activity') return this.activityReport
    if(key === 'survey') return this.surveyReport
    if(key === 'nonresponse') return this.nonResponseReport
    return null
  }

  isNumber(value: any): boolean {
    return typeof value === 'number'
  }

  // Petitions only take survey responses, so they need a survey to have anything to edit
  get canEditEntries(): boolean {
    return !!this.activity.surveyID || (!this.isPetition && !!this.activity.nonResponseSetID)
  }

  openEditEntriesDialog(){
    const phone = window.innerWidth < 768
    const dialogRef = this.dialog.open(EditActivityEntriesDialog, {data: this.activity, autoFocus: false, width: phone ? '100vw' : '960px', maxWidth: phone ? '100vw' : '94vw'})
    dialogRef.afterClosed().subscribe(changed => { if(changed) this.refresh() })
  }

  openTextResponsesDialog(){
    const phone = window.innerWidth < 768
    this.dialog.open(PhonebankTextResponsesDialog, {data: this.activity, disableClose: true, autoFocus: false, width: phone ? '100vw' : '960px', maxWidth: phone ? '100vw' : '94vw'});
  }

  //////////////////////// LOAD ////////////////////////

  // True while any figure is loading; the Refresh button waits so requests don't stack
  get refreshing(): boolean {
    return this.loadingSize || this.activityReport.loading || this.surveyReport.loading || this.nonResponseReport.loading
  }

  // Re-fetches the size and the open tables with the current date range and question.
  // Notes aren't reloaded, so unsaved edits there are kept.
  refresh(){
    if(this.refreshing) return
    if(!this.isPetition) this.getActivitySize()
    this.loadReports()
    this.lastUpdated = new Date()
  }

  loadReports(){
    this.errorMessage = ''
    this.getActivityReport()
    if(!this.isPetition) this.getNonresponseSetReport()
    if(this.selectedQuestion) this.getSurveyReport()
  }

  getActivitySize(){
    this.loadingSize = true
    this.activityService.getActivitySize(this.activity._id).subscribe(
      (size: any) => {
        this.totalHouseHolds = size?.totalHouseHolds || 0
        this.totalResidents = size?.totalResidents || 0
        this.density = size?.density || 0
        this.loadingSize = false
      },
      error => {
        console.log(error)
        this.loadingSize = false
      }
    )
  }

  getSurvey(){
    if(!this.activity.surveyID){
      this.surveyLoaded = true
      return
    }
    this.surveyService.getSurvey(this.activity.surveyID).subscribe(
      (survey: Survey) => {
        this.survey = survey
        this.surveyLoaded = true
      },
      error => {
        console.log(error)
        this.surveyLoaded = true
      }
    )
  }

  getActivityReport(){
    const id = this.activity._id
    const start = this.selectedStartDate, end = this.selectedEndDate
    const requests: {[type: string]: () => Observable<Object>} = {
      Canvass: () => this.contactRecordService.getCanvassReport(id, start, end),
      Phonebank: () => this.contactRecordService.getPhonebankReport(id, start, end),
      Texting: () => this.contactRecordService.getTextbankReport(id, start, end),
      Petition: () => this.contactRecordService.getPetitionReport(id, start, end),
    }
    const request = requests[this.activity.activityType]
    if(request) this.fetch(this.activityReport, request(), 'activity report')
  }

  getNonresponseSetReport(){
    this.fetch(this.nonResponseReport, this.contactRecordService.getActivityNonresponseSetReport(this.activity._id, this.selectedStartDate, this.selectedEndDate), 'nonresponse report')
  }

  getSurveyReport(){
    if(!this.selectedQuestion) return
    this.fetch(this.surveyReport, this.contactRecordService.getActivitySurveyReport(this.activity._id, this.selectedStartDate, this.selectedEndDate, this.selectedQuestion), 'survey responses', () => this.renderChartSoon())
  }

  // Loads one report; a newer request for the same report wins
  private fetch(report: Report, request: Observable<Object>, label: string, done?: () => void){
    const token = ++report.token
    report.loading = true
    report.error = ''

    request.subscribe(
      (rows: any) => {
        if(token !== report.token) return
        report.loading = false
        report.rows = (Array.isArray(rows) ? rows : []).map(cleanRow)
        report.headers = headersFor(report.rows)
        report.totals = report.rows.length ? buildTotals(report.rows, report.headers) : null
        done?.()
      },
      error => {
        console.log(error)
        if(token !== report.token) return
        report.loading = false
        report.rows = []
        report.headers = []
        report.totals = null
        report.error = `Couldn't load the ${label}.`
        this.errorMessage = report.error
        done?.()
      }
    )
  }

  onQuestionChange(event: MatSelectChange){
    this.selectedQuestion = event.value
    this.getSurveyReport()
  }

  //////////////////////// DATES ////////////////////////

  // Same date handling as the campaign summary, so both reports agree
  changeDateRange(){
    const start = this.range.value.start
    const end = this.range.value.end

    // Wait for the end date; picking only a start date is an unfinished range
    if(start && !end) return

    // Dates are shifted to Pacific midnight, and the end date is made inclusive
    this.selectedStartDate = start ? new Date(start.getTime() + (7 * 60 * 60 * 1000)) : undefined
    this.selectedEndDate = end ? new Date(end.getTime() + ((24 + 7) * 60 * 60 * 1000)) : undefined
    this.loadReports()
  }

  clearDateRange(){
    this.range.reset()
    this.selectedStartDate = undefined
    this.selectedEndDate = undefined
    this.loadReports()
  }

  //////////////////////// CHART ////////////////////////

  onTabChange(index: number){
    this.selectedTab = index
    if(this.tabKeys[index] === 'survey') this.renderChartSoon()
  }

  // The canvas only exists while the survey tab is showing
  private renderChartSoon(){
    if(this.tabKeys[this.selectedTab] !== 'survey') return
    setTimeout(() => this.renderChart())
  }

  get chartEntries(): {label: string, value: number}[] {
    const totals = this.surveyReport.totals
    if(!totals) return []
    return this.surveyReport.headers
      .filter(header => header !== 'User' && typeof totals[header] === 'number')
      .map(header => ({label: header, value: totals[header]}))
  }

  // Bars plus room for the axis
  get chartHeight(): number {
    return Math.max(120, this.chartEntries.length * 36 + 40)
  }

  private renderChart(){
    this.chart?.destroy()
    this.chart = null

    const canvas = this.chartCanvas?.nativeElement
    const entries = this.chartEntries
    if(!canvas || !entries.length) return

    const total = entries.reduce((sum, e) => sum + e.value, 0)

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: entries.map(e => e.label),
        datasets: [{
          data: entries.map(e => e.value),
          backgroundColor: BAR_COLOR,
          borderRadius: 4,
          borderSkipped: 'start',
          barThickness: 18,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {display: false},
          tooltip: {
            callbacks: {
              label: ctx => {
                const value = ctx.parsed.x
                const share = total ? Math.round(value / total * 100) : 0
                return ` ${value.toLocaleString()} (${share}%)`
              }
            }
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {precision: 0, color: 'rgba(0,0,0,0.6)'},
            grid: {color: 'rgba(0,0,0,0.06)'},
            border: {display: false},
          },
          y: {
            ticks: {color: 'rgba(0,0,0,0.75)', font: {size: 12}},
            grid: {display: false},
          },
        },
      },
    })
  }

  //////////////////////// NOTES ////////////////////////

  get notesDirty(): boolean {
    return this.notes !== this.savedNotes
  }

  saveNotes(){
    if(this.savingNotes || !this.notesDirty) return
    const notes = this.notes
    this.savingNotes = true

    this.activityService.updateActivityNotes(this.activity._id, notes).subscribe(
      () => {
        this.savingNotes = false
        this.savedNotes = notes
        this.activity.notes = notes
        this.snackBar.open('Notes saved.', 'Dismiss', {duration: 2500})
      },
      error => {
        console.log(error)
        this.savingNotes = false
        this.errorMessage = 'A problem with the server prevented saving the notes.'
      }
    )
  }

  //////////////////////// EXPORT ////////////////////////

  exportCSV(){
    const report = this.currentReport
    if(!report || !report.rows.length) return

    const key = this.tabKeys[this.selectedTab]
    const rows = report.totals ? [...report.rows, report.totals] : report.rows
    const csv = toCSV(report.headers, rows)

    const fmt = (d?: Date) => d ? d.toISOString().slice(0, 10) : ''
    const dates = this.dateRangeSelected ? `_${fmt(this.range.value.start)}_to_${fmt(this.range.value.end)}` : ''
    const question = key === 'survey' ? `_${this.selectedQuestion}` : ''
    const filename = `${this.activity.name}_${key}${question}${dates}.csv`.replace(/[\\/:*?"<>|]+/g, '-')

    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}))
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  async close(){
    if(this.notesDirty && !(await confirmAction(this.dialog, {title: 'Discard your unsaved notes?', message: 'Your notes will be lost.', danger: true}))) return
    this.dialogRef.close()
  }
}

// The server divides by zero for volunteers with no calls/doors ("NaN%")
function cleanRow(row: any): any {
  const clean: any = {}
  Object.keys(row || {}).forEach(key => clean[key] = (typeof row[key] === 'string' && row[key].startsWith('NaN')) ? '—' : row[key])
  return clean
}

// Every column any row has, in first-seen order, with User first
function headersFor(rows: any[]): string[] {
  const headers: string[] = []
  rows.forEach(row => Object.keys(row).forEach(key => { if(!headers.includes(key)) headers.push(key) }))
  return headers.includes('User') ? ['User', ...headers.filter(h => h !== 'User')] : headers
}

const percent = (part: number, whole: number) => whole ? Math.round(part / whole * 100) + '%' : '—'

// Sums numeric columns; ratio columns are recomputed from the summed counts, other text shows "—"
function buildTotals(rows: any[], headers: string[]): any {
  const totals: any = {}
  headers.forEach(header => {
    if(header === 'User'){ totals[header] = 'Total'; return }
    const values = rows.map(row => row[header]).filter(value => value !== undefined && value !== null)
    totals[header] = values.every(value => typeof value === 'number')
      ? values.reduce((sum, value) => sum + value, 0)
      : '—'
  })

  if('Contacts/Doors Knocked' in totals) totals['Contacts/Doors Knocked'] = percent(totals['Contacts'], totals['Doors Knocked'])
  if('Contacts/Unique Calls' in totals) totals['Contacts/Unique Calls'] = percent(totals['Contacts'], totals['Unique Calls'])
  // An average of per-user averages would be misleading
  if('Avg Call Length(s)' in totals) totals['Avg Call Length(s)'] = '—'
  return totals
}

// RFC 4180: quote every field, double embedded quotes
function toCSV(headers: string[], rows: any[]): string {
  const cell = (value: any) => `"${String(value ?? 0).replace(/"/g, '""')}"`
  return [headers.map(cell).join(','), ...rows.map(row => headers.map(h => cell(row[h])).join(','))].join('\r\n')
}
