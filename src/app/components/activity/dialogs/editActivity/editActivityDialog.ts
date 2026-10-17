import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';

//SERVICES
import {UserService} from '../../../../services/user.service'
import {OrganizationService} from '../../../../services/organization/organization.service'
import {ActivityService} from '../../../../services/activity.service'
import {GroupService} from '../../../../services/group.service'
import {SurveyService} from '../../../../services/survey.service'
import { SignalWireService } from 'src/app/services/signalWire.service';
import { TextingService } from 'src/app/services/texting.service';

//MODELS
import {User} from '../../../../models/user.model';
import {Organization} from '../../../../models/organization.model';
import {Activity, TextMetaData, InitTextMsg, TextingTemplate} from '../../../../models/activity.model'
import {Survey} from '../../../../models/survey.model'
import {NonResponseSet} from '../../../../models/nonResponseSet.model'
import { Group } from 'src/app/models/group.model';
import { PetitionSettings, petitionSettings, petitionMetadata, petitionSummary } from '../../../../utils/petitionSettings';
import { choiceCoverageError } from '../../../campaign-map/dialogs/surveys/surveyQuestionsEditor/surveyQuestionsEditor';
import { passLabel } from '../../../../pipes/passLabel.pipe';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    templateUrl: './editActivityDialog.html',
    providers: [{provide: STEPPER_GLOBAL_OPTIONS, useValue: {showError: true, displayDefaultIndicatorType: false}}],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class EditActivityDialog implements OnInit{

  activityID: string = ''
  activityType: string = ''
  dev: boolean = false

  // Form
  name: string = ''
  description: string = ''
  enableTexting: boolean = false
  optinOption: boolean = false
  selectedUserIDs: string[] = []
  selectedOrgIDs: string[] = []
  scriptLink: string = ''
  patchThroughNumber: string = ''
  petition: PetitionSettings = petitionSettings(null)
  questionsToHide: string[] = []
  tagsToHide: string[] = []
  // This org's tags, for the Hide tags step
  orgTags: string[] = []

  // Texting form
  textingCampaignID: string = ''
  activityPhonenumber: string = ''
  initTextMsgs: InitTextMsg[] = []
  defaultInitTextMsg: InitTextMsg | undefined
  quickResponses: string[] = []

  // Loaded data
  users: User[] = []
  campaignOrgs: Organization[] = []
  survey: Survey
  surveyName: string = ''
  groupName: string = ''
  nonResponseSetName: string = ''
  allTextingOperations: any[] = []

  // Active operations, plus this activity's saved one if it has since gone inactive
  get textingOperations(): any[] {
    return this.allTextingOperations.filter(op => op.state === 'active' || op.id === this.textingCampaignID)
  }
  textingTemplates: TextingTemplate[] = []
  availableTextingNumbers: string[] = []
  loadingAvailableTextingNumbers: boolean = false
  private numbersToken = 0

  userURL: string = ''
  generatingLink: boolean = false

  loading: boolean = true
  loadFailed: boolean = false
  saving: boolean = false
  resetting: boolean = false
  errorMessage: string = ''
  nameError: string = ''

  // Something changed server side; the caller reloads activities
  changed: boolean = false

  private snapshot: string = ''

  constructor(public dialogRef: MatDialogRef<EditActivityDialog>,
        @Inject(MAT_DIALOG_DATA) public activity: Activity,
        public userService: UserService,
        public activityService: ActivityService,
        public groupService: GroupService,
        public orgService: OrganizationService,
        public surveyService: SurveyService,
        public swService: SignalWireService,
        private textingService: TextingService,
        private snackBar: MatSnackBar,
        public dialog: MatDialog,
        ) {
          this.activityID = activity._id
          this.activityType = activity.activityType
        }

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
    this.dev = !!JSON.parse(sessionStorage.getItem('user') || '{}')?.dev

    this.load()
    this.getTextingTemplates()
    this.getOrgSWCampaigns()
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

    forkJoin({
      activity: this.activityService.getActivity(this.activityID),
      users: this.orgService.getCampaignUsers(this.campaignID, this.orgID),
      orgs: this.orgService.getCampaignOrgs(this.campaignID),
      // Without tags the Hide tags step just doesn't show
      tags: this.orgService.getOrgTags(this.orgID).pipe(catchError(error => { console.log(error); return of([]) })),
    }).subscribe(
      ({activity, users, orgs, tags}) => {
        this.orgTags = ((tags as string[]) || []).filter(tag => !!tag)
        this.activity = activity as Activity
        this.activityType = this.activity.activityType

        // The creating user and org are always kept and aren't selectable
        this.users = ((users as User[]) || []).filter(user => user._id !== this.activity.userIDs[0])
        this.campaignOrgs = ((orgs as Organization[]) || []).filter(org => org._id !== this.activity.orgIDs[0])

        this.loadForm()
        this.snapshot = this.serialize()
        this.loading = false

        this.getSurvey()
        if(this.activityType !== 'Petition'){
          this.getGroup()
          this.getNonResponseSet()
        }
      },
      error => {
        console.log(error)
        this.loading = false
        this.loadFailed = true
        this.errorMessage = 'Couldn\'t load this activity.'
      }
    )
  }

  private loadForm(){
    const activity = this.activity

    this.name = activity.name || ''
    this.description = activity.description || ''
    this.enableTexting = !!activity.enableTexting
    this.optinOption = !!activity.optinOption
    this.selectedUserIDs = (activity.userIDs || []).slice(1)
    this.selectedOrgIDs = (activity.orgIDs || []).slice(1)
    this.scriptLink = activity.scriptLink ? String(activity.scriptLink) : ''
    this.patchThroughNumber = activity.patchThroughNumber || ''
    this.questionsToHide = [...(activity.questionsToHide || [])]
    this.tagsToHide = [...(activity.tagsToHide || [])]

    this.petition = petitionSettings(activity.petitionMetadata)

    const meta = activity.textMetaData
    this.initTextMsgs = (meta?.initTextMsgs || []).map(item => ({...item}))
    this.quickResponses = [...(meta?.quickResponses || [])]
    const savedDefault = meta?.defaultInitTextMsg
    this.defaultInitTextMsg = savedDefault ? this.initTextMsgs.find(item => item.msg === savedDefault.msg && (item.imageUrl || '') === (savedDefault.imageUrl || '')) : undefined
    this.updateDefaultInitTextMsg()

    this.textingCampaignID = meta?.textingCampaignID || ''
    this.activityPhonenumber = meta?.activityPhonenumber || ''
    if(this.textingCampaignID) this.getAvailableTextingNumbers(this.textingCampaignID)
  }

  getGroup(){
    this.groupService.getGroup(this.activity.groupID).subscribe(
      (group: Group) => {
        this.groupName = group ? group.name : 'Group no longer exists'
      },
      error => {
        console.log(error)
        this.groupName = 'Couldn\'t load'
      }
    )
  }

  getSurvey(){
    this.surveyService.getSurvey(this.activity.surveyID).subscribe(
      (survey: Survey) => {
        this.survey = survey
        this.surveyName = survey ? survey.name : 'Survey no longer exists'
      },
      error => {
        console.log(error)
        this.surveyName = 'Couldn\'t load'
      }
    )
  }

  getNonResponseSet(){
    this.surveyService.getNonResponseSet(this.activity.nonResponseSetID).subscribe(
      (nonResponseSet: NonResponseSet) => {
        this.nonResponseSetName = nonResponseSet ? nonResponseSet.name : 'Nonresponse set no longer exists'
      },
      error => {
        console.log(error)
        this.nonResponseSetName = 'Couldn\'t load'
      }
    )
  }

  getOrgSWCampaigns(){
    this.swService.getOrgSWCampaigns(this.orgID, this.campaignID, true).subscribe(
      (result: any[]) => { this.allTextingOperations = Array.isArray(result) ? result : [] },
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
        const numbers = [...(availableTextingNumbers || [])]

        // The activity's own number is in use, so the server leaves it out
        const saved = this.activity.textMetaData
        if(saved?.activityPhonenumber && saved.textingCampaignID === textCampaignID && !numbers.includes(saved.activityPhonenumber)){
          numbers.push(saved.activityPhonenumber)
        }
        this.availableTextingNumbers = numbers
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

  //////////////////////// TEXTING ////////////////////////

  get textingOn(): boolean {
    return this.activityType === 'Texting' || this.enableTexting
  }

  // Step summaries shown under each stepper label
  get textingSummary(): string {
    const operation = this.textingOperations.find(op => op.id === this.textingCampaignID)?.name || 'No operation'
    const count = this.initTextMsgs.length
    return `${operation} · ${count} ${count === 1 ? 'message' : 'messages'}`
  }

  get accessSummary(): string {
    const users = this.selectedUserIDs.length
    const orgs = this.selectedOrgIDs.length
    if(!users && !orgs) return 'Only the creator'
    return `${users} ${users === 1 ? 'user' : 'users'} · ${orgs} ${orgs === 1 ? 'org' : 'orgs'} added`
  }

  // Blocks Save and belongs to the texting step (the name error belongs to Basic info)
  get textingError(): string {
    return this.textingOn && this.name.trim() ? this.validationError : ''
  }

  updateDefaultInitTextMsg(){
    if(this.initTextMsgs.length === 1){
      this.defaultInitTextMsg = this.initTextMsgs[0]
    } else if(!this.initTextMsgs.includes(this.defaultInitTextMsg)){
      this.defaultInitTextMsg = undefined
    }
  }

  onTextingTemplateChange(event: MatSelectChange){
    const template: TextingTemplate = event.value;
    if(!template) return;

    this.initTextMsgs = template.initTextMsgs.map(item => ({...item}));
    this.quickResponses = [...template.quickResponses];
    this.updateDefaultInitTextMsg();
  }

  //////////////////////// SURVEY ////////////////////////

  toggleHiddenQuestion(question: string){
    const index = this.questionsToHide.indexOf(question)
    if(index === -1) this.questionsToHide.push(question)
    else this.questionsToHide.splice(index, 1)
  }

  //////////////////////// TAGS ////////////////////////

  // Names this org doesn't have (e.g. hidden by a partner org) stay in the list untouched
  toggleHiddenTag(tag: string){
    const index = this.tagsToHide.indexOf(tag)
    if(index === -1) this.tagsToHide.push(tag)
    else this.tagsToHide.splice(index, 1)
  }

  get hiddenOrgTagCount(): number {
    return this.orgTags.filter(tag => this.tagsToHide.includes(tag)).length
  }

  //////////////////////// SAVE ////////////////////////

  private serialize(): string {
    return JSON.stringify([
      this.name.trim(), this.description.trim(), this.enableTexting, this.optinOption,
      [...this.selectedUserIDs].sort(), [...this.selectedOrgIDs].sort(),
      this.scriptLink.trim(), this.patchThroughNumber.trim(),
      this.petition,
      [...this.questionsToHide].sort(),
      [...this.tagsToHide].sort(),
      this.textingCampaignID, this.activityPhonenumber,
      this.initTextMsgs, this.initTextMsgs.indexOf(this.defaultInitTextMsg), this.quickResponses,
    ])
  }

  get hasChanges(): boolean {
    return !this.loading && !this.loadFailed && this.serialize() !== this.snapshot
  }

  // The orgs in this activity, with names for messages
  private get activityOrgs(): {_id: string, name: string}[] {
    const ownerID = this.activity?.orgIDs?.[0]
    const owner = {_id: ownerID, name: sessionStorage.getItem('orgName') || 'Your organization'}
    const others = this.selectedOrgIDs.map(id => ({_id: id, name: this.campaignOrgs.find(o => o._id === id)?.name || id}))
    return ownerID ? [owner, ...others] : others
  }

  // Hiding questions must leave every org a single/multi-select question, or its volunteers can't Submit
  get hiddenQuestionsError(): string {
    if(!this.survey?.questions?.length || !this.questionsToHide.length) return ''
    const orgs = this.activityOrgs
    // A gap the survey already has (e.g. org-scoped questions) is fixed in the survey, not here
    if(choiceCoverageError(this.survey.questions, orgs)) return ''
    return choiceCoverageError(this.survey.questions, orgs, this.questionsToHide)
  }

  // Shown in the Hidden questions step when the survey itself leaves an org without a choice question
  get surveyChoiceWarning(): string {
    if(!this.survey?.questions?.length) return ''
    const error = choiceCoverageError(this.survey.questions, this.activityOrgs)
    return error ? `${error} Edit the survey so every organization has one; until then their volunteers can only record non-responses.` : ''
  }

  get validationError(): string {
    if(!this.name.trim()) return 'The activity needs a name.'
    if(this.hiddenQuestionsError) return this.hiddenQuestionsError
    if(this.textingOn){
      if(!this.textingCampaignID) return 'Choose a texting operation.'
      if(this.initTextMsgs.length === 0) return 'Add at least one initial text message.'
      if(this.activityType === 'Texting' && this.initTextMsgs.length > 1 && !this.defaultInitTextMsg) return 'Choose a default initial text message.'
      if(!this.loadingAvailableTextingNumbers && this.availableTextingNumbers.length === 0) return 'This texting operation has no available numbers.'
      if(!this.activityPhonenumber) return 'Choose a texting number.'
    }
    return ''
  }

  get busy(): boolean {
    return this.saving || this.loading || this.resetting
  }

  save(){
    if(this.busy || !this.hasChanges) return
    if(this.validationError){
      this.errorMessage = this.validationError
      return
    }

    const editedActivity: Activity = {
      ...this.activity,
      name: this.name.trim(),
      description: this.description.trim(),
      enableTexting: this.enableTexting,
      optinOption: this.optinOption,
      orgIDs: [this.activity.orgIDs[0], ...this.selectedOrgIDs],
      userIDs: [this.activity.userIDs[0], ...this.selectedUserIDs],
      questionsToHide: this.questionsToHide,
      tagsToHide: this.tagsToHide,
    }

    if(this.textingOn){
      const textMetaData: TextMetaData = {
        quickResponses: this.quickResponses,
        initTextMsgs: this.initTextMsgs,
        defaultInitTextMsg: this.defaultInitTextMsg,
        textingCampaignID: this.textingCampaignID,
        activityPhonenumber: this.activityPhonenumber,
      }
      editedActivity.textMetaData = textMetaData
    } else {
      delete editedActivity.textMetaData
    }

    if(this.activityType === 'Phonebank'){
      editedActivity.scriptLink = this.scriptLink.trim() as any
      editedActivity.patchThroughNumber = this.patchThroughNumber.trim()
    }

    if(this.activityType === 'Petition'){
      editedActivity.petitionMetadata = petitionMetadata(this.petition)
    }

    this.saving = true
    this.errorMessage = ''
    this.nameError = ''

    this.activityService.saveActivityEdits(editedActivity).subscribe(
      (result: any) => {
        this.saving = false
        if(!result){
          // The server rejects a duplicate name or a default message that isn't in the list
          this.nameError = 'An activity with that name may already exist in this campaign.'
          this.errorMessage = 'The activity could not be saved. Check the name and default message.'
          return
        }
        this.snackBar.open('Activity saved.', 'Dismiss', {duration: 2500})
        this.dialogRef.close(true)
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'A problem with the server prevented the update. Please try again.'
      }
    )
  }

  //////////////////////// STATUS ////////////////////////

  get canReset(): boolean {
    return ['Phonebank', 'Canvass', 'Texting'].includes(this.activityType)
  }

  async resetActivity(){
    if(this.busy) return
    if(!(await confirmAction(this.dialog, {title: `Start the ${passLabel((this.activity.passes || 0) + 1)} of "${this.activity.name}"?`, message: "Households that weren't completed become available again.", confirmLabel: 'Start', cancelLabel: 'Cancel'}))) return

    this.resetting = true
    this.errorMessage = ''

    this.activityService.resetActivity(this.activityID).subscribe(
      (activity: Activity) => {
        this.resetting = false
        this.changed = true
        if(activity) this.activity.passes = activity.passes
        this.snackBar.open('Activity reset.', 'Dismiss', {duration: 2500})
      },
      error => {
        console.log(error)
        this.resetting = false
        this.errorMessage = 'A problem with the server prevented the reset. Please try again.'
      }
    )
  }

  async deactivate(){
    if(this.busy) return
    if(!(await confirmAction(this.dialog, {title: `Deactivate "${this.activity.name}"?`, message: "Volunteers won't see it until it's reactivated.", confirmLabel: 'Deactivate', cancelLabel: 'Cancel', danger: true}))) return
    this.runAndClose(this.activityService.toggleActiveActivity(this.activityID), 'The activity could not be deactivated.')
  }

  async deleteActivity(){
    if(this.busy) return
    if(!(await confirmAction(this.dialog, {title: `Permanently delete "${this.activity.name}" and all of its records?`, message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) return
    this.runAndClose(this.activityService.deleteActivity(this.activityID, this.activityType), 'The activity could not be deleted.')
  }

  async cloneActivity(){
    if(this.busy) return
    if(!(await confirmAction(this.dialog, {title: `Clone "${this.activity.name}"?`, message: "The copy won't have a texting number.", confirmLabel: 'Clone', cancelLabel: 'Cancel'}))) return
    this.runAndClose(this.activityService.cloneActivity(this.activityID), 'The activity could not be cloned.')
  }

  private runAndClose(request: any, failMessage: string){
    this.saving = true
    this.errorMessage = ''

    request.subscribe(
      (result: unknown) => {
        this.saving = false
        if(!result){
          this.errorMessage = failMessage
          return
        }
        this.dialogRef.close(result)
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'A problem with the server prevented that. Please try again.'
      }
    )
  }

  removeAlreadyVoted(){
    this.runAndClose(this.activityService.removeAlreadyVoted(this.activityID), 'Already-voted contacts could not be removed.')
  }

  //////////////////////// LINKS ////////////////////////

  generateNewUserLink(){
    this.generatingLink = true

    const userDetails = {
      orgID: this.orgID,
      campaignID: this.campaignID,
      route: "/" + this.activityType.toLowerCase(),
      activityID: this.activityID
    }

    this.userService.generateNewUserLink(userDetails).subscribe(
      (link: any) => {
        this.generatingLink = false
        this.userURL = link?.url || ''
      },
      error => {
        console.log(error)
        this.generatingLink = false
        this.errorMessage = 'Couldn\'t generate a sign-up link.'
      }
    )
  }

  copy(text: string, label: string){
    navigator.clipboard?.writeText(text).then(
      () => this.snackBar.open(`${label} copied.`, 'Dismiss', {duration: 2500}),
      () => this.snackBar.open(`Could not copy the ${label.toLowerCase()}.`, 'Dismiss', {duration: 2500})
    )
  }

  //////////////////////// CLOSE ////////////////////////

  async close(){
    if(this.saving) return
    if(this.hasChanges && !(await confirmAction(this.dialog, {title: 'Discard unsaved changes?', message: 'Your edits to this activity will be lost.', danger: true}))) return
    this.dialogRef.close(this.changed ? true : null)
  }
}
