import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {MatBottomSheet} from '@angular/material/bottom-sheet';
import { version } from '../../../environments/version';

import { PlatformLocation } from '@angular/common'
import { Device, Call } from '@twilio/voice-sdk';
import { CallTones, RingbackGate } from '../../utils/callTones';

//SERVICES
import {ActivityService} from '../../services/activity.service'
import {OrganizationService} from '../../services/organization/organization.service'
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, MISSING_ACTIVITY_MSG, loadErrorText } from '../../utils/loading';
import { SafeUrl } from '@angular/platform-browser';
import {PhonebankService} from '../../services/phonebank.service'
import {SurveyService} from '../../services/survey.service'
import { TwilioService } from 'src/app/services/twilio.service';

//MODELS
import { User } from 'src/app/models/user.model';
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import {Activity, CallPool} from '../../models/activity.model'
import { ActivityContactRecord, ActivityHouseholdRecord,  NonResponse,  PhonebankContactDetails, QuestionResponse, SurveyResponse, TextbankContactDetails, TextConversation } from '../../models/contact.record.model';

import {Survey, Question} from '../../models/survey.model'
import {Household, Resident, Person} from '../../models/person.model'
import { CampaignService } from 'src/app/services/campaign.service';
import { Campaign } from 'src/app/models/campaign.model';
import { OptinFormBottomSheet } from '../optinForm/optinForm';
import { SingularTextForm } from 'src/app/components/singularTextForm/singularTextForm';
import { VoteCenter, VoteCenterProperties, isVoteCenter, hasPreciseLocation } from 'src/app/models/votecenter.model';
import { AmplifyService } from 'src/app/services/amplify.service';
import { formatPhone } from 'src/app/utils/phone';
import { ClientConfigService } from 'src/app/services/clientConfig.service';
import { passLabel } from '../../pipes/passLabel.pipe';

const ALL_DONE_STATUS = 'Congratulations! All members of this list have been contacted.'

interface VisibleQuestion {
  question: Question;
  index: number;   // position in survey.questions; keys the answers
  number: number;  // shown to the caller
}

// Twilio call-quality warnings worth telling the caller about
const CALL_QUALITY_WARNINGS = ['high-jitter', 'high-packet-loss', 'high-rtt', 'low-mos']

// Device connection drops the SDK recovers from on its own; only worth telling the caller about mid-call
// 31000/53001: the websocket to Twilio closed or couldn't open; 53405: the call audio couldn't connect
const TRANSIENT_DEVICE_ERRORS = [31000, 31003, 31005, 31009, 53000, 53001, 53002, 53405]

// Unavailable, busy, declined: nobody answered, and Twilio hangs up the call right after the error
const UNANSWERED_CALL_ERRORS = [31480, 31486, 31603]

// The number itself can't be called (invalid, not in service, not found, international): the caller records a non-response instead
const NUMBER_PROBLEM_ERRORS = [13223, 13224, 21211, 31404, 13227, 21215]

// Call pressed before the Twilio device exists (token still loading or failed)
const DEVICE_NOT_READY = 'device-not-ready'

@Component({
  selector: 'app-phonebank',
  templateUrl: './phonebank.component.html',
  // Residents, survey and answer buttons share the canvass household dialog's styles
  styleUrls: [
    '../../styles/dialog-common.scss',
    '../canvass/dialogs/householdDialog/householdDialog.scss',
    './phonebank.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class PhonebankComponent implements OnInit, OnDestroy {

  public version: string = version.version;

  activity: Activity;
  survey: Survey;
  nonResponseSet: NonResponseSet;

  user: User;

  household: Household;
  activityHouseholdRecord: ActivityHouseholdRecord;

  residentsCalled: string[] = [];
  residentsResponded: string[] = [];

  userPhoneNumber: string = "";
  // True while a call-pool number is reserved for this caller and not yet released
  holdingPoolNumber: boolean = false;
  residentCalling: Resident;
  // Household record the current call was placed from; the page may move on before it's recorded
  callingHouseholdRecord: ActivityHouseholdRecord;

  inCall: boolean = false;
  // While in a call: still ringing, or someone (a person or voicemail) answered
  callPhase: 'ringing' | 'answered' | null = null;
  // Set when the call starts ringing; callSid is only set once someone answers
  private pendingCallSid: string | undefined
  // Call-quality warnings Twilio reports while they last (jitter, packet loss, latency, low quality)
  connectionWarnings = new Set<string>();
  justAnswered: boolean = false;
  private tones = new CallTones();
  // The current call's ringback decisions while it rings
  private ringbackGate: RingbackGate | null = null;
  connecting: boolean = false;
  // The ended call is being linked to the resident; responses wait so they land on that record, not a new one
  recordingCall: boolean = false;
  // Bumped by every Call, Cancel and teardown; a reply for an older attempt is stale and must not dial
  private callAttempt: number = 0;
  // Sent with each call and saved on its record: a call that fails before ringing never tells the page its CallSid
  private callAttemptID?: string;
  // The current call already reported busy/declined/unavailable, so its disconnect keeps that message
  private unansweredError: boolean = false;
  // Residents whose call ended this visit, so their responses unlock even if the call record fails
  private locallyCalled = new Set<string>();
  private removePopState?: VoidFunction;
  // Tab close or reload skips ngOnDestroy; this still frees the reserved number
  private onPageHide = () => this.releasePoolNumberOnUnload()
  // Residents whose Submit was missing a multiple-choice answer
  needsResponses = new Set<string>();

  // Questions this org sees (not hidden by the activity), numbered as shown
  visibleQuestions: VisibleQuestion[] = [];

  // answers[personID][question index]: a response, a list of responses (multi-select) or notes text
  answers: {[personID: string]: {[questionIndex: number]: any}} = {};
  // Per resident: why their last response didn't save, shown next to the answer buttons
  responseError: {[personID: string]: string} = {};

  showPlaces: boolean = true;
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

  callSid: string = "";

  patchThroughAvailable: boolean = false
  patchingThrough: boolean = false;

  device;

  orgID: string;

  nearestPollingLocations: VoteCenter[];
  gettingPollingLocations: boolean = false;
  // The household's map location is too rough to pick voting sites from
  pollingLocationApproximate: boolean = false;
  showPartisan: boolean = false;
  showNearestPollingLocations: boolean = false;
  campaignLoaded: boolean = false;

  orgLevel: string = '';

  dev: boolean = false;
  orgLogo$: Observable<SafeUrl | null | undefined>;

  constructor(private activityService: ActivityService,
              private snackBar: MatSnackBar,
              private router: Router,
              public orgService: OrganizationService,
              private phonebankService: PhonebankService,
              public surveyService: SurveyService,
              public campaignService: CampaignService,
              private bottomSheet: MatBottomSheet,
              public twilioService: TwilioService,
              public ampService: AmplifyService,
              private clientConfig: ClientConfigService,
              location: PlatformLocation) { 
                this.removePopState = location.onPopState(() => this.teardownCalling());}

  ngOnDestroy(){
    window.removeEventListener('pagehide', this.onPageHide)
    this.removePopState?.()
    this.teardownCalling()
    this.tones.close()
  }

  // Ends any call in progress, frees the reserved call-pool number and the Twilio device
  teardownCalling(){
    const callSid = this.callSid || this.pendingCallSid
    const resident = this.residentCalling
    // Cleared first so the disconnect event below doesn't record the call a second time
    this.callSid = undefined
    this.pendingCallSid = undefined
    this.endCallFeedback()
    this.residentCalling = undefined
    if(this.inCall && callSid && resident) this.finishCall(callSid, resident)
    this.callAttempt++
    this.device?.disconnectAll()
    this.releasePoolNumber()
    this.device?.destroy()
    this.device = undefined
    this.inCall = false
    this.connecting = false
  }

  private releasePoolNumberOnUnload(){
    if(!this.holdingPoolNumber || !this.userPhoneNumber) return
    this.holdingPoolNumber = false
    const token = sessionStorage.getItem('jwt')
    try {
      fetch(environment.API_URL + '/api/hangUpNumber', {
        method: 'POST',
        keepalive: true,
        headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
        body: JSON.stringify({
          orgID: sessionStorage.getItem('orgID') || '',
          userPhoneNumber: this.userPhoneNumber,
          campaignID: parseInt(sessionStorage.getItem('campaignID') || '-1'),
        }),
      })
    } catch(e){}
  }

  //////////////////////// DISPLAY ////////////////////////

  get callerName(): string {
    return this.user?.name?.fullName || [this.user?.name?.firstName, this.user?.name?.lastName].filter(Boolean).join(' ')
  }

  get allDone(): boolean {
    return this.status === ALL_DONE_STATUS
  }

  // Short label and color for the call-state pill
  get statusKind(): 'ready' | 'connecting' | 'ringing' | 'incall' | 'done' {
    if(this.connecting || this.status === 'Connecting...') return 'connecting'
    if(this.inCall && this.callPhase === 'ringing') return 'ringing'
    if(this.inCall) return 'incall'
    if(this.allDone || this.status?.startsWith('Call Complete')) return 'done'
    return 'ready'
  }

  get statusLabel(): string {
    if(!this.status) return ''
    if(this.allDone) return 'List complete'
    if(this.statusKind === 'connecting') return 'Connecting…'
    if(this.statusKind === 'ringing') return 'Ringing…'
    if(this.statusKind === 'incall') return this.callPhase === 'answered' ? 'Picked up: person or voicemail?' : 'In call'
    if(this.status.startsWith('Call Complete')) return 'Call complete'
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

  // Calling, or still reserving a number to call, this resident
  isOnCallWith(resident: Resident): boolean {
    return (this.inCall || this.connecting) && this.residentCalling?.personID === resident.personID
  }

  private markCalled(resident: Resident){
    if(!resident?.personID) return
    this.locallyCalled.add(resident.personID)
    if(!this.residentsCalled.includes(resident.personID)) this.residentsCalled = [...this.residentsCalled, resident.personID]
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
    this.locallyCalled.clear()
    this.snackBar.open(`This activity moved to its ${passLabel(currentPass)}. Calls are now recorded on the ${passLabel(currentPass)}.`, 'Dismiss', {duration: 6000})
  }

  // A new household is on screen: fresh answers, and no leftover errors from the last one
  private showHousehold(activityHouseholdRecord: ActivityHouseholdRecord){
    this.syncPass(activityHouseholdRecord)
    // The same household comes back while some residents are left; keep what's been typed for them
    const sameHousehold = !!this.activityHouseholdRecord && this.activityHouseholdRecord._id === activityHouseholdRecord._id
    this.household = activityHouseholdRecord.household;
    this.activityHouseholdRecord = activityHouseholdRecord;
    this.displayErrorMsg = false;
    this.allNumsInUse = false;
    if(sameHousehold){
      this.needsResponses.clear()
      for(const resident of this.household?.residents || []){
        if(!this.answers[resident.personID]) this.answers[resident.personID] = {}
      }
    } else {
      this.locallyCalled.clear()
      this.resetAnswers();
    }
    this.getPhonebankContactRecords(this.activity._id, this.household)
    this.loadHouseholdExtras()
  }

  ngOnInit(){
    this.orgID = sessionStorage.getItem('orgID') || "";
    this.orgLogo$ = this.orgService.getOrgLogoUrl(this.orgID);
    this.user = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.dev = this.user?.dev || false;

    this.getActivity();
    this.clientConfig.load()
    sessionStorage.removeItem('rdr')
    sessionStorage.setItem('activityType', "Phonebank")
    window.addEventListener('pagehide', this.onPageHide)
    this.getOrgLevel();
  }

  getActivity(){
    this.status = "Loading Activity Details..."
    var activityID: string = sessionStorage.getItem('activityID') || "";
    this.activityService.getActivity(activityID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (activity: Activity) =>{

        if(!activity){
          this.errorMessage = MISSING_ACTIVITY_MSG;
          this.displayErrorMsg = true;
          this.status = "Activity not found";
          this.loading = false;
          return
        }

        if(activity.active === false){
          this.errorMessage = "This activity is no longer active. Please contact your administrator for more information.";
          this.displayErrorMsg = true;
          this.status = "Inactive Activity";
          this.activity = activity
          this.loading = false;
          return
        }
        this.getNonResponseSet(activity.nonResponseSetID);
        this.getSurvey(activity.surveyID);
        this.getTwilioToken();

        this.loading = false;
        this.status = "Activity Details Loaded.";
        this.activity = activity
        // Opt-in is an activity setting (it used to live on the shared survey)
        this.optinOption = !!activity.optinOption
        this.lockHousehold();

        if(activity.patchThroughNumber && activity.patchThroughNumber != ""){
          this.patchThroughAvailable = true
        }

    }, error=>{
      console.log(error)
      this.errorMessage = loadErrorText('this activity', error);
      this.loading = false;
      this.displayErrorMsg = true;
    })
  }

  getSurvey(surveyID: string){
    this.surveyService.getSurvey(surveyID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (survey: Survey) =>{
        this.survey = survey
        this.buildVisibleQuestions()
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.loading = false;
        this.errorMessage = loadErrorText('the survey', error);
      }
    )
  }

  getNonResponseSet(nonResponseSetID: string){
    this.surveyService.getNonResponseSet(nonResponseSetID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (nonResponseSet: NonResponseSet) =>{
        this.nonResponseSet = nonResponseSet
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.loading = false;
        this.errorMessage = loadErrorText('the survey', error);
      }
    )
  }

  public getTwilioToken(){
    // Only the first load shows this; refreshes of an existing device stay out of the status pill
    if(!this.device) this.status = "Fetching Calling Token..."
    //Twilio.Device.destroy()////////////////////////////////////////////////
    var orgID: string = sessionStorage.getItem('orgID') || "";
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || "-1");

    this.phonebankService.getTwilioToken(orgID, campaignID).subscribe(
      (callingToken: any)=>{
        var token = callingToken['token'];

        // Refresh the existing device rather than stacking a second one on top of it
        if(this.device){
          this.device.updateToken(token)
          return
        }

        // Opus first: it copes with packet loss far better than PCMU, so audio cuts out less on weak connections
        this.device = new Device(token, {
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
          // Report the real code (e.g. 31404, 53001) instead of folding it into 31000
          enableImprovedSignalingErrorPrecision: true,
        });
        this.device.audio.outgoing(false);

        // Refresh before the token runs out instead of failing the next call
        this.device.on('tokenWillExpire', () => this.getTwilioToken())

        this.device.on('error', this.deviceError)
      },
      error =>{
        this.errorMessage = "Couldn't start calling. Refresh the page to try again.";
        this.displayErrorMsg = true;
        console.log(error)
      }
    );
  }

  ready = () =>{
    if(this.status === ALL_DONE_STATUS){
      return
    }
    this.status = 'Ready to Call.';
  }

  getCampaign(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || "-1");
    
    this.campaignService.getCampaign(campaignID).subscribe(
      (campaign: Campaign) =>{
        this.campaignLoaded = true;
        this.showPartisan = campaign.showPartisan;
        this.showNearestPollingLocations = campaign.showNearestPollingLocations;
        this.loadPollingLocations()
      },
      error => console.log(error)
    )
  }

  // Called for every new household. The campaign settings only need fetching once.
  loadHouseholdExtras(){
    this.nearestPollingLocations = []
    this.pollingLocationApproximate = false
    if(!this.campaignLoaded){
      this.getCampaign()
      return
    }
    this.loadPollingLocations()
  }

  loadPollingLocations(){
    if(!this.showNearestPollingLocations || !this.household){
      // Don't leave a previous household's bar running
      this.gettingPollingLocations = false
      return
    }
    if(!hasPreciseLocation(this.household)){
      this.pollingLocationApproximate = true
      this.gettingPollingLocations = false
      return
    }
    this.gettingPollingLocations = true;
    this.getVotingCenters()
  }

  // The activity was deactivated while this caller had the page open
  handleInactiveActivity(){
    // End any call and free its number; nothing more can be recorded for this activity
    this.callAttempt++
    this.device?.disconnectAll()
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
    var activityID: string = sessionStorage.getItem('activityID') || "";
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

        if(!activityHouseholdRecord){
          this.status = ALL_DONE_STATUS
          this.loading = false;
          this.errorMessage = '';
          this.displayErrorMsg = false;
          return
        }

        this.loading = false;
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
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id

    this.phonebankService.getPhonebankContactRecords(activityID, household, userID, this.activity.passes).subscribe(
      (pbContactRecords: ActivityContactRecord[]) =>{
        // Ignore a slow reply for a household the caller has already moved past
        if(household !== this.household) return

        this.residentsResponded = pbContactRecords.filter((pbContactRecords: ActivityContactRecord) =>{return (pbContactRecords.complete || (pbContactRecords.nonResponse && (pbContactRecords.pass === this.activity.passes)))})
                                                    .map((pbContactRecords: ActivityContactRecord) =>{return pbContactRecords.personID});

        const calledThisPass = pbContactRecords.filter((pbContactRecords: ActivityContactRecord) =>{return (pbContactRecords.pass === this.activity.passes)})
                                                    .map((pbContactRecords: ActivityContactRecord) =>{return pbContactRecords.personID});
        // Calls that ended here count even if their record didn't save
        this.residentsCalled = Array.from(new Set([...calledThisPass, ...this.locallyCalled]))
      },
      error =>{
        this.errorMessage = "Sorry, could not get phonebank contact Records. Please refresh to try again.";
        this.loading = false;
        this.displayErrorMsg = true;
        console.log(error)
      }
    )
  }

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
      this.status = ALL_DONE_STATUS;
      this.household = null
      this.errorMessage = '';
      this.displayErrorMsg = false;
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

  // The number shown to the caller and the number dialed must be the same one
  getDialNumber(resident: Resident): string | null {
    const phone = (resident?.phones || []).find(p => p?.number && p.number.trim() !== '')
    return phone ? phone.number : null
  }

  call(resident: Resident){
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
    // Twilio rejects malformed numbers mid-call (13224), so catch them before using a pool number
    var digits = String(dialNumber).replace(/\D/g, '')
    if(digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
    if(!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)){
      this.errorMessage = `This resident's phone number (${dialNumber}) isn't a valid US number. Choose a non-response (e.g. Wrong Number).`
      this.displayErrorMsg = true
      return
    }
    var residentPhonenumber: string = '+1' + digits

    this.inCall = true;
    this.residentCalling = resident;
    const attempt = ++this.callAttempt

    this.status = "Connecting..."
    this.connecting = true;
    this.displayErrorMsg = false
    this.unansweredError = false

    this.twilioService.updateTwilioCallPool(orgID, campaignID, this.activity._id).subscribe(
      (callPoolNumber: CallPool) => {
        if(attempt !== this.callAttempt){
          // Cancelled (or superseded) while reserving: hand that number straight back and don't dial
          if(callPoolNumber && (callPoolNumber as any).number) this.releaseNumber(callPoolNumber.number)
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
          this.residentCalling = undefined;
          return
        }

        this.connectTwilioCall(callPoolNumber, resident, residentPhonenumber, attempt);

      },
      error =>{
        console.log(error)
        if(attempt !== this.callAttempt) return
        this.inCall = false;
        this.connecting = false;
        this.residentCalling = undefined;
        this.errorMessage = "There was a problem establishing a call. Please try again.";
        this.displayErrorMsg = true;
      }
    )
  }

  async connectTwilioCall(callPoolNumber: CallPool, resident: Resident, residentPhonenumber: string, attempt: number = this.callAttempt){

    this.residentCalling = resident
    this.callingHouseholdRecord = this.activityHouseholdRecord
    this.callSid = undefined
    this.callAttemptID = crypto.randomUUID()
    this.allNumsInUse = false;

    // Kept locally: if this attempt goes stale, a newer call may already hold this.userPhoneNumber
    const number = callPoolNumber.number
    this.userPhoneNumber = number
    this.holdingPoolNumber = true

    var phonebankContactDetails: PhonebankContactDetails = {
      residentPhonenumber: residentPhonenumber, 
      userPhonenumber: this.userPhoneNumber,
      conference: this.patchThroughAvailable,
      attemptID: this.callAttemptID,
    }

    var twilioCallDetails = {params: phonebankContactDetails}

    var connection
    try {
      if(!this.device) throw {code: DEVICE_NOT_READY, message: 'Calling device is not ready'}
      connection = await this.device.connect(twilioCallDetails);
    } catch(error) {
      if(attempt !== this.callAttempt){
        this.releaseStaleNumber(number)
        return
      }
      this.callError(error)
      return
    }

    // Hung up or left while Twilio was still setting the call up: drop it before it rings
    if(attempt !== this.callAttempt){
      connection.disconnect()
      this.releaseStaleNumber(number)
      return
    }

    this.callPhase = null
    this.pendingCallSid = undefined
    connection.on('ringing', (hasEarlyMedia: boolean) => this.callRinging(connection, hasEarlyMedia));
    connection.on('accept', this.callConnected);
    connection.on('disconnect', this.callDisconnected);
    connection.on('error', this.callError);
    connection.on('warning', (name: string) => this.callWarning(connection, name));
    connection.on('warning-cleared', (name: string) => this.connectionWarnings.delete(name));

    // The carrier's own sound pauses our ringback so the two don't overlap; when it goes quiet, ours comes back
    const gate = new RingbackGate()
    this.ringbackGate = gate
    connection.on('volume', (inputVolume: number, outputVolume: number) => {
      if(this.callPhase !== 'ringing' || this.ringbackGate !== gate) return
      const action = gate.update(outputVolume, Date.now())
      if(action === 'pause') this.tones.stopRingback()
      if(action === 'resume') this.tones.startRingback()
    });
  }

  // The resident's phone is ringing (answerOnBridge holds the call until they answer).
  // Ring in the browser until the carrier's own sound takes over, so the caller always hears something.
  callRinging(connection: Call, hasEarlyMedia: boolean){
    if(!this.inCall) return
    this.callPhase = 'ringing'
    this.status = "Ringing..."
    this.pendingCallSid = connection.parameters?.CallSid || this.pendingCallSid
    // hasEarlyMedia only says the carrier may send sound; the gate pauses our ringback once it actually does.
    // Ringing can fire again after that, so don't restart over the carrier's sound.
    if(!this.ringbackGate?.paused) this.tones.startRingback()
  }

  // Stops the ringback and logs what the carrier sent while ringing, to explain silent-ringing reports
  private endRingback(outcome: string){
    this.tones.stopRingback()
    const gate = this.ringbackGate
    this.ringbackGate = null
    if(!gate || this.callPhase !== 'ringing') return
    console.log(`Ringing ended (${outcome}): peak carrier volume ${gate.peakVolume.toFixed(3)}, ringback paused ${gate.pauses}x, resumed ${gate.resumes}x`)
  }

  // Someone picked up: a person or their voicemail
  callConnected = (connection) =>{
    this.endRingback('answered')
    this.callPhase = 'answered'
    this.status = "Connected."
    this.callSid = connection.parameters.CallSid
    this.justAnswered = true
    setTimeout(() => this.justAnswered = false, 2500)
  }

  callWarning(connection: Call, name: string){
    if(!CALL_QUALITY_WARNINGS.includes(name)) return
    console.log('Call quality warning:', name, connection.parameters?.CallSid)
    this.connectionWarnings.add(name)
  }

  // Ringback, answer highlight and quality warnings all end with the call
  private endCallFeedback(){
    this.endRingback('ended')
    this.callPhase = null
    this.justAnswered = false
    this.connectionWarnings.clear()
  }

  // Errors on the device itself, not a call. An idle page sees these whenever the connection to Twilio drops and comes back.
  deviceError = (error: any, call?: Call) =>{
    // 31205: invalid JWT, 20104: access token expired, 20101: invalid access token
    if(error.code === 31205 || error.code === 20104 || error.code === 20101){
      this.getTwilioToken()
      return
    }
    // Errors on a call also reach that call's own error listener; handling them here too would run callError twice
    if(call) return
    const code = error?.originalError?.code ?? error?.code
    if(TRANSIENT_DEVICE_ERRORS.includes(code) && !this.inCall && !this.connecting){
      console.log('Twilio device connection error while idle:', code, error)
      return
    }
    this.callError(error)
  }

  callError = (error) =>{
    const code = error?.originalError?.code ?? error?.code
    console.log('Twilio error', code, error?.code, error?.message, error)
    this.errorMessage = this.twilioErrorMessage(error)
    this.displayErrorMsg = true

    // The message tells the caller to record a non-response, so make those buttons usable
    if(NUMBER_PROBLEM_ERRORS.includes(code)) this.markCalled(this.residentCalling)

    // The call was placed, so leave cleanup to the disconnect that follows: it records the call and unlocks the responses
    if(UNANSWERED_CALL_ERRORS.includes(code) && this.inCall){
      this.unansweredError = true
      const attempt = this.callAttempt
      const resident = this.residentCalling
      setTimeout(() => {
        // No disconnect came: finish the call here instead of leaving it stuck
        if(this.inCall && attempt === this.callAttempt && this.residentCalling === resident) this.callDisconnected(undefined)
      }, 5000)
      return
    }

    // The call never connected, so no disconnect will follow to clean up
    if(!this.callSid && (this.inCall || this.connecting)){
      const resident = this.residentCalling
      const pendingCallSid = this.pendingCallSid
      this.endCallFeedback()
      this.pendingCallSid = undefined
      this.inCall = false
      this.connecting = false
      this.residentCalling = undefined
      this.releasePoolNumber()
      // Twilio may have placed it (e.g. to an invalid number): link that record so the call shows in reports
      if(resident) this.linkUnconnectedCall(resident, pendingCallSid)
    }
  }

  // Links a call that ended without connecting; the caller has already been told what happened
  private linkUnconnectedCall(resident: Resident, callSid?: string){
    if(!callSid && !this.callAttemptID) return
    this.recordingCall = true
    this.finishCall(callSid, resident)
  }

  // Errors from the call itself (e.g. 13224 on the dialed number) arrive as 31005 with the real code in originalError
  twilioErrorMessage(error: any): string {
    const code = error?.originalError?.code ?? error?.code
    if(code === DEVICE_NOT_READY) return "Calling is still starting up. Wait a few seconds and try again; if it doesn't start, refresh the page."
    const suffix = code ? ` (Twilio error ${code})` : ''
    switch(code){
      case 31480: case 31486: case 31603:
        return "The call wasn't answered (declined, busy or unavailable). Choose a non-response such as No Answer, or try again later." + suffix
      case 13223: case 13224: case 21211: case 31404:
        return "This phone number can't be dialed. It's invalid or not in service. Choose a non-response (e.g. Wrong Number) and move on." + suffix
      case 13227: case 21215:
        return "This number is outside the US and your organization can't call it. Choose a non-response." + suffix
      case 31401: case 31402:
        return "Calling needs microphone access. Allow the microphone for this site in your browser and try again." + suffix
      case 20101: case 20104: case 20151: case 31201: case 31202: case 31203: case 31204: case 31205: case 31207: case 31209:
        return "Your calling session expired. Refresh the page and try again." + suffix
      case 31000: case 31003: case 31005: case 31009: case 53000: case 53001: case 53002: case 53405:
        return "Lost connection to Twilio. Check your internet connection and try the call again. If it keeps happening, you may be on a VPN or a work/school network that blocks calling; try another network, or skip the household." + suffix
      case 53400: case 53402:
        return "Your browser couldn't set up the call audio. Refresh the page and try again; if it keeps happening, try another browser (Chrome works best)." + suffix
      case 31206:
        return "Too many calls in a short time. Wait a minute and try again." + suffix
      default:
        return "Call could not be made due to an error with Twilio. Please call another resident or skip the household. If it keeps happening, let your organizer know." + suffix
    }
  }

  callDisconnected = (connection) =>{
    const resident = this.residentCalling
    const pendingCallSid = this.pendingCallSid
    this.pendingCallSid = undefined
    this.endCallFeedback()

    this.status = "Call Complete. You may continue."
    this.releasePoolNumber();
    
    this.inCall = false;
    this.residentCalling = undefined

    // Torn down already (leaving the page) and recorded there
    if(!resident) return

    // A call hung up while still ringing has no answered callSid, but it was placed and is recorded
    const callSid = connection?.parameters?.CallSid || this.callSid || pendingCallSid
    if(!callSid){
      // The caller can still record a response (e.g. No answer)
      this.markCalled(resident)
      this.linkUnconnectedCall(resident)
      // Busy or declined before it rang: keep the more specific message callError already showed
      if(this.unansweredError) return
      this.errorMessage = "The call didn't go through. Try again, or choose a non-response.";
      this.displayErrorMsg = true;
      return
    }

    this.recordingCall = true
    this.finishCall(callSid, resident);
  }

  // Cancel while a number is being reserved, otherwise hang up
  cancelCall(){
    this.callAttempt++
    if(this.connecting){
      this.connecting = false
      this.inCall = false
      this.residentCalling = undefined
      this.ready()
      return
    }
    // Twilio may still be creating the call; connectTwilioCall drops it when it arrives.
    // A ringing call already exists, so it hangs up normally and gets recorded.
    if(!this.callSid && !this.pendingCallSid && this.residentCalling && this.inCall){
      this.inCall = false
      this.residentCalling = undefined
      this.ready()
    }
    this.endCall()
  }

  endCall(){
    // The device may already be gone (page teardown or a failed token refresh)
    this.device?.disconnectAll();
    if(!this.device) this.inCall = false
  }

  // Without a callSid the call is found by its attemptID; not finding one then just means it never reached Twilio
  finishCall(callSid: string | undefined, resident: Resident = this.residentCalling){
    // The household the call was placed from, even if the page has moved on since
    var householdRecord: ActivityHouseholdRecord = this.callingHouseholdRecord || this.activityHouseholdRecord
    var orgID: string = sessionStorage.getItem('orgID') || "";
    var activityID: string = sessionStorage.getItem('activityID') || "";
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || "-1");
    var user: User =  JSON.parse(sessionStorage.getItem('user') || '{}');
    
    var person: Person = {resident: resident, 
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
                            attemptID: this.callAttemptID,
                            person: person,
                            personID: resident.personID,
                            pass: this.activity.passes
                          }

    this.phonebankService.finishCall(finishCallDetail).subscribe(
      (phonebankContactRecord: ActivityContactRecord)=>{
        this.recordingCall = false
        // Linked (or not linkable): either way responses for this resident can be recorded now.
        // An attempt that never reached Twilio stays as it was: unlocked only where callError/callDisconnected did
        if(callSid || phonebankContactRecord) this.markCalled(resident)

        if(!phonebankContactRecord && callSid){
          this.errorMessage = "The call ended but couldn't be recorded. Record a response manually, and contact support if this keeps happening.";
          this.displayErrorMsg = true;
        }

        this.callSid = undefined;

        // The list may have finished (or the activity closed) while the call was being recorded
        if(this.household) this.getPhonebankContactRecords(activityID, this.household);
      },
      error=>{
        console.log(error)
        this.recordingCall = false
        // An unconnected call already showed why it failed
        if(!callSid) return
        this.markCalled(resident)
        this.errorMessage = "The call ended but couldn't be recorded because of a server error. Record a response manually, and contact support if this keeps happening.";
        this.displayErrorMsg = true;
      }
    )
  }

  // Frees the reserved call-pool number for other callers; safe to call more than once
  releasePoolNumber(){
    if(!this.holdingPoolNumber || !this.userPhoneNumber) return
    this.holdingPoolNumber = false
    this.releaseNumber(this.userPhoneNumber)
  }

  // A dropped attempt's number: free it without disturbing a newer call that holds a different one
  private releaseStaleNumber(number: string){
    if(this.userPhoneNumber === number) this.holdingPoolNumber = false
    this.releaseNumber(number)
  }

  // Frees a specific pool number (also one reserved by a cancelled attempt that never became the current call)
  private releaseNumber(number: string){
    var orgID: string = sessionStorage.getItem('orgID') || "";
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID') || "-1");
    
    this.orgService.hangUpNumber(orgID, number, campaignID).subscribe(
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
    if(this.inCall || this.connecting) return
    this.submittingResponse = true;
    this.displayErrorMsg = false

    this.phonebankService.skipHouseHold(this.activityHouseholdRecord._id).subscribe(
    () =>{
      this.displayErrorMsg = false
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
    var orgID: string = sessionStorage.getItem('orgID') || "";
    var user: User = JSON.parse(sessionStorage.getItem('user') || '{}');
    // Texting goes through opt-in: the sheet offers Send text once they've consented
    this.bottomSheet.open(OptinFormBottomSheet, {data: {resident: resident, orgID: orgID, user: user, activity: this.activity,
      household: this.household, allowTexting: !!this.activity?.enableTexting}});
  }

  patchThroughCall(){
    // The conference is named after the call; there's nothing to join until it connects
    if(!this.callSid) return
    var orgID: string = sessionStorage.getItem('orgID') || "";
    var patchThroughNumber: string = this.activity.patchThroughNumber
    var call = {orgID: orgID, callSid: this.callSid, userPhonenumber: this.userPhoneNumber, remotePhonenumber: this.testCallingNumber, patchThroughNumber: patchThroughNumber}

    this.patchingThrough = true;

    this.phonebankService.patchThroughCallTwilio(call).subscribe(
      (result: any) => {
        if(result === false){
          this.patchingThrough = false;
          this.errorMessage = "Could not patch the call through. Please try again.";
          this.displayErrorMsg = true;
          return
        }
        setTimeout(() =>{
          this.patchingThrough = false;
        }, 3000);
      },
      error => {
        console.log(error)
        this.patchingThrough = false;
        this.errorMessage = "Could not patch the call through. Please try again.";
        this.displayErrorMsg = true;
      }
    )
  }

  openSMSDialog(resident: Resident, household: Household): void {
    this.bottomSheet.open(SingularTextForm, {data: {resident: resident, household, activity: this.activity}});
  }

  shouldShowQuestion(question: any): boolean {
    var orgID: string = sessionStorage.getItem('orgID') || "";

    if ((!question.orgIDs || question.orgIDs.length === 0)) {
      return true;
    }

    return question.orgIDs.includes(orgID);
  }

  shouldHideQuestion(question: any): boolean {
    return (this.activity?.questionsToHide || []).includes(question.question);
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
        this.gettingPollingLocations = false;
      }
    )
  }

  getPropensityLabel(resident: Resident): string {

    if(resident.generalPropensity === undefined || resident.primaryPropensity === undefined || resident.specialPropensity === undefined){
      return 'Unknown';
    }
    var overallPropensity = (resident.generalPropensity*2 + resident.primaryPropensity*3 + resident.specialPropensity*1)/6
    if (overallPropensity >= 66) {
      return 'High';
    }
    if (overallPropensity >= 33) {
      return 'Medium';
    }
    return 'Low';
  }

  getOrgLevel() {
    let user: User = JSON.parse(sessionStorage.getItem('user') || '{}');
    let orgID: string = sessionStorage.getItem('orgID') || '';

    for (var i = 0; i< (user.orgPermissions || []).length; i++){
      if(user.orgPermissions[i].orgID === orgID){
        this.orgLevel = user.orgPermissions[i].level
      }
    }
  }

}