import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, loadErrorText } from 'src/app/utils/loading';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {MatDialog} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SurveyService } from 'src/app/services/survey.service';
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import { EditNonResponseDialog } from '../../nonresponsesets/editNonresponseSet/editNonResponseDialog';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';

type SetWithUsage = NonResponseSet & {activityCount?: number};

@Component({
    templateUrl: './otherNonresponseSets.html',
    styleUrls: ['./otherNonresponseSets.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class OtherNonresponseSetsDialog implements OnInit{

  loading: boolean = false;

  orgNonResponseSets: SetWithUsage[] = [];
  archivedNonResponseSets: SetWithUsage[] = []

  errorMessage: string = ''
  loadFailed: boolean = false

  dev: boolean = false
  campaignID: number
  // Rows with a request in flight
  busyIDs = new Set<string>()
  // Tells the campaign map to refresh its list when this dialog closes
  changed: boolean = false

  constructor( 
    public dialogRef: MatDialogRef<OtherNonresponseSetsDialog>, 
    @Inject(MAT_DIALOG_DATA) public data: any,
    public surveyService: SurveyService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar) {}

  ngOnInit(){
    this.dev = !!JSON.parse(sessionStorage.getItem('user') || '{}').dev
    this.campaignID = parseInt(sessionStorage.getItem('campaignID'))
    this.getAllNonResponseSets()
  }

  private fail(error?: any, message: string = 'There was a problem with the server. Please try again.'){
    if(error) console.log(error)
    this.errorMessage = message
    this.loading = false
  }

  private notify(message: string){
    this.snackBar.open(message, 'Dismiss', {duration: 3500})
  }

  getAllNonResponseSets(){
    const orgID: string = sessionStorage.getItem('orgID')
    this.loading = true;
    this.loadFailed = false
    this.errorMessage = ''

    this.surveyService.getAllNonResponseSets(orgID, this.campaignID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (nonResponseSets: SetWithUsage[]) => {
        const ownSets = (nonResponseSets || []).filter(set => set.orgID === orgID)
        this.orgNonResponseSets = ownSets.filter(set => set.active)
        this.archivedNonResponseSets = ownSets.filter(set => !set.active)
        this.loading = false;
      },
      error => {
        this.fail(error, loadErrorText('the non-response sets', error))
        this.loadFailed = true
      }
    )
  }

  //////////////////////// DISPLAY ////////////////////////

  inThisCampaign(set: NonResponseSet): boolean {
    return (set.campaignIDs || []).includes(this.campaignID)
  }

  responseCount(set: NonResponseSet): number {
    return (set.nonResponses || []).length
  }

  // "Not Home, Voicemail, Do Not Contact +4"
  responsesPreview(set: NonResponseSet): string {
    const texts = (set.nonResponses || []).map(nr => nr.nonResponse)
    const shown = texts.slice(0, 3).join(', ')
    return texts.length > 3 ? `${shown} +${texts.length - 3}` : shown
  }

  usageLabel(set: SetWithUsage): string {
    const n = set.activityCount || 0
    return n ? `Used by ${n} ${n === 1 ? 'activity' : 'activities'}` : ''
  }

  trackSet(index: number, set: NonResponseSet){ return set._id }

  //////////////////////// ACTIONS ////////////////////////

  editNonResponseSet(nonResponseSet: NonResponseSet){
    const dialogRef = this.dialog.open(EditNonResponseDialog, {autoFocus: false, data: nonResponseSet, width: this.data?.screenSize || '75%', maxWidth: this.data?.screenSize || '75%'});
    dialogRef.afterClosed().subscribe(result => {
      if(!result) return
      this.changed = true
      this.getAllNonResponseSets()
    });
  }

  setActive(set: SetWithUsage, active: boolean){
    if(this.busyIDs.has(set._id)) return
    this.busyIDs.add(set._id)
    this.errorMessage = ''

    this.surveyService.archiveNonResponseSet(set, active).subscribe(
      (result: NonResponseSet) => {
        this.busyIDs.delete(set._id)
        if(!result){
          this.fail(undefined, 'That set no longer exists.')
          this.getAllNonResponseSets()
          return
        }
        this.changed = true
        this.notify(active ? `"${set.name}" restored.` : `"${set.name}" archived.`)
        this.getAllNonResponseSets()
      },
      error => {
        this.busyIDs.delete(set._id)
        this.fail(error)
      }
    )
  }

  async removeNonResponseSet(set: SetWithUsage){
    if(set.activityCount) return
    if(!(await confirmAction(this.dialog, {title: `Permanently delete "${set.name}"?`, message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return

    this.busyIDs.add(set._id)
    this.errorMessage = ''

    this.surveyService.removeNonResponseSet(set).subscribe(
      (result: any) => {
        this.busyIDs.delete(set._id)
        if(!result?.success){
          this.fail(undefined, result?.msg || 'The set could not be deleted.')
          return
        }
        this.changed = true
        this.notify(`"${set.name}" deleted.`)
        this.getAllNonResponseSets()
      },
      error => {
        this.busyIDs.delete(set._id)
        this.fail(error)
      }
    )
  }

  closeDialog(){
    this.dialogRef.close(this.changed)
  }
}
