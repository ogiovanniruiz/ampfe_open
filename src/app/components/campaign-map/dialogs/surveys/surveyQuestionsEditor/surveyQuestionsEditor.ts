import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Organization } from 'src/app/models/organization.model';
import { Question, Response } from 'src/app/models/survey.model';
import { normalizeText, cleanText } from '../../nonresponsesets/nonResponseEditor/nonResponseEditor';

export const QUESTION_TYPES: {[type: string]: {label: string, hint: string}} = {
  SINGLESELECT: {label: 'Single choice', hint: 'Volunteers pick one response.'},
  MULTISELECT: {label: 'Multiple choice', hint: 'Volunteers can pick several responses.'},
  NOTES: {label: 'Notes', hint: 'Volunteers type a free-text answer.'},
};

export interface DraftResponse extends Response {
  // Wording when the survey was loaded; undefined for responses added in this session
  originalText?: string;
}

// Client-only fields: a stable list key, the unsent response draft, and the loaded wording
export interface DraftQuestion extends Question {
  key: number;
  responses: DraftResponse[];
  newResponse: string;
  newResponseError: string;
  originalText?: string;
  originalType?: string;
}

// Server shape from /api/getSurveyUsage
export interface SurveyUsage {
  total: number;
  questions: {[question: string]: {count: number, responses: {[response: string]: number}}};
}

let nextKey = 1;

export function toDraftQuestion(question: Question, keepOriginals: boolean = false): DraftQuestion {
  return {
    key: nextKey++,
    question: question.question,
    questionType: question.questionType,
    responses: (question.responses || []).map(r => ({response: r.response, ...(keepOriginals ? {originalText: r.response} : {})})),
    orgIDs: [...(question.orgIDs || [])],
    newResponse: '',
    newResponseError: '',
    ...(keepOriginals ? {originalText: question.question, originalType: question.questionType} : {}),
  };
}

export function isChoiceQuestion(question: Question): boolean {
  return question.questionType === 'SINGLESELECT' || question.questionType === 'MULTISELECT';
}

// Same rule the field tools use: unscoped questions show to everyone
export function questionShownToOrg(question: Question, orgID: string): boolean {
  return !question.orgIDs?.length || question.orgIDs.includes(orgID)
}

// Orgs (by ID) that would see no single/multi-select question, so their volunteers could never Submit
export function orgsWithoutChoiceQuestion(questions: Question[], orgIDs: string[], hidden: string[] = []): string[] {
  const choices = (questions || []).filter(q => isChoiceQuestion(q) && !hidden.includes(q.question))
  return orgIDs.filter(orgID => !choices.some(q => questionShownToOrg(q, orgID)))
}

// Why these questions can't be used for responses, or '' when every listed org sees a choice question
export function choiceCoverageError(questions: Question[], orgs: {_id?: string, name?: string}[] = [], hidden: string[] = []): string {
  const choices = (questions || []).filter(q => isChoiceQuestion(q) && !hidden.includes(q.question))
  if(!choices.length) return hidden.length ? 'Leave at least one single- or multiple-choice question visible.' : 'Add at least one single- or multiple-choice question.'
  const missing = orgsWithoutChoiceQuestion(questions, orgs.map(o => o._id).filter(Boolean), hidden)
  if(!missing.length) return ''
  const names = missing.map(id => orgs.find(o => o._id === id)?.name || id).join(', ')
  return `These organizations would see no multiple-choice question: ${names}.`
}

export function questionError(questions: Question[], index: number): string {
  const question = questions[index];
  if(!cleanText(question.question)) return 'Question text is required.';
  const key = normalizeText(question.question);
  if(questions.some((q, i) => i !== index && normalizeText(q.question) === key)) return 'Duplicate of another question.';
  if(isChoiceQuestion(question) && question.responses.length === 0) return 'Add at least one response.';
  return '';
}

export function responseError(question: Question, index: number): string {
  const text = question.responses[index].response;
  if(!cleanText(text)) return 'Response text is required.';
  const key = normalizeText(text);
  if(question.responses.some((r, i) => i !== index && normalizeText(r.response) === key)) return 'Duplicate response.';
  return '';
}

export function surveyQuestionsValid(questions: Question[]): boolean {
  return questions.length > 0 &&
    questions.every((q, i) => !questionError(questions, i) && q.responses.every((r, j) => !responseError(q, j)));
}

// What gets saved: trimmed text, responses only for choice questions, no client-only fields
export function cleanQuestions(questions: Question[]): Question[] {
  return questions.map(q => ({
    question: cleanText(q.question),
    questionType: q.questionType,
    responses: isChoiceQuestion(q) ? q.responses.map(r => ({response: cleanText(r.response)})) : [],
    orgIDs: q.orgIDs || [],
  }));
}

/**
 * Ordered, editable survey questions plus the "add a question" card.
 * Edits `questions` in place; the parent dialog owns saving.
 */
@Component({
  selector: 'app-survey-questions-editor',
  templateUrl: './surveyQuestionsEditor.html',
  styleUrls: ['./surveyQuestionsEditor.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class SurveyQuestionsEditorComponent {

  @Input() questions: DraftQuestion[] = [];
  @Input() campaignOrgs: Organization[] = [];
  // When given, wording that already has answers is locked (Edit Survey)
  @Input() usage: SurveyUsage = null;

  types = QUESTION_TYPES
  typeKeys = Object.keys(QUESTION_TYPES)

  newQuestion: string = ''
  newQuestionType: string = 'SINGLESELECT'
  newQuestionError: string = ''

  isChoice = isChoiceQuestion

  questionError(index: number): string {
    return questionError(this.questions, index)
  }

  //////////////////////// LOCKS ////////////////////////
  // Answers are stored as text, so used wording must not change (see getSurveySummary / convertQueries)

  questionAnswers(question: DraftQuestion): number {
    if(!this.usage || question.originalText === undefined) return 0
    return this.usage.questions[question.originalText]?.count || 0
  }

  responseAnswers(question: DraftQuestion, response: DraftResponse): number {
    if(!this.usage || question.originalText === undefined || response.originalText === undefined) return 0
    return this.usage.questions[question.originalText]?.responses?.[response.originalText] || 0
  }

  questionLocked(question: DraftQuestion): boolean {
    return this.questionAnswers(question) > 0
  }

  responseLocked(question: DraftQuestion, response: DraftResponse): boolean {
    return this.responseAnswers(question, response) > 0
  }

  // Single and multiple choice store answers the same way; switching to or from Notes doesn't
  typeOptionDisabled(question: DraftQuestion, type: string): boolean {
    if(!this.questionLocked(question)) return false
    const originalIsChoice = isChoiceQuestion({...question, questionType: this.originalType(question)})
    return originalIsChoice ? type === 'NOTES' : type !== 'NOTES'
  }

  private originalType(question: DraftQuestion): string {
    return question.originalType ?? question.questionType
  }

  answersLabel(n: number): string {
    return n === 1 ? '1 answer' : n.toLocaleString() + ' answers'
  }

  responseError(question: Question, index: number): string {
    return responseError(question, index)
  }

  addQuestion(){
    const text = cleanText(this.newQuestion)
    if(!text){
      this.newQuestionError = 'Enter the question volunteers will ask.'
      return
    }
    const key = normalizeText(text)
    if(this.questions.some(q => normalizeText(q.question) === key)){
      this.newQuestionError = 'This question is already in the survey.'
      return
    }

    this.questions.push(toDraftQuestion({question: text, questionType: this.newQuestionType, responses: [], orgIDs: []}))
    this.newQuestion = ''
    this.newQuestionError = ''
    // The type is kept, so several questions of one type can be added in a row
  }

  removeQuestion(index: number){
    this.questions.splice(index, 1)
  }

  moveQuestion(index: number, offset: number){
    const target = index + offset
    if(target < 0 || target >= this.questions.length) return
    moveItemInArray(this.questions, index, target)
  }

  dropQuestion(event: CdkDragDrop<DraftQuestion[]>){
    moveItemInArray(this.questions, event.previousIndex, event.currentIndex)
  }

  addResponse(question: DraftQuestion){
    const text = cleanText(question.newResponse)
    if(!text){
      question.newResponseError = 'Enter a response.'
      return
    }
    const key = normalizeText(text)
    if(question.responses.some(r => normalizeText(r.response) === key)){
      question.newResponseError = `"${text}" is already a response.`
      return
    }
    question.responses.push({response: text})
    question.newResponse = ''
    question.newResponseError = ''
  }

  removeResponse(question: Question, index: number){
    question.responses.splice(index, 1)
  }

  moveResponse(question: Question, index: number, offset: number){
    const target = index + offset
    if(target < 0 || target >= question.responses.length) return
    moveItemInArray(question.responses, index, target)
  }

  trackQuestion(index: number, question: DraftQuestion){ return question.key ?? index }
  trackByIndex(index: number){ return index }
}
