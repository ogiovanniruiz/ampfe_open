import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PolygonService } from '../../../../../services/shape/polygon.service'
import { CampaignService } from 'src/app/services/campaign.service';
import { Polygon } from 'src/app/models/polygon.model';
import { Activity } from 'src/app/models/activity.model';
import { ActivityReportDialog } from '../../../../activity/dialogs/activityReports/activityReportDialog';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';

interface PolygonUsage {
  groups: {_id: string, name: string}[];
  activities: Activity[];
}

@Component({
    templateUrl: './morePolygonsDialog.html',
    styleUrls: ['./morePolygonsDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class MorePolygonsDialog implements OnInit{

  loadAllOrgPolygons: boolean = false

  campaignID: number
  orgID: string

  loading: boolean = false
  errorMessage: string = ''
  loadFailed: boolean = false

  activePolygons: Polygon[] = [];
  archivedPolygons: Polygon[] = [];

  // Keyed by polygon ID so results can't land on the wrong row when lists change
  usage = new Map<string, PolygonUsage>()
  loadingUsage: boolean = false
  usageFailed: boolean = false

  busyIDs = new Set<string>()
  search: string = ''

  // Tells the map to reload its polygon layers
  changed: boolean = false;

  savingMode: boolean = false

  // Ignores list responses from a mode the user already switched away from
  private loadToken = 0

  constructor(
    public dialogRef: MatDialogRef<MorePolygonsDialog>,
    // {loadAllOrgPolygons} (older callers pass the boolean)
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialog: MatDialog,
    public polygonService: PolygonService,
    public campaignService: CampaignService,
    private snackBar: MatSnackBar) {
  }

  ngOnInit(){
    this.loadAllOrgPolygons = typeof this.data === 'boolean' ? this.data : !!this.data?.loadAllOrgPolygons
    this.campaignID = parseInt(sessionStorage.getItem('campaignID'))
    this.orgID = sessionStorage.getItem('orgID')
    this.getPolygons()
  }

  //////////////////////// LOAD ////////////////////////

  getPolygons(){
    const token = ++this.loadToken
    this.loading = true
    this.loadFailed = false
    this.errorMessage = ''

    this.polygonService.getPolygons(this.campaignID, this.orgID, this.loadAllOrgPolygons ? 'all' : 'campaign', true).subscribe(
      (polygons: any[]) => {
        if(token !== this.loadToken) return
        this.loading = false
        const byName = (a: Polygon, b: Polygon) => (a.properties.name || '').localeCompare(b.properties.name || '')
        const allPolys: Polygon[] = (polygons || []).flatMap(p => p.polys || []).sort(byName)

        this.activePolygons = allPolys.filter(p => p.properties.active)
        this.archivedPolygons = allPolys.filter(p => !p.properties.active)
        this.getUsage(allPolys.map(p => p._id))
      },
      error => {
        console.log(error)
        if(token !== this.loadToken) return
        this.loading = false
        this.loadFailed = true
        this.errorMessage = 'Couldn\'t load polygons.'
      }
    )
  }

  getUsage(polygonIDs: string[]){
    if(!polygonIDs.length) return
    this.loadingUsage = true
    this.usageFailed = false

    this.polygonService.getPolygonsUsage(polygonIDs, this.campaignID).subscribe(
      (results: {[id: string]: PolygonUsage}) => {
        this.loadingUsage = false
        Object.keys(results || {}).forEach(id => this.usage.set(id, results[id]))
      },
      error => {
        console.log(error)
        this.loadingUsage = false
        this.usageFailed = true
      }
    )
  }

  retryUsage(){
    this.getUsage([...this.activePolygons, ...this.archivedPolygons].map(p => p._id))
  }

  usageOf(polygon: Polygon): PolygonUsage | undefined {
    return this.usage.get(polygon._id)
  }

  usageKnown(polygon: Polygon): boolean {
    return this.usage.has(polygon._id)
  }

  //////////////////////// MODE ////////////////////////

  // Saved on the campaign, like the old sidebar toggle
  setLoadAllOrgPolygons(value: boolean){
    if(this.savingMode || value === this.loadAllOrgPolygons) return
    const previous = this.loadAllOrgPolygons

    this.loadAllOrgPolygons = value
    this.savingMode = true
    this.errorMessage = ''
    this.search = ''
    this.usage.clear()
    this.activePolygons = []
    this.archivedPolygons = []
    this.getPolygons()

    this.campaignService.toggleAllOrgPolygons(this.campaignID, value).subscribe(
      () => {
        this.savingMode = false
        this.changed = true
      },
      error => {
        console.log(error)
        this.savingMode = false
        this.loadAllOrgPolygons = previous
        this.errorMessage = 'Couldn\'t save the setting. Please try again.'
        this.getPolygons()
      }
    )
  }

  //////////////////////// DISPLAY ////////////////////////

  isMine(polygon: Polygon): boolean {
    return polygon.properties.orgID === this.orgID
  }

  orgName(polygon: Polygon): string {
    return polygon.properties['orgName'] || ''
  }

  private matches(polygon: Polygon): boolean {
    const term = this.search.trim().toLowerCase()
    if(!term) return true
    const usage = this.usageOf(polygon)
    const haystack = [
      polygon.properties.name,
      this.orgName(polygon),
      ...(usage?.groups || []).map(g => g.name),
      ...(usage?.activities || []).map(a => a.name),
    ]
    return haystack.some(text => (text || '').toLowerCase().includes(term))
  }

  get filteredActive(): Polygon[] {
    return this.activePolygons.filter(p => this.matches(p))
  }

  get filteredArchived(): Polygon[] {
    return this.archivedPolygons.filter(p => this.matches(p))
  }

  plural(count: number, one: string, many: string): string {
    return `${count} ${count === 1 ? one : many}`
  }

  archiveBlockedReason(polygon: Polygon): string {
    const activities = this.usageOf(polygon)?.activities?.length || 0
    if(!this.usageKnown(polygon)) return this.usageFailed ? 'Couldn\'t check whether activities use this polygon' : 'Checking usage…'
    if(activities) return `Used by ${this.plural(activities, 'activity', 'activities')} in this campaign`
    return ''
  }

  deleteBlockedReason(polygon: Polygon): string {
    const groups = this.usageOf(polygon)?.groups?.length || 0
    if(!this.usageKnown(polygon)) return this.usageFailed ? 'Couldn\'t check whether groups use this polygon' : 'Checking usage…'
    if(groups) return `Used by ${this.plural(groups, 'group', 'groups')} in this campaign`
    return ''
  }

  //////////////////////// ACTIONS ////////////////////////

  async setActive(polygon: Polygon, active: boolean){
    if(!this.isMine(polygon) || this.busyIDs.has(polygon._id)) return
    if(!active && this.archiveBlockedReason(polygon)) return

    const name = polygon.properties.name
    const question = active
      ? {title: `Restore "${name}"?`, message: 'It will show on the map and can be used in new groups again.', confirmLabel: 'Restore', cancelLabel: 'Cancel'}
      : {title: `Archive "${name}"?`, message: 'It will be hidden from the map and from new groups. You can restore it later.', confirmLabel: 'Archive', cancelLabel: 'Cancel', danger: true}
    if(!(await confirmAction(this.dialog, question))) return

    this.busyIDs.add(polygon._id)
    this.errorMessage = ''

    this.polygonService.archivePolygon(polygon._id, active).subscribe(
      (updated: Polygon) => {
        this.busyIDs.delete(polygon._id)
        if(!updated){
          this.errorMessage = `"${name}" no longer exists.`
          this.removeFromLists(polygon._id)
          return
        }

        // Keep the org name the list already showed
        polygon.properties.active = active
        this.removeFromLists(polygon._id)
        const target = active ? this.activePolygons : this.archivedPolygons
        target.push(polygon)
        target.sort((a, b) => (a.properties.name || '').localeCompare(b.properties.name || ''))

        this.changed = true
        this.snackBar.open(`"${name}" ${active ? 'restored' : 'archived'}.`, 'Dismiss', {duration: 3000})
      },
      error => {
        console.log(error)
        this.busyIDs.delete(polygon._id)
        this.errorMessage = `Couldn't ${active ? 'restore' : 'archive'} "${name}". Please try again.`
      }
    )
  }

  async deletePolygon(polygon: Polygon){
    if(!this.isMine(polygon) || this.busyIDs.has(polygon._id) || this.deleteBlockedReason(polygon)) return

    const name = polygon.properties.name
    if(!(await confirmAction(this.dialog, {title: `Permanently delete "${name}"?`, message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return

    this.busyIDs.add(polygon._id)
    this.errorMessage = ''

    this.polygonService.deletePolygon(polygon._id).subscribe(
      (response: any) => {
        this.busyIDs.delete(polygon._id)
        if(!response?.success){
          this.errorMessage = response?.message || `Couldn't delete "${name}".`
          return
        }
        this.removeFromLists(polygon._id)
        this.usage.delete(polygon._id)
        this.snackBar.open(`"${name}" deleted.`, 'Dismiss', {duration: 3000})
      },
      error => {
        console.log(error)
        this.busyIDs.delete(polygon._id)
        this.errorMessage = `Couldn't delete "${name}". Please try again.`
      }
    )
  }

  private removeFromLists(id: string){
    this.activePolygons = this.activePolygons.filter(p => p._id !== id)
    this.archivedPolygons = this.archivedPolygons.filter(p => p._id !== id)
  }

  copyID(polygon: Polygon){
    navigator.clipboard?.writeText(polygon._id).then(
      () => this.snackBar.open('Polygon ID copied.', 'Dismiss', {duration: 2500}),
      () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
    )
  }

  openReportsDialog(activity: Activity) {
    this.dialog.open(ActivityReportDialog, {autoFocus: false, width: "960px", maxWidth: "94vw", data: activity});
  }

  trackPolygon(index: number, polygon: Polygon){ return polygon._id }

  closeDialog(){
    this.dialogRef.close({changed: this.changed, loadAllOrgPolygons: this.loadAllOrgPolygons})
  }
}
