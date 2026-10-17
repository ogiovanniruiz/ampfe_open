import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

//SERVICES
import { OrganizationService } from '../../../../services/organization/organization.service'

//MODELS
import { Organization, UpdatedOrg } from '../../../../models/organization.model'

import { SUBSCRIPTIONS, CALLING_SERVICES } from '../editOrganization/editOrgDialog';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Developer-only (Home's developer menu)
@Component({
    templateUrl: './createOrg.html',
    styleUrls: ['../editOrganization/editOrgDialog.scss', './createOrg.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
  
export class CreateOrgDialog {

    subscriptions = SUBSCRIPTIONS
    callingServices = CALLING_SERVICES

    name: string = ''
    description: string = ''
    contactEmail: string = ''
    subscription: string = 'FREE'
    callingService: string = 'signalwire'

    creating: boolean = false
    errorMessage: string = ''
    nameError: string = ''

    // Organizations created in this session; Home reloads when there are any
    created: Organization[] = []
    // false after a create, until "Create another"
    showForm: boolean = true

    constructor(public dialogRef: MatDialogRef<CreateOrgDialog>,
                public orgService: OrganizationService,
                private snackBar: MatSnackBar,
                private dialog: MatDialog) {}

    get lastCreated(): Organization | null {
      return this.created[this.created.length - 1] || null
    }

    get emailError(): string {
      const email = this.contactEmail.trim()
      return email && !EMAIL_PATTERN.test(email) ? 'Enter a valid email address.' : ''
    }

    get formValid(): boolean {
      return !!this.name.trim() && !this.emailError
    }

    get hasInput(): boolean {
      return !!(this.name.trim() || this.description.trim() || this.contactEmail.trim())
    }

    label(list: {value: string, label: string}[], value: string): string {
      return list.find(item => item.value === value)?.label || value
    }

    createOrganization(){
      if(this.creating) return
      if(!this.name.trim()){
        this.nameError = 'Organization needs a name.'
        return
      }
      if(this.emailError) return

      this.creating = true
      this.errorMessage = ''
      this.nameError = ''

      this.orgService.createOrganization({
        name: this.name.trim(),
        description: this.description.trim(),
        contactEmail: this.contactEmail.trim(),
        subscription: this.subscription,
        callingService: this.callingService,
      }).subscribe(
        (results: UpdatedOrg) => {
          this.creating = false
          if(!results?.success){
            const msg = results?.msg || 'The organization could not be created.'
            if(/name/i.test(msg)) this.nameError = msg
            else this.errorMessage = msg
            return
          }
          this.created.push(results.org)
          this.showForm = false
        },
        error => {
          console.log(error)
          this.creating = false
          this.errorMessage = 'A problem with the server prevented creating the organization. Please try again.'
        }
      )
    }

    copyID(org: Organization){
      navigator.clipboard?.writeText(org._id).then(
        () => this.snackBar.open('Organization ID copied.', 'Dismiss', {duration: 2500}),
        () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
      )
    }

    createAnother(){
      this.name = ''
      this.description = ''
      this.contactEmail = ''
      this.subscription = 'FREE'
      this.callingService = 'signalwire'
      this.nameError = ''
      this.errorMessage = ''
      this.showForm = true
    }

    async closeDialog(){
      if(this.creating) return
      if(this.showForm && this.hasInput && !(await confirmAction(this.dialog, {title: 'Discard this new organization?', message: 'Its details will be lost.', danger: true}))) return
      this.dialogRef.close(this.created.length ? {success: true, org: this.lastCreated} : undefined)
    }
}
