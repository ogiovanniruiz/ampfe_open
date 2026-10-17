import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

//SERVICES
import { CampaignService } from '../../../../services/campaign.service';
import { OrganizationService } from 'src/app/services/organization/organization.service';

//MODELS
import { UpdatedCampaign } from '../../../../models/campaign.model';
import { User } from '../../../../models/user.model'

import { ELECTION_TYPES, buildElectionYears, filterDistricts } from '../editCampaign/campaignFormUtils';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
  templateUrl: './createCampaign.html',
  styleUrls: ['../editCampaign/editCampaignDialog.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class CreateCampaignDialog implements OnInit{

  state = 'California'
  districtTypes = this.campaignService.getDistrictTypes()
  electionTypes = ELECTION_TYPES
  electionYears = buildElectionYears()

  orgID: string
  currentUser: User

  // Form
  name: string = ''
  description: string = ''
  dataManagerIDs: string[] = []
  districtType: string = ''
  boundaryIDs: string[] = []
  electionType: string = ''
  electionYear: string = String(new Date().getFullYear())
  geographical: boolean = false
  fundedByCreatorOrg: boolean = true
  textingFundedByCreatorOrg: boolean = true

  admins: User[] = []
  loadingAdmins: boolean = false

  districts: any[] = []
  districtSearch: string = ''
  loadingDistricts: boolean = false
  private districtToken = 0

  creating: boolean = false
  errorMessage: string = ''
  nameError: string = ''

  constructor(public dialogRef: MatDialogRef<CreateCampaignDialog>,
              public campaignService: CampaignService,
              public orgService: OrganizationService,
              private dialog: MatDialog,
              private snackBar: MatSnackBar,
              ) {}

  ngOnInit(){
    this.orgID = sessionStorage.getItem('orgID')
    this.currentUser = JSON.parse(sessionStorage.getItem('user') || '{}')
    this.dataManagerIDs = this.currentUser?._id ? [this.currentUser._id] : []
    this.getApprovedUsers()
  }

  //////////////////////// LOAD ////////////////////////

  // Owners and administrators of this org can be data managers
  getApprovedUsers(){
    this.loadingAdmins = true
    this.orgService.getOrgUsers(this.orgID).subscribe(
      (users: User[]) => {
        this.loadingAdmins = false
        this.admins = (users || []).filter(user => (user.orgPermissions || []).some(p =>
          p.orgID === this.orgID && (p.level === 'ADMINISTRATOR' || p.level === 'OWNER')))
      },
      error => {
        console.log(error)
        this.loadingAdmins = false
        this.errorMessage = 'Couldn\'t load your organization\'s administrators.'
      }
    )
  }

  // You're always selectable, even as a developer outside the org's admins
  get managerOptions(): User[] {
    const options = [...this.admins]
    if(this.currentUser?._id && !options.some(u => u._id === this.currentUser._id)) options.unshift(this.currentUser)
    return options
  }

  onDistrictTypeChange(){
    this.boundaryIDs = []
    this.districtSearch = ''
    this.getDistricts()
  }

  getDistricts(){
    if(!this.districtType) return
    const token = ++this.districtToken
    this.loadingDistricts = true
    this.districts = []

    this.campaignService.getDistrictProperties(this.state, this.districtType).subscribe(
      (districts: any[]) => {
        if(token !== this.districtToken) return
        this.districts = districts || []
        this.loadingDistricts = false
      },
      error => {
        console.log(error)
        if(token !== this.districtToken) return
        this.loadingDistricts = false
        this.errorMessage = 'Couldn\'t load districts for that type.'
      }
    )
  }

  get filteredDistricts(): any[] {
    return filterDistricts(this.districts, this.districtSearch, this.boundaryIDs)
  }

  //////////////////////// CREATE ////////////////////////

  get validationError(): string {
    if(!this.name.trim()) return 'Give the campaign a name.'
    if(!this.dataManagerIDs.length) return 'Choose at least one data manager.'
    if(!this.districtType) return 'Choose a district type.'
    if(!this.boundaryIDs.length) return 'Choose at least one district.'
    if(!this.electionType) return 'Choose an election type.'
    if(!this.electionYear) return 'Choose an election year.'
    return ''
  }

  get hasInput(): boolean {
    return !!(this.name.trim() || this.description.trim() || this.districtType || this.electionType)
  }

  createCampaign(){
    if(this.creating) return
    if(this.validationError){
      this.errorMessage = this.validationError
      return
    }

    const campaignDetail = {
      name: this.name.trim(),
      description: this.description.trim(),
      orgIDs: [this.orgID],
      dataManagers: this.dataManagerIDs,
      boundaryIDs: this.boundaryIDs,
      electionType: this.electionType,
      electionYear: this.electionYear,
      fundedByCreatorOrg: this.fundedByCreatorOrg,
      textingFundedByCreatorOrg: this.textingFundedByCreatorOrg,
      creatorOrg: this.orgID,
      geographical: this.geographical,
    }

    this.creating = true
    this.errorMessage = ''
    this.nameError = ''

    this.campaignService.createCampaign(campaignDetail).subscribe(
      (results: UpdatedCampaign) => {
        this.creating = false
        if(results?.success){
          this.snackBar.open(`Campaign "${campaignDetail.name}" created.`, 'Dismiss', {duration: 3000})
          this.dialogRef.close(results)
          return
        }
        const msg = results?.msg || 'The campaign could not be created.'
        if(/name/i.test(msg)) this.nameError = msg
        else this.errorMessage = msg
      },
      error => {
        console.log(error)
        this.creating = false
        this.errorMessage = 'There was a problem with the server. Please try again.'
      }
    )
  }

  async closeDialog(){
    if(this.creating) return
    if(this.hasInput && !(await confirmAction(this.dialog, {title: 'Discard this new campaign?', message: 'Its details will be lost.', danger: true}))) return
    this.dialogRef.close()
  }
}
