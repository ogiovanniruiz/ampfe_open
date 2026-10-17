import { Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { choiceCoverageError } from '../../../campaign-map/dialogs/surveys/surveyQuestionsEditor/surveyQuestionsEditor';

import { PetitionSettings, petitionMetadata, petitionSummary } from '../../../../utils/petitionSettings';

//SERVICES
import {CampaignService} from '../../../../services/campaign.service';
import {OrganizationService} from '../../../../services/organization/organization.service';
import {ActivityService} from '../../../../services/activity.service';
import {GroupService} from '../../../../services/group.service';
import {SurveyService} from '../../../../services/survey.service';
import { SignalWireService } from 'src/app/services/signalWire.service';
import { TextingService } from 'src/app/services/texting.service';

//MODELS
import { Organization } from '../../../../models/organization.model';
import { User } from '../../../../models/user.model';
import { Campaign } from 'src/app/models/campaign.model';
import { Activity, TextMetaData, InitTextMsg, TextingTemplate } from 'src/app/models/activity.model';
import { Group } from 'src/app/models/group.model';
import { Survey } from '../../../../models/survey.model'
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    templateUrl: './createActivityDialog.html',
    // Shares the Edit Activity look
    providers: [{provide: STEPPER_GLOBAL_OPTIONS, useValue: {showError: true, displayDefaultIndicatorType: false}}],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class CreateActivityDialog implements OnInit{

  @ViewChild(MatStepper) stepper?: MatStepper

  activityType: string = ''
  campaignName: string = ''
  private userID: string = ''

  // Form
  name: string = ''
  description: string = ''
  idBy: string = 'INDIVIDUAL'
  enableTexting: boolean = false
  optinOption: boolean = false
  surveyID: string = ''
  groupID: string = ''
  nonResponseSetID: string = ''
  selectedUserIDs: string[] = []
  selectedOrgIDs: string[] = []
  scriptLink: string = ''
  patchThroughNumber: string = ''
  questionsToHide: string[] = []
  tagsToHide: string[] = []
  // New petitions: voter check on, zip only, optional email
  petition: PetitionSettings = {checkVoterfile: true, includeAddress: false, requireAddress: false, includeEmail: true, requireEmail: false}

  // Texting form
  textingCampaignID: string = ''
  activityPhonenumber: string = ''
  initTextMsgs: InitTextMsg[] = []
  defaultInitTextMsg: InitTextMsg | undefined
  quickResponses: string[] = []

  // Loaded data
  electionType: string = ''
  geographical: boolean = false
  groups: Group[] = []
  surveys: Survey[] = []
  nonResponseSets: NonResponseSet[] = []
  users: User[] = []
  campaignOrgs: Organization[] = []
  // This org's tags, for the Hide tags step
  orgTags: string[] = []
  textingOperations: any[] = []
  textingTemplates: TextingTemplate[] = []
  availableTextingNumbers: string[] = []
  loadingAvailableTextingNumbers: boolean = false
  private numbersToken = 0

  loading: boolean = true
  loadFailed: boolean = false
  creating: boolean = false
  submitted: boolean = false
  errorMessage: string = ''
  nameError: string = ''

  constructor(public dialogRef: MatDialogRef<CreateActivityDialog>,
      public activityService: ActivityService,
      public campaignService: CampaignService,
      public groupService: GroupService,
      public orgService: OrganizationService,
      public router: Router,
      public surveyService: SurveyService,
      public swService: SignalWireService,
      private textingService: TextingService,
      private snackBar: MatSnackBar,
      private dialog: MatDialog
      ) {}

  get petitionSummary(): string {
    return petitionSummary(this.petition)
  }

  // A field that isn't on the form can't be required
  setPetitionInclude(field: 'address' | 'email', included: boolean){
    if(included) return
    if(field === 'address') this.petition.requireAddress = false
    else this.petition.requireEmail = false
  }

  ngOnInit(){
    this.activityType = sessionStorage.getItem('activityType') || ''
    this.campaignName = sessionStorage.getItem('campaignName') || ''
    this.userID = JSON.parse(sessionStorage.getItem('user') || '{}')?._id || ''

    this.load()
    this.getOrgSWCampaigns()
    this.getTextingTemplates()
  }

  private get campaignID(): number {
    return parseInt(sessionStorage.getItem('campaignID') || "-1")
  }

  private get orgID(): string {
    return sessionStorage.getItem('orgID') || ""
  }

  //////////////////////// LOAD ////////////////////////

  load(){
    this.loading = true
    this.loadFailed = false
    this.errorMessage = ''
    const campaignID = this.campaignID

    forkJoin({
      campaign: this.campaignService.getCampaign(campaignID),
      groups: this.groupService.getOrgGroups(campaignID, this.orgID),
      surveys: this.surveyService.getAllSurveys(this.orgID, campaignID),
      nonResponseSets: this.surveyService.getAllNonResponseSets(this.orgID, campaignID),
      orgs: this.orgService.getCampaignOrgs(campaignID),
      users: this.orgService.getCampaignUsers(campaignID, this.orgID),
      // Without tags the Hide tags step just doesn't show
      tags: this.orgService.getOrgTags(this.orgID).pipe(catchError(error => { console.log(error); return of([]) })),
    }).subscribe(
      ({campaign, groups, surveys, nonResponseSets, orgs, users, tags}) => {
        this.orgTags = ((tags as string[]) || []).filter(tag => !!tag)
        const camp = (campaign || {}) as Campaign
        this.electionType = camp.electionType || ''
        this.geographical = !!camp.geographical

        let usable = (groups as Group[]) || []
        if(this.geographical || this.activityType === 'Canvass'){
          usable = usable.filter(group => group.includesPolygon || group.groupBy === 'MEMBERSHIP')
        }
        if(this.electionType === 'Nonpolitical Purpose'){
          usable = usable.filter(group => group.groupBy === 'MEMBERSHIP')
        }
        this.groups = usable

        this.surveys = ((surveys as Survey[]) || []).filter(survey => survey.active && (survey.campaignIDs || []).includes(campaignID))
        this.nonResponseSets = ((nonResponseSets as NonResponseSet[]) || []).filter(set => set.active && (set.campaignIDs || []).includes(campaignID))
        this.campaignOrgs = ((orgs as Organization[]) || []).filter(org => org._id !== this.orgID)
        this.users = ((users as User[]) || []).filter(user => user._id !== this.userID)

        // One choice is the only choice
        if(this.surveys.length === 1) this.surveyID = this.surveys[0]._id
        if(this.groups.length === 1) this.groupID = this.groups[0]._id
        if(this.nonResponseSets.length === 1) this.nonResponseSetID = this.nonResponseSets[0]._id

        this.loading = false
      },
      error => {
        console.log(error)
        this.loading = false
        this.loadFailed = true
        this.errorMessage = 'Couldn\'t load the campaign\'s surveys and groups.'
      }
    )
  }

  getOrgSWCampaigns(){
    this.swService.getOrgSWCampaigns(this.orgID, this.campaignID).subscribe(
      (result: any[]) => { this.textingOperations = result || [] },
      error => { console.log(error) }
    )
  }

  getTextingTemplates(){
    this.textingService.getTextingTemplates(this.campaignID).subscribe(
      (textingTemplates: any[]) => { this.textingTemplates = textingTemplates || [] },
      error => { console.log(error) }
    )
  }

  getAvailableTextingNumbers(textCampaignID: string){
    const token = ++this.numbersToken
    this.loadingAvailableTextingNumbers = true
    this.availableTextingNumbers = []

    this.textingService.getAvailableTextingNumbers(textCampaignID, this.campaignID, this.orgID).subscribe(
      (availableTextingNumbers: string[]) => {
        if(token !== this.numbersToken) return
        this.availableTextingNumbers = [...new Set(availableTextingNumbers || [])]
        this.loadingAvailableTextingNumbers = false
      },
      error => {
        console.log(error)
        if(token !== this.numbersToken) return
        this.loadingAvailableTextingNumbers = false
        this.errorMessage = 'Couldn\'t load texting numbers for that operation.'
      }
    )
  }

  onTextingOperationChange(event: MatSelectChange){
    this.activityPhonenumber = ''
    this.getAvailableTextingNumbers(event.value)
  }

  //////////////////////// PREREQUISITES ////////////////////////

  get needsGroup(): boolean {
    return this.activityType !== 'Petition'
  }

  // What the campaign is missing before this kind of activity can be created
  get missingItems(): string[] {
    if(this.loading || this.loadFailed) return []
    const missing: string[] = []
    if(!this.surveys.length) missing.push('An active survey for this campaign')
    if(this.needsGroup){
      if(!this.nonResponseSets.length) missing.push('An active nonresponse set for this campaign')
      if(!this.groups.length){
        if(this.electionType === 'Nonpolitical Purpose') missing.push('A group based on a contact list')
        else if(this.geographical || this.activityType === 'Canvass') missing.push('A geographical group (drawn on the map) or a contact-list group')
        else missing.push('A group')
      }
    }
    return missing
  }

  get groupHint(): string {
    if(this.electionType === 'Nonpolitical Purpose') return 'Only contact-list groups can be used in this campaign'
    if(this.geographical || this.activityType === 'Canvass') return 'Only geographical and contact-list groups are listed'
    return ''
  }

  goToCampaignMap(){
    this.router.navigate(['/campaignMap'])
    this.dialogRef.close()
  }

  //////////////////////// TEXTING ////////////////////////

  get textingOn(): boolean {
    return this.activityType === 'Texting' || this.enableTexting
  }

  updateDefaultInitTextMsg(){
    if(this.initTextMsgs.length === 1){
      this.defaultInitTextMsg = this.initTextMsgs[0]
    } else if(!this.initTextMsgs.includes(this.defaultInitTextMsg)){
      this.defaultInitTextMsg = undefined
    }
  }

  onTextingTemplateChange(event: MatSelectChange){
    const template: TextingTemplate = event.value
    if(!template) return

    this.initTextMsgs = template.initTextMsgs.map(item => ({...item}))
    this.quickResponses = [...template.quickResponses]
    this.updateDefaultInitTextMsg()
  }

  //////////////////////// USERS ////////////////////////

  selectAllUsers(){
    this.selectedUserIDs = this.users.map(user => user._id)
  }

  clearUsers(){
    this.selectedUserIDs = []
  }

  //////////////////////// SUMMARIES ////////////////////////

  get linkedSummary(): string {
    const survey = this.surveys.find(s => s._id === this.surveyID)?.name
    if(!this.needsGroup) return survey || 'Choose a survey'
    const group = this.groups.find(g => g._id === this.groupID)?.name
    return [survey, group].filter(Boolean).join(' · ') || 'Choose a survey, group and nonresponse set'
  }

  get textingSummary(): string {
    const operation = this.textingOperations.find(op => op.id === this.textingCampaignID)?.name || 'No operation'
    const count = this.initTextMsgs.length
    return `${operation} · ${count} ${count === 1 ? 'message' : 'messages'}`
  }

  get accessSummary(): string {
    const users = this.selectedUserIDs.length
    const orgs = this.selectedOrgIDs.length
    if(!users && !orgs) return 'Only you and your organization'
    return `${users} ${users === 1 ? 'user' : 'users'} · ${orgs} ${orgs === 1 ? 'org' : 'orgs'} added`
  }

  //////////////////////// HIDDEN QUESTIONS AND TAGS ////////////////////////

  get selectedSurvey(): Survey | undefined {
    return this.surveys.find(s => s._id === this.surveyID)
  }

  // Only questions in the chosen survey count, so switching surveys drops the others
  get hiddenQuestions(): string[] {
    const questions = (this.selectedSurvey?.questions || []).map(q => q.question)
    return this.questionsToHide.filter(question => questions.includes(question))
  }

  toggleHiddenQuestion(question: string){
    const index = this.questionsToHide.indexOf(question)
    if(index === -1) this.questionsToHide.push(question)
    else this.questionsToHide.splice(index, 1)
  }

  toggleHiddenTag(tag: string){
    const index = this.tagsToHide.indexOf(tag)
    if(index === -1) this.tagsToHide.push(tag)
    else this.tagsToHide.splice(index, 1)
  }

  // Your org first, then the ones added, with names for messages
  private get activityOrgs(): {_id: string, name: string}[] {
    const owner = {_id: this.orgID, name: sessionStorage.getItem('orgName') || 'Your organization'}
    return [owner, ...this.selectedOrgIDs.map(id => ({_id: id, name: this.campaignOrgs.find(o => o._id === id)?.name || id}))]
  }

  // Same rule as Edit activity: hiding must leave every org a single/multi-select question
  get hiddenQuestionsError(): string {
    const questions = this.selectedSurvey?.questions || []
    if(!questions.length || !this.hiddenQuestions.length) return ''
    if(choiceCoverageError(questions, this.activityOrgs)) return ''
    return choiceCoverageError(questions, this.activityOrgs, this.hiddenQuestions)
  }

  get surveyChoiceWarning(): string {
    const questions = this.selectedSurvey?.questions || []
    if(!questions.length) return ''
    const error = choiceCoverageError(questions, this.activityOrgs)
    return error ? `${error} Edit the survey so every organization has one; until then their volunteers can only record non-responses.` : ''
  }

  //////////////////////// VALIDATION ////////////////////////

  get basicError(): string {
    return this.name.trim() ? '' : 'The activity needs a name.'
  }

  get linkedError(): string {
    if(!this.surveyID) return 'Choose a survey.'
    if(this.needsGroup){
      if(!this.groupID) return 'Choose a group.'
      if(!this.nonResponseSetID) return 'Choose a nonresponse set.'
    }
    return ''
  }

  get textingError(): string {
    if(!this.textingOn) return ''
    if(!this.textingCampaignID) return 'Choose a texting operation.'
    if(this.initTextMsgs.length === 0) return 'Add at least one initial text message.'
    if(this.activityType === 'Texting' && this.initTextMsgs.length > 1 && !this.defaultInitTextMsg) return 'Choose a default initial text message.'
    if(!this.loadingAvailableTextingNumbers && this.availableTextingNumbers.length === 0) return 'This texting operation has no available numbers.'
    if(!this.activityPhonenumber) return 'Choose a texting number.'
    return ''
  }

  get validationError(): string {
    return this.basicError || this.linkedError || this.textingError || this.hiddenQuestionsError
  }

  // Order matches the steps in the template
  private get stepKeys(): string[] {
    return [
      'basic', 'linked',
      ...(this.textingOn ? ['texting'] : []),
      ...(this.activityType === 'Petition' ? ['petition'] : []),
      ...(this.activityType === 'Phonebank' ? ['phonebank'] : []),
      'access',
      ...(this.selectedSurvey?.questions?.length ? ['questions'] : []),
      ...(this.orgTags.length ? ['tags'] : []),
    ]
  }

  get hasInput(): boolean {
    return !!(this.name.trim() || this.description.trim() || this.initTextMsgs.length || this.quickResponses.length
      || this.selectedUserIDs.length || this.selectedOrgIDs.length || this.scriptLink.trim() || this.patchThroughNumber.trim()
      || this.questionsToHide.length || this.tagsToHide.length)
  }

  //////////////////////// CREATE ////////////////////////

  create(){
    if(this.creating || this.loading) return

    if(this.validationError){
      this.submitted = true
      const failing = this.basicError ? 'basic' : this.linkedError ? 'linked' : this.textingError ? 'texting' : 'questions'
      const index = this.stepKeys.indexOf(failing)
      if(this.stepper && index > -1) this.stepper.selectedIndex = index
      return
    }

    const newActivity: Activity = {
      name: this.name.trim(),
      activityType: this.activityType,
      description: this.description.trim(),
      campaignID: this.campaignID,
      orgIDs: [this.orgID, ...this.selectedOrgIDs],
      userIDs: [this.userID, ...this.selectedUserIDs],
      surveyID: this.surveyID,
      passes: 0,
      active: true,
      hhReady: false,
      idBy: this.idBy,
      enableTexting: this.enableTexting,
      optinOption: this.activityType !== 'Petition' && this.optinOption,
      notes: '',
      complete: false,
      questionsToHide: this.hiddenQuestions,
      tagsToHide: this.tagsToHide,
    }

    if(this.needsGroup){
      newActivity.groupID = this.groupID
      newActivity.nonResponseSetID = this.nonResponseSetID
    }

    if(this.textingOn){
      const textMetaData: TextMetaData = {
        quickResponses: this.quickResponses,
        initTextMsgs: this.initTextMsgs,
        defaultInitTextMsg: this.defaultInitTextMsg,
        textingCampaignID: this.textingCampaignID,
        activityPhonenumber: this.activityPhonenumber,
      }
      newActivity.textMetaData = textMetaData
    }

    if(this.activityType === 'Phonebank'){
      newActivity.scriptLink = this.scriptLink.trim() as any
      newActivity.patchThroughNumber = this.patchThroughNumber.trim()
    }

    if(this.activityType === 'Petition'){
      newActivity.petitionMetadata = petitionMetadata(this.petition)
    }

    this.creating = true
    this.errorMessage = ''
    this.nameError = ''

    this.activityService.createActivity(newActivity).subscribe(
      (success: any) => {
        this.creating = false
        if(!success){
          // The server rejects a duplicate name or a default message that isn't in the list
          this.nameError = 'An activity with that name may already exist in this campaign.'
          this.errorMessage = 'The activity could not be created. Check the name and default message.'
          if(this.stepper) this.stepper.selectedIndex = 0
          return
        }
        this.snackBar.open(`"${newActivity.name}" created.`, 'Dismiss', {duration: 2500})
        this.dialogRef.close(true)
      },
      error => {
        console.log(error)
        this.creating = false
        this.errorMessage = 'A problem with the server prevented creating the activity. Please try again.'
      }
    )
  }

  async close(){
    if(this.creating) return
    if(this.hasInput && !(await confirmAction(this.dialog, {title: 'Discard this new activity?', message: 'Its details will be lost.', danger: true}))) return
    this.dialogRef.close()
  }
}
