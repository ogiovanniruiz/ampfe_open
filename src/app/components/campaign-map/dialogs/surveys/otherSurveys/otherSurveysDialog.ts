import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, loadErrorText } from 'src/app/utils/loading';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {MatDialog} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {EditSurveyDialog} from '../editSurvey/editSurveyDialog'
import { Survey } from 'src/app/models/survey.model';
import { SurveyService } from 'src/app/services/survey.service';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';

type SurveyWithUsage = Survey & {activityCount?: number};

@Component({
    templateUrl: './otherSurveysDialog.html',
    styleUrls: ['./otherSurveysDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class OtherSurveysDialog implements OnInit{

  orgSurveys: SurveyWithUsage[] = []
  archivedSurveys: SurveyWithUsage[] = []

  loading: boolean = false
  errorMessage: string = ''
  loadFailed: boolean = false

  dev: boolean = false
  campaignID: number
  // Rows with a request in flight
  busyIDs = new Set<string>()
  // Tells the campaign map to refresh its list when this dialog closes
  changed: boolean = false

  constructor( 
    public dialogRef: MatDialogRef<OtherSurveysDialog>, 
    @Inject(MAT_DIALOG_DATA) public data: any,
    public surveyService: SurveyService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar) {}

  ngOnInit(){
    this.dev = !!JSON.parse(sessionStorage.getItem('user') || '{}').dev
    this.campaignID = parseInt(sessionStorage.getItem('campaignID') || '-1')
    this.getAllSurveys()
  }

  private fail(error?: any, message: string = 'There was a problem with the server. Please try again.'){
    if(error) console.log(error)
    this.errorMessage = message
    this.loading = false
  }

  private notify(message: string){
    this.snackBar.open(message, 'Dismiss', {duration: 3500})
  }

  getAllSurveys(){
    const orgID: string = sessionStorage.getItem('orgID') || '';
    this.loading = true;
    this.loadFailed = false
    this.errorMessage = ''

    this.surveyService.getAllSurveys(orgID, this.campaignID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (surveys: SurveyWithUsage[]) => {
        const ownSurveys = (surveys || []).filter(survey => survey.orgID === orgID)
        this.orgSurveys = ownSurveys.filter(survey => survey.active)
        this.archivedSurveys = ownSurveys.filter(survey => !survey.active)
        this.loading = false
      },
      error => {
        this.fail(error, loadErrorText('the surveys', error))
        this.loadFailed = true
      }
    )
  }

  //////////////////////// DISPLAY ////////////////////////

  inThisCampaign(survey: Survey): boolean {
    return (survey.campaignIDs || []).includes(this.campaignID)
  }

  questionCount(survey: Survey): number {
    return (survey.questions || []).length
  }

  // "Who are you voting for?, Top issue? +3"
  questionsPreview(survey: Survey): string {
    const texts = (survey.questions || []).map(q => q.question)
    const shown = texts.slice(0, 2).join(', ')
    return texts.length > 2 ? `${shown} +${texts.length - 2}` : shown
  }

  usageLabel(survey: SurveyWithUsage): string {
    const n = survey.activityCount || 0
    return n ? `Used by ${n} ${n === 1 ? 'activity' : 'activities'}` : ''
  }

  trackSurvey(index: number, survey: Survey){ return survey._id }

  //////////////////////// ACTIONS ////////////////////////

  editSurvey(survey: Survey){
    const width = this.data?.screenSize || (window.innerWidth < 768 ? '100%' : '75%')
    const dialogRef = this.dialog.open(EditSurveyDialog, {data: survey, width, autoFocus: false, maxWidth: width, disableClose: true });
    dialogRef.afterClosed().subscribe(result => {
      if(!result) return
      this.changed = true
      this.getAllSurveys()
    });
  }

  setActive(survey: SurveyWithUsage, active: boolean){
    if(this.busyIDs.has(survey._id)) return
    this.busyIDs.add(survey._id)
    this.errorMessage = ''

    this.surveyService.archiveSurvey(survey, active).subscribe(
      (result: Survey) => {
        this.busyIDs.delete(survey._id)
        if(!result){
          this.fail(undefined, 'That survey no longer exists.')
          this.getAllSurveys()
          return
        }
        this.changed = true
        this.notify(active ? `"${survey.name}" restored.` : `"${survey.name}" archived.`)
        this.getAllSurveys()
      },
      error => {
        this.busyIDs.delete(survey._id)
        this.fail(error)
      }
    )
  }

  async removeSurvey(survey: SurveyWithUsage){
    if(survey.activityCount) return
    // Confirm first: setting busy state before asking froze the dialog when Cancel was pressed
    if(!(await confirmAction(this.dialog, {title: `Permanently delete "${survey.name}"?`, message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return

    this.busyIDs.add(survey._id)
    this.errorMessage = ''

    this.surveyService.removeSurvey(survey).subscribe(
      (result: any) => {
        this.busyIDs.delete(survey._id)
        if(!result?.success){
          this.fail(undefined, result?.msg || 'The survey could not be deleted.')
          return
        }
        this.changed = true
        this.notify(`"${survey.name}" deleted.`)
        this.getAllSurveys()
      },
      error => {
        this.busyIDs.delete(survey._id)
        this.fail(error)
      }
    )
  }

  closeDialog(){
    this.dialogRef.close(this.changed)
  }
}
