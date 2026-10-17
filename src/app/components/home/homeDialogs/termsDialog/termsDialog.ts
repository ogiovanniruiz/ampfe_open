import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

//SERVICES
import {OrganizationService, OrgTermsStatus} from '../../../../services/organization/organization.service'
import {UserService} from '../../../../services/user.service'

//MODELS
import {Organization} from '../../../../models/organization.model'
import {User, UserAgreement} from '../../../../models/user.model'

export interface Terms {
  html: string | null;
  url: string;
  version: string;
}

export interface TermsDialogData {
  org: Organization;
  terms?: Terms;
  // Opened automatically on login because the user hasn't accepted the current version
  required: boolean;
  // Whether an owner has accepted for the org; loaded here when not passed
  status?: OrgTermsStatus | null;
}

@Component({
  templateUrl: './termsDialog.html',
  styleUrls: ['./termsDialog.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class TermsDialog implements OnInit{

  org: Organization;
  required: boolean = false;

  agreeChecked: boolean = false;
  // Pricing list; hidden until pricing is shown in the app again
  canSeeCost: boolean = false;

  terms: Terms = null;
  loadingTerms: boolean = false;
  termsError: boolean = false;

  // The user's agreement for the current version, if they've accepted it
  currentAgreement: UserAgreement = null;

  // One owner accepts on behalf of the whole organization
  status: OrgTermsStatus | null = null;
  loadingStatus: boolean = false;
  statusError: boolean = false;

  submitting: boolean = false;
  submitError: string = '';

  constructor(
    public dialogRef: MatDialogRef<TermsDialog>,
    public orgService: OrganizationService,
    public userService: UserService,
    @Inject(MAT_DIALOG_DATA) public data: TermsDialogData) {
      this.org = data.org
      this.required = data.required
    }

  ngOnInit(){
    if(this.data.terms){
      this.setTerms(this.data.terms)
    }else{
      this.getTerms()
    }

    if(this.data.status) this.status = this.data.status
    else this.getStatus()
  }

  getStatus(){
    this.loadingStatus = true
    this.statusError = false
    this.orgService.getOrgTermsStatus(this.org._id).subscribe(
      (status: OrgTermsStatus) => {
        this.status = status
        this.loadingStatus = false
      },
      error => {
        console.log(error)
        this.statusError = true
        this.loadingStatus = false
      }
    )
  }

  get isOwner(): boolean {
    return !!this.user?.orgPermissions?.some(p => p.orgID === this.org._id && p.level === 'OWNER')
  }

  get orgAccepted(): boolean {
    return !!this.status?.accepted
  }

  get acceptedByMe(): boolean {
    return !!this.status?.acceptedBy && this.status.acceptedBy.userID === this.user?._id
  }

  // Only an owner can accept, and only while no owner has
  get canAccept(): boolean {
    return this.isOwner && !!this.status && !this.orgAccepted
  }

  get ownerList(): string {
    return (this.status?.ownerNames || []).join(', ')
  }

  private get user(): User | null {
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  }

  get termsUrl(): string {
    return this.terms?.url || ''
  }

  getTerms(){
    this.loadingTerms = true
    this.termsError = false
    this.orgService.getTerms().subscribe(
      (terms: Terms) => {
        this.setTerms(terms)
        this.loadingTerms = false
      },
      error => {
        console.log(error)
        this.termsError = true
        this.loadingTerms = false
      }
    )
  }

  setTerms(terms: Terms){
    this.terms = terms
    this.termsError = !terms?.html

    // Agreements are per organization: only one made for this org counts here
    this.currentAgreement = this.user?.userAgreements?.find(agreement => agreement.version === terms?.version && agreement.orgID === this.org._id) ?? null
    this.agreeChecked = !!this.currentAgreement
  }

  submitAgreement(){
    const user = this.user
    if(!user || !this.agreeChecked || !this.canAccept || this.submitting) return

    this.submitting = true
    this.submitError = ''

    // The server records its own current version for this user and org; the dialog only closes once it's saved
    this.userService.submitAgreement({user, orgID: this.org._id}).subscribe(
      (result: any) => {
        this.submitting = false
        if(!result?.user){
          this.submitError = result?.msg || 'Couldn\'t save the agreement. Please try again.'
          return
        }
        this.dialogRef.close({user: result.user})
      },
      error => {
        console.log(error)
        this.submitting = false
        this.submitError = 'Couldn\'t save the agreement. Please try again.'
      }
    )
  }

  // Required mode only holds an owner who still has to accept; anyone else can close
  close(){
    if((this.required && this.canAccept) || this.submitting) return
    this.dialogRef.close()
  }
}
