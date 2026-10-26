import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormGroup, FormControl } from '@angular/forms';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, loadErrorText } from 'src/app/utils/loading';

//SERVICES
import { OrganizationService } from 'src/app/services/organization/organization.service';
import { TwilioService } from 'src/app/services/twilio.service';
import { SignalWireService } from 'src/app/services/signalWire.service';

//MODELS
import { Organization, TwilioAccountStatus } from 'src/app/models/organization.model';
import { subscriptionCost, twilioCharges, swCharges, formatBillingDate, TwilioCharges, SWCharges, BILLING_RATES } from 'src/app/utils/billing';

// Twilio's usage call only resolves once it sees an outbound-call record, so cap the wait
const USAGE_TIMEOUT_MS = 60000;

type Period = 'thisMonth' | 'lastMonth' | 'custom';

interface OrgBillingRow {
  org: Organization;
  subscriptionCost: number;
  hasTwilio: boolean;
  hasSW: boolean;
  twilio?: TwilioCharges;
  sw?: SWCharges;
  // Account checks still running (Twilio + SignalWire)
  checking: number;
  // Usage requests still running for the current period
  pending: number;
  request: number;
  error: string;
}

interface StatementLine {
  label: string;
  quantity: number;
  unit: string;
  rate: number | null;
  amount: number;
}

interface StatementSection {
  title: string;
  lines: StatementLine[];
  notes: string[];
}

const roundCents = (value: number) => Math.round(value * 100) / 100

@Component({
  templateUrl: './campaignBillingDialog.html',
  styleUrls: ['../../campaignMap.component.scss', './campaignBillingDialog.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class CampaignBillingDialog implements OnInit {

  rows: OrgBillingRow[] = [];
  loadingOrgs: boolean = true;
  orgsFailed: boolean = false;
  displayErrorMsg: boolean = false;
  errorMessage: string = '';

  rates = BILLING_RATES

  period: Period = 'thisMonth'
  periodStart: Date
  periodEnd: Date

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  constructor(public dialogRef: MatDialogRef<CampaignBillingDialog>,
              public orgService: OrganizationService,
              public twilioService: TwilioService,
              public swService: SignalWireService) {}

  ngOnInit(){
    this.setPeriodDates('thisMonth');
    this.loadOrgs();
  }

  loadOrgs(){
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    this.loadingOrgs = true;
    this.orgsFailed = false;
    this.displayErrorMsg = false;

    this.orgService.getCampaignOrgs(campaignID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (orgs: Organization[]) => {
        this.loadingOrgs = false;
        this.rows = (orgs || [])
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(org => ({org, subscriptionCost: subscriptionCost(org.subscription), hasTwilio: false, hasSW: false, checking: 0, pending: 0, request: 0, error: ''}));
        this.rows.forEach(row => this.checkAccounts(row));
      },
      error => {
        console.log(error);
        this.loadingOrgs = false;
        this.orgsFailed = true;
        this.displayErrorMsg = true;
        this.errorMessage = loadErrorText('the campaign organizations', error);
      }
    );
  }

  return(){this.dialogRef.close()}

  get loading(): boolean {
    return this.loadingOrgs || this.rows.some(row => this.rowLoading(row));
  }

  rowLoading(row: OrgBillingRow): boolean {
    return row.checking > 0 || row.pending > 0;
  }

  //////////////////////// PERIOD ////////////////////////

  private setPeriodDates(period: Period){
    const today = new Date()
    if(period === 'thisMonth'){
      this.periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
      this.periodEnd = today
    }
    if(period === 'lastMonth'){
      this.periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      this.periodEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    }
  }

  setPeriod(period: Period){
    this.period = period
    // A custom range loads once both dates are picked
    if(period === 'custom') return
    this.setPeriodDates(period)
    this.reloadUsage()
  }

  applyCustomRange(){
    const start = this.range.value.start
    const end = this.range.value.end
    if(!start || !end) return
    this.periodStart = start
    this.periodEnd = end
    this.reloadUsage()
  }

  get periodLabel(): string {
    if(!this.periodStart || !this.periodEnd) return ''
    const sameYear = this.periodStart.getFullYear() === this.periodEnd.getFullYear()
    const startText = this.periodStart.toLocaleDateString(undefined, {month: 'short', day: 'numeric', ...(sameYear ? {} : {year: 'numeric'})})
    const endText = this.periodEnd.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})
    return `${startText} – ${endText}`
  }

  //////////////////////// USAGE ////////////////////////

  checkAccounts(row: OrgBillingRow){
    row.checking += 2;

    this.twilioService.checkTwilioAccount(row.org._id).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (result: TwilioAccountStatus) => {
        row.checking--;
        row.hasTwilio = !!result?.status;
        if(row.hasTwilio) this.loadTwilio(row, row.request);
      },
      error => {
        row.checking--;
        this.fail(row, row.request, error, false);
      }
    );

    this.swService.checkSWAccount(row.org._id).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      result => {
        row.checking--;
        row.hasSW = !!result && result['name'] !== 'Error';
        if(row.hasSW) this.loadSW(row, row.request);
      },
      error => {
        row.checking--;
        this.fail(row, row.request, error, false);
      }
    );
  }

  loadTwilio(row: OrgBillingRow, request: number){
    row.pending++;
    this.twilioService.getTwilioUsageSummary(row.org._id, formatBillingDate(this.periodStart), formatBillingDate(this.periodEnd)).pipe(timeout(USAGE_TIMEOUT_MS)).subscribe(
      result => {
        if(request !== row.request) return;
        if(!result) return this.fail(row, request, 'No Twilio usage returned');
        row.pending--;
        row.twilio = twilioCharges(result);
      },
      error => this.fail(row, request, error)
    );
  }

  loadSW(row: OrgBillingRow, request: number){
    row.pending++;
    this.swService.getSWUsageSummary(row.org._id, formatBillingDate(this.periodStart), formatBillingDate(this.periodEnd)).pipe(timeout(USAGE_TIMEOUT_MS)).subscribe(
      result => {
        if(request !== row.request) return;
        if(!result) return this.fail(row, request, 'No SignalWire usage returned');
        row.pending--;
        row.sw = swCharges(result);
      },
      error => this.fail(row, request, error)
    );
  }

  // A response from an older period is ignored; one org failing doesn't block the others
  fail(row: OrgBillingRow, request: number, error: any, wasUsageRequest: boolean = true){
    console.log(error);
    if(request !== row.request) return;
    if(wasUsageRequest) row.pending = Math.max(0, row.pending - 1);
    row.error = 'Some usage for this organization could not be loaded.';
  }

  reloadUsage(){
    this.rows.forEach(row => {
      row.request++;
      row.pending = 0;
      row.error = '';
      row.twilio = undefined;
      row.sw = undefined;
      if(row.hasTwilio) this.loadTwilio(row, row.request);
      if(row.hasSW) this.loadSW(row, row.request);
    });
  }

  //////////////////////// STATEMENT ////////////////////////

  // Same lines and formula as Organization Billing, so each subtotal matches that screen
  sections(row: OrgBillingRow): StatementSection[] {
    const calling: StatementLine[] = []
    const texting: StatementLine[] = []
    const callingNotes: string[] = []
    const textingNotes: string[] = []

    if(row.twilio){
      calling.push({label: 'Twilio call minutes', quantity: row.twilio.calls.count, unit: 'min', rate: this.rates.callMinute, amount: row.twilio.calls.cost})
      calling.push({label: 'Twilio pool numbers', quantity: row.twilio.numbers.count, unit: 'numbers', rate: this.rates.poolNumber, amount: row.twilio.numbers.cost})
      if(row.twilio.messages.count > 0){
        texting.push({label: 'Twilio texts', quantity: row.twilio.messages.count, unit: 'segments', rate: this.rates.textSegment, amount: row.twilio.messages.cost})
      }
    } else if(!row.checking && !row.hasTwilio){
      callingNotes.push('No Twilio account connected')
    }

    if(row.sw){
      calling.push({label: 'SignalWire call minutes', quantity: row.sw.calls.count, unit: 'min', rate: this.rates.callMinute, amount: row.sw.calls.cost})
      calling.push({label: 'SignalWire pool numbers', quantity: row.sw.numbers.count, unit: 'numbers', rate: this.rates.poolNumber, amount: row.sw.numbers.cost})
      texting.push({label: 'SignalWire text segments', quantity: row.sw.messages.count, unit: 'segments', rate: this.rates.textSegment, amount: row.sw.messages.cost})
    } else if(!row.checking && !row.hasSW){
      textingNotes.push('No SignalWire account connected')
    }

    return [
      {title: 'Subscription', notes: [], lines: [
        {label: `Monthly subscription (${row.org.subscription || 'PLUS'})`, quantity: 1, unit: 'month', rate: null, amount: row.subscriptionCost}
      ]},
      {title: 'Calling', notes: callingNotes, lines: calling},
      {title: 'Texting', notes: textingNotes, lines: texting},
    ]
  }

  subtotal(row: OrgBillingRow): number {
    return roundCents(row.subscriptionCost
      + (row.sw ? row.sw.numbers.cost + row.sw.calls.cost + row.sw.messages.cost : 0)
      + (row.twilio ? row.twilio.numbers.cost + row.twilio.calls.cost + row.twilio.messages.cost : 0));
  }

  get totals(){
    const sum = (fn: (row: OrgBillingRow) => number) => this.rows.reduce((total, row) => total + fn(row), 0);
    return {
      subscriptions: roundCents(sum(row => row.subscriptionCost)),
      callMinutes: sum(row => (row.twilio?.calls.count ?? 0) + (row.sw?.calls.count ?? 0)),
      callCost: roundCents(sum(row => (row.twilio?.calls.cost ?? 0) + (row.sw?.calls.cost ?? 0))),
      textSegments: sum(row => (row.twilio?.messages.count ?? 0) + (row.sw?.messages.count ?? 0)),
      textCost: roundCents(sum(row => (row.twilio?.messages.cost ?? 0) + (row.sw?.messages.cost ?? 0))),
      numbers: sum(row => (row.twilio?.numbers.count ?? 0) + (row.sw?.numbers.count ?? 0)),
      numberCost: roundCents(sum(row => (row.twilio?.numbers.cost ?? 0) + (row.sw?.numbers.cost ?? 0))),
      total: roundCents(sum(row => this.subtotal(row))),
    };
  }

  trackRow(index: number, row: OrgBillingRow){ return row.org._id }
}
