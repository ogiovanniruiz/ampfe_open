import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

//MODELS
import {Group, Estimate, EstimateResults} from '../../../../../models/group.model'

//SERVICES
import { GroupService } from 'src/app/services/group.service';

import { FilterSection, FilterLookups, summarizeQueries } from './groupFilterSummary';

const GROUP_BY_LABELS: {[groupBy: string]: string} = {
  HOUSEHOLD: 'Households',
  INDIVIDUAL: 'Individuals',
  MEMBERSHIP: 'Members',
}

// Long lists (e.g. precincts) show this many values until expanded
const COLLAPSED_VALUES = 12

@Component({
    templateUrl: './groupEditorDialog.html',
    styleUrls: ['../../../../../styles/dialog-common.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class GroupEditorDialog implements OnInit{

    group: Group
    lookups: FilterLookups = {}

    constructor(
        public dialogRef: MatDialogRef<GroupEditorDialog>,
        // {group, polygons, surveys, districts} (older callers pass the group)
        @Inject(MAT_DIALOG_DATA) public data: any,
        public groupService: GroupService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        ) {}

    campaignID: number
    orgID: string

    dataManager: boolean = false
    dev: boolean = false

    name: string = ''
    campaignWide: boolean = false

    saving: boolean = false
    archiving: boolean = false
    estimating: boolean = false

    errorMessage: string = ''
    nameError: string = ''

    estimateResults: EstimateResults | null = null
    estimateIsSaved: boolean = false

    sections: FilterSection[] = []
    expandedFilters = new Set<string>()

    // Tells the map to reload its group lists
    changed: boolean = false

    ngOnInit(){
        this.group = this.data?.group || this.data
        this.lookups = {polygons: this.data?.polygons, surveys: this.data?.surveys, districts: this.data?.districts}

        this.campaignID = parseInt(sessionStorage.getItem('campaignID'))
        this.orgID = sessionStorage.getItem('orgID')
        this.getDataManagerStatus()

        this.name = this.group.name || ''
        this.campaignWide = !!this.group.campaignWide
        this.sections = summarizeQueries(this.group.queries, this.lookups)

        // Estimates are saved on the group when activities are sized
        const saved = this.group['estimateResults']
        if(saved && (saved.totalHHs || saved.totalResidents || saved.totalPhones)){
          this.estimateResults = saved
          this.estimateIsSaved = true
        }
    }

    getDataManagerStatus(){
      const user = JSON.parse(sessionStorage.getItem('user') || '{}')
      this.dev = !!user?.dev
      this.dataManager = (user?.dataManager || []).includes(this.campaignID)
    }

    //////////////////////// DISPLAY ////////////////////////

    get groupByLabel(): string {
      return GROUP_BY_LABELS[this.group.groupBy] || this.group.groupBy
    }

    // Other organizations' campaign-wide groups are read-only unless you manage the campaign
    get canEdit(): boolean {
      return this.group.orgID === this.orgID || this.dev || this.dataManager
    }

    get canSetCampaignWide(): boolean {
      return this.dev || this.dataManager
    }

    get filterCount(): number {
      return this.sections.reduce((sum, section) => sum + section.filters.length, 0)
    }

    visibleValues(filterKey: string, values: string[]): string[] {
      return this.expandedFilters.has(filterKey) ? values : values.slice(0, COLLAPSED_VALUES)
    }

    hiddenCount(filterKey: string, values: string[]): number {
      return this.expandedFilters.has(filterKey) ? 0 : Math.max(0, values.length - COLLAPSED_VALUES)
    }

    toggleExpanded(filterKey: string){
      if(this.expandedFilters.has(filterKey)) this.expandedFilters.delete(filterKey)
      else this.expandedFilters.add(filterKey)
    }

    //////////////////////// SAVE ////////////////////////

    get busy(): boolean {
      return this.saving || this.archiving
    }

    get hasChanges(): boolean {
      return this.name.trim() !== (this.group.name || '') || this.campaignWide !== !!this.group.campaignWide
    }

    get canSave(): boolean {
      return this.canEdit && this.hasChanges && !!this.name.trim() && !this.busy
    }

    save(){
      if(!this.canEdit || this.busy) return
      if(!this.name.trim()){
        this.nameError = 'The group needs a name.'
        return
      }

      this.saving = true
      this.errorMessage = ''
      this.nameError = ''

      this.groupService.editGroup(this.group, this.name.trim(), this.campaignWide).subscribe(
        (result: any) => {
          this.saving = false
          if(!result?.success){
            const msg = result?.msg || 'The group could not be saved.'
            if(/name/i.test(msg)) this.nameError = msg
            else this.errorMessage = msg
            return
          }

          this.group = {...this.group, name: result.group.name, campaignWide: result.group.campaignWide}
          this.name = this.group.name
          this.campaignWide = !!this.group.campaignWide
          this.changed = true
          this.snackBar.open('Group saved.', 'Dismiss', {duration: 2500})
        },
        error => {
          console.log(error)
          this.saving = false
          this.errorMessage = 'There was a problem with the server. Please try again.'
        }
      )
    }

    async archiveGroup(){
      if(!this.canEdit || this.busy) return
      if(!(await confirmAction(this.dialog, {
        title: `Archive "${this.group.name}"?`,
        message: 'It will be hidden from new activities. Activities already created from it keep their contacts. You can restore it from More Groups.',
        confirmLabel: 'Archive', cancelLabel: 'Cancel', danger: true,
      }))) return

      this.archiving = true
      this.errorMessage = ''

      this.groupService.archiveGroup(this.group, false).subscribe(
        (result: unknown) => {
          this.archiving = false
          if(!result){
            this.errorMessage = 'This group no longer exists.'
            return
          }
          this.snackBar.open(`"${this.group.name}" archived.`, 'Dismiss', {duration: 3000})
          this.dialogRef.close(true)
        },
        error => {
          console.log(error)
          this.archiving = false
          this.errorMessage = 'Couldn\'t archive the group. Please try again.'
        }
      )
    }

    //////////////////////// ESTIMATE ////////////////////////

    getEstimate(){
      this.errorMessage = ''
      this.estimating = true

      const estimate: Estimate = {
          orgID: this.orgID,
          campaignID: this.campaignID,
          queries: this.group.queries,
          groupBy: this.group.groupBy,
          campaignWide: this.campaignWide
      }

      this.groupService.getEstimate(estimate).subscribe(
        (estimateResults: EstimateResults) => {
          this.estimating = false
          this.estimateResults = estimateResults
          this.estimateIsSaved = false
        },
        error => {
          console.log(error)
          this.estimating = false
          this.errorMessage = 'There was an error calculating the estimate.'
        })
    }

    //////////////////////// CLOSE ////////////////////////

    copyID(){
      navigator.clipboard?.writeText(this.group._id).then(
        () => this.snackBar.open('Group ID copied.', 'Dismiss', {duration: 2500}),
        () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
      )
    }

    async close(){
      if(this.busy) return
      if(this.hasChanges && !(await confirmAction(this.dialog, {title: 'Discard unsaved changes?', danger: true}))) return
      this.dialogRef.close(this.changed)
    }
}
