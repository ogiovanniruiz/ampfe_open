import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import { Organization } from 'src/app/models/organization.model';
import { Survey, UpdatedSurvey } from 'src/app/models/survey.model';
import { OrganizationService } from 'src/app/services/organization/organization.service';
import { SurveyService } from 'src/app/services/survey.service';
import { DraftQuestion, surveyQuestionsValid, cleanQuestions, choiceCoverageError } from '../surveyQuestionsEditor/surveyQuestionsEditor';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    templateUrl: './createSurveyDialog.html',
    styleUrls: ['./createSurveyDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class CreateSurveyDialog implements OnInit{

  name: string = ''
  questions: DraftQuestion[] = [];
  optinOption: boolean = false;

  campaignOrgs: Organization[] = [];

  errorMessage: string = ''
  saving: boolean = false;

  constructor(public dialogRef: MatDialogRef<CreateSurveyDialog>, 
              public surveyService: SurveyService,
              public orgService: OrganizationService,
              private dialog: MatDialog,
              private snackBar: MatSnackBar,
              ) {}

  ngOnInit(){
    this.getCampaignOrgs()
  }

  getCampaignOrgs(){
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID') || '-1');
    this.orgService.getCampaignOrgs(campaignID).subscribe(
      (orgs: Organization[]) => { this.campaignOrgs = orgs || [] },
      error => console.log(error)
    ) 
  }

  get isDirty(): boolean {
    return !!this.name.trim() || this.questions.length > 0
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

  createSurvey(){
    if(!this.valid){
      this.errorMessage = this.validationSummary
      return
    }
    if(this.saving) return

    const survey: Survey = {
      name: this.name.trim(),
      questions: cleanQuestions(this.questions),
      userID: JSON.parse(sessionStorage.getItem('user') ?? '{}')['_id'],
      campaignIDs: [parseInt(sessionStorage.getItem('campaignID') || '-1')],
      orgID: sessionStorage.getItem('orgID') ?? '',
      active: true,
      optinOption: this.optinOption
    }

    this.saving = true;
    this.errorMessage = '';

    this.surveyService.createSurvey(survey).subscribe(
      (result: UpdatedSurvey) => {
        this.saving = false;
        if(result?.success){
          this.snackBar.open(`Survey "${survey.name}" created.`, 'Dismiss', {duration: 3000})
          this.dialogRef.close(result)
          return
        }
        this.errorMessage = result?.msg || 'The survey could not be created.'
      },
      error => {
        console.log(error)
        this.saving = false;
        this.errorMessage = 'There was a problem with the server. Please try again.';
      }
    )
  }

  async clear(){
    if(this.isDirty && !(await confirmAction(this.dialog, {title: 'Clear this survey?', message: 'Its name and questions will be removed so you can start over.', confirmLabel: 'Clear', danger: true}))) return
    this.name = ''
    this.questions = []
    this.optinOption = false
    this.errorMessage = ''
  }

  async return(){
    if(this.isDirty && !(await confirmAction(this.dialog, {title: 'Discard this survey?', message: 'Its name and questions will be lost.', danger: true}))) return
    this.dialogRef.close()
  }
}
