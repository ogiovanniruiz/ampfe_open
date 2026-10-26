import { Component, OnInit, OnDestroy, Inject, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

//SERVICES
import { ContactRecordService } from 'src/app/services/contact.record.service';
import { SurveyService } from 'src/app/services/survey.service';

//MODELS
import { Activity } from '../../../../models/activity.model'
import { Survey, Question } from '../../../../models/survey.model'
import { NonResponseSet } from '../../../../models/nonResponseSet.model'
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../material.module';
import { PassLabelPipe } from '../../../../pipes/passLabel.pipe';
interface Filters {
  voter: string
  userIDs: string[]
  kind: 'all' | 'survey' | 'nonresponse'
  question: string
  answer: string
  nonResponse: string
  phone: string
  address: string
  pass: number | null
  notes: string
  edited: boolean
}

const emptyFilters = (): Filters => ({voter: '', userIDs: [], kind: 'all', question: '', answer: '', nonResponse: '', phone: '', address: '', pass: null, notes: '', edited: false})

const CHOICE_TYPES = ['SINGLESELECT', 'MULTISELECT']

// The open row's editor: answers by question (an array for MULTISELECT) or the chosen nonresponse
interface Draft {
  mode: 'survey' | 'nonresponse'
  answers: {[question: string]: any}
  nonResponse: string
  questions: Question[]
  original: string
}

@Component({
    templateUrl: './editActivityEntries.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [CommonModule, MaterialModule, PassLabelPipe]
  })

export class EditActivityEntriesDialog implements OnInit, OnDestroy{

  survey: Survey | null = null
  nonResponseSet: NonResponseSet | null = null

  filters: Filters = emptyFilters()
  showMoreFilters: boolean = false
  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });
  private startDate: Date | undefined
  private endDate: Date | undefined

  users: {_id: string, name: string, count: number}[] = []
  rows: any[] = []
  total: number = 0
  page: number = 0
  pageSize: number = 50
  loading: boolean = false
  errorMessage: string = ''
  private token: number = 0

  openRowID: string | null = null
  draft: Draft | null = null
  saving: boolean = false
  rowError: string = ''
  historyOpen: boolean = false

  // Something was saved, so the report should refresh when this closes
  changed: boolean = false

  private textChanges = new Subject<void>()
  private textSub?: Subscription

  constructor(public dialogRef: MatDialogRef<EditActivityEntriesDialog>,
              @Inject(MAT_DIALOG_DATA) public activity: Activity,
              public contactRecordService: ContactRecordService,
              public surveyService: SurveyService,
              private snackBar: MatSnackBar,
              private dialog: MatDialog
        ) {}

  ngOnInit(){
    this.dialogRef.disableClose = true
    this.dialogRef.backdropClick().subscribe(() => this.close())

    this.textSub = this.textChanges.pipe(debounceTime(300)).subscribe(() => this.search())
    this.getSurvey()
    this.getNonResponseSet()
    this.load(true)
  }

  ngOnDestroy(){
    this.textSub?.unsubscribe()
  }

  //////////////////////// SETUP ////////////////////////

  getSurvey(){
    if(!this.activity.surveyID) return
    this.surveyService.getSurvey(this.activity.surveyID).subscribe(
      (survey: Survey) => this.survey = survey,
      error => console.log(error)
    )
  }

  getNonResponseSet(){
    if(!this.activity.nonResponseSetID) return
    this.surveyService.getNonResponseSet(this.activity.nonResponseSetID).subscribe(
      (nonResponseSet: NonResponseSet) => this.nonResponseSet = nonResponseSet,
      error => console.log(error)
    )
  }

  // Questions volunteers see in this org's activity (the phonebank, canvass and petition rule)
  get visibleQuestions(): Question[] {
    const orgID = sessionStorage.getItem('orgID') || ''
    const hidden = this.activity.questionsToHide || []
    return (this.survey?.questions || []).filter(q =>
      (!q.orgIDs || !q.orgIDs.length || q.orgIDs.includes(orgID)) && !hidden.includes(q.question))
  }

  // Stored pass values, 0 through the activity's current pass
  get passOptions(): number[] {
    return Array.from({length: (this.activity.passes || 0) + 1}, (_, pass) => pass)
  }

  get choiceQuestions(): Question[] {
    return (this.survey?.questions || []).filter(q => CHOICE_TYPES.includes(q.questionType))
  }

  get answersForFilter(): string[] {
    const question = this.choiceQuestions.find(q => q.question === this.filters.question)
    return (question?.responses || []).map(r => r.response)
  }

  //////////////////////// SEARCH ////////////////////////

  get activeFilterCount(): number {
    const f = this.filters
    return [f.voter.trim(), f.userIDs.length, f.kind !== 'all', f.question, f.nonResponse, f.phone.trim(), f.address.trim(),
            f.pass !== null && f.pass !== undefined && String(f.pass) !== '', f.notes.trim(), f.edited, this.startDate || this.endDate]
      .filter(Boolean).length
  }

  get moreFilterCount(): number {
    const f = this.filters
    return [f.question, f.nonResponse, f.phone.trim(), f.address.trim(), f.pass !== null && f.pass !== undefined && String(f.pass) !== '', f.notes.trim(), f.edited]
      .filter(Boolean).length
  }

  onTextChange(){
    this.textChanges.next()
  }

  onQuestionFilterChange(){
    this.filters.answer = ''
    this.search()
  }

  search(){
    this.page = 0
    this.load()
  }

  clearFilters(){
    this.filters = emptyFilters()
    this.range.reset()
    this.startDate = undefined
    this.endDate = undefined
    this.search()
  }

  // Same date handling as the activity report
  changeDateRange(){
    const start = this.range.value.start
    const end = this.range.value.end
    if(start && !end) return
    this.startDate = start ? new Date(start.getTime() + (7 * 60 * 60 * 1000)) : undefined
    this.endDate = end ? new Date(end.getTime() + ((24 + 7) * 60 * 60 * 1000)) : undefined
    this.search()
  }

  clearDateRange(){
    this.range.reset()
    this.startDate = undefined
    this.endDate = undefined
    this.search()
  }

  async onPage(event: PageEvent){
    if(this.draftDirty && !(await confirmAction(this.dialog, {title: 'Discard your unsaved changes?', message: 'Your edits to this entry will be lost.', danger: true}))) return
    this.page = event.pageIndex
    this.load()
  }

  // A newer search wins over an older one still loading
  load(includeUsers: boolean = false){
    const token = ++this.token
    this.loading = true
    this.errorMessage = ''
    const filters = {...this.filters, startDate: this.startDate, endDate: this.endDate}

    this.contactRecordService.searchActivityEntries(this.activity._id, filters, this.page, includeUsers).subscribe(
      (result: any) => {
        if(token !== this.token) return
        this.loading = false
        this.rows = result?.rows || []
        this.total = result?.total || 0
        this.pageSize = result?.pageSize || 50
        if(result?.users) this.users = result.users
        this.closeEditor()
      },
      error => {
        console.log(error)
        if(token !== this.token) return
        this.loading = false
        this.errorMessage = "Couldn't load the entries."
      }
    )
  }

  //////////////////////// DISPLAY ////////////////////////

  voterName(row: any): string {
    const name = row.person?.resident?.name || {}
    return [name.firstName, name.lastName].filter(Boolean).join(' ') || name.fullName || 'Unknown voter'
  }

  phone(row: any): string {
    const number = (row.person?.resident?.phones || []).find((p: any) => p.number)?.number || ''
    return number.length === 10 ? `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}` : number
  }

  address(row: any): string {
    if(row.person?.fullAddress1) return row.person.fullAddress1
    const a = row.person?.address || {}
    return [a.streetNum, a.prefix, a.street, a.suffix, a.unit].filter(Boolean).join(' ')
  }

  volunteer(row: any): string {
    return row.user?.name?.fullName || this.users.find(u => u._id === row.userID)?.name || 'Unknown volunteer'
  }

  // The choice answers, or the nonresponse
  summary(entry: {surveyResponse?: any, nonResponse?: any} | null): string {
    if(!entry) return '—'
    if(entry.nonResponse) return entry.nonResponse.nonResponse
    const choices = (entry.surveyResponse?.questionResponses || [])
      .filter((r: any) => CHOICE_TYPES.includes(r.questionType))
      .map((r: any) => r.response)
    return choices.length ? choices.join(' · ') : 'Survey response'
  }

  notesOf(entry: any): string {
    return (entry?.surveyResponse?.questionResponses || []).filter((r: any) => r.questionType === 'NOTES').map((r: any) => r.response).join(' · ')
  }

  isEdited(row: any): boolean {
    return !!row.editHistory?.length
  }

  // Newest first
  history(row: any): any[] {
    return [...(row.editHistory || [])].reverse()
  }

  trackRow(index: number, row: any){
    return row._id
  }

  //////////////////////// EDIT ////////////////////////

  async toggleRow(row: any){
    if(this.openRowID === row._id){
      if(this.draftDirty && !(await confirmAction(this.dialog, {title: 'Discard your unsaved changes?', message: 'Your edits to this entry will be lost.', danger: true}))) return
      this.closeEditor()
      return
    }
    if(this.draftDirty && !(await confirmAction(this.dialog, {title: 'Discard your unsaved changes?', message: 'Your edits to this entry will be lost.', danger: true}))) return
    this.openEditor(row)
  }

  private openEditor(row: any){
    const answers: {[question: string]: any} = {}
    ;(row.surveyResponse?.questionResponses || []).forEach((r: any) => {
      if(r.questionType === 'MULTISELECT') answers[r.question] = [...(answers[r.question] || []), r.response]
      else answers[r.question] = r.response
    })

    // Volunteers' questions, plus any other survey question this entry already answers so saving keeps it
    const answered = new Set(Object.keys(answers))
    const visible = this.visibleQuestions
    const questions = (this.survey?.questions || []).filter(q => visible.includes(q) || answered.has(q.question))

    this.draft = {
      mode: row.surveyResponse ? 'survey' : 'nonresponse',
      answers,
      nonResponse: row.nonResponse?.nonResponse || '',
      questions,
      original: '',
    }
    this.draft.original = this.draftKey(this.draft)
    this.openRowID = row._id
    this.rowError = ''
    this.historyOpen = false
  }

  closeEditor(){
    this.openRowID = null
    this.draft = null
    this.rowError = ''
    this.historyOpen = false
  }

  private draftKey(draft: Draft): string {
    return draft.mode === 'survey' ? 'S' + JSON.stringify(this.questionResponses(draft)) : 'N' + draft.nonResponse
  }

  get draftDirty(): boolean {
    return !!this.draft && this.draftKey(this.draft) !== this.draft.original
  }

  isChecked(question: Question, response: string): boolean {
    const value = this.draft?.answers[question.question]
    return Array.isArray(value) && value.includes(response)
  }

  toggleOption(question: Question, response: string, checked: boolean){
    if(!this.draft) return
    const current: string[] = Array.isArray(this.draft.answers[question.question]) ? this.draft.answers[question.question] : []
    this.draft.answers[question.question] = checked ? [...current.filter(r => r !== response), response] : current.filter(r => r !== response)
  }

  clearAnswer(question: Question){
    if(this.draft) delete this.draft.answers[question.question]
  }

  // Built the way submitting builds them: MULTISELECT is one entry per chosen option
  private questionResponses(draft: Draft): any[] {
    const responses: any[] = []
    for(const question of draft.questions){
      const value = draft.answers[question.question]
      if(question.questionType === 'MULTISELECT' && Array.isArray(value)){
        value.forEach(response => responses.push({question: question.question, response, questionType: 'MULTISELECT'}))
      } else if(question.questionType === 'NOTES' && typeof value === 'string' && value.trim()){
        responses.push({question: question.question, response: value.trim(), questionType: 'NOTES'})
      } else if(typeof value === 'string' && value){
        responses.push({question: question.question, response: value, questionType: question.questionType})
      }
    }
    return responses
  }

  get canSave(): boolean {
    if(!this.draft || this.saving || !this.draftDirty) return false
    if(this.draft.mode === 'nonresponse') return !!this.draft.nonResponse
    return this.questionResponses(this.draft).some(r => CHOICE_TYPES.includes(r.questionType))
  }

  get needsChoiceAnswer(): boolean {
    return !!this.draft && this.draft.mode === 'survey' && !this.questionResponses(this.draft).some(r => CHOICE_TYPES.includes(r.questionType))
  }

  save(row: any){
    if(!this.draft || !this.canSave) return
    const draft = this.draft
    const editorID = JSON.parse(sessionStorage.getItem('user') || '{}')._id
    const edit: any = {recordID: row._id, activityID: this.activity._id, editorID}
    if(draft.mode === 'survey') edit.surveyResponse = {questionResponses: this.questionResponses(draft)}
    else edit.nonResponse = {nonResponse: draft.nonResponse}

    this.saving = true
    this.rowError = ''
    this.contactRecordService.editActivityEntry(edit).subscribe(
      (result: any) => {
        this.saving = false
        if(result?.error){
          this.rowError = result.error
          return
        }
        const saved = result?.record || {}
        row.surveyResponse = saved.surveyResponse
        row.nonResponse = saved.nonResponse
        row.complete = saved.complete
        row.editHistory = saved.editHistory
        this.changed = true
        this.closeEditor()
        this.snackBar.open('Entry updated.', 'Dismiss', {duration: 2500})
      },
      error => {
        console.log(error)
        this.saving = false
        this.rowError = 'A problem with the server prevented saving this entry.'
      }
    )
  }

  //////////////////////// CLOSE ////////////////////////

  async close(){
    if(this.saving) return
    if(this.draftDirty && !(await confirmAction(this.dialog, {title: 'Discard your unsaved changes?', message: 'Your edits to this entry will be lost.', danger: true}))) return
    this.dialogRef.close(this.changed)
  }
}
