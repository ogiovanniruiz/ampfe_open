import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig} from '@angular/material/dialog';
import {MatBottomSheet} from '@angular/material/bottom-sheet';
import {MatDialog} from '@angular/material/dialog';

//SERVICES
import { ActivityService } from 'src/app/services/activity.service';
import { CanvassService } from '../../../../services/canvass.service'

//MODELS
import {Survey, Question} from '../../../../models/survey.model'
import { User } from 'src/app/models/user.model';
import {Activity} from 'src/app/models/activity.model';
import {CanvassDialogData, ActivityContactRecord, SurveyResponse, ActivityHouseholdRecord, NonResponse, QuestionResponse} from 'src/app/models/contact.record.model'
import { Household, Resident, Person } from 'src/app/models/person.model';
import { NonResponseSet } from 'src/app/models/nonResponseSet.model';
import { OptinFormBottomSheet } from 'src/app/components/optinForm/optinForm';

import { SingularTextForm } from 'src/app/components/singularTextForm/singularTextForm';
import { CreateMemberDialog } from 'src/app/components/membership/dialogs/createMember/createMemberDialog';
import { AmplifyService } from 'src/app/services/amplify.service';
import { VoteCenter, VoteCenterProperties, isVoteCenter, hasPreciseLocation } from 'src/app/models/votecenter.model';
import { from, TimeoutError } from 'rxjs';
import { concatMap, last, timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, SLOW_LOAD_TIMEOUT_MS } from 'src/app/utils/loading';
import { formatAddress } from '../../canvassUtils';
import { formatPhone } from 'src/app/utils/phone';

// Every place that opens this dialog uses it: full width on phones, a centered card elsewhere
export function householdDialogConfig(data: CanvassDialogData): MatDialogConfig {
  const isMobile = window.innerWidth < 600
  return isMobile
    ? {autoFocus: false, disableClose: true, data, width: '100vw', maxWidth: '100vw', maxHeight: '100vh'}
    : {autoFocus: false, disableClose: true, data, width: '760px', maxWidth: '94vw', maxHeight: '96vh'}
}

interface VisibleQuestion {
  question: Question;
  index: number;   // position in survey.questions; keys the answers
  number: number;  // shown to the canvasser
}

@Component({
    templateUrl: './householdDialog.html',
    styleUrls: ['../../../../styles/dialog-common.scss', './householdDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class HouseholdDialog implements OnInit{

  disableAnimation = true;

  loading: boolean = false
  
  activityInactive: boolean = false;
  errorMessage: string = '';

  fullAddress1: string = ''
  fullAddress2: string = ''
  household: Household;

  residentsContacted: string[] = [];
  residentsComplete: string[] = []
  survey: Survey;
  nonResponseSet: NonResponseSet;
  activity: Activity;

  // Residents whose Submit was missing a multiple-choice answer
  needsResponses = new Set<string>();

  optinOption: boolean = false;

  orgID: string;

  // Questions this org sees (not hidden by the activity), numbered as shown
  visibleQuestions: VisibleQuestion[] = [];

  // answers[personID][question index]: a response, a list of responses (multi-select) or notes text
  answers: {[personID: string]: {[questionIndex: number]: any}} = {};

  showPlaces: boolean = true;

  nearestPollingLocations: VoteCenter[];

  showNearestPollingLocations: boolean = false;
  showPartisan: boolean = false;
  gettingPollingLocations: boolean = false;
  // The household's map location is too rough to pick voting sites from
  pollingLocationApproximate: boolean = false;


  constructor(
        public dialogRef: MatDialogRef<HouseholdDialog>,
        @Inject(MAT_DIALOG_DATA) public data: CanvassDialogData,
        public activityService: ActivityService,
        public canvassService: CanvassService,
        private bottomSheet: MatBottomSheet,
        public dialog: MatDialog,
        public ampService: AmplifyService
        ) {

          this.orgID = sessionStorage.getItem('orgID')


          this.household = data.canvassHouseholdRecord.household
          
          this.fullAddress1 = formatAddress(this.household._id)
          this.fullAddress2 = this.household.fullAddress2
          
          this.activity = data.activity
          this.survey = data.survey

          // Opt-in is an activity setting (it used to live on the shared survey)
          this.optinOption = !!this.activity?.optinOption
          this.nonResponseSet = data.nonResponseSet
          this.showNearestPollingLocations = data.showNearestPollingLocations
          this.showPartisan = data.showPartisan

          // Dropped doors sit exactly where the canvasser tapped, whatever their address geocode says
          const preciseLocation = data.canvassHouseholdRecord.dropped || hasPreciseLocation(this.household)
          if(this.showNearestPollingLocations && !preciseLocation){
            this.pollingLocationApproximate = true;
          } else if(this.showNearestPollingLocations){
            this.gettingPollingLocations = true;
            this.getVotingCenters();
          }

          this.visibleQuestions = this.buildVisibleQuestions()
          this.ensureAnswers()
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

  // One answer slot per resident, kept when the household record is refreshed
  private ensureAnswers(){
    for(const resident of this.household?.residents || []){
      if(!this.answers[resident.personID]) this.answers[resident.personID] = {}
    }
  }

  //////////////////////// DISPLAY ////////////////////////

  residentName(resident: Resident): string {
    return [resident.name?.firstName, resident.name?.middleName, resident.name?.lastName].filter(Boolean).join(' ') || 'Unnamed resident'
  }

  isComplete(resident: Resident): boolean {
    return this.residentsComplete.includes(resident.personID)
  }

  isTried(resident: Resident): boolean {
    return this.residentsContacted.includes(resident.personID)
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

  //////////////////////// ANSWERS ////////////////////////

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

  createActivityContactRecord(resident: Resident, household: Household){
    if(this.loading) return
    var questionResponses: QuestionResponse[] = this.generateQuestionResponses(resident);

    if(questionResponses.length === 0 || !questionResponses.some(obj => obj.questionType === "SINGLESELECT" || obj.questionType === "MULTISELECT")){
      this.needsResponses.add(resident.personID);
      return;
    }

    this.needsResponses.delete(resident.personID)
    this.loading = true
    this.errorMessage = ''

    var personID: string = resident.personID
    var user: User = JSON.parse(sessionStorage.getItem('user'))
    var orgID: string = sessionStorage.getItem('orgID')

    var surveyResponse: SurveyResponse = {surveyID: this.survey._id, questionResponses: questionResponses}

    var person: Person = {resident: resident, 
                          address: household._id, 
                          county: household.county, 
                          fullAddress1: household.fullAddress1,
                          fullAddress2: household.fullAddress2,
                          location: household.location,
                          accuracyType: household.accuracyType,
                          districts: household.districts,
                          registrationPrecinctID: household.registrationPrecinctID

                          }

    var activityContactRecord: ActivityContactRecord = {personID: personID,
                                                        person: person, 

                                                        userID: user._id,
                                                        user: user,

                                                        activityID: this.activity._id, 
                                                        orgID: orgID,
                                                        campaignID: this.activity.campaignID,
                                                        
                                                        activityType: "Canvass",
                                                        
                                                        surveyResponse: surveyResponse,
                                                        
                                                        member: false,
                                                        complete: true,
                                                        pass: this.activity.passes,
                                                        activityHouseholdRecordID: this.data.canvassHouseholdRecord._id,
                                                        
                                                        }

    this.canvassService.createCanvassContactRecord(activityContactRecord).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe(
      (canvassHouseholdRecord: ActivityHouseholdRecord)=> this.handleSavedRecord(canvassHouseholdRecord),
      error=> this.handleSaveError(error)
    )
  }

  // Closes once the household is finished; otherwise refreshes which residents are done
  handleSavedRecord(canvassHouseholdRecord: ActivityHouseholdRecord){
    if(!canvassHouseholdRecord) return this.handleSaveError()
    if(canvassHouseholdRecord.complete || canvassHouseholdRecord.passed){
      this.dialogRef.close(canvassHouseholdRecord)
      return
    }

    this.household = canvassHouseholdRecord.household
    this.ensureAnswers();
    this.getHouseholdContactHistory();
    this.loading = false;
    this.errorMessage = '';
  }

  // A timed-out save may still have reached the server, so resubmitting could record it twice
  handleSaveError(error?: any){
    if(error) console.log(error)
    this.errorMessage = error instanceof TimeoutError
      ? "The server didn't respond, so this response may not have been saved. Close this door and reopen it to check before submitting again."
      : "Sorry, could not submit response. Please try again in a few seconds.";
    this.loading = false;
  }

  createActivityNonResponseRecord(resident: Resident, household: Household, nonResponse: NonResponse){
    if(this.loading) return
    this.loading = true
    this.errorMessage = ''
    this.needsResponses.delete(resident.personID)

    this.canvassService.createCanvassContactRecord(this.buildNonResponseRecord(resident, household, nonResponse)).pipe(timeout(SLOW_LOAD_TIMEOUT_MS)).subscribe(
      (canvassHouseholdRecord: ActivityHouseholdRecord)=> this.handleSavedRecord(canvassHouseholdRecord),
      error=> this.handleSaveError(error)
    )
  }

  buildNonResponseRecord(resident: Resident, household: Household, nonResponse: NonResponse): ActivityContactRecord {
    var personID: string = resident.personID
    var user: User = JSON.parse(sessionStorage.getItem('user'))
    var orgID: string = sessionStorage.getItem('orgID')

    var nonResponse: NonResponse = {nonResponseSetID: this.nonResponseSet._id, 
                                    nonResponse: nonResponse.nonResponse, 
                                    nonResponseType: nonResponse.nonResponseType}

    var person: Person = {resident: resident, 
                          address: household._id, 
                          county: household.county, 
                          fullAddress1: household.fullAddress1,
                          fullAddress2: household.fullAddress2,
                          location: household.location,
                          accuracyType: household.accuracyType,
                          districts: household.districts,
                          registrationPrecinctID: household.registrationPrecinctID

                          }

    var activityContactRecord: ActivityContactRecord = {
                            personID: personID,
                            person: person, 

                            userID: user._id,
                            user: user,

                            activityID: this.activity._id, 
                            orgID: orgID,
                            campaignID: this.activity.campaignID,
                            
                            activityType: "Canvass",
                            
                            nonResponse: nonResponse,
                            
                            member: false,
                            complete: false,
                            pass: this.activity.passes,
                            activityHouseholdRecordID: this.data.canvassHouseholdRecord._id,
                          }

  if(nonResponse.nonResponseType == "DNC" || nonResponse.nonResponseType === "INVALIDADDRESS")
  {
    activityContactRecord.complete = true
  }

  return activityContactRecord
  }
 
  // Only checked when the door is opened, so a household already open when the activity
  // is deactivated can still be finished
  checkActivityActive(){
    var activityID = sessionStorage.getItem('activityID')
    this.activityService.getActivity(activityID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (activity: any) =>{
        this.activityInactive = activity?.active === false
      },
      error => console.log(error)
    )
  }

  getHouseholdContactHistory(){
    var activityID = sessionStorage.getItem('activityID')
    this.canvassService.getCanvassContactHistory(activityID, this.household._id, this.data.canvassHouseholdRecord._id).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (canvassContactHistories: ActivityContactRecord[]) =>{
        canvassContactHistories = canvassContactHistories || []
        // Attempts from earlier passes don't count; a completed contact is final
        this.residentsContacted = canvassContactHistories.filter((x: ActivityContactRecord) => x.pass === this.activity.passes).map(x => x.personID)
        this.residentsComplete = canvassContactHistories.filter((x: ActivityContactRecord)=>{return x.complete}).map(x =>{ return x.personID})
      },
      error => {
        console.log(error)
        this.errorMessage = "Couldn't load who has already been contacted here. Statuses may be out of date."
      }
    )
  }

  ngOnInit(): void{
    this.checkActivityActive();
    this.getHouseholdContactHistory();

  }

  close(){
    if(this.loading) return
    this.dialogRef.close()
  }

  openOptinFormBottomSheet(resident: Resident): void {
    var orgID: string = sessionStorage.getItem('orgID')
    var user: User = JSON.parse(sessionStorage.getItem('user'))
    // Texting goes through opt-in: the sheet offers Send text once they've consented
    this.bottomSheet.open(OptinFormBottomSheet, {data: {resident: resident, orgID: orgID, user: user, activity: this.activity,
      household: this.household, allowTexting: !!this.activity?.enableTexting}});
  }

  submitNonResponseForHH(household: Household, nonResponse: NonResponse){
    const records = household.residents
      .filter(resident => !this.residentsContacted.includes(resident.personID) && !this.residentsComplete.includes(resident.personID))
      .map(resident => this.buildNonResponseRecord(resident, household, nonResponse))

    if(records.length === 0 || this.loading) return

    this.loading = true
    this.errorMessage = ''

    // One at a time: the server decides whether the household is passed by counting
    // the records already saved, so parallel requests can each miss the others
    from(records).pipe(
      concatMap(record => this.canvassService.createCanvassContactRecord(record).pipe(timeout(SLOW_LOAD_TIMEOUT_MS))),
      last()
    ).subscribe(
      (canvassHouseholdRecord: ActivityHouseholdRecord) => this.handleSavedRecord(canvassHouseholdRecord),
      error => this.handleSaveError(error)
    )
  }

  openSMSDialog(resident: Resident, household: Household): void {
    this.bottomSheet.open(SingularTextForm, {data: {resident: resident, household, activity: this.activity}});
  }

  openCreateMemberDialog(){
    const record = this.data.canvassHouseholdRecord
    // A dropped household gets its new people as residents; the dialog hands back the finished record,
    // so it only closes through its own buttons
    const size = window.innerWidth < 600
      ? {width: '100vw', maxWidth: '100vw', maxHeight: '100vh'}
      : {width: '640px', maxWidth: '94vw', maxHeight: '96vh'}
    const dialogRef = this.dialog.open(CreateMemberDialog, {autoFocus: false, data: {household: this.household, activityHouseholdRecord: record},
                                                             ...size, disableClose: !!record?.dropped});
    dialogRef.afterClosed().subscribe((savedRecord: ActivityHouseholdRecord) => {
      if(savedRecord) this.handleSavedRecord(savedRecord)
    });
  }

  shouldShowQuestion(question: any): boolean {
    var orgID: string = sessionStorage.getItem('orgID')

    if (!question.orgIDs || question.orgIDs.length === 0) {
      return true;
    }
    return question.orgIDs.includes(orgID);
  }

  shouldHideQuestion(question: any): boolean {
    return this.activity.questionsToHide.includes(question.question); 
  }

  getVisibleIndex(questions: any[], currentIndex: number): number {
  return questions
    .slice(0, currentIndex)
    .filter(q => this.shouldShowQuestion(q) && !this.shouldHideQuestion(q))
    .length + 1;
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

  getVotingCenters(){
    this.ampService.getNearestVoteCenters(this.household.location, this.household.county).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (nearestPollingLocations: VoteCenter[]) =>{
        this.nearestPollingLocations = nearestPollingLocations || []
        this.gettingPollingLocations = false;
      },
      error =>{
        console.log(error)
        this.gettingPollingLocations = false;
      }
    )
  }

}