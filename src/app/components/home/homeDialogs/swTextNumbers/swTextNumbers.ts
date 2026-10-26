import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, SLOW_LOAD_TIMEOUT_MS } from 'src/app/utils/loading';
import {MatDialogRef, MatDialog} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

//SERVICES
import {OrganizationService} from '../../../../services/organization/organization.service'
import {SignalWireService} from '../../../../services/signalWire.service'

//MODELS
import {User} from '../../../../models/user.model'
import { HotlineService } from 'src/app/services/hotline.service';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';
import { textAuthStatus } from 'src/app/utils/textAuthStatus';

@Component({
  templateUrl: './swTextNumbers.html',
  styleUrls: ['../../home.component.scss', '../../../../styles/dialog-common.scss', './swTextNumbers.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
  
export class SWTextNumbersDialog implements OnInit{

  displayErrorMsg: boolean = false;
  errorMessage: string = '';

  accountExists: boolean = false;

  loading: boolean = true;
  user: User;

  dev: boolean = false;

  textingCampaigns: any[] = []

  // Each texting operation keeps its own numbers, area code and status
  numbersByCampaign: {[campaignID: string]: any[]} = {}
  loadingByCampaign: {[campaignID: string]: boolean} = {}
  areaCodes: {[campaignID: string]: string} = {}
  buyErrors: {[campaignID: string]: string} = {}

  hotline_number: string;
  updatingHotline: boolean = false;

  constructor(public dialogRef: MatDialogRef<SWTextNumbersDialog>, 
              public orgService: OrganizationService, 
              public dialog: MatDialog,
              public signalWireService: SignalWireService,
              public hotlineService: HotlineService,
              private cd: ChangeDetectorRef,
              private snackBar: MatSnackBar
              ) {}

  private get orgID(): string {
    return sessionStorage.getItem('orgID')
  }

  private fail(message: string = "There was an unknown error with the server.", error?: any, campaignID?: string){
    if(error) console.log(error)
    this.errorMessage = error instanceof TimeoutError ? "The server didn't respond. Try Refresh." : message
    this.displayErrorMsg = true
    this.loading = false
    this.updatingHotline = false
    if(campaignID) this.loadingByCampaign[campaignID] = false
  }

  private notify(message: string){
    this.snackBar.open(message, 'Dismiss', {duration: 4000})
  }

  //////////////////////// ACCOUNT ////////////////////////

  checkSWAccount(){
    this.loading = true
    this.signalWireService.checkSWAccount(this.orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (result: any) =>{
        if(!result || result['name'] === "Error"){
          this.accountExists = false
          this.loading = false
          return
        }

        this.accountExists = true
        this.getOrgSWCampaigns()
      },
      error => this.fail(undefined, error)
    )
  }

  createSWAccount(){
    this.loading = true
    this.signalWireService.createSWAccount(this.orgID).subscribe(
      (result: any) =>{
        if(!result){
          this.fail("The texting account could not be created.")
          return
        }
        this.notify("Texting account created.")
        this.checkSWAccount()
      },
      error => this.fail(undefined, error)
    )
  }

  getOrgSWCampaigns(){
    this.signalWireService.getOrgSWCampaigns(this.orgID, null).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (textingCampaigns: any[]) =>{
        this.textingCampaigns = textingCampaigns || []
        this.loading = false
        this.cd.detectChanges();
        this.getHotlineStatus()
      },
      error => this.fail(undefined, error)
    )
  }

  refreshAll(){
    this.displayErrorMsg = false
    this.numbersByCampaign = {}
    this.checkSWAccount()
  }

  //////////////////////// NUMBERS ////////////////////////

  getSWCampaignPhonenumbers(campaignID: string){
    this.loadingByCampaign[campaignID] = true

    this.signalWireService.getSWCampaignPhonenumbers(campaignID, null, this.orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (phonenumbers: any[]) =>{
        this.numbersByCampaign[campaignID] = phonenumbers || []
        this.loadingByCampaign[campaignID] = false
        this.getHotlineStatus()
      },
      error => this.fail("Could not load this operation's numbers.", error, campaignID)
    )
  }

  buyPhonenumber(campaign: any){
    const campaignID = campaign.id
    const areaCode = (this.areaCodes[campaignID] || '').trim()

    if(!/^\d{3}$/.test(areaCode)){
      this.buyErrors[campaignID] = areaCode ? "Area code must be 3 digits." : "An area code is needed."
      return
    }

    this.buyErrors[campaignID] = ''
    this.loadingByCampaign[campaignID] = true

    this.signalWireService.buySWPhonenumber(areaCode, campaignID, this.orgID).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe(
      (result: any) =>{
        // Reasons the server could explain (no numbers, SignalWire refused) show next to the area code
        if(result?.errors?.length){
          this.buyErrors[campaignID] = result.errors[0].detail || "The number could not be purchased."
          this.loadingByCampaign[campaignID] = false
          return
        }
        this.areaCodes[campaignID] = ''
        this.notify(result?.number ? `Bought ${this.formatPhone(result.number)}.` : "Number purchased.")
        if(result?.warnings?.length) this.buyErrors[campaignID] = result.warnings.join(' ')
        this.getSWCampaignPhonenumbers(campaignID)
      },
      error => {
        // Shown beside the Buy button, like the other buy errors
        console.log(error)
        this.buyErrors[campaignID] = error instanceof TimeoutError
          ? "The server didn't respond. Refresh to check whether the number was bought."
          : `The number could not be purchased for area code ${areaCode}.`
        this.loadingByCampaign[campaignID] = false
      }
    )
  }

  async releasePhonenumber(campaign: any, phonenumber: any){
    if(!(await confirmAction(this.dialog, {title: `Release ${this.formatPhone(phonenumber.phone_number.number)}?`, message: "This can't be undone.", confirmLabel: 'Release', cancelLabel: 'Cancel', danger: true}))) return

    const campaignID = campaign.id
    this.loadingByCampaign[campaignID] = true

    this.signalWireService.releaseSWPhonenumber(phonenumber.phone_number.id, this.orgID, phonenumber.phone_number.number).subscribe(
      (result: any) =>{
        // SignalWire answers a failed release with {errors: [...]}; success has no body
        if(result?.errors?.length){
          this.fail(result.errors[0].detail || "The number could not be released.", undefined, campaignID)
          return
        }
        this.notify("Number released.")
        this.getSWCampaignPhonenumbers(campaignID)
      },
      error => this.fail(undefined, error, campaignID)
    )
  }

  // Takes the number off this operation without releasing it; it stays in the account and calling pool
  async removeFromOperation(campaign: any, phonenumber: any){
    if(!(await confirmAction(this.dialog, {title: `Remove ${this.formatPhone(phonenumber.phone_number.number)} from ${campaign.name}?`, message: "It stays in the calling pool but can't text until it's assigned again.", confirmLabel: 'Remove', cancelLabel: 'Cancel'}))) return

    const campaignID = campaign.id
    this.loadingByCampaign[campaignID] = true

    this.signalWireService.removeSWCampaignAssignment(phonenumber.id, this.orgID).subscribe(
      (result: any) =>{
        if(!result?.success){
          this.fail(result?.errors?.[0]?.detail || "The number could not be removed from this operation.", undefined, campaignID)
          return
        }
        this.notify("Number removed from the operation.")
        this.getSWCampaignPhonenumbers(campaignID)
      },
      error => this.fail(undefined, error, campaignID)
    )
  }

  updateSWUrls(campaign: any){
    const numbers = this.numbersByCampaign[campaign.id] || []
    if(!numbers.length) return

    this.loadingByCampaign[campaign.id] = true

    const updates = numbers.map(phonenumber => {
      phonenumber.orgID = this.orgID
      return this.signalWireService.updateSWPhonenumber(phonenumber)
    })

    forkJoin(updates).subscribe(
      () =>{
        this.loadingByCampaign[campaign.id] = false
        this.notify(`SignalWire URLs updated for ${numbers.length} ${numbers.length === 1 ? 'number' : 'numbers'}.`)
      },
      error => this.fail("Some numbers could not be updated.", error, campaign.id)
    )
  }

  //////////////////////// HOTLINE ////////////////////////

  isHotline(phonenumber: any): boolean {
    return !!this.hotline_number && this.hotline_number === phonenumber.phone_number.number
  }

  // Only one hotline number at a time: others can't be enabled while one is set
  canSetHotline(phonenumber: any): boolean {
    return !this.hotline_number || this.isHotline(phonenumber)
  }

  setHotline(phonenumber: any, enabled: boolean){
    if(enabled && !this.canSetHotline(phonenumber)) return

    this.updatingHotline = true
    this.hotlineService.enableHotlinePhonenumber(phonenumber, enabled).subscribe(
      () =>{
        this.updatingHotline = false
        this.notify(enabled ? "Hotline number set." : "Hotline number removed.")
        this.getHotlineStatus()
      },
      error => this.fail("The hotline could not be updated.", error)
    )
  }

  getHotlineStatus(){
    this.hotlineService.getHotlineStatus(this.orgID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (hotline_number: any) =>{
        this.hotline_number = hotline_number ? hotline_number.number : null
      },
      error => console.log(error)
    )
  }

  //////////////////////// DISPLAY ////////////////////////

  get summary(){
    const loaded = Object.values(this.numbersByCampaign)
    return {
      operations: this.textingCampaigns.length,
      numbers: loaded.reduce((sum, numbers) => sum + numbers.length, 0),
      anyLoaded: loaded.length > 0,
    }
  }

  formatPhone(number: string): string {
    const digits = (number || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
    if(digits.length !== 10) return number || ''
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  authStatus = textAuthStatus

  trackNumber(index: number, phonenumber: any){ return phonenumber?.phone_number?.id || index }

  return(){
    this.dialogRef.close()
  }

  ngOnInit(){
    this.user = JSON.parse(sessionStorage.getItem('user'));
    this.dev = !!this.user?.dev
    this.checkSWAccount()
  }

}
