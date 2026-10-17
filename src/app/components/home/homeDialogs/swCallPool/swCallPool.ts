import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, SLOW_LOAD_TIMEOUT_MS } from 'src/app/utils/loading';
import {forkJoin} from 'rxjs';
import {MatDialogRef, MatDialog} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

//SERVICES
import {SignalWireService} from '../../../../services/signalWire.service'
import { HotlineService } from 'src/app/services/hotline.service';

//MODELS
import {User} from '../../../../models/user.model'
import { CallPoolNumber } from 'src/app/models/organization.model';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

type NumberStatus = 'available' | 'inUse' | 'notInPool';

interface NumberRow {
  swNumber: any;
  number: string;
  formatted: string;
  status: NumberStatus;
  lastUsed: Date | null;
  numCalls: number | null;
  isHotline: boolean;
  assignedCampaignID: string | undefined;
}

@Component({
  templateUrl: './swCallPool.html',
  // Same look as the Twilio Calling Pool (cp-*)
  styleUrls: ['../../home.component.scss', '../twilioCallPool/twilioCallPool.scss', './swCallPool.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class SignalWireCallPoolDialog implements OnInit{

  displayErrorMsg: boolean = false;
  errorMessage: string = '';

  phonenumbers: any[] = []
  callPoolNumbers: CallPoolNumber[] = [];

  accountExists: boolean = false;

  userMessage: string = '';
  displayMessage: boolean = false;

  loading: boolean = true;
  user: User;
  dev: boolean = false;

  textingCampaigns: any[] = []
  assignedCampaignByNumber: {[phoneNumber: string]: string} = {}
  hotline_number: string;

  // One precomputed row per number, rebuilt whenever numbers, pool, assignments or the hotline change
  rows: NumberRow[] = [];

  @ViewChild("areaCode", {static: false}) areaCode: ElementRef;

  constructor(public dialogRef: MatDialogRef<SignalWireCallPoolDialog>,
              public swService: SignalWireService,
              public dialog: MatDialog,
              public hotlineService: HotlineService,
              private snackBar: MatSnackBar
              ) {}

  private fail(message: string = "There was an unknown error with the server.", error?: any){
    if(error) console.log(error)
    this.errorMessage = error instanceof TimeoutError ? "The server didn't respond. Try Refresh." : message
    this.displayErrorMsg = true
    this.loading = false
  }

  private notify(message: string){
    this.snackBar.open(message, 'Dismiss', {duration: 4000})
  }

  private get orgID(): string {
    return sessionStorage.getItem('orgID') || ''
  }

  refreshAll(){
    this.loading = true
    this.displayErrorMsg = false
    this.getSWPhonenumbers()
    this.getSWCallPool()
  }

  get summary(){
    return {
      total: this.rows.length,
      available: this.rows.filter(row => row.status === 'available').length,
      inUse: this.rows.filter(row => row.status === 'inUse').length,
    }
  }

  formatPhone(number: string): string {
    const digits = (number || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
    if(digits.length !== 10) return number || ''
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  buildRows(){
    this.rows = this.phonenumbers.map((swNumber: any) => {
      const poolNumber: any = this.getMatchedNumber(swNumber.phoneNumber)
      let status: NumberStatus = 'notInPool'
      if(poolNumber) status = poolNumber.available ? 'available' : 'inUse'

      return {
        swNumber,
        number: swNumber.phoneNumber,
        formatted: this.formatPhone(swNumber.phoneNumber),
        status,
        lastUsed: poolNumber?.dateUpdated ? new Date(poolNumber.dateUpdated) : null,
        numCalls: poolNumber?.numCalls ?? null,
        isHotline: !!this.hotline_number && this.hotline_number === swNumber.phoneNumber,
        assignedCampaignID: this.assignedCampaignByNumber[swNumber.phoneNumber],
      }
    })
  }

  trackRow(index: number, row: NumberRow){ return row.number }

  //////////////////////// ACCOUNT ////////////////////////

  createSWAccount(){
    this.loading = true;
    this.swService.createSWAccount(this.orgID).subscribe(
      (success: boolean) => {
        if(success){
          this.checkSWAccount()
          return
        }
        this.fail("There was an unknown error. Please contact developers.")
      },
      error => this.fail(undefined, error)
    )
  }

  checkSWAccount(){
    this.loading = true
    this.swService.checkSWAccount(this.orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      result =>{
        if(result && result['name'] !== "Error"){
          this.accountExists = true
          this.getSWPhonenumbers()
          this.getSWCallPool();
          return
        }

        this.loading = false
        this.accountExists = false
      },
      error => this.fail(undefined, error)
    )
  }

  //////////////////////// DATA ////////////////////////

  getSWPhonenumbers(){
    this.swService.getAllSWPhonenumbers(this.orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (phonenumbers: any[]) =>{
        this.phonenumbers = phonenumbers || []
        this.buildRows()
        this.getOrgSWCampaigns()
        this.loading = false;
      },
      error => this.fail(undefined, error)
    )
  }

  getSWCallPool(){
    this.swService.getSWCallPool(this.orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (callPoolNumbers: CallPoolNumber[]) =>{
        this.callPoolNumbers = callPoolNumbers || [];
        this.buildRows()
        this.loading = false;
      },
      error => this.fail(undefined, error)
    )
  }

  getOrgSWCampaigns(){
    this.swService.getOrgSWCampaigns(this.orgID, null).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (textingCampaigns: any[]) =>{
        this.textingCampaigns = textingCampaigns || []
        this.getAssignedCampaigns()
      },
      error => console.log(error)
    )
  }

  getAssignedCampaigns(){
    if(this.textingCampaigns.length === 0) return

    forkJoin(this.textingCampaigns.map((textingCampaign: any) =>
      this.swService.getSWCampaignPhonenumbers(textingCampaign.id, null, this.orgID)
    )).subscribe(
      (results: any[]) =>{
        var assigned: {[phoneNumber: string]: string} = {}

        results.forEach((campaignNumbers: any, index: number) =>{
          if(!Array.isArray(campaignNumbers)) return

          campaignNumbers.forEach((campaignNumber: any) =>{
            var number = campaignNumber?.phone_number?.number
            if(number) assigned[number] = this.textingCampaigns[index].id
          })
        })

        this.assignedCampaignByNumber = assigned
        this.buildRows()
      },
      error => console.log(error)
    )
  }

  getHotlineStatus(){
    this.hotlineService.getHotlineStatus(this.orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (hotline_number: any) =>{
        if(hotline_number){
          this.hotline_number = hotline_number.number
          this.buildRows()
        }
      },
      error => console.log(error)
    )
  }

  getMatchedNumber(number: string) {
    return this.callPoolNumbers.find((callPoolNumber: CallPoolNumber) => callPoolNumber.number === number)
  }

  //////////////////////// ACTIONS ////////////////////////

  buyPhonenumber(){
    var areaCode: string = (this.areaCode.nativeElement.value || '').trim()

    if(!/^\d{3}$/.test(areaCode)){
      this.displayMessage = true;
      this.userMessage = areaCode ? "Area code must be 3 digits." : "An area code is needed."
      return
    }
    this.displayMessage = false;
    this.loading = true;

    this.swService.buySWCallingPhonenumber(areaCode, this.orgID).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe(
      (result: any) =>{
        // Reasons the server could explain (no numbers, SignalWire refused) show under the area code
        if(result?.errors?.length){
          this.userMessage = result.errors[0].detail || "The number could not be purchased."
          this.displayMessage = true;
          this.loading = false;
          return
        }

        this.areaCode.nativeElement.value = ''
        this.notify(result?.number ? `Bought ${this.formatPhone(result.number)}.` : 'Number purchased.')
        if(result?.warnings?.length){
          this.userMessage = result.warnings.join(' ')
          this.displayMessage = true;
        }
        this.refreshAll()
      },
      error => error instanceof TimeoutError
        ? this.fail("The server didn't respond. Refresh to check whether the number was bought.")
        : this.fail(`The number could not be purchased for area code ${areaCode}.`, error)
    )
  }

  async releaseSWPhonenumber(row: NumberRow){
    if(row.isHotline) return
    if(!(await confirmAction(this.dialog, {title: `Release ${row.formatted}?`, message: 'It will no longer be available for calling.', confirmLabel: 'Release', cancelLabel: 'Cancel', danger: true}))) return

    this.loading = true;
    this.swService.releaseSWPhonenumber(row.swNumber.sid, this.orgID, row.number).subscribe(
      () =>{
        this.notify('Number released.')
        this.refreshAll()
      },
      error => this.fail('The number could not be released.', error)
    )
  }

  async forceHangUpSWPhonenumber(phoneNumber: string){
    if(!(await confirmAction(this.dialog, {title: 'Force hang up this number?', confirmLabel: 'Hang up', cancelLabel: 'Cancel', danger: true}))) return

    this.loading = true
    this.swService.forceHangUpSWPhonenumber(this.orgID, phoneNumber).subscribe(
      (result: unknown) => {
        if((result as any)?.acknowledged){
          this.notify('Number hung up and returned to the pool.')
          this.getSWCallPool();
          return
        }
        this.fail('The number could not be hung up.')
      },
      error => this.fail(undefined, error)
    )
  }

  assignSWCampaign(row: NumberRow, campaignID: string){
    const previous = row.assignedCampaignID
    if(!campaignID || campaignID === previous) return

    const textingCampaign = this.textingCampaigns.find(c => c.id === campaignID)
    if(!textingCampaign) return

    this.loading = true;
    row.assignedCampaignID = campaignID

    this.swService.assignSWCampaign(textingCampaign, row.swNumber, this.orgID).subscribe(
      () =>{
        this.assignedCampaignByNumber[row.number] = campaignID
        this.loading = false;
        this.notify(`${row.formatted} assigned to ${textingCampaign.name}.`)
      },
      error =>{
        row.assignedCampaignID = previous
        this.fail('The number could not be assigned to that texting operation.', error)
      }
    )
  }

  ngOnInit(){
    this.user = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.dev = !!this.user?.dev
    this.checkSWAccount()
    this.getHotlineStatus()
  }

  return(){
    this.dialogRef.close()
  }
}
