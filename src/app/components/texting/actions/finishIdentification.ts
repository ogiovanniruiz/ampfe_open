import {Component, Inject, ChangeDetectionStrategy} from '@angular/core';
import {MatBottomSheet, MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA} from '@angular/material/bottom-sheet';
import { OptinFormBottomSheet } from '../../optinForm/optinForm';

//SERVICES
import {TextingService} from '../../../services/texting.service';

//MODELS
import { User } from 'src/app/models/user.model';
import { ActivityContactRecord, NonResponse, QuestionResponse, SurveyResponse } from 'src/app/models/contact.record.model';
import { Activity } from 'src/app/models/activity.model';
import { Question, Survey } from 'src/app/models/survey.model';
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';

interface VisibleQuestion {
  question: Question;
  index: number;   // position in survey.questions; keys the answers
  number: number;  // shown to the texter
}

@Component({
    selector: 'finishIdentification',
    templateUrl: 'finishIdentification.html',
    styleUrls: [
      '../../../styles/dialog-common.scss',
      '../../canvass/dialogs/householdDialog/householdDialog.scss',
      './finishIdentification.scss',
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  export class FinishIDBottomSheet {

    errorMessage: string = '';

    submitingResponse: boolean = false;

    // Submit was pressed without a multiple-choice answer
    needsResponses: boolean = false;

    selectedTextContactRecord: ActivityContactRecord
    activity: Activity;
    survey: Survey;
    nonResponseSet: NonResponseSet;

    optinOption: boolean = false;

    // Questions this org sees (not hidden by the activity), numbered as shown
    visibleQuestions: VisibleQuestion[] = [];

    // answers[question index]: a response, a list of responses (multi-select) or notes text
    answers: {[questionIndex: number]: any} = {};

    constructor(private _bottomSheetRef: MatBottomSheetRef<FinishIDBottomSheet>,
                @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
                private textingService: TextingService,
                private bottomSheet: MatBottomSheet
                ) {
                  this.survey = data.survey
                  this.activity = data.activity
                  // Opt-in is an activity setting (it used to live on the shared survey)
                  this.optinOption = !!this.activity?.optinOption
                  this.nonResponseSet = data['nonResponseSet']
                  this.selectedTextContactRecord = data['selectedTextContactRecord']
                  this.visibleQuestions = this.buildVisibleQuestions()
                }

  get personName(): string {
    const name = this.selectedTextContactRecord?.person?.resident?.name
    return [name?.firstName, name?.lastName].filter(Boolean).join(' ')
  }

  private buildVisibleQuestions(): VisibleQuestion[] {
    const visible: VisibleQuestion[] = []
    ;(this.survey?.questions || []).forEach((question, index) => {
      if(this.shouldShowQuestion(question) && !this.shouldHideQuestion(question)){
        visible.push({question, index, number: visible.length + 1})
      }
    })
    return visible
  }

  isChecked(questionIndex: number, response: string): boolean {
    const selected = this.answers[questionIndex]
    return Array.isArray(selected) && selected.includes(response)
  }

  toggleOption(questionIndex: number, response: string, checked: boolean){
    const current: string[] = Array.isArray(this.answers[questionIndex]) ? this.answers[questionIndex] : []
    this.answers[questionIndex] = checked
      ? (current.includes(response) ? current : [...current, response])
      : current.filter(value => value !== response)
    this.needsResponses = false
  }

  close(){
    if(this.submitingResponse) return
    this._bottomSheetRef.dismiss()
  }

  submitNonResponse(nonResponse: string, nonResponseType: string){
    if(this.submitingResponse) return
    this.submitingResponse = true;
    this.errorMessage = ''

    var nonResponseObject: NonResponse = {nonResponse: nonResponse,
                                          nonResponseType: nonResponseType,
                                          nonResponseSetID: this.nonResponseSet._id}

    this.textingService.submitTextNonResponse(this.activity, nonResponseObject, this.selectedTextContactRecord).subscribe(
        (textContactRecord)=>{
          this._bottomSheetRef.dismiss(textContactRecord);
        },
        error =>{
            console.log(error)
            this.submitingResponse = false;
            this.errorMessage = 'There was a problem with the server. Please try again.';
        }
    );
  }

  submitSurveyResponse(){
    if(this.submitingResponse) return
    var questionResponses: QuestionResponse[] = this.generateQuestionResponses();

    if(questionResponses.length === 0 || !questionResponses.some(obj => obj.questionType === "SINGLESELECT" || obj.questionType === "MULTISELECT")){
      this.needsResponses = true;
      return;
    }

    var surveyResponse: SurveyResponse = {questionResponses, surveyID: this.survey._id}

    this.submitingResponse = true;
    this.needsResponses = false;
    this.errorMessage = ''

    this.textingService.submitTextSurveyResponse(this.activity, surveyResponse, this.selectedTextContactRecord).subscribe(
        (textContactRecord)=>{
          this._bottomSheetRef.dismiss(textContactRecord);
        },
        error =>{
            console.log(error)
            this.submitingResponse = false;
            this.errorMessage = 'There was a problem with the server. Please try again.';
        }
    )
  }

  // Same shape as before: one entry per single-select answer, per checked multi-select option and per note
  generateQuestionResponses(): QuestionResponse[]{
    const questionResponses: QuestionResponse[] = [];

    for(const {question, index} of this.visibleQuestions){
      const value = this.answers[index]

      if(question.questionType === 'SINGLESELECT' && value){
        questionResponses.push({question: question.question, response: value, questionType: "SINGLESELECT"});
      }

      if(question.questionType === 'NOTES' && typeof value === 'string' && value.trim()){
        questionResponses.push({question: question.question, response: value.trim(), questionType: "NOTES"});
      }

      if(question.questionType === 'MULTISELECT' && Array.isArray(value)){
        for(const response of value){
          questionResponses.push({question: question.question, response: response, questionType: "MULTISELECT"});
        }
      }
    }

    return questionResponses
  }

  openOptinFormBottomSheet(): void {
    var resident = this.selectedTextContactRecord.person.resident
    var orgID: string = sessionStorage.getItem('orgID')
    var user: User = JSON.parse(sessionStorage.getItem('user'))
    this.bottomSheet.open(OptinFormBottomSheet, {data: {resident: resident, orgID: orgID, user: user, activity: this.activity}});
  }

  shouldShowQuestion(question: any): boolean {
    var orgID: string = sessionStorage.getItem('orgID')

    if (!question.orgIDs || question.orgIDs.length === 0) {
      return true;
    }
    return question.orgIDs.includes(orgID);
  }

  shouldHideQuestion(question: any): boolean {
    return (this.activity?.questionsToHide || []).includes(question.question);
  }

}
