import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {MatBottomSheet} from '@angular/material/bottom-sheet';

import { PlatformLocation } from '@angular/common'
declare const Relay: any;

//SERVICES
import {ActivityService} from '../../services/activity.service'
import {OrganizationService} from '../../services/organization/organization.service'
import {PhonebankService} from '../../services/phonebank.service'
import {SurveyService} from '../../services/survey.service'
import { SignalWireService } from 'src/app/services/signalWire.service';

//MODELS
import { User } from 'src/app/models/user.model';
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import {Activity, CallPool} from '../../models/activity.model'
import {  ActivityContactRecord, ActivityHouseholdRecord,  NonResponse,  PhonebankContactDetails, QuestionResponse, SurveyResponse } from '../../models/contact.record.model';

import {Survey, Question} from '../../models/survey.model'
import {Household, Resident, Person} from '../../models/person.model'
import { OptinFormBottomSheet } from '../optinForm/optinForm';
import { CampaignService } from 'src/app/services/campaign.service';
import { Campaign } from 'src/app/models/campaign.model';
import { SingularTextForm } from '../singularTextForm/singularTextForm';
import { formatPhone } from 'src/app/utils/phone';
import { ClientConfigService } from 'src/app/services/clientConfig.service';
import { AmplifyService } from 'src/app/services/amplify.service';
import { VoteCenter, VoteCenterProperties, isVoteCenter, hasPreciseLocation } from 'src/app/models/votecenter.model';
import { passLabel } from '../../pipes/passLabel.pipe';

const ALL_DONE_STATUS = 'Congratulations! All members of this list have been contacted.'

interface VisibleQuestion {
  question: Question;
  index: number;   // position in survey.questions; keys the answers
  number: number;  // shown to the caller
}

@Component({
  selector: 'app-swCalling',
  templateUrl: './swCalling.component.html',
  // Same look as the Twilio phonebank page (pb-*) and the canvass household dialog (hh-*)
  styleUrls: [
    '../../styles/dialog-common.scss',
    '../canvass/dialogs/householdDialog/householdDialog.scss',
    '../phonebank/phonebank.component.scss',
    './swCalling.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class SWCallingComponent implements OnInit, OnDestroy {

  client: any;
  currentCall = null;

  activity: Activity;
  survey: Survey;
  nonResponseSet: NonResponseSet;

  user: User;

  household: Household;
  activityHouseholdRecord: ActivityHouseholdRecord;
  // Household record the current call was placed from; the page may move on before it's recorded
  callingHouseholdRecord: ActivityHouseholdRecord;

  residentsCalled: string[] = [];
  residentsResponded: string[] = [];

  userPhoneNumber: string;
  // True while a call-pool number is reserved for this caller and not yet released
  holdingPoolNumber: boolean = false;
  residentCalling: Resident;

  inCall: boolean = false;
  showPartisan: boolean = false;
  showNearestPollingLocations: boolean = false;
  campaignLoaded: boolean = false;
  nearestPollingLocations: VoteCenter[] = [];
  gettingPollingLocations: boolean = false;
  // The household's map location is too rough to pick voting sites from
  pollingLocationApproximate: boolean = false;
  showPlaces: boolean = true;
  connecting: boolean = false;
  // Bumped by every Call, Hang up while reserving, and teardown; a pool reply for an older attempt must not dial
  private callAttempt: number = 0;
  displayErrorMsg: boolean = false;
  loading: boolean = true;
  allNumsInUse: boolean = false;
  submittingResponse: boolean = false;

  status: string = 'Loading Phonebank...';
  errorMessage: string = '';

  optinOption: boolean = false;

  demoVersion: boolean = environment.demoVersion;
  // Demo builds dial this instead of residents; it comes from the server (clientConfig)
  get testCallingNumber(): string { return this.clientConfig.testCallingNumber }

  tokenExpired: boolean = false

  // Residents whose Submit was missing a multiple-choice answer
  needsResponses = new Set<string>();

  // Questions this org sees (not hidden by the activity), numbered as shown
  visibleQuestions: VisibleQuestion[] = [];

  // answers[personID][question index]: a response, a list of responses (multi-select) or notes text
  answers: {[personID: string]: {[questionIndex: number]: any}} = {};
  // Per resident: why their last response didn't save, shown next to the answer buttons
  responseError: {[personID: string]: string} = {};

  constructor(public swService: SignalWireService, private activityService: ActivityService,
    private snackBar: MatSnackBar,
    private router: Router,
    public orgService: OrganizationService,
    private phonebankService: PhonebankService,
    public surveyService: SurveyService,
    location: PlatformLocation,
    private bottomSheet: MatBottomSheet,
    public campaignService: CampaignService,
    private clientConfig: ClientConfigService,
    public ampService: AmplifyService,
  ) {
      location.onPopState(() => this.teardownCalling());
  }

  ngOnInit(){
    this.user = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.clientConfig.load()

    this.getActivity()
    this.getCampaign()
    sessionStorage.removeItem('rdr')
    sessionStorage.setItem('activityType', "Phonebank")
  }

  ngOnDestroy(){
    this.teardownCalling()
  }

  // Ends any call in progress, frees the reserved call-pool number and closes the SignalWire socket.
  // Safe to run more than once (route change and back button can both trigger it).
  teardownCalling(){
    this.callAttempt++
    try {
      this.currentCall?.hangup()
    } catch(error) {
      console.log(error)
    }
    this.currentCall = null
    this.releasePoolNumber()
    try {
      this.client?.disconnect()
    } catch(error) {
      console.log(error)
    }
    this.client = undefined
    this.inCall = false
    this.connecting = false
  }

  //////////////////////// DISPLAY ////////////////////////

  get callerName(): string {
    return this.user?.name?.fullName || [this.user?.name?.firstName, this.user?.name?.lastName].filter(Boolean).join(' ')
  }

  get allDone(): boolean {
    return this.status === ALL_DONE_STATUS
  }

  // Short label and color for the call-state pill
  get statusKind(): 'ready' | 'connecting' | 'incall' | 'done' {
    if(this.connecting || this.status === 'Dialing...' || this.status === 'Connecting...') return 'connecting'
    if(this.inCall) return 'incall'
    if(this.allDone || /^Call (Complete|Hungup|Ended)/.test(this.status || '')) return 'done'
    return 'ready'
  }

  get statusLabel(): string {
    if(!this.status || this.tokenExpired) return this.tokenExpired ? 'Session expired' : ''
    if(this.allDone) return 'List complete'
    if(this.statusKind === 'connecting') return this.status === 'Dialing...' ? 'Dialing…' : 'Connecting…'
    if(this.statusKind === 'incall') return 'In call'
    if(this.statusKind === 'done') return 'Call complete'
    if(this.status === 'Ready to Call.') return 'Ready to call'
    return this.status.replace(/\.\.\.$/, '…').replace(/\.$/, '')
  }

  residentName(resident: Resident): string {
    return [resident.name?.firstName, resident.name?.middleName, resident.name?.lastName].filter(Boolean).join(' ') || 'Unnamed resident'
  }

  firstName(resident: Resident): string {
    const first = resident.name?.firstName || ''
    return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : 'this person'
  }

  isResponded(resident: Resident): boolean {
    return this.residentsResponded.includes(resident.personID)
  }

  isCalled(resident: Resident): boolean {
    return this.residentsCalled.includes(resident.personID)
  }

  // The number shown to the caller and the number dialed must be the same one
  getDialNumber(resident: Resident): string | null {
    const phone = (resident?.phones || []).find(p => p?.number && p.number.trim() !== '')
    return phone ? phone.number : null
  }

  formatPhone(value: string): string {
    return formatPhone(value)
  }

  isVoteCenter(site: VoteCenterProperties): boolean {
    return isVoteCenter(site)
  }

  trackResident(index: number, resident: Resident){
    return resident.personID
  }

  backToActivities(){
    this.router.navigate(['/activity'])
  }

  //////////////////////// ANSWERS ////////////////////////

  private buildVisibleQuestions(){
    const visible: VisibleQuestion[] = []
    ;(this.survey?.questions || []).forEach((question, index) => {
      if(this.shouldShowQuestion(question) && !this.shouldHideQuestion(question)){
        visible.push({question, index, number: visible.length + 1})
      }
    })
    this.visibleQuestions = visible
  }

  // Fresh answers for each new household's residents
  private resetAnswers(){
    this.answers = {}
    this.responseError = {}
    this.needsResponses.clear()
    for(const resident of this.household?.residents || []){
      this.answers[resident.personID] = {}
    }
  }

  isChecked(resident: Resident, questionIndex: number, response: string): boolean {
    const selected = this.answers[resident.personID]?.[questionIndex]
    return Array.isArray(selected) && selected.includes(response)
  }

  toggleOption(resident: Resident, questionIndex: number, response: string, checked: boolean){
    const current: string[] = Array.isArray(this.answers[resident.personID][questionIndex]) ? this.answers[resident.personID][questionIndex] : []
    this.answers[resident.personID][questionIndex] = checked
      ? (current.includes(response) ? current : [...current, response])
      : current.filter(value => value !== response)
    this.clearNeeds(resident)
  }

  clearNeeds(resident: Resident){
    this.needsResponses.delete(resident.personID)
  }

  // The page loads the activity once; every household the server hands out carries the activity's
  // current pass, so a reset made while this page is open is picked up here
  private syncPass(activityHouseholdRecord: ActivityHouseholdRecord){
    const currentPass = (activityHouseholdRecord as any)?.currentPass
    if(typeof currentPass !== 'number' || !this.activity || currentPass === this.activity.passes) return
    this.activity.passes = currentPass
    this.residentsCalled = []
    this.snackBar.open(`This activity moved to its ${passLabel(currentPass)}. Calls are now recorded on the ${passLabel(currentPass)}.`, 'Dismiss', {duration: 6000})
  }

  // A new household is on screen: fresh answers, and no leftover errors from the last one
  private showHousehold(activityHouseholdRecord: ActivityHouseholdRecord){
    this.syncPass(activityHouseholdRecord)
    this.household = activityHouseholdRecord.household;
    this.activityHouseholdRecord = activityHouseholdRecord;
    this.displayErrorMsg = false;
    this.allNumsInUse = false;
    this.resetAnswers();
    this.getPhonebankContactRecords(this.activity._id, this.household)
    this.nearestPollingLocations = []
    this.loadPollingLocations()
  }

  private showAllDone(){
    this.status = ALL_DONE_STATUS;
    this.household = null
    this.errorMessage = '';
    this.displayErrorMsg = false;
  }

  //////////////////////// LOAD ////////////////////////

  getCampaign(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || "-1");

    this.campaignService.getCampaign(campaignID).subscribe(
      (campaign: Campaign) =>{
        this.showPartisan = campaign.showPartisan;
        this.showNearestPollingLocations = campaign.showNearestPollingLocations;
        this.campaignLoaded = true;
        // A household may already be on screen if it loaded before the campaign
        this.loadPollingLocations()
      },
      error => console.log(error)
    )
  }

  loadPollingLocations(){
    this.pollingLocationApproximate = false
    if(!this.campaignLoaded || !this.showNearestPollingLocations || !this.household) return
    if(!hasPreciseLocation(this.household)){
      this.pollingLocationApproximate = true
      // A previous household's lookup may still be running; its reply is ignored
      this.gettingPollingLocations = false
      return
    }
    this.gettingPollingLocations = true;
    this.getVotingCenters()
  }

  getVotingCenters(){
    const household = this.household
    this.ampService.getNearestVoteCenters(household.location, household.county).subscribe(
      (nearestPollingLocations: VoteCenter[]) =>{
        // Ignore results for a household the caller has already moved past
        if(household !== this.household) return
        this.nearestPollingLocations = nearestPollingLocations
        this.gettingPollingLocations = false;
      },
      error =>{
        console.log(error)
        if(household === this.household) this.gettingPollingLocations = false;
      }
    )
  }

  getActivity(){
    this.status = "Loading Activity Details..."
    var activityID: string = sessionStorage.getItem('activityID');
    this.activityService.getActivity(activityID).subscribe(
      (activity: Activity) =>{
        this.activity = activity
        // Opt-in is an activity setting (it used to live on the shared survey)
        this.optinOption = !!activity.optinOption

        if(activity.active === false){
          this.handleInactiveActivity()
          return
        }

        this.getNonResponseSet(activity.nonResponseSetID);
        this.getSurvey(activity.surveyID);
        this.getSWToken();

        this.loading = false;
        this.status = null;
        this.lockHousehold();

    }, error=>{
      this.errorMessage = "Sorry, could not get activity. Please refresh to try again.";
      this.loading = false;
      this.displayErrorMsg = true;
      console.log(error)
    })
  }

  getSurvey(surveyID: string){
    this.surveyService.getSurvey(surveyID).subscribe(
      (survey: Survey) =>{
        this.survey = survey
        this.buildVisibleQuestions()
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.loading = false;
        this.errorMessage = 'There was a problem loading the survey. Please refresh the page.';
      }
    )
  }

  getNonResponseSet(nonResponseSetID: string){
    this.surveyService.getNonResponseSet(nonResponseSetID).subscribe(
      (nonResponseSet: NonResponseSet) =>{
        this.nonResponseSet = nonResponseSet
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.loading = false;
        this.errorMessage = 'There was a problem loading the survey. Please refresh the page.';
      }
    )
  }

  public getSWToken(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

    this.swService.getSWToken(orgID, campaignID).subscribe(
      (callingToken: any) =>{
        try {
          this.client = new Relay({project: callingToken['projectID'], token: callingToken['token']});
          this.client.on('signalwire.ready', this.ready)

          this.client.on('signalwire.socket.error', (error) => {console.log("SW ERROR: ", error)})
          this.client.on('signalwire.notification', this.handleNotification);
          this.client.on('signalwire.socket.close', function() {console.log("SOCKET CLOSED: DISCONNECTED")});
          this.client.enableMicrophone()

          this.client.remoteElement = 'remoteVideo';
          this.client.localElement = 'localVideo';
          this.client.connect()
        } catch(error) {
          console.log(error)
          this.client = undefined
          this.errorMessage = "Couldn't start the calling connection. Refresh the page to try again.";
          this.displayErrorMsg = true;
        }
      },
      error => {
        console.log(error)
        this.errorMessage = "Couldn't get a calling token. Refresh the page to try again.";
        this.displayErrorMsg = true;
      })
  }

  handleNotification = (notification) =>{
    switch (notification.type) {
      case 'callUpdate':
        this.handleCallUpdate(notification.call);
        break;
      case 'userMediaError':
        console.log("USER MEDIA ERROR")
        this.errorMessage = "Your microphone couldn't be used. Allow microphone access in your browser and try again.";
        this.displayErrorMsg = true;
        break;
      case 'participantData':
        console.log("Particpant Data")
        break;
      case 'refreshToken':
        this.status = "Calling token has expired. Refresh the page to create a new token."
        this.tokenExpired = true;
        break;
    }
  }

  handleCallUpdate(call) {
    this.currentCall = call
    switch (call.state) {
      case 'new':
        this.initCallToDB(call)
        break;
      case 'trying':
        this.updateCallStatus(call)
        this.status = "Dialing..."
        break;
      case 'early':
        this.updateCallStatus(call)
        break;
      case 'active':
        this.updateCallStatus(call)
        this.status = "Call Is Active."
        break;
      case 'hangup':
        this.callDisconnected(this.currentCall)
        this.status = "Call Hungup."
        break;
      case 'destroy':
        this.currentCall = null;
        this.status = "Call Ended."
        break;
      }
  }

  initCallToDB(call){

    var phonebankContactDetails: PhonebankContactDetails = {
      residentPhonenumber: call.options.destinationNumber,
      userPhonenumber: this.userPhoneNumber,
      CallSid: call.id
    }
    this.swService.swCall(phonebankContactDetails).subscribe(
      results => console.log(results),
      error => console.log(error)
    )

  }

  updateCallStatus(call){

    var callDetails = {state: call.state, id: call.id}

    this.swService.swCallStatus(callDetails).subscribe(
      results => console.log(results),
      error => console.log(error)
    )

  }

  ready = () =>{
    // SignalWire can fire this again after reconnecting; it must not hide the end of the list
    if(this.status === ALL_DONE_STATUS){
      return
    }
    this.status = 'Ready to Call.';
    this.tokenExpired = false;
  }

  // The activity was deactivated while this caller had the page open
  handleInactiveActivity(){
    // End any call and free its number; nothing more can be recorded for this activity
    this.callAttempt++
    this.currentCall?.hangup()
    this.inCall = false
    this.residentCalling = undefined
    this.releasePoolNumber()
    this.household = null
    this.loading = false
    this.connecting = false
    this.errorMessage = "This activity is no longer active. Please contact your administrator for more information.";
    this.displayErrorMsg = true;
    this.status = "Inactive Activity";
  }

  lockHousehold(){
    var activityID: string = sessionStorage.getItem('activityID');
    var userID: string = JSON.parse(sessionStorage.getItem('user') || '{}')._id;

    this.status = "Loading Household..."
    this.household = null
    this.loading = true

    this.phonebankService.lockHousehold(activityID, userID).subscribe(
      (activityHouseholdRecord: ActivityHouseholdRecord) =>{
        if(activityHouseholdRecord?.['inactive']){
          this.handleInactiveActivity()
          return
        }

        this.loading = false;

        if(!activityHouseholdRecord){
          this.showAllDone()
          return
        }

        this.status = null
        this.ready()
        this.showHousehold(activityHouseholdRecord)

      }, error=>{
        console.log(error)
        this.errorMessage = "There was an error locking the household. Please try again.";
        this.displayErrorMsg = true;
        this.loading = false;
      }
    )
  }


  getPhonebankContactRecords(activityID: string, household: Household){
    var userID: string = JSON.parse(sessionStorage.getItem('user') || '{}')._id

    this.phonebankService.getPhonebankContactRecords(activityID, household, userID, this.activity.passes).subscribe(
      (pbContactRecords: ActivityContactRecord[]) =>{
        this.residentsResponded = pbContactRecords.filter((pbContactRecords: ActivityContactRecord) =>{return (pbContactRecords.complete || (pbContactRecords.nonResponse && (pbContactRecords.pass === this.activity.passes)))})
                                                   .map((pbContactRecords: ActivityContactRecord) =>{return pbContactRecords.personID});

        this.residentsCalled = pbContactRecords.filter((pbContactRecords: ActivityContactRecord) =>{return (pbContactRecords.pass === this.activity.passes)})
                                               .map((pbContactRecords: ActivityContactRecord) =>{return pbContactRecords.personID});

      },
      error =>{
        this.errorMessage = "Sorry, could not get phonebank contact Records. Please refresh to try again.";
        this.loading = false;
        this.displayErrorMsg = true;
        console.log(error)
      }
    )
  }

  //////////////////////// RESPONSES ////////////////////////

  // Same shape as before: one entry per single-select answer, per checked multi-select option and per note
  generateQuestionResponses(resident: Resident): QuestionResponse[]{
    const questionResponses: QuestionResponse[] = [];
    const answers = this.answers[resident.personID] || {}

    for(const {question, index} of this.visibleQuestions){
      const value = answers[index]

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

  // Lets the server record a response even when the call never got linked to the resident
  private submitterDetails(){
    return {
      userID: JSON.parse(sessionStorage.getItem('user') || '{}')._id,
      orgID: sessionStorage.getItem('orgID') || '',
      campaignID: parseInt(sessionStorage.getItem('campaignID') || '-1'),
    }
  }

  // Shared by survey and non-response submissions: next household, the end of the list, or why it didn't save
  private handleSubmitted(resident: Resident, result: any){
    this.submittingResponse = false;
    this.loading = false;

    if(result?.inactive){
      this.handleInactiveActivity()
      return
    }

    if(result?.error){
      this.responseError[resident.personID] = result.error
      this.errorMessage = result.error
      this.displayErrorMsg = true
      return
    }

    delete this.responseError[resident.personID]
    if(!result){
      this.showAllDone()
      return
    }

    this.status = null
    this.ready()
    this.showHousehold(result)
  }

  private handleSubmitError(resident: Resident, error: any){
    console.log(error)
    this.responseError[resident.personID] = "Couldn't save this response. Your answers are still here, so try again. If it keeps failing, skip the household and let your organizer know."
    this.errorMessage = "Couldn't save this response. Your answers are still here, so try again. If it keeps failing, skip the household and let your organizer know."
    this.displayErrorMsg = true;
    this.loading = false;
    this.submittingResponse = false;
  }

  submitSurveyResponse(resident: Resident){
    if(this.submittingResponse) return
    var questionResponses: QuestionResponse[] = this.generateQuestionResponses(resident);

    if(questionResponses.length === 0 || !questionResponses.some(obj => obj.questionType === "SINGLESELECT" || obj.questionType === "MULTISELECT")){
      this.needsResponses.add(resident.personID);
      return;
    }
    this.submittingResponse = true;
    this.needsResponses.delete(resident.personID);

    var activityHouseholdRecordID: string = this.activityHouseholdRecord._id

    var surveyResponse: SurveyResponse = {questionResponses, surveyID: this.survey._id}

    var passes: number = this.activity.passes

    var surveyResponseSubmission = {surveyResponse, resident, activityHouseholdRecordID, passes, ...this.submitterDetails()}

    this.phonebankService.submitSurveyResponse(surveyResponseSubmission).subscribe(
      result => this.handleSubmitted(resident, result),
      error => this.handleSubmitError(resident, error))
  }

  submitNonResponse(resident: Resident, nonResponse: string, nonResponseType: string){
    if(this.submittingResponse) return
    this.submittingResponse = true;
    this.needsResponses.delete(resident.personID);

    var activityHouseholdRecordID: string = this.activityHouseholdRecord._id
    var nonResponseObject: NonResponse = {nonResponse: nonResponse,
                                          nonResponseType: nonResponseType,
                                          nonResponseSetID: this.nonResponseSet._id}

    var passes: number = this.activity.passes

    var nonResponseSubmission = {nonResponseObject, resident, activityHouseholdRecordID, passes, ...this.submitterDetails()}

    this.phonebankService.submitNonResponse(nonResponseSubmission).subscribe(
      result => this.handleSubmitted(resident, result),
      error => this.handleSubmitError(resident, error))
  }

  //////////////////////// CALLING ////////////////////////

  call(resident: Resident){
    if(this.inCall || this.connecting) return

    if(!this.client){
      this.errorMessage = "The calling connection isn't ready. Refresh the page to try again.";
      this.displayErrorMsg = true;
      return
    }

    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

    // A demo build must never fall back to a resident's real number
    if(this.demoVersion && !this.testCallingNumber){
      this.errorMessage = "Test number isn't configured on the server, so demo calls and texts are turned off."
      this.displayErrorMsg = true
      return
    }
    var dialNumber = this.demoVersion ? this.testCallingNumber : this.getDialNumber(resident)
    if(!dialNumber){
      this.errorMessage = "This resident has no phone number to call."
      this.displayErrorMsg = true
      return
    }
    var phone: string = '+1' + dialNumber

    this.inCall = true;
    this.status = "Connecting..."
    this.connecting = true;
    this.displayErrorMsg = false;
    const attempt = ++this.callAttempt

    this.swService.updateSWCallPool(orgID, campaignID, this.activity._id).subscribe(
      (callPoolNumber: CallPool) => {
        if(attempt !== this.callAttempt){
          // Hung up (or left) while reserving: hand that number straight back and don't dial
          if(callPoolNumber && (callPoolNumber as any).number) this.swService.hangUpSWNumber(orgID, callPoolNumber.number, campaignID).subscribe(() => {}, error => console.log(error))
          return
        }
        this.connecting = false;

        if(callPoolNumber?.['inactive']){
          this.inCall = false;
          this.handleInactiveActivity()
          return
        }

        if(!callPoolNumber){
          this.allNumsInUse = true;
          this.inCall = false;
          this.status = null
          this.ready()
          return
        }

        this.residentCalling = resident
        this.callingHouseholdRecord = this.activityHouseholdRecord
        this.allNumsInUse = false;
        this.userPhoneNumber = callPoolNumber.number
        this.holdingPoolNumber = true

        try {
          const options = {callerNumber: this.userPhoneNumber, destinationNumber: phone, audio: true}
          this.currentCall = this.client.newCall(options)
        } catch(error) {
          console.log(error)
          this.inCall = false
          this.residentCalling = undefined
          this.releasePoolNumber()
          this.errorMessage = "The call couldn't be started. Please try again.";
          this.displayErrorMsg = true;
        }
      },
      error =>{
        console.log(error)
        if(attempt !== this.callAttempt) return
        this.inCall = false;
        this.connecting = false;
        this.status = null
        this.ready()
        this.errorMessage = "There was a problem establishing a call. Please try again.";
        this.displayErrorMsg = true;
      }
    )

  }

  patchThroughCall(){
    if(!this.currentCall) return
    var orgID: string = sessionStorage.getItem('orgID')

    var call = {userPhonenumber: this.userPhoneNumber, remotePhonenumber: this.testCallingNumber, orgID: orgID, callSid: this.currentCall.id}

    this.swService.patchThroughCall(call).subscribe(
      (result: any) => console.log(result),
      error => {
        console.log(error)
        this.errorMessage = "Could not patch the call through. Please try again.";
        this.displayErrorMsg = true;
      }
    )
  }

  callDisconnected = (connection) =>{
    if(this.residentCalling) this.finishCall(connection.id);
    this.releasePoolNumber();

    this.inCall = false;
    this.status = "Call Complete. You may continue."
    this.residentCalling = undefined
  }

  endCall(){
    if(this.currentCall){
      this.currentCall.hangup()
    } else {
      // Nothing to hang up (the call never started): stop a pending reservation and reset the controls
      this.callAttempt++
      this.connecting = false
      this.inCall = false
      this.releasePoolNumber()
      this.ready()
    }
  }

  finishCall(callSid: string){
    // The household the call was placed from, even if the page has moved on since
    var householdRecord: ActivityHouseholdRecord = this.callingHouseholdRecord || this.activityHouseholdRecord
    var orgID: string = sessionStorage.getItem('orgID')
    var activityID: string = sessionStorage.getItem('activityID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var user: User =  JSON.parse(sessionStorage.getItem('user') || '{}')

    var person: Person = {resident: this.residentCalling,
      address: householdRecord.household._id,
      county: householdRecord.household.county,
      fullAddress1: householdRecord.household.fullAddress1,
      fullAddress2: householdRecord.household.fullAddress2,
      location: householdRecord.household.location,
      accuracyType: householdRecord.household.accuracyType,
      districts: householdRecord.household.districts,
      registrationPrecinctID: householdRecord.household.registrationPrecinctID
      }

    var finishCallDetail = {orgID: orgID,
                            activityID: activityID,
                            campaignID: campaignID,
                            user: user,
                            userID: user._id,
                            activityHouseholdRecordID: householdRecord._id,
                            callSid: callSid,
                            person: person,
                            personID: this.residentCalling.personID,
                            pass: this.activity.passes
                          }

    this.phonebankService.finishCall(finishCallDetail).subscribe(
      ()=>{
        if(this.household) this.getPhonebankContactRecords(activityID, this.household);
      },
      error=>{
        console.log(error)
        this.errorMessage = "The call ended but couldn't be recorded because of a server error. Record a response manually, and contact support if this keeps happening.";
        this.displayErrorMsg = true;
      }
    )
  }

  // Frees the reserved call-pool number for other callers; safe to call more than once
  releasePoolNumber(){
    if(!this.holdingPoolNumber || !this.userPhoneNumber) return
    this.holdingPoolNumber = false

    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

    this.swService.hangUpSWNumber(orgID, this.userPhoneNumber, campaignID).subscribe(
      (result: unknown) => {
        console.log("Number has been successfully unlocked for use.")
      },
      error => {
        console.log(error);
        this.errorMessage = "Could not release number in call pool for use.";
        this.displayErrorMsg = true;
      }
    )
  }

  skipHousehold(){
    if(this.inCall || this.connecting || this.submittingResponse) return
    this.submittingResponse = true;
    this.displayErrorMsg = false;

    this.phonebankService.skipHouseHold(this.activityHouseholdRecord._id).subscribe(
    () =>{
      this.submittingResponse = false;
      this.lockHousehold();
    },
    error =>{
      console.log(error)
      this.errorMessage = "Could not skip household. Please try again.";
      this.displayErrorMsg = true;
      this.submittingResponse = false;
    })
  }

  openOptinFormBottomSheet(resident: Resident): void {
    var orgID: string = sessionStorage.getItem('orgID')
    var user: User = JSON.parse(sessionStorage.getItem('user') || '{}')
    // Texting goes through opt-in: the sheet offers Send text once they've consented
    this.bottomSheet.open(OptinFormBottomSheet, {data: {resident: resident, orgID: orgID, user: user, activity: this.activity,
      household: this.household, allowTexting: !!this.activity?.enableTexting}});
  }

  openSMSDialog(resident: Resident, household: Household): void {
    this.bottomSheet.open(SingularTextForm, {data: {resident: resident, household, activity: this.activity}});
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
