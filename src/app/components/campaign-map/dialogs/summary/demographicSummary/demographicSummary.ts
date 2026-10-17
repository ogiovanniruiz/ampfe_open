import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {GroupService} from '../../../../../services/group.service';
import {OrganizationService} from '../../../../../services/organization/organization.service';

import { SummaryService } from 'src/app/services/summary.service';

import { SurveyService } from 'src/app/services/survey.service';
import { Survey } from 'src/app/models/survey.model';

export interface DistributionEntry {
  key: string;
  label: string;
  pct: number;
  // Estimated from the percentage and the universe size; the server only returns percentages
  estCount: number;
}

// One hue for every distribution: the bars show magnitude, the labels carry identity
export const BAR_COLOR = '#2a78d6';

// Ordinal ramp for "voted in 0..3 of the last 3 generals" (validated light → dark)
const VOTE_RAMP = ['#86b6ef', '#3987e5', '#256abf', '#184f95'];

const AGE_ORDER = ['18-24', '25-54', '55+'];

// Labels that shouldn't just be capitalized
const LABEL_OVERRIDES: {[key: string]: string} = {api: 'API', unknown: 'Unknown'};

@Component({
    templateUrl: './demographicSummary.html',
    styleUrls: ['./demographicSummary.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
  
export class DemographicSummaryDialog implements OnInit{

  orgSurveys: Survey[] = []
  loadingSurveys: boolean = true
  selectedSurveyID: string = null
  analysisSummaryData: any = null
  loading = false;
  error = false;

  // Responses from an earlier pick are ignored
  private request = 0;

  view: 'chart' | 'table' = 'chart'
  barColor = BAR_COLOR

  constructor(
      @Inject(MAT_DIALOG_DATA) public summaryType: string,
      public dialogRef: MatDialogRef<DemographicSummaryDialog>, 
      public groupService: GroupService,
      public orgService: OrganizationService,
      private summaryService: SummaryService,
      private surveyService: SurveyService,
  ) {}

  ngOnInit(){
    this.getSurveys();
  }

  return(){
    this.dialogRef.close()
  }

  getSurveys(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.surveyService.getAllSurveys(orgID, campaignID).subscribe(
      (surveys: Survey[]) => {
        this.loadingSurveys = false
        this.orgSurveys = (surveys || []).filter(survey => survey.campaignIDs.includes(campaignID) && survey.active)
      },
      error => {
        console.log(error)
        this.loadingSurveys = false
      }
    )
  }

  getAnalysisSummary(surveyID: string){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

    this.selectedSurveyID = surveyID
    const request = ++this.request

    this.loading = true;
    this.error = false;

    this.summaryService.getAnalysisSummary(campaignID, surveyID, orgID).subscribe(
      (response: any) => {
        if(request !== this.request) return
        this.analysisSummaryData = response;
        this.loading = false;
      },
      error => {
        if(request !== this.request) return
        console.error('Error fetching analysis summary:', error);
        this.analysisSummaryData = null;
        this.loading = false;
        this.error = true;
      }
    ); 
  }

  retry(){
    if(this.selectedSurveyID) this.getAnalysisSummary(this.selectedSurveyID)
  }

  //////////////////////// SUMMARY ////////////////////////

  get universe(): number {
    return this.analysisSummaryData?.universeSizeAll || 0
  }

  get isEmpty(): boolean {
    return !!this.analysisSummaryData && this.universe === 0
  }

  get surveyedPct(): number {
    const surveyed = this.analysisSummaryData?.universeSizeSurveyed || 0;
    if (!this.universe) return 0;
    return Math.round((surveyed / this.universe) * 1000) / 10;
  }

  get electionYears(): string {
    return (this.analysisSummaryData?.voteHistory?.generalElectionsConsidered || []).join(', ')
  }

  get ethnicityEntries(): DistributionEntry[] {
    return this.entries(this.analysisSummaryData?.ethnicityDistributionPct);
  }

  get genderEntries(): DistributionEntry[] {
    return this.entries(this.analysisSummaryData?.genderDistributionPct);
  }

  get ageEntries(): DistributionEntry[] {
    return this.entries(this.analysisSummaryData?.ageDistributionPct, {order: AGE_ORDER});
  }

  get countyEntries(): DistributionEntry[] {
    return this.entries(this.analysisSummaryData?.countyDistributionPct, {topN: 6});
  }

  get voteHistoryEntries(): DistributionEntry[] {
    return this.entries(this.analysisSummaryData?.voteHistory?.distributionPct, {order: ['0', '1', '2', '3']})
      .map(entry => ({...entry, label: `${entry.key} of 3`}));
  }

  voteColor(index: number): string {
    return VOTE_RAMP[index] || VOTE_RAMP[VOTE_RAMP.length - 1];
  }

  formatCompact(value: number): string {
    if (value === null || value === undefined) return '—'
    if (Math.abs(value) >= 10000) {
      return new Intl.NumberFormat(undefined, {notation: 'compact', maximumFractionDigits: 1} as any).format(value)
    }
    return value.toLocaleString()
  }

  // Rows for one distribution: sorted largest first unless an order is given; topN folds the rest into "Other"
  private entries(obj: Record<string, any>, options: {order?: string[], topN?: number} = {}): DistributionEntry[] {
    let rows = Object.entries(obj || {}).map(([key, value]) => this.toEntry(key, Number(value) || 0))

    if (options.order) {
      const order = options.order
      rows.sort((a, b) => (order.indexOf(a.key) === -1 ? 99 : order.indexOf(a.key)) - (order.indexOf(b.key) === -1 ? 99 : order.indexOf(b.key)))
    } else {
      rows.sort((a, b) => b.pct - a.pct)
    }

    if (options.topN && rows.length > options.topN + 1) {
      const rest = rows.slice(options.topN)
      const otherPct = Math.round(rest.reduce((sum, row) => sum + row.pct, 0) * 10) / 10
      rows = [...rows.slice(0, options.topN), this.toEntry('other', otherPct, `Other (${rest.length})`)]
    }

    return rows
  }

  private toEntry(key: string, pct: number, label?: string): DistributionEntry {
    const lower = key.toLowerCase()
    return {
      key,
      label: label || LABEL_OVERRIDES[lower] || key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
      pct,
      estCount: Math.round(pct / 100 * this.universe),
    }
  }

  tooltip(entry: DistributionEntry): string {
    return `${entry.label} · ${entry.pct}% · ≈${entry.estCount.toLocaleString()} voters`
  }
}
