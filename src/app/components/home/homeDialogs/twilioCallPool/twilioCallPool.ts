import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import { TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS } from 'src/app/utils/loading';
import {MatDialogRef, MatDialog} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

//SERVICES
import {TwilioService} from '../../../../services/twilio.service'

//MODELS
import {TwilioAccountStatus, UpdatedOrg, TwilioNumber, CallPoolNumber} from '../../../../models/organization.model'
import {User} from '../../../../models/user.model'
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

type NumberStatus = 'available' | 'inUse' | 'notInPool';

interface NumberRow {
  twilioNumber: TwilioNumber;
  number: string;
  formatted: string;
  status: NumberStatus;
  lastUsed: Date | null;
  numCalls: number | null;
  profileSid: string;
  shakenSid: string;
  tegritySid: string;
}

@Component({
  templateUrl: './twilioCallPool.html',
  styleUrls: ['../../home.component.scss', './twilioCallPool.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
  
export class TwilioCallPoolDialog implements OnInit{

  displayErrorMsg: boolean = false;
  errorMessage: string = '';
  
  phonenumbers: TwilioNumber[] = [];
  callPoolNumbers: CallPoolNumber[] = [];
  businessProfileNumbers: any[] = [];
  shakenNumbers: any[] = [];
  tegrityNumbers: any[] = [];
  
  accountExists: boolean = false;
  needsAreaCode = false;

  // Buy failures, shown beside the Buy button
  buyError: string = '';

  loading: boolean = true;
  user: User;
  dev: boolean = false;

  @ViewChild("areaCode", {static: false}) areaCode: ElementRef;

  // One precomputed row per number, rebuilt whenever numbers, pool or Trust Hub data change
  rows: NumberRow[] = [];

  // How many numbers to buy for the area code, and progress while buying them one by one
  buyQuantities: number[] = [1, 2, 3, 4, 5, 10];
  buyQuantity: number = 1;
  buyingIndex: number = 0;

  constructor(public dialogRef: MatDialogRef<TwilioCallPoolDialog>, 
              public dialog: MatDialog,
              public twilioService: TwilioService,
              private snackBar: MatSnackBar
              ) {
              }

  private fail(message: string = "There was an unknown error with the server.", error?: any){
    if(error) console.log(error)
    this.errorMessage = error instanceof TimeoutError ? "The server didn't respond. Try Refresh." : message
    this.displayErrorMsg = true
    this.loading = false
  }

  private notify(message: string){
    this.snackBar.open(message, 'Dismiss', {duration: 4000})
  }

  refreshAll(){
    this.loading = true
    this.displayErrorMsg = false
    this.getTwilioPhonenumbers()
    this.getTwilioCallPool()
    this.trustHubChecks()
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
    this.rows = this.phonenumbers.map((twilioNumber: any) => {
      const poolNumber: any = this.getMatchedCallPoolNumber(twilioNumber.phoneNumber)
      let status: NumberStatus = 'notInPool'
      if(poolNumber) status = poolNumber.available ? 'available' : 'inUse'

      return {
        twilioNumber,
        number: twilioNumber.phoneNumber,
        formatted: this.formatPhone(twilioNumber.phoneNumber),
        status,
        lastUsed: poolNumber?.dateUpdated ? new Date(poolNumber.dateUpdated) : null,
        numCalls: poolNumber?.numCalls ?? null,
        profileSid: this.getMatchedTrustHubNumber(twilioNumber.sid)?.customer_profile_sid || '',
        shakenSid: this.getMatchedShakenNumber(twilioNumber.sid)?.trust_product_sid || '',
        tegritySid: this.getMatchedTegrityNumber(twilioNumber.sid)?.trust_product_sid || '',
      }
    })
  }

  trackRow(index: number, row: NumberRow){ return row.number }
  
  createTwilioAccount(){
    this.loading = true;
    var orgID: string = sessionStorage.getItem('orgID')
    this.twilioService.createTwilioSubAccount(orgID).subscribe(
      (success: boolean) =>{
        if(success) {
          this.checkTwilioAccount()
          return
        }

        this.fail("There was an unknown error. Please contact developers.")
        
      }, 
      error => this.fail(undefined, error)
    )
  }

  checkTwilioAccount(){
    var orgID: string = sessionStorage.getItem('orgID')
    this.twilioService.checkTwilioAccount(orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (result: TwilioAccountStatus) =>{
        this.accountExists = !!result?.status
        
        if(this.accountExists) {
          this.getTwilioPhonenumbers()
          this.getTwilioCallPool();
        }
        else this.loading = false;
      }, 
      error => this.fail(undefined, error)
    )
  }

  getTwilioPhonenumbers(){
    var orgID: string = sessionStorage.getItem('orgID')

    this.twilioService.getTwilioPhonenumbers(orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (phonenumbers: TwilioNumber[])  =>{
        this.phonenumbers = phonenumbers || [];
        this.buildRows();
        this.loading = false;
      }, 
      error => this.fail(undefined, error)
    )
  }

  get buyLabel(): string {
    if(this.buyingIndex) return `Buying ${this.buyingIndex} of ${this.buyQuantity}…`
    return this.buyQuantity > 1 ? `Buy ${this.buyQuantity} numbers` : 'Buy number'
  }

  // Buys one number at a time with the same call as a single purchase, so each gets the same pool and
  // Trust Hub setup; stops at the first failure (e.g. Twilio has no more numbers in that area code)
  async buyPhoneNumber(){
    if(this.buyingIndex) return
    var areaCode: string = (this.areaCode.nativeElement.value || '').trim()

    if(!/^\d{3}$/.test(areaCode)){
      this.buyError = areaCode ? "Area code must be 3 digits." : "An area code is needed."
      return
    }
    this.buyError = '';
    this.loading = true;

    var orgID: string = sessionStorage.getItem('orgID')
    const quantity = this.buyQuantity
    let bought = 0
    let failure = ''

    for(let i = 1; i <= quantity; i++){
      this.buyingIndex = i
      try {
        const result = await firstValueFrom(this.twilioService.buyPhoneNumber(orgID, areaCode)) as UpdatedOrg
        if(!result?.success){
          failure = result?.msg || 'The number could not be bought.'
          break
        }
        bought++
      } catch(error) {
        console.log(error)
        failure = 'There was a problem with the server.'
        break
      }
    }
    this.buyingIndex = 0

    if(failure){
      this.buyError = quantity > 1 ? `Bought ${bought} of ${quantity}. ${failure}` : failure
    } else {
      this.areaCode.nativeElement.value = ''
      this.buyQuantity = 1
    }
    if(bought) this.notify(bought === 1 ? 'Number purchased.' : `${bought} numbers purchased.`)

    if(bought) this.refreshAll()
    else this.loading = false
  }
  


  async releaseTwilioPhonenumber(number: TwilioNumber){
    if((await confirmAction(this.dialog, {title: `Delete ${this.formatPhone(number.phoneNumber)}?`, message: 'It will be removed from your Twilio account and the calling pool.', confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))){
      this.loading = true

      var orgID: string = sessionStorage.getItem('orgID')
      this.twilioService.releaseTwilioPhonenumber(number, orgID).subscribe(
        (result: UpdatedOrg) =>{
          if(result?.success){
            this.notify('Number deleted.')
            this.refreshAll()
            return
          }
          this.fail(result?.msg || 'The number could not be deleted.')
        },
        error => this.fail(undefined, error)
      )
    }
  }

  async releaseAllTwilioPhonenumbers(){
    if((await confirmAction(this.dialog, {title: 'Delete all Twilio phone numbers?', message: 'They will be removed from your Twilio account and the calling pool.', confirmLabel: 'Delete all', cancelLabel: 'Cancel', danger: true}))){
      var orgID: string = sessionStorage.getItem('orgID')
      this.loading = true

      this.twilioService.releaseAllTwilioPhonenumbers(orgID, this.phonenumbers).subscribe(
        (result: unknown) => {
          if((result as any)?.acknowledged){
            this.notify('All numbers deleted.')
            this.refreshAll()
            return
          }
          this.fail('The numbers could not be deleted.')
        },
        error => this.fail(undefined, error)
      )
    }
  }

  async forceHangUpTwilioPhonenumber(phoneNumber: string){
    if((await confirmAction(this.dialog, {title: 'Force hang up this number?', confirmLabel: 'Hang up', cancelLabel: 'Cancel', danger: true}))){
      var orgID: string = sessionStorage.getItem('orgID')
      this.loading = true


      this.twilioService.forceHangUpTwilioPhonenumber(orgID, phoneNumber).subscribe(
        (result: unknown) => {
          if((result as any)?.acknowledged){
            this.notify('Number hung up and returned to the pool.')
            this.getTwilioCallPool();
            return
          }
          this.fail('The number could not be hung up.')
        },
        error => this.fail(undefined, error)
      )
    }
  }

  // Frees every number marked in use, e.g. after callers closed the page without hanging up
  async forceHangUpAllTwilioPhonenumbers(){
    if(!(await confirmAction(this.dialog, {title: 'Free every number in use?', message: 'Any caller still on a call will lose their reserved number.', confirmLabel: 'Free numbers', cancelLabel: 'Cancel', danger: true}))) return
    var orgID: string = sessionStorage.getItem('orgID')
    this.loading = true

    this.twilioService.forceHangUpAllTwilioPhonenumbers(orgID).subscribe(
      (result: any) => {
        if(result?.acknowledged){
          const freed = result.modifiedCount ?? 0
          this.notify(freed === 1 ? '1 number returned to the pool.' : `${freed} numbers returned to the pool.`)
          this.getTwilioCallPool();
          return
        }
        this.fail('The numbers could not be hung up.')
      },
      error => this.fail(undefined, error)
    )
  }

  updateTwilioAccount(){
    var orgID: string = sessionStorage.getItem('orgID')

    this.loading = true
    this.twilioService.updateTwilioAccount(orgID).subscribe(
      result =>{
        this.notify("Twilio URLs updated.")
        this.getTwilioPhonenumbers();
      },
      error => this.fail(undefined, error)
    )
  }

  ngOnInit(){
    this.checkTwilioAccount()
    this.user = JSON.parse(sessionStorage.getItem('user'));
    this.dev = this.user.dev

    this.trustHubChecks();
  }

  return(){
    this.dialogRef.close()
  }

  getTwilioCallPool(){
    this.twilioService.getTwilioCallPool(sessionStorage.getItem('orgID')).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (callPoolNumbers: CallPoolNumber[]) => {
        this.callPoolNumbers = callPoolNumbers || []
        this.buildRows();
        this.loading = false;
      },
      error => this.fail(undefined, error)
    );
  }

  getMatchedCallPoolNumber(number: string) {
    return this.callPoolNumbers.find((callPoolNumber: CallPoolNumber) => callPoolNumber.number === number)
  }

  getMatchedTrustHubNumber(number: string) {
    return this.businessProfileNumbers.find((trustHubNumber: any) => trustHubNumber.channel_endpoint_sid === number)
  }

  getMatchedShakenNumber(number: string) {
    return this.shakenNumbers.find((shakenNumber: any) => shakenNumber.channel_endpoint_sid === number)
  }

  getMatchedTegrityNumber(number: string) {
    return this.tegrityNumbers.find((tegrityNumber: any) => tegrityNumber.channel_endpoint_sid === number)
  }

  trustHubChecks(){
    var orgID: string = sessionStorage.getItem('orgID')

    this.twilioService.trustHubChecks(orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (result: any) => {
        if (result && result.error) {
          this.businessProfileNumbers = [];
          this.shakenNumbers = [];
          this.tegrityNumbers = [];
          this.buildRows();
          return;
        }
        this.businessProfileNumbers = result?.profile_phonenumbers || [];
        this.shakenNumbers = result?.shaken_phonenumbers || [];
        this.tegrityNumbers = result?.tegrity_phonenumbers || [];
        this.buildRows();
      },
      error => this.fail(undefined, error)
    )
  }
} 
