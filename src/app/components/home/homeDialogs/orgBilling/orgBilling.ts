import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormGroup, FormControl} from '@angular/forms';

//SERVICES
import {OrganizationService} from '../../../../services/organization/organization.service'
import { TwilioService } from '../../../../services/twilio.service';

//MODELS
import {Organization} from '../../../../models/organization.model'
import {User} from '../../../../models/user.model'
import { TwilioAccountStatus } from '../../../../models/organization.model';
import { SignalWireService } from 'src/app/services/signalWire.service';
import { TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, SLOW_LOAD_TIMEOUT_MS } from 'src/app/utils/loading';
import { subscriptionCost, twilioCharges, swCharges, formatBillingDate, BILLING_RATES } from 'src/app/utils/billing';

type Period = 'thisMonth' | 'lastMonth' | 'custom';

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
  loading: boolean;
}

@Component({
  templateUrl: './orgBilling.html',
  styleUrls: ['../../home.component.scss', './orgBilling.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class OrgBillingDialog implements OnInit{

  displayErrorMsg: boolean = false
  errorMessage: string = '';

  dev: boolean = false;

  twilioMsgCount: number = 0
  twilioMsgCost: number = 0
  
  twilioCallCount: number = 0
  twilioCallCost: number = 0

  swMsgCount: number = 0
  swMsgCost: number = 0

  swCallCount: number = 0
  swCallCost: number = 0

  twilioPhoneNumCost: number = 0
  twilioPhoneNumCount: number = 0

  swPhoneNumCost: number = 0
  swPhoneNumCount: number = 0

  loadingTwilioUsage: boolean = false
  loadingSWUsage: boolean = false

  checkingTwilioAccount: boolean = true
  checkingSWAccount: boolean = true

  twilioAccountExists: boolean = false;
  swAccountExists: boolean = false;

  twilioUsageLoaded: boolean =  false
  swUsageLoaded: boolean =  false

  monthlySubscriptionCost: number = 600
  rates = BILLING_RATES

  period: Period = 'thisMonth'
  periodStart: Date
  periodEnd: Date

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });
  
  constructor(public dialogRef: MatDialogRef<OrgBillingDialog>,
              @Inject(MAT_DIALOG_DATA) public organization: Organization, 
              public orgService: OrganizationService,
              public swService: SignalWireService,
              public twilioService: TwilioService,
              ) {
                this.monthlySubscriptionCost = subscriptionCost(this.organization?.subscription)
              }

  return(){this.dialogRef.close()}

  private get orgID(): string {
    return sessionStorage.getItem('orgID')
  }

  private fail(error?: any, message: string = "There was an unknown error with the server."){
    if(error) console.log(error)
    this.errorMessage = error instanceof TimeoutError ? "The server didn't respond. Try again." : message
    this.displayErrorMsg = true
    this.checkingTwilioAccount = false
    this.checkingSWAccount = false
    this.loadingTwilioUsage = false
    this.loadingSWUsage = false
  }

  ngOnInit(){
    var user: User = JSON.parse(sessionStorage.getItem('user'));
    this.dev = !!user?.dev
    this.setPeriodDates('thisMonth')
    this.checkTwilioAccount()
    this.checkSWAccount() 
  }

  // Re-checks both accounts, which reloads usage for the ones that exist
  retry(){
    this.displayErrorMsg = false
    this.checkTwilioAccount()
    this.checkSWAccount()
  }

  //////////////////////// ACCOUNTS ////////////////////////

  checkTwilioAccount(){
    this.checkingTwilioAccount = true
    this.twilioService.checkTwilioAccount(this.orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (result: TwilioAccountStatus) =>{
        this.twilioAccountExists = !!result?.status
        this.checkingTwilioAccount = false 
        if(this.twilioAccountExists) this.loadTwilioUsage()
      }, 
      error => this.fail(error)
    )
  }

  checkSWAccount(){
    this.checkingSWAccount = true
    this.swService.checkSWAccount(this.orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      result =>{
        this.checkingSWAccount = false
        this.swAccountExists = !!result && result['name'] !== "Error"
        if(this.swAccountExists) this.loadSWUsage()
      },
      error => this.fail(error)
    )
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
    this.loadUsage()
  }

  applyCustomRange(){
    const start = this.range.value.start
    const end = this.range.value.end
    if(!start || !end) return
    this.periodStart = start
    this.periodEnd = end
    this.loadUsage()
  }

  get periodLabel(): string {
    if(!this.periodStart || !this.periodEnd) return ''
    const sameYear = this.periodStart.getFullYear() === this.periodEnd.getFullYear()
    const startText = this.periodStart.toLocaleDateString(undefined, {month: 'short', day: 'numeric', ...(sameYear ? {} : {year: 'numeric'})})
    const endText = this.periodEnd.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})
    return `${startText} – ${endText}`
  }

  //////////////////////// USAGE ////////////////////////

  loadUsage(){
    this.displayErrorMsg = false
    if(this.twilioAccountExists) this.loadTwilioUsage()
    if(this.swAccountExists) this.loadSWUsage()
  }

  loadTwilioUsage(){
    this.loadingTwilioUsage = true;
    this.twilioService.getTwilioUsageSummary(this.orgID, formatBillingDate(this.periodStart), formatBillingDate(this.periodEnd)).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe(
      (result: any) =>{
        if(!result) return this.fail(undefined, "Could not load Twilio usage.")
        const charges = twilioCharges(result)

        this.twilioCallCount = charges.calls.count
        this.twilioCallCost = charges.calls.cost

        this.twilioPhoneNumCount = charges.numbers.count
        this.twilioPhoneNumCost = charges.numbers.cost

        this.twilioMsgCount = charges.messages.count
        this.twilioMsgCost = charges.messages.cost

        this.loadingTwilioUsage = false
        this.twilioUsageLoaded = true
      },
      error => this.fail(error, "Could not load Twilio usage.")
    )
  }

  loadSWUsage(){
    this.loadingSWUsage = true
    this.swService.getSWUsageSummary(this.orgID, formatBillingDate(this.periodStart), formatBillingDate(this.periodEnd)).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe(
      result =>{
        if(!result) return this.fail(undefined, "Could not load SignalWire usage.")
        const charges = swCharges(result)

        this.swMsgCount = charges.messages.count
        this.swMsgCost = charges.messages.cost

        this.swCallCount = charges.calls.count
        this.swCallCost = charges.calls.cost

        this.swPhoneNumCount = charges.numbers.count
        this.swPhoneNumCost = charges.numbers.cost

        this.loadingSWUsage = false
        this.swUsageLoaded = true
      },
      error => this.fail(error, "Could not load SignalWire usage.")
    )
  }

  //////////////////////// STATEMENT ////////////////////////

  get loadingAny(): boolean {
    return this.checkingTwilioAccount || this.checkingSWAccount || this.loadingTwilioUsage || this.loadingSWUsage
  }

  get subscriptionTier(): string {
    return this.organization?.subscription || 'PLUS'
  }

  get sections(): StatementSection[] {
    const twilioLoading = this.checkingTwilioAccount || this.loadingTwilioUsage
    const swLoading = this.checkingSWAccount || this.loadingSWUsage
    const twilio = this.twilioAccountExists && this.twilioUsageLoaded
    const sw = this.swAccountExists && this.swUsageLoaded

    const calling: StatementLine[] = []
    const texting: StatementLine[] = []
    const callingNotes: string[] = []
    const textingNotes: string[] = []

    if(twilio){
      calling.push({label: 'Twilio call minutes', quantity: this.twilioCallCount, unit: 'min', rate: this.rates.callMinute, amount: this.twilioCallCost})
      calling.push({label: 'Twilio pool numbers', quantity: this.twilioPhoneNumCount, unit: 'numbers', rate: this.rates.poolNumber, amount: this.twilioPhoneNumCost})
      // Twilio texting was charged but never shown; it only appears when used
      if(this.twilioMsgCount > 0){
        texting.push({label: 'Twilio texts', quantity: this.twilioMsgCount, unit: 'segments', rate: this.rates.textSegment, amount: this.twilioMsgCost})
      }
    } else if(!this.checkingTwilioAccount && !this.twilioAccountExists){
      callingNotes.push('No Twilio account connected')
    }

    if(sw){
      calling.push({label: 'SignalWire call minutes', quantity: this.swCallCount, unit: 'min', rate: this.rates.callMinute, amount: this.swCallCost})
      calling.push({label: 'SignalWire pool numbers', quantity: this.swPhoneNumCount, unit: 'numbers', rate: this.rates.poolNumber, amount: this.swPhoneNumCost})
      texting.push({label: 'SignalWire text segments', quantity: this.swMsgCount, unit: 'segments', rate: this.rates.textSegment, amount: this.swMsgCost})
    } else if(!this.checkingSWAccount && !this.swAccountExists){
      textingNotes.push('No SignalWire account connected')
    }

    return [
      {title: 'Subscription', loading: false, notes: [], lines: [
        {label: `Monthly subscription (${this.subscriptionTier})`, quantity: 1, unit: 'month', rate: null, amount: this.monthlySubscriptionCost}
      ]},
      {title: 'Calling', loading: twilioLoading || swLoading, notes: callingNotes, lines: calling},
      {title: 'Texting', loading: twilioLoading || swLoading, notes: textingNotes, lines: texting},
    ]
  }

  get total(): number {
    const sum = this.sections.reduce((total, section) =>
      total + section.lines.reduce((subtotal, line) => subtotal + line.amount, 0), 0)
    return Math.round(sum * 100) / 100
  }
}
