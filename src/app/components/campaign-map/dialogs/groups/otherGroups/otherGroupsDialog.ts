import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

//MODELS
import {Group} from '../../../../../models/group.model'

//SERVICES
import {GroupService} from '../../../../../services/group.service'

import { GroupEditorDialog } from '../editGroup/groupEditorDialog';
import { FilterLookups, summarizeQueries } from '../editGroup/groupFilterSummary';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';

interface GroupRow extends Group {
  activityCount?: number;
}

const GROUP_BY_LABELS: {[groupBy: string]: string} = {
  HOUSEHOLD: 'Households',
  INDIVIDUAL: 'Individuals',
  MEMBERSHIP: 'Members',
}

@Component({
    templateUrl: './otherGroupsDialog.html',
    styleUrls: ['./otherGroupsDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

  export class GroupReviewDialog implements OnInit{

    campaignID: number
    orgID: string
    dev: boolean = false

    loading: boolean = false
    loadFailed: boolean = false
    errorMessage: string = ''

    activeGroups: GroupRow[] = []
    archivedGroups: GroupRow[] = []

    busyIDs = new Set<string>()
    search: string = ''

    // Filter previews, computed once per load
    private previews = new Map<string, string>()

    // Tells the map to reload its group lists
    changed: boolean = false

    constructor(
        public dialogRef: MatDialogRef<GroupReviewDialog>,
        // {polygons, surveys, districts} for naming IDs in filters
        @Inject(MAT_DIALOG_DATA) public data: any,
        public groupService: GroupService,
        public dialog: MatDialog,
        private snackBar: MatSnackBar,
        ) {}

    ngOnInit(){
      this.campaignID = parseInt(sessionStorage.getItem('campaignID'))
      this.orgID = sessionStorage.getItem('orgID')
      const user = JSON.parse(sessionStorage.getItem('user') || '{}')
      this.dev = !!user?.dev
      this.getAllCampaignGroups()
    }

    private get lookups(): FilterLookups {
      return {polygons: this.data?.polygons, surveys: this.data?.surveys, districts: this.data?.districts || this.data?.campaignBoundary}
    }

    //////////////////////// LOAD ////////////////////////

    getAllCampaignGroups(){
      this.loading = true
      this.loadFailed = false

      this.groupService.getAllCampaignGroups(this.campaignID).subscribe(
        (groups: GroupRow[]) => {
          this.loading = false
          const mine = (groups || []).filter(group => group.orgID === this.orgID)

          this.previews.clear()
          mine.forEach(group => this.previews.set(group._id, this.buildPreview(group)))

          this.activeGroups = mine.filter(group => group.active)
          this.archivedGroups = mine.filter(group => !group.active)
        },
        error => {
          console.log(error)
          this.loading = false
          this.loadFailed = true
          this.errorMessage = 'Couldn\'t load groups.'
        }
      )
    }

    //////////////////////// DISPLAY ////////////////////////

    private buildPreview(group: Group): string {
      const filters = summarizeQueries(group.queries, this.lookups).flatMap(section => section.filters)
      return filters.map(filter => {
        const shown = filter.values.slice(0, 3).join(', ')
        const more = filter.values.length > 3 ? ` +${filter.values.length - 3}` : ''
        return `${filter.label}: ${shown}${more}`
      }).join(' · ')
    }

    preview(group: Group): string {
      return this.previews.get(group._id) || ''
    }

    groupByLabel(group: Group): string {
      return GROUP_BY_LABELS[group.groupBy] || group.groupBy
    }

    usageLabel(group: GroupRow): string {
      const count = group.activityCount || 0
      if(!count) return 'Not used by any activity'
      return `Used by ${count} ${count === 1 ? 'activity' : 'activities'}`
    }

    private matches(group: Group): boolean {
      const term = this.search.trim().toLowerCase()
      if(!term) return true
      return (group.name || '').toLowerCase().includes(term) || this.preview(group).toLowerCase().includes(term)
    }

    get filteredActive(): GroupRow[] {
      return this.activeGroups.filter(group => this.matches(group))
    }

    get filteredArchived(): GroupRow[] {
      return this.archivedGroups.filter(group => this.matches(group))
    }

    trackGroup(index: number, group: Group){ return group._id }

    //////////////////////// ACTIONS ////////////////////////

    editGroup(group: Group){
      const phone = this.data?.screenSize === '100%'
      const dialogRef = this.dialog.open(GroupEditorDialog, {
        autoFocus: false, disableClose: true, maxHeight: '190vh',
        width: phone ? '100vw' : '820px', maxWidth: phone ? '100vw' : '94vw',
        data: {group, ...this.lookups},
      })

      dialogRef.afterClosed().subscribe(changed => {
        if(!changed) return
        this.changed = true
        this.getAllCampaignGroups()
      })
    }

    async setActive(group: GroupRow, active: boolean){
      if(this.busyIDs.has(group._id)) return

      const question = active
        ? {title: `Restore "${group.name}"?`, message: 'It will be available for new activities again.', confirmLabel: 'Restore', cancelLabel: 'Cancel'}
        : {title: `Archive "${group.name}"?`, message: 'It will be hidden from new activities. Activities already created from it keep their contacts.', confirmLabel: 'Archive', cancelLabel: 'Cancel', danger: true}
      if(!(await confirmAction(this.dialog, question))) return

      this.busyIDs.add(group._id)
      this.errorMessage = ''

      this.groupService.archiveGroup(group, active).subscribe(
        (result: unknown) => {
          this.busyIDs.delete(group._id)
          if(!result){
            this.errorMessage = `"${group.name}" no longer exists.`
            this.removeFromLists(group._id)
            return
          }

          group.active = active
          this.removeFromLists(group._id)
          const target = active ? this.activeGroups : this.archivedGroups
          target.push(group)
          // Newest first, like the server order
          target.sort((a, b) => (b._id || '').localeCompare(a._id || ''))

          this.changed = true
          this.snackBar.open(`"${group.name}" ${active ? 'restored' : 'archived'}.`, 'Dismiss', {duration: 3000})
        },
        error => {
          console.log(error)
          this.busyIDs.delete(group._id)
          this.errorMessage = `Couldn't ${active ? 'restore' : 'archive'} "${group.name}". Please try again.`
        }
      )
    }

    async deleteGroup(group: GroupRow){
      if(!this.dev || this.busyIDs.has(group._id) || group.activityCount > 0) return
      if(!(await confirmAction(this.dialog, {title: `Permanently delete "${group.name}"?`, message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return

      this.busyIDs.add(group._id)
      this.errorMessage = ''

      this.groupService.deleteGroup(group._id).subscribe(
        (result: any) => {
          this.busyIDs.delete(group._id)
          if(!result?.success){
            this.errorMessage = result?.msg || `Couldn't delete "${group.name}".`
            return
          }
          this.removeFromLists(group._id)
          this.changed = true
          this.snackBar.open(`"${group.name}" deleted.`, 'Dismiss', {duration: 3000})
        },
        error => {
          console.log(error)
          this.busyIDs.delete(group._id)
          this.errorMessage = `Couldn't delete "${group.name}". Please try again.`
        }
      )
    }

    private removeFromLists(id: string){
      this.activeGroups = this.activeGroups.filter(group => group._id !== id)
      this.archivedGroups = this.archivedGroups.filter(group => group._id !== id)
    }

    closeDialog(){
      this.dialogRef.close(this.changed)
    }
}
