import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

//SERVICES
import { OrganizationService } from '../../../../services/organization/organization.service'

interface OrgOption {
  _id: string;
  name: string;
  status: 'member' | 'requested' | null;
}

const MIN_SEARCH = 2
const MAX_RESULTS = 20

@Component({
    templateUrl: './requestOrg.html',
    styleUrls: ['../requestCampaign/requestCampaign.scss', './requestOrg.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
  
export class RequestOrgDialog implements OnInit{

    userID: string = ''

    orgs: OrgOption[] = []
    loading: boolean = false
    loadFailed: boolean = false

    search: string = ''
    selected: OrgOption | null = null

    sending: boolean = false
    requestError: string = ''
    errorMessage: string = ''

    sentTo: string = ''

    minSearch = MIN_SEARCH

    constructor(public dialogRef: MatDialogRef<RequestOrgDialog>,
                public orgService: OrganizationService) {}

    ngOnInit(){
      const user = JSON.parse(sessionStorage.getItem('user') || '{}')
      this.userID = user?._id || ''
      this.getAllOrgs()
    }

    getAllOrgs(){
      this.loading = true
      this.loadFailed = false
      this.errorMessage = ''

      this.orgService.getAllOrgs(this.userID).subscribe(
        (orgs: OrgOption[]) => {
          this.loading = false
          this.orgs = orgs || []
          // Keep the selection in sync with refreshed statuses
          if(this.selected) this.selected = this.orgs.find(o => o._id === this.selected._id && !o.status) || null
        },
        error => {
          console.log(error)
          this.loading = false
          this.loadFailed = true
          this.errorMessage = 'Couldn\'t load organizations.'
        }
      )
    }

    //////////////////////// SEARCH ////////////////////////

    get searching(): boolean {
      return this.search.trim().length >= MIN_SEARCH
    }

    private get allMatches(): OrgOption[] {
      if(!this.searching) return []
      const term = this.search.trim().toLowerCase()
      return this.orgs.filter(org => (org.name || '').toLowerCase().includes(term))
    }

    get results(): OrgOption[] {
      return this.allMatches.slice(0, MAX_RESULTS)
    }

    get moreCount(): number {
      return Math.max(0, this.allMatches.length - MAX_RESULTS)
    }

    onSearch(){
      this.requestError = ''
      if(this.selected && !this.results.includes(this.selected)) this.selected = null
    }

    select(org: OrgOption){
      if(org.status || this.sending) return
      this.selected = org
      this.requestError = ''
    }

    statusLabel(org: OrgOption): string {
      return org.status === 'member' ? 'Member' : org.status === 'requested' ? 'Requested' : ''
    }

    //////////////////////// SEND ////////////////////////

    sendOrgRequest(){
      if(!this.selected || this.sending) return
      const org = this.selected

      this.sending = true
      this.requestError = ''
      this.errorMessage = ''

      this.orgService.requestOrganization(this.userID, org._id).subscribe(
        (result: any) => {
          this.sending = false
          if(!result?.success){
            this.requestError = result?.msg || 'The request could not be sent.'
            return
          }
          org.status = 'requested'
          this.sentTo = result.orgName || org.name
          this.selected = null
        },
        error => {
          console.log(error)
          this.sending = false
          this.errorMessage = 'Failed to send the request due to a server error. Please try again.'
        }
      )
    }

    requestAnother(){
      this.sentTo = ''
      this.search = ''
      this.selected = null
      this.getAllOrgs()
    }

    trackOrg(index: number, org: OrgOption){ return org._id }

    closeDialog(){
      if(this.sending) return
      this.dialogRef.close()
    }
}
