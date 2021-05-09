import { Component, OnInit, ViewChildren, QueryList} from '@angular/core';
import {ActivityService} from '../../services/activity/activity.service'
import { MediaChange, MediaObserver } from '@angular/flex-layout';
import {PhonebankService} from '../../services/phonebank/phonebank.service'
import {ScriptService} from '../../services/script/script.service'
import {PersonService} from '../../services/person/person.service'
import { PlatformLocation } from '@angular/common'
import {ContactFormDialog} from '../../dialogs/contactForm'
import {MatDialog} from '@angular/material/dialog';
declare const Twilio: any;
import {OrganizationService} from '../../services/organization/organization.service'

import { environment } from '../../../environments/environment';
import {Activity} from '../../models/activities/activity.model'
import {Script} from '../../models/scripts/script.model'
import {lockedHHResult, HouseHold} from '../../models/houseHolds/houseHold.model'


@Component({
  selector: 'app-phonebank',
  templateUrl: './phonebank.component.html',
  styleUrls: ['./phonebank.component.scss']
})
export class PhonebankComponent implements OnInit {

  activity: Activity;
  gridColumns: number;
  houseHold: HouseHold;
  script: Script;
  nonResponseSet: unknown;

  inCall: boolean = false;
  connecting: boolean = false;

  twilioStatusMessage: string = '';

  userPhoneNumber: string;
  needsResponses = false;
  status = 'Loading Phonebank...';
  errorMessage: string = '';
  displayErrorMsg: boolean = false;
  loading = true;

  residentCalling: unknown;

  allNumsInUse: boolean = false;

  residentsCalled: string[] = [];
  residentsResponded: string[] = [];

  submittingResponse: boolean = false;


  demoVersion: boolean = environment.demoVersion;
  testCallingNumber:  string = environment.testCallingNumber;

  @ViewChildren('radioAnswers') radioAnswers:QueryList<any>;
  @ViewChildren('textAnswers') textAnswers:QueryList<any>;

  gridByBreakpoint = {
    xl: 4,
    lg: 4,
    md: 3,
    sm: 2,
    xs: 2
  }

  constructor(private activityService: ActivityService,
              private observableMedia: MediaObserver, 
              public dialog: MatDialog,
              public orgService: OrganizationService,
              private phonebankService: PhonebankService, 
              public scriptService: ScriptService,location: PlatformLocation) { 

                location.onPopState(() => {
                  Twilio.Device.destroy();
                });
              }

  getActivity(){
    var activityID: string = sessionStorage.getItem('activityID');
    this.activityService.getActivity(activityID).subscribe(
      (activity: Activity) =>{
          this.getTwilioToken();
          this.getNonResponseSet(activity.nonResponseSetID);
          this.getScript(activity.scriptID);
          this.loading = false;
          this.status = null;
          this.activity = activity
          this.lockHouseHold();

    }, error=>{
      this.errorMessage = "Sorry, could not get activity. Please refresh to try again.";
      this.loading = false;
      this.displayErrorMsg = true;
      console.log(error)
    })
  }

  getPhonebankContactHistory(activityID: string, houseHold: unknown){
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id

    this.phonebankService.getPhonebankContactHistory(activityID, houseHold, userID, this.activity.passes).subscribe(
      (residentIDs: unknown) =>{
        this.residentsResponded = residentIDs['residentsResponded']
        this.residentsCalled = residentIDs['residentsCalled']
      },
      error =>{
        this.errorMessage = "Sorry, could not get phonebank contact histories. Please refresh to try again.";
        this.loading = false;
        this.displayErrorMsg = true;
        console.log(error)
      }
    )
  }


  public getTwilioToken(){
    this.status = "Fetching Calling Token..."
    Twilio.Device.destroy()
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))

    this.phonebankService.getTwilioToken(orgID, campaignID).subscribe(
      result=>{
        var token = result['token'];
        Twilio.Device.setup(token, { debug: true });
        Twilio.Device.on('ready', this.ready);
      },
      error =>{
        this.errorMessage = 'Sorry, could not get twilio token. Please refresh to try again.';
        this.displayErrorMsg = true;
        console.log(error)
      }
    );
  }

  ready = () =>{
    if(this.status = 'All members of this list have been contacted.'){
      return
    }
    this.twilioStatusMessage = 'Ready to Call.';
  }

  lockHouseHold(){
    var activityID: string = sessionStorage.getItem('activityID');
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

    this.status = "Loading Household..."
    this.houseHold = null

    this.phonebankService.lockHouseHold(activityID, userID).subscribe(
        (result: lockedHHResult) =>{
          if(result.success){
            this.loading = false;
            this.status = null
            this.ready()
            this.houseHold = result.houseHold;

            this.getPhonebankContactHistory(this.activity._id, this.houseHold)
          }else{
            this.status = "All members of this list have been contacted."
            this.loading = false;
            this.errorMessage = '';
            this.twilioStatusMessage = ''
          }
        }, error=>{
          console.log(error)
          this.errorMessage = "There was an error locking the household. Please try again.";
          this.displayErrorMsg = true;
          this.loading = false;
        }
    )
  }

  generateIdResponses(script: Script, radioAnswers, textAnswers): any[]{
    var idResponses = [];

    var questions = script['questions'].map(x => {return x.question})

    radioAnswers.forEach(div => {
      var question = div['name'];
      var answer = div['viewModel'];
      
      if(answer && questions.includes(question)){
        var response = answer.split(",")[0];
        var idType = answer.split(',')[1];
        var idResponse = {question: question, response: response, idType: idType};
        idResponses.push(idResponse);
      }
    });

    textAnswers.forEach(div => {
      var question = div.nativeElement.name;
      var answer = div.nativeElement.value;

      if(answer && questions.includes(question)){
        var idResponse = {question: question, response: answer, idType: "NONE"};
        idResponses.push(idResponse);
      }
    });

    return idResponses

  }

  submitScriptResponse(resident: unknown, radioAnswers, textAnswers, houseHoldID: unknown, hhSize: number){
    var idResponses = this.generateIdResponses(this.script, radioAnswers, textAnswers);

    if(idResponses.length === 0){
      this.needsResponses = true;
      return;
    }
    this.submittingResponse = true;
    this.needsResponses = false;

    var personID: string = resident['personID']
    var user: object = JSON.parse(sessionStorage.getItem('user'))
    var orgID: string = sessionStorage.getItem('orgID')

    this.phonebankService.submitScriptResponse(this.activity, idResponses, personID, user, orgID, houseHoldID, hhSize).subscribe(
      (result: unknown)=>{          
          this.submittingResponse = false;
          if(result['success']){
            this.loading = false;
            this.status = null
            this.ready()
            this.houseHold = result['houseHold'];
            this.getPhonebankContactHistory(this.activity['_id'], this.houseHold)
          }else{

            this.status = "All members of this list have been contacted.";
            this.houseHold = null
            this.loading = false;
            this.errorMessage = '';
            this.twilioStatusMessage = ''
          }
      },
      error =>{
          console.log(error)
          this.errorMessage = 'Sorry, could not submit response. Please try again in a few seconds.';
          this.displayErrorMsg = true;
          this.loading = false;
      }
    )
  }

  submitNonResponse(resident: unknown, nonResponse: string, nonResponseType: string, houseHoldID: unknown, hhSize: number){
    var personID: string = resident['personID']
    var user: object = JSON.parse(sessionStorage.getItem('user'))
    var orgID: string = sessionStorage.getItem('orgID')

    this.submittingResponse = true;

    this.phonebankService.submitNonResponse(this.activity, nonResponse, nonResponseType, personID, user, orgID, houseHoldID, hhSize, this.nonResponseSet['_id']).subscribe(
      (result: unknown)=>{

        this.submittingResponse = false;

        if(result['success']){
          this.loading = false;
          this.status = null
          this.ready()
          this.houseHold = result['houseHold'];
          this.getPhonebankContactHistory(this.activity['_id'], this.houseHold)
        }else{
          this.status = 'All members of this list have been contacted.';
          this.houseHold = null
          this.loading = false;
          this.errorMessage = '';
          this.twilioStatusMessage = '';
        }
      },
      error =>{
        console.log(error)
        this.errorMessage = 'Sorry, could not submit response. Please try again in a few seconds.';
        this.displayErrorMsg = true;
        this.loading = false;
      }
    )
  }

  getScript(scriptID: string){
    this.scriptService.getScript(scriptID).subscribe(
      (script: Script) =>{
        this.script = script
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.loading = false;
        this.errorMessage = 'There was a problem loading the script. Please refresh the page.';
      }
    )
  }

  getNonResponseSet(nonResponseSetID: string){
    this.scriptService.getNonResponseSet(nonResponseSetID).subscribe(
      (nonResponseSet: unknown) =>{
        this.nonResponseSet = nonResponseSet
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.loading = false;
        this.errorMessage = 'There was a problem loading the script. Please refresh the page.';
      }
    )
  }

  call(resident: unknown){

    this.inCall = true;
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var phone = ''

    for(var i =0; i < resident['phones'].length; i++){
      if(resident['phones'][i].number != ''){
          phone = '+1' + resident['phones'][i].number
      }
    }

    if(this.demoVersion){
      phone = this.testCallingNumber
    }

    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id
    var activityID: string = sessionStorage.getItem('activityID')

    this.twilioStatusMessage = "Connecting..."
    this.connecting = true;

    this.orgService.updateCallPool(orgID, campaignID).subscribe(
      (outGoingNumber: Object) => {
        this.connecting = false;
        
        if(outGoingNumber['success']){

          this.residentCalling = resident

          this.allNumsInUse = false;
          this.userPhoneNumber = outGoingNumber['number']

          var callDetails = {
                             residentPhonenum: phone, 
                             userPhonenum: this.userPhoneNumber,
                             origin: this.userPhoneNumber,
                             personID: resident['personID'],
                             userID: userID,
                             activityID: activityID,
                             orgID: orgID,
                             campaignID: campaignID,
                             pass: this.activity.passes,
                             idBy: this.activity.idByHousehold
                            }

          var connection = Twilio.Device.connect(callDetails);
          
          connection.on('connect', this.callConnection); 
          connection.on('disconnect', this.callDisconnected);
          connection.on('error', this.callError);

        }else{
          this.allNumsInUse = true;
          this.inCall = false;
        }       
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was as problem establishing a call. Please refresh the page and try again.";
        this.displayErrorMsg = true;
      }
    )
  }

  logCallLength(resident){
    var orgID: string = sessionStorage.getItem('orgID')
    var activityID: string = sessionStorage.getItem('activityID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id

    this.phonebankService.logCallLength(this.userPhoneNumber, orgID, activityID, this.activity.passes, resident['personID'], campaignID, userID).subscribe(
      ()=>{
        this.getPhonebankContactHistory(activityID, this.houseHold);
      },
      error=>{
        console.log(error)
        this.errorMessage = "There was an error logging the call length. Please refresh and try again.";
        this.displayErrorMsg = true;
      }
    )
  }

  skipHouseHold(houseHold: HouseHold){

    var activityID: string = sessionStorage.getItem('activityID')
    this.submittingResponse = true;

    this.phonebankService.skipHouseHold(activityID, houseHold, this.activity.idByHousehold).subscribe(
      () =>{
        this.submittingResponse = false;
        this.lockHouseHold();
      },
      error =>{
        console.log(error)
        this.errorMessage = "Could not skip household. Please try again.";
        this.displayErrorMsg = true;
      }
    )
  }

  ngOnInit(){
    this.getActivity()
    sessionStorage.removeItem('rdr')
    sessionStorage.setItem('activityType', "Phonebank")
  }

  openContactDialog(): void {
    var activityID = sessionStorage.getItem('activityID');
    this.dialog.open(ContactFormDialog, {width: '95%', data: {houseHold: this.houseHold, activityID: activityID}});
  }

  ngAfterContentInit() {
    this.observableMedia.media$.subscribe((change: MediaChange) => {
      this.gridColumns = this.gridByBreakpoint[change.mqAlias];
    });
  }

  callConnection = (connection) =>{
    console.log(connection);
    this.twilioStatusMessage = "Connected"
  }

  callError = (error) =>{
    console.log(error)
    this.errorMessage = "Twilio Error. Please refresh."
  }

  callDisconnected = () =>{
    this.twilioStatusMessage = "Call Disconnected. You may continue."
    this.hangUpNumber();
    this.logCallLength(this.residentCalling);
    this.inCall = false;
    this.residentCalling = undefined
  }

  endCall(){
    Twilio.Device.disconnectAll();
  }

  hangUpNumber(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    
    this.orgService.hangUpNumber(orgID, this.userPhoneNumber, campaignID).subscribe(
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

}

