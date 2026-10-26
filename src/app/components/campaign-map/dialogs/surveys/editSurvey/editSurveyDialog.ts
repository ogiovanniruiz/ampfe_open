import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {SurveyService} from '../../../../../services/survey.service'
import {Survey, UpdatedSurvey} from '../../../../../models/survey.model'
import { Organization } from 'src/app/models/organization.model';
import { OrganizationService } from 'src/app/services/organization/organization.service';
import { DraftQuestion, toDraftQuestion, surveyQuestionsValid, cleanQuestions, choiceCoverageError, SurveyUsage } from '../surveyQuestionsEditor/surveyQuestionsEditor';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';

@Component({
  templateUrl: './editSurveyDialog.html',
  styleUrls: ['../createSurvey/createSurveyDialog.scss', './editSurveyDialog.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class EditSurveyDialog implements OnInit{

  name: string = ''
  questions: DraftQuestion[] = [];
  campaignIDs: number[] = [];
  optinOption: boolean = false;
  campaignID: number

  campaignOrgs: Organization[] = [];

  errorMessage: string = ''
  saving: boolean = false

  // Answers recorded so far; editing waits for it so locks are known before anything changes
  usage: SurveyUsage = null
  loadingUsage: boolean = true
  usageFailed: boolean = false

  private snapshot: string = ''

  constructor(public dialogRef: MatDialogRef<EditSurveyDialog>,
              @Inject(MAT_DIALOG_DATA) public survey: Survey,
              public surveyService: SurveyService,
              public orgService: OrganizationService,
              private snackBar: MatSnackBar,
              private dialog: MatDialog
            ){}

  ngOnInit(){
    this.campaignID = parseInt(sessionStorage.getItem('campaignID'))

    // Work on copies so closing without saving leaves the caller's survey untouched
    this.name = this.survey.name || ''
    this.questions = (this.survey.questions || []).map(q => toDraftQuestion(q, true))
    this.campaignIDs = [...(this.survey.campaignIDs || [])]
    this.optinOption = !!this.survey.optinOption

    this.snapshot = this.serialize()
    this.getCampaignOrgs();
    this.getUsage();
  }

  getUsage(){
    this.loadingUsage = true
    this.usageFailed = false
    this.surveyService.getSurveyUsage(this.survey._id).subscribe(
      (usage: SurveyUsage) => {
        this.usage = usage || {total: 0, questions: {}}
        this.loadingUsage = false
      },
      error => {
        console.log(error)
        this.loadingUsage = false
        this.usageFailed = true
      }
    )
  }

  get answeredCount(): number {
    return this.usage?.total || 0
  }

  getCampaignOrgs(){
    this.orgService.getCampaignOrgs(this.campaignID).subscribe(
      (orgs: Organization[]) => { this.campaignOrgs = orgs || [] },
      error => console.log(error)
    ) 
  }

  //////////////////////// SETTINGS ////////////////////////

  get loadedInCampaign(): boolean {
    return this.campaignIDs.includes(this.campaignID)
  }

  setLoaded(checked: boolean){
    this.campaignIDs = this.campaignIDs.filter(id => id !== this.campaignID)
    if(checked) this.campaignIDs.push(this.campaignID)
  }

  //////////////////////// CHANGES ////////////////////////

  private serialize(): string {
    return JSON.stringify([this.name.trim(), cleanQuestions(this.questions), [...this.campaignIDs].sort(), this.optinOption])
  }

  get hasChanges(): boolean {
    return this.serialize() !== this.snapshot
  }

  // Every campaign org must see a single/multi-select question: volunteers can't Submit without one
  get choiceError(): string {
    return this.questions.length ? choiceCoverageError(this.questions, this.campaignOrgs) : ''
  }

  get valid(): boolean {
    return !!this.name.trim() && surveyQuestionsValid(this.questions) && !this.choiceError
  }

  get validationSummary(): string {
    if(!this.name.trim()) return 'Name the survey.'
    if(!this.questions.length) return 'Add at least one question.'
    if(this.choiceError) return this.choiceError
    if(!this.valid) return 'Fix the highlighted questions.'
    return ''
  }

  //////////////////////// SAVE / ARCHIVE ////////////////////////

  saveSurveyChanges(){
    if(!this.valid){
      this.errorMessage = this.validationSummary
      return
    }
    // Never save without knowing which wording is locked
    if(this.saving || this.loadingUsage || this.usageFailed) return

    const survey: Survey = {
      name: this.name.trim(),
      questions: cleanQuestions(this.questions),
      campaignIDs: this.campaignIDs,
      optinOption: this.optinOption
    }

    this.saving = true;
    this.errorMessage = ''

    this.surveyService.editSurvey(survey, this.survey._id, this.campaignID).subscribe(
      (result: UpdatedSurvey) => {
        this.saving = false
        if(result?.success){
          this.snackBar.open('Survey saved.', 'Dismiss', {duration: 2500})
          this.dialogRef.close(result)
          return
        }
        this.errorMessage = result?.msg || 'The survey could not be saved.'
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'There was a problem with the server. Please try again.'
      }
    )
  }

  // Only offered for active surveys; always archives (never restores)
  async archiveSurvey(){
    if(!(await confirmAction(this.dialog, {title: `Archive "${this.survey.name}"?`, message: 'It will be hidden from survey lists. Activities already using it keep working.', confirmLabel: 'Archive', cancelLabel: 'Cancel', danger: true}))) return

    this.saving = true
    this.errorMessage = ''

    this.surveyService.archiveSurvey(this.survey, false).subscribe(
      (result: Survey) => {
        this.saving = false
        if(!result){
          this.errorMessage = 'This survey no longer exists.'
          return
        }
        this.snackBar.open(`"${this.survey.name}" archived.`, 'Dismiss', {duration: 3000})
        this.dialogRef.close(result)
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'There was a problem with the server. Please try again.'
      }
    )
  }

  copyID(){
    const id = this.survey._id
    if(!id) return
    navigator.clipboard?.writeText(id).then(
      () => this.snackBar.open('Survey ID copied.', 'Dismiss', {duration: 2500}),
      () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
    )
  }

  async closeDialog(){
    if(this.hasChanges && !(await confirmAction(this.dialog, {title: 'Discard your changes?', message: 'Your edits to this survey will be lost.', danger: true}))) return
    this.dialogRef.close()
  }
}
