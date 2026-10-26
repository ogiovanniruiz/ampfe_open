import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

//SERVICES
import {OrganizationService, OrgServiceAccount} from '../../../../services/organization/organization.service'

//MODELS
import {Organization, UpdatedOrg} from '../../../../models/organization.model'
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

export const SUBSCRIPTIONS = [
  {value: 'FREE', label: 'Free'},
  {value: 'LITE', label: 'Lite'},
  {value: 'CORE', label: 'Core'},
  {value: 'PLUS', label: 'Plus'},
]

export const CALLING_SERVICES = [
  {value: 'signalwire', label: 'SignalWire'},
  {value: 'twilio', label: 'Twilio'},
]

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const LOGO_MAX_BYTES = 2000000
const KEY_MAX_BYTES = 20000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

@Component({
    templateUrl: './editOrgDialog.html',
    styleUrls: ['./editOrgDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
  
export class EditOrgDialog implements OnInit{

  org: Organization
  dev: boolean = false

  subscriptions = SUBSCRIPTIONS
  callingServices = CALLING_SERVICES

  name: string = ''
  description: string = ''
  contactEmail: string = ''
  subscription: string = 'FREE'
  callingService: string = 'signalwire'
  brandID: string = ''

  saving: boolean = false
  errorMessage: string = ''
  nameError: string = ''

  // Logo
  currentLogo: SafeUrl | null = null
  selectedFile: File | null = null
  previewUrl: SafeUrl | null = null
  private previewObjectUrl: string = ''
  logoError: string = ''
  uploading: boolean = false
  logoChanged: boolean = false

  // Google service account key (Sheets and BigQuery syncs). Only its email and project come back from the server
  serviceAccount: OrgServiceAccount | null = null
  loadingServiceAccount: boolean = false
  selectedKeyFile: File | null = null
  selectedKeyEmail: string = ''
  keyError: string = ''
  keyUploading: boolean = false
  keyDragOver: boolean = false

  // Something was saved; Home reloads the org
  orgChanged: boolean = false

  private snapshot: string = ''

  constructor(public dialogRef: MatDialogRef<EditOrgDialog>,
            // {org, logo, dev} (older callers pass the org)
            @Inject(MAT_DIALOG_DATA) public data: any,
            public orgService: OrganizationService,
            private snackBar: MatSnackBar,
            private sanitizer: DomSanitizer,
            private dialog: MatDialog
            ) {}

  ngOnInit(){
    this.org = this.data?.org || this.data
    this.currentLogo = this.data?.logo || null

    const user = JSON.parse(sessionStorage.getItem('user') || '{}')
    this.dev = typeof this.data?.dev === 'boolean' ? this.data.dev : !!user?.dev

    this.loadForm()
    this.getServiceAccount()
  }

  private loadForm(){
    this.name = this.org.name || ''
    this.description = this.org.description || ''
    this.contactEmail = this.org.contactEmail || ''
    this.subscription = this.org.subscription || 'FREE'
    this.callingService = this.org.callingService || 'signalwire'
    this.brandID = this.org.signalWireAccount?.brandID || ''
    this.snapshot = this.serialize()
  }

  //////////////////////// DISPLAY ////////////////////////

  label(list: {value: string, label: string}[], value: string): string {
    return list.find(item => item.value === value)?.label || value || '—'
  }

  //////////////////////// SAVE ////////////////////////

  private serialize(): string {
    return JSON.stringify([this.name.trim(), this.description.trim(), this.contactEmail.trim(), this.subscription, this.callingService, this.brandID.trim()])
  }

  get hasChanges(): boolean {
    return this.serialize() !== this.snapshot
  }

  get emailError(): string {
    const email = this.contactEmail.trim()
    return email && !EMAIL_PATTERN.test(email) ? 'Enter a valid email address.' : ''
  }

  get formValid(): boolean {
    return !!this.name.trim() && !this.emailError
  }

  get busy(): boolean {
    return this.saving || this.uploading || this.keyUploading
  }

  save(){
    if(this.busy || !this.hasChanges) return
    if(!this.name.trim()){
      this.nameError = 'Organization needs a name.'
      return
    }
    if(this.emailError) return

    // Plan and calling service are managed by developers; others resend what's saved
    const platform = this.dev
      ? {subscription: this.subscription, callingService: this.callingService, brandID: this.brandID.trim()}
      : {subscription: this.org.subscription, callingService: this.org.callingService, brandID: this.org.signalWireAccount?.brandID || ''}

    this.send({
      command: 'edit',
      name: this.name.trim(),
      description: this.description.trim(),
      contactEmail: this.contactEmail.trim(),
      ...platform,
    }, 'Organization saved.')
  }

  async setActive(active: boolean){
    if(this.busy) return
    if(!active && !(await confirmAction(this.dialog, {title: `Deactivate "${this.org.name}"?`, message: "Its members won't be able to use it until it's reactivated.", confirmLabel: 'Deactivate', cancelLabel: 'Cancel', danger: true}))) return
    if(active && !(await confirmAction(this.dialog, {title: `Reactivate "${this.org.name}"?`, confirmLabel: 'Reactivate', cancelLabel: 'Cancel'}))) return

    this.send({command: active ? 'activate' : 'deactivate'}, active ? 'Organization activated.' : 'Organization deactivated.')
  }

  private send(payload: any, successMessage: string){
    this.saving = true
    this.errorMessage = ''
    this.nameError = ''

    this.orgService.editOrganization({orgID: this.org._id, ...payload}).subscribe(
      (result: UpdatedOrg) => {
        this.saving = false
        if(!result?.success){
          const msg = result?.msg || 'The organization could not be saved.'
          if(/name/i.test(msg)) this.nameError = msg
          else this.errorMessage = msg
          return
        }

        this.org = result['org'] || this.org
        this.loadForm()
        this.orgChanged = true
        this.snackBar.open(successMessage, 'Dismiss', {duration: 2500})
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'A problem with the server prevented the update. Please try again.'
      })
  }

  //////////////////////// LOGO ////////////////////////

  onFileChanged(event: Event){
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if(!file) return

    this.logoError = ''
    if(!LOGO_TYPES.includes(file.type)){
      this.logoError = 'Choose a PNG, JPEG or WebP image.'
      return
    }
    if(file.size > LOGO_MAX_BYTES){
      this.logoError = 'That image is larger than 2 MB.'
      return
    }

    this.clearSelection()
    this.selectedFile = file
    this.previewObjectUrl = URL.createObjectURL(file)
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(this.previewObjectUrl)
  }

  clearSelection(){
    if(this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl)
    this.previewObjectUrl = ''
    this.previewUrl = null
    this.selectedFile = null
  }

  uploadLogo(){
    if(!this.selectedFile || this.busy) return

    const uploadData = new FormData()
    uploadData.append(this.org._id, this.selectedFile)

    this.uploading = true
    this.logoError = ''

    this.orgService.uploadLogo(uploadData).subscribe(
      (result: any) => {
        this.uploading = false
        if(!result?.success){
          this.logoError = result?.msg || 'The logo could not be uploaded.'
          return
        }
        // Keep showing the new image as the current logo
        this.currentLogo = this.previewUrl
        this.previewUrl = null
        this.previewObjectUrl = ''
        this.selectedFile = null
        this.logoChanged = true
        this.snackBar.open('Logo updated.', 'Dismiss', {duration: 2500})
      },
      error => {
        console.log(error)
        this.uploading = false
        this.logoError = 'A problem with the server prevented the upload. Please try again.'
      })
  }

  //////////////////////// SERVICE ACCOUNT ////////////////////////

  private getServiceAccount(){
    this.loadingServiceAccount = true
    this.orgService.getOrgServiceAccount(this.org._id).subscribe(
      account => {
        this.loadingServiceAccount = false
        this.serviceAccount = account?.clientEmail ? account : null
      },
      error => {
        console.log(error)
        this.loadingServiceAccount = false
        this.keyError = 'Could not load the service account.'
      })
  }

  onKeyFileChanged(event: Event){
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if(file) this.selectKeyFile(file)
  }

  onKeyDragOver(event: DragEvent){
    event.preventDefault()
    if(!this.busy) this.keyDragOver = true
  }

  onKeyDrop(event: DragEvent){
    event.preventDefault()
    this.keyDragOver = false
    const file = event.dataTransfer?.files?.[0]
    if(file && !this.busy) this.selectKeyFile(file)
  }

  // Checks the file looks like a service account key before it's sent; the server checks again
  private async selectKeyFile(file: File){
    this.keyError = ''
    if(file.size > KEY_MAX_BYTES){
      this.keyError = "That file is too large to be a service account key."
      return
    }

    let key: any
    try {
      key = JSON.parse(await file.text())
    } catch(e) {
      this.keyError = "That file isn't a JSON key file."
      return
    }
    if(key?.type !== 'service_account' || !key.private_key || !key.client_email || !key.project_id){
      this.keyError = "That file isn't a Google service account key."
      return
    }

    this.selectedKeyFile = file
    this.selectedKeyEmail = key.client_email
  }

  clearKeySelection(){
    this.selectedKeyFile = null
    this.selectedKeyEmail = ''
  }

  uploadServiceAccount(){
    if(!this.selectedKeyFile || this.busy) return

    const uploadData = new FormData()
    uploadData.append(this.org._id, this.selectedKeyFile)

    this.keyUploading = true
    this.keyError = ''

    this.orgService.uploadServiceAccount(uploadData).subscribe(
      (result: any) => {
        this.keyUploading = false
        if(!result?.success){
          this.keyError = result?.msg || 'The key could not be uploaded.'
          return
        }
        this.serviceAccount = result.serviceAccount
        this.clearKeySelection()
        this.snackBar.open('Service account key uploaded.', 'Dismiss', {duration: 2500})
      },
      error => {
        console.log(error)
        this.keyUploading = false
        this.keyError = 'A problem with the server prevented the upload. Please try again.'
      })
  }

  async removeServiceAccount(){
    if(!this.serviceAccount || this.busy) return
    if(!(await confirmAction(this.dialog, {title: 'Remove the service account key?', message: "Google Sheets and BigQuery syncs for this organization will stop working until a new key is uploaded.", confirmLabel: 'Remove', cancelLabel: 'Cancel', danger: true}))) return

    this.keyUploading = true
    this.keyError = ''

    this.orgService.removeServiceAccount(this.org._id).subscribe(
      (result: any) => {
        this.keyUploading = false
        if(!result?.success){
          this.keyError = result?.msg || 'The key could not be removed.'
          return
        }
        this.serviceAccount = null
        this.snackBar.open('Service account key removed.', 'Dismiss', {duration: 2500})
      },
      error => {
        console.log(error)
        this.keyUploading = false
        this.keyError = 'A problem with the server prevented the removal. Please try again.'
      })
  }

  copyServiceAccountEmail(){
    navigator.clipboard?.writeText(this.serviceAccount?.clientEmail || '').then(
      () => this.snackBar.open('Email copied.', 'Dismiss', {duration: 2500}),
      () => this.snackBar.open('Could not copy the email.', 'Dismiss', {duration: 2500})
    )
  }

  //////////////////////// CLOSE ////////////////////////

  copyID(){
    navigator.clipboard?.writeText(this.org._id).then(
      () => this.snackBar.open('Organization ID copied.', 'Dismiss', {duration: 2500}),
      () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
    )
  }

  async close(){
    if(this.busy) return
    if((this.hasChanges || this.selectedFile || this.selectedKeyFile) && !(await confirmAction(this.dialog, {title: 'Discard unsaved changes?', message: 'Your edits to this organization will be lost.', danger: true}))) return
    this.clearSelection()
    const changed = this.orgChanged || this.logoChanged
    this.dialogRef.close(changed ? {org: this.orgChanged ? this.org : null, logoChanged: this.logoChanged} : null)
  }
}
