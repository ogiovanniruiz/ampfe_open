import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

//SERVICES
import {CampaignService} from '../../../../services/campaign.service';
import {OrganizationService} from '../../../../services/organization/organization.service';
import {GroupService} from '../../../../services/group.service';

//MODELS
import { Organization } from '../../../../models/organization.model';
import { Campaign } from 'src/app/models/campaign.model';
import { Group } from 'src/app/models/group.model';

import { ELECTION_TYPES, buildElectionYears, matchDistrictType, filterDistricts } from './campaignFormUtils';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    templateUrl: './editCampaignDialog.html',
    styleUrls: ['./editCampaignDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class EditCampaignDialog implements OnInit{

  // Working copy; the caller's campaign is left alone until Home reloads
  campaign: Campaign

  state = 'California'
  districtTypes = this.campaignService.getDistrictTypes()
  electionTypes = ELECTION_TYPES
  electionYears: string[] = []

  dev: boolean = false

  // Form
  name: string = ''
  description: string = ''
  districtType: string = ''
  boundaryIDs: string[] = []
  electionType: string = ''
  electionYear: string = ''
  geographical: boolean = false
  fundedByCreatorOrg: boolean = false
  textingFundedByCreatorOrg: boolean = false
  sleep: boolean = false
  showNearestPollingLocations: boolean = false
  showPartisan: boolean = false

  // Loaded data
  campaignBoundary: any[] = []
  groupCount: number = 0
  creatorOrgName: string = ''

  districts: any[] = []
  districtSearch: string = ''
  loadingDistricts: boolean = false
  private districtToken = 0

  loading: boolean = true
  loadFailed: boolean = false
  saving: boolean = false
  errorMessage: string = ''
  nameError: string = ''

  // Something was saved; Home reloads campaigns
  changed: boolean = false

  private snapshot: string = ''

  constructor(public dialogRef: MatDialogRef<EditCampaignDialog>,
            @Inject(MAT_DIALOG_DATA) public data: Campaign,
            public campaignService: CampaignService,
            public groupService: GroupService,
            public orgService: OrganizationService,
            private snackBar: MatSnackBar,
            private dialog: MatDialog
          ) {}

  ngOnInit(){
    this.campaign = {...this.data}
    const user = JSON.parse(sessionStorage.getItem('user') || '{}')
    this.dev = !!user?.dev
    this.electionYears = buildElectionYears(this.campaign.electionYear)
    this.loadForm()
    this.load()
  }

  private loadForm(){
    this.name = this.campaign.name || ''
    this.description = this.campaign.description || ''
    this.electionType = this.campaign.electionType || ''
    this.electionYear = this.campaign.electionYear ? String(this.campaign.electionYear) : ''
    this.geographical = !!this.campaign.geographical
    this.fundedByCreatorOrg = !!this.campaign.fundedByCreatorOrg
    this.textingFundedByCreatorOrg = !!this.campaign.textingFundedByCreatorOrg
    this.sleep = !!this.campaign.sleep
    this.showNearestPollingLocations = !!this.campaign.showNearestPollingLocations
    this.showPartisan = !!this.campaign.showPartisan
    this.boundaryIDs = this.campaignBoundary.map(b => b.properties.identifier)
    this.districtType = matchDistrictType(this.districtTypes, this.campaignBoundary[0]?.properties?.districtType)
  }

  //////////////////////// LOAD ////////////////////////

  load(){
    this.loading = true
    this.loadFailed = false
    this.errorMessage = ''

    forkJoin({
      boundary: this.campaignService.getCampaignBoundary(this.campaign.campaignID),
      groups: this.groupService.getAllCampaignGroups(this.campaign.campaignID),
      org: this.orgService.getOrganization(this.campaign.creatorOrg),
    }).subscribe(
      ({boundary, groups, org}) => {
        this.campaignBoundary = (boundary as any[]) || []
        this.groupCount = ((groups as Group[]) || []).length
        this.creatorOrgName = (org as Organization)?.name || ''

        this.loadForm()
        this.snapshot = this.serialize()
        this.loading = false

        if(this.districtEditable && this.districtType) this.getDistricts(false)
      },
      error => {
        console.log(error)
        this.loading = false
        this.loadFailed = true
        this.errorMessage = 'Couldn\'t load this campaign\'s details.'
      }
    )
  }

  onDistrictTypeChange(){
    this.boundaryIDs = []
    this.getDistricts(true)
  }

  getDistricts(clearSearch: boolean){
    if(!this.districtType) return
    const token = ++this.districtToken
    if(clearSearch) this.districtSearch = ''
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

  //////////////////////// DISPLAY ////////////////////////

  // Changing the district changes who's in existing groups, so it locks once groups exist
  get districtEditable(): boolean {
    return this.groupCount === 0 || this.dev
  }

  districtTypeLabel(): string {
    const stored = this.campaignBoundary[0]?.properties?.districtType
    return this.districtTypes.find(t => t.name === matchDistrictType(this.districtTypes, stored))?.label || stored || '—'
  }

  fundedLabel(value: boolean): string {
    return value ? 'Creator organization' : 'Each organization funds itself'
  }

  //////////////////////// SAVE ////////////////////////

  private serialize(): string {
    return JSON.stringify([
      this.name.trim(), this.description.trim(), this.districtType, [...this.boundaryIDs].sort(),
      this.electionType, this.electionYear, this.geographical, this.fundedByCreatorOrg, this.textingFundedByCreatorOrg,
      this.sleep, this.showNearestPollingLocations, this.showPartisan,
    ])
  }

  get hasChanges(): boolean {
    return !this.loading && !this.loadFailed && this.serialize() !== this.snapshot
  }

  get validationError(): string {
    if(!this.name.trim()) return 'Campaign needs a name.'
    if(this.districtEditable){
      if(!this.districtType) return 'Choose a district type.'
      if(!this.boundaryIDs.length) return 'Choose at least one district.'
      if(!this.electionType) return 'Choose an election type.'
      if(!this.electionYear) return 'Choose an election year.'
    }
    return ''
  }

  get busy(): boolean {
    return this.saving || this.loading
  }

  save(){
    if(this.busy || !this.hasChanges) return
    if(this.validationError){
      this.errorMessage = this.validationError
      return
    }

    let editData: any = {
      sleep: this.sleep,
      showNearestPollingLocations: this.showNearestPollingLocations,
      showPartisan: this.showPartisan,
    }
    if(this.districtEditable){
      editData = {
        ...editData,
        boundaryType: 'DISTRICT',
        boundaryID: this.boundaryIDs,
        editElectionType: this.electionType,
        geographical: this.geographical,
        fundedByCreatorOrg: this.fundedByCreatorOrg,
        textingFundedByCreatorOrg: this.textingFundedByCreatorOrg,
        electionYear: this.electionYear,
      }
    }

    this.send('edit', this.name.trim(), this.description.trim(), editData, () => {
      const boundaryChanged = this.districtEditable && JSON.stringify([...this.boundaryIDs].sort()) !== JSON.stringify(this.campaignBoundary.map(b => b.properties.identifier).sort())
      Object.assign(this.campaign, {
        name: this.name.trim(), description: this.description.trim(),
        sleep: this.sleep, showNearestPollingLocations: this.showNearestPollingLocations, showPartisan: this.showPartisan,
      })
      if(this.districtEditable){
        Object.assign(this.campaign, {
          boundaryIDs: this.boundaryIDs, electionType: this.electionType, electionYear: this.electionYear,
          geographical: this.geographical, fundedByCreatorOrg: this.fundedByCreatorOrg, textingFundedByCreatorOrg: this.textingFundedByCreatorOrg,
        })
      }
      this.snackBar.open('Campaign saved.', 'Dismiss', {duration: 2500})
      // The read-only summary shows the saved boundary, so reload it after a district change
      if(boundaryChanged) this.load()
      else this.snapshot = this.serialize()
    })
  }

  async setActive(active: boolean){
    if(this.busy) return
    const question = active
      ? {title: `Reactivate "${this.campaign.name}"?`, confirmLabel: 'Reactivate', cancelLabel: 'Cancel'}
      : {title: `Deactivate "${this.campaign.name}"?`, message: "Members won't see it on their home page until it's reactivated.", confirmLabel: 'Deactivate', cancelLabel: 'Cancel', danger: true}
    if(!(await confirmAction(this.dialog, question))) return

    this.send(active ? 'activate' : 'deactivate', this.campaign.name, this.campaign.description, {}, () => {
      this.campaign.active = active
      this.snackBar.open(active ? 'Campaign activated.' : 'Campaign deactivated.', 'Dismiss', {duration: 2500})
    })
  }

  private send(command: string, name: string, description: string, editData: any, onSuccess: () => void){
    this.saving = true
    this.errorMessage = ''
    this.nameError = ''

    this.campaignService.editCampaign(name, description, editData, this.campaign.campaignID, command).subscribe(
      (result: any) => {
        this.saving = false
        if(!result?.success){
          const msg = result?.msg || 'The campaign could not be saved.'
          if(/name/i.test(msg)) this.nameError = msg
          else this.errorMessage = msg
          return
        }
        this.changed = true
        onSuccess()
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'A problem with the server prevented the update. Please try again.'
      })
  }

  async deleteCampaign(){
    if(this.busy || this.campaign.active || this.groupCount > 0) return
    if(!(await confirmAction(this.dialog, {title: `Permanently delete "${this.campaign.name}"?`, message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return

    this.saving = true
    this.errorMessage = ''

    this.campaignService.deleteCampaign(this.campaign.campaignID, this.campaign.orgIDs).subscribe(
      (result: any) => {
        this.saving = false
        if(!result?.success){
          this.errorMessage = result?.msg || 'The campaign could not be deleted.'
          return
        }
        this.snackBar.open(`"${this.campaign.name}" deleted.`, 'Dismiss', {duration: 3000})
        this.dialogRef.close(result)
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'A problem with the server prevented the delete. Please try again.'
      })
  }

  //////////////////////// CLOSE ////////////////////////

  copyID(){
    navigator.clipboard?.writeText(String(this.campaign.campaignID)).then(
      () => this.snackBar.open('Campaign ID copied.', 'Dismiss', {duration: 2500}),
      () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
    )
  }

  async close(){
    if(this.saving) return
    if(this.hasChanges && !(await confirmAction(this.dialog, {title: 'Discard unsaved changes?', message: 'Your edits to this campaign will be lost.', danger: true}))) return
    this.dialogRef.close(this.changed ? {success: true, campaign: this.campaign} : null)
  }
}
