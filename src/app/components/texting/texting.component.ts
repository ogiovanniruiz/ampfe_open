import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import {ConversationComponent} from './conversation/conversation.component'
import {SwPush} from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import * as _ from 'underscore';



//SERVICES
import { ActivityService} from '../../services/activity.service'
import {TextingService} from '../../services/texting.service'
import {OrganizationService} from '../../services/organization/organization.service'

//MODELS
import {Activity, InitTextMsg } from '../../models/activity.model'
import {  ActivityContactRecord, TextRecordsUpdated, ActivityHouseholdRecord, TextbankContactDetails, TextConversation } from '../../models/contact.record.model';

import {Address, Household, Person, Resident} from '../../models/person.model'
import { User } from 'src/app/models/user.model';
import { SignalWireService } from 'src/app/services/signalWire.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { HotlineService } from 'src/app/services/hotline.service';
import { buildInitTextMsg, EMPTY_INIT_TEXT_MSG } from '../../utils/initTextMsg';
import { ClientConfigService } from 'src/app/services/clientConfig.service';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS, MISSING_ACTIVITY_MSG, loadErrorText } from '../../utils/loading';


@Component({
  selector: 'app-texting',
  templateUrl: './texting.component.html',
  styleUrls: ['./texting.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class TextingComponent implements OnInit{

  vapidKey = {publicKey:"BNePgr0mFlyTAfrgaWgIyeqSyV3uy-gqCKBB5JFa2OmO2dcChvZaP_VCuvy7aoKad2TOam9y2cdYgocdoCe2wtk"}

  errorMessage: string = '';
  displayErrorMsg: boolean = false;

  activityLoaded: boolean = false;
  // The activity couldn't be loaded: the page shows this with Retry instead of loading forever
  loadFailed: string = '';
  houseHoldsLoaded: boolean = false;
  loadingHouseHolds: boolean = false;


  activityTextingNumber: string;

  @ViewChild(ConversationComponent, { static: false}) 

  identifiedPeople: unknown[] = []
  userFirstName: string;
  sendingText = false;
  houseHoldRecords: ActivityHouseholdRecord[]= []

  orgLevel: string = ''
  sentHouseHoldRecords: unknown[] = []
  residentsSent = []
  // Replied or finished in an earlier pass: never sent another initial text
  residentsFinished: string[] = []
  textReceivedContactRecords = []
  textReceivedContactRecordsIDS = []

  selectedTextContactRecord: ActivityContactRecord;

  activity: Activity;
  houseHoldsCompleted: boolean = false;
  houseHoldsNewLockCompleted: boolean = false;
  alreadyLocked: boolean = false;
  demoVersion: boolean = environment.demoVersion;
  // Demo builds text this instead of residents; it comes from the server (clientConfig)
  get testCallingNumber(): string { return this.clientConfig.testCallingNumber }

  sendImage: boolean = false
  imageUrl: string = ''

  sendingBatchTexts: boolean = false;
  batchTotal: number = 0;
  batchDone: number = 0;
  cancelBatch: boolean = false;

  // Phone layout shows either the conversation list or one open conversation
  showPreview: boolean = false;

  constructor(private activityService: ActivityService, 
              private textingService: TextingService,
              private swService: SignalWireService,
              public orgService: OrganizationService,
              private swPush: SwPush,
                 public hotlineService: HotlineService,
                 private clientConfig: ClientConfigService

              ) {
                this.swPush.messages.subscribe(event=>{
                  console.log(event)
                  this.getActivity()
                })
               }

  subscribeToNotifications() {

    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id

    this.swPush.requestSubscription({serverPublicKey: this.vapidKey.publicKey
    }).then(sub => this.textingService.addPushSubscriber(sub, userID).subscribe(result=>{console.log(result)
    })).catch(err => console.error("Could not subscribe to notifications", err));
  }

  public getActivity(){
    var activityID: string = sessionStorage.getItem('activityID')
    this.loadFailed = ''

    this.activityService.getActivity(activityID).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
      (activity: Activity) =>{
        if(!activity){
          this.loadFailed = MISSING_ACTIVITY_MSG
          return
        }
        this.activity = activity
        const defaultInitTextMsg: InitTextMsg = activity.textMetaData.defaultInitTextMsg ?? activity.textMetaData.initTextMsgs[0] ?? {msg: '', sendSenderName: false, sendReceiverName: false, attachImage: false, imageUrl: ''};
        this.sendImage = defaultInitTextMsg.attachImage
        this.imageUrl = defaultInitTextMsg.imageUrl

        this.activityTextingNumber = activity.textMetaData.activityPhonenumber;
        this.activityLoaded = true;

        if(this.activityTextingNumber === undefined || this.activityTextingNumber === null || this.activityTextingNumber === ''){
          return
        }

        
        if(!this.demoVersion){
          this.subscribeToNotifications()
        }
        
        this.loadHouseHolds();
        this.getTextbankContactHistory();
        
        this.sendingText = false;
      },
      error=>{
        console.log(error)
        this.loadFailed = loadErrorText('this activity', error)
      }
    )
  }

  getTextbankContactHistory(){
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

    this.textingService.getTextbankContactHistory(this.activity._id, userID, this.orgLevel, this.activity.passes).subscribe(
      (residentIDs: unknown[]) =>{
        this.textReceivedContactRecords = residentIDs['residentsResponded'];

        this.textReceivedContactRecordsIDS = residentIDs['residentsResponded'].map(x =>{return x['personID']});

        this.residentsSent = residentIDs['residentsSent'];

        this.residentsFinished = residentIDs['residentsFinished'] || [];

      },
      error =>{
        console.log(error)
      }
    )
  }

  public loadHouseHolds(){
    var activityID: string = sessionStorage.getItem('activityID');
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

    this.textingService.loadHouseHolds(activityID, userID).subscribe(
      (lockedHouseHoldRecords: ActivityHouseholdRecord[]) =>{

        this.houseHoldRecords = lockedHouseHoldRecords;
        this.houseHoldsLoaded = true;

        if(this.houseHoldRecords.length === 0 && this.alreadyLocked){
          this.houseHoldsCompleted = true;
        }else{
          this.houseHoldsCompleted = false;
        }

        this.loadingHouseHolds = false;
        this.sendingText = false;
      },
      error => {
        console.log(error)
        this.loadingHouseHolds = false;
        this.sendingText = false;
        this.errorMessage = loadErrorText('your households', error);
        this.displayErrorMsg = true;
      }
    );
  }

  public lockNewHouseHolds(){
    this.loadingHouseHolds = true;
    var activityID: string = sessionStorage.getItem('activityID')
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id
    this.alreadyLocked = true;

    this.textingService.lockNewHouseHolds(activityID, userID).subscribe(
      (lockedHouseHoldIDs: ActivityHouseholdRecord[]) =>{

        if(lockedHouseHoldIDs.length === 0) {this.houseHoldsNewLockCompleted = true; this.loadingHouseHolds = false; return;}

        this.houseHoldRecords = this.houseHoldRecords.concat(lockedHouseHoldIDs);
        this.loadingHouseHolds = false;
        this.alreadyLocked = true;

      },
      error =>{
        console.log(error)
        this.loadingHouseHolds = false;
        this.errorMessage = "Couldn't load more households. Please try again.";
        this.displayErrorMsg = true;
      }
    )
  }

  createFullInitTextMessage(resident: Resident){
    const initTextMsg: InitTextMsg = this.activity.textMetaData.defaultInitTextMsg ?? this.activity.textMetaData.initTextMsgs[0] ?? EMPTY_INIT_TEXT_MSG
    return buildInitTextMsg(initTextMsg, this.userFirstName, resident.name.firstName)
  }

  sendInitText(resident: Resident, household: Household, activityHouseholdRecordID: string){

    // A demo build must never fall back to a resident's real number
    if(this.demoVersion && !this.testCallingNumber){
      this.errorMessage = "Test number isn't configured on the server, so demo calls and texts are turned off."
      this.displayErrorMsg = true
      return
    }

    this.sendingText = true;
    var activityID: string = sessionStorage.getItem('activityID')
    var orgID: string = sessionStorage.getItem('orgID')
    var user: User = JSON.parse(sessionStorage.getItem('user'))
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    var fullInitTextMsg = this.createFullInitTextMessage(resident)

    var textConversation: TextConversation = {origin: "USER", msg: fullInitTextMsg}

    var residentPhonenumber = resident.phones[0].number
    
    if(this.demoVersion){
      residentPhonenumber = this.testCallingNumber
    }

    var textbankContactDetails: TextbankContactDetails = {
      userPhonenumber: this.activityTextingNumber,
      residentPhonenumber: residentPhonenumber,
      textSuccessful: false,
      textConvo: [textConversation],
      initTextMessage: fullInitTextMsg,
      imageUrl: this.sendImage ? this.imageUrl : ''
    }

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

    var tbContactRecord: ActivityContactRecord = {
                                                  orgID: orgID,
                                                  campaignID: campaignID,
                                                  userID: user._id,
                                                  user: user,
                                                  activityID: activityID,
                                                  activityType: "Texting",

                                                  textbankContactDetails,
                                                  personID: resident.personID,
                                                  pass: this.activity.passes,

                                                  person: person,
                                                  complete: false,
                                                  activityHouseholdRecordID: activityHouseholdRecordID,
                                                  member: false
                                                  }

    this.textingService.sendInitText(tbContactRecord).subscribe(
      async (recordsUpdated: TextRecordsUpdated) =>{

        if(!recordsUpdated) {
          this.sendingText = false;  
          return
        } 

        // The server refused: this person replied or was finished in an earlier pass
        if(recordsUpdated['skipped']){
          if(!this.residentsFinished.includes(recordsUpdated['personID'])) this.residentsFinished.push(recordsUpdated['personID'])
          this.sendingText = false;
          return
        }

        if(!this.residentsSent.includes(recordsUpdated.textContactRecord.personID)){
          this.residentsSent.push(recordsUpdated.textContactRecord.personID);
        }
     

        if(recordsUpdated.textbankHouseholdRecord.passed && !this.sendingBatchTexts){
          for(var j = this.houseHoldRecords.length - 1; j >= 0; j--){
            if(this.houseHoldRecords[j]._id === recordsUpdated.textbankHouseholdRecord._id){
              this.houseHoldRecords.splice(j, 1);
              this.sendingText = false;
              return
            }
          }
        }

        this.sendingText = false;
          
      },
      error =>{
        console.log(error)
        this.sendingText = false;
        this.errorMessage = "Couldn't send the text. Please try again.";
        this.displayErrorMsg = true;
      }
    )
  }

  async sendBatchTexting(){
    const timer = ms => new Promise(res => setTimeout(res, ms))

    // Everyone still to text, household by household (last loaded first, as before)
    const queue: {resident: Resident, household: Household, recordID: string}[] = []
    for(var i = this.houseHoldRecords.length - 1; i >= 0; i--){
      const record = this.houseHoldRecords[i]
      for(const resident of record.household.residents){
        if(this.residentStatus(resident) === 'todo') queue.push({resident, household: record.household, recordID: record._id})
      }
    }

    if(queue.length === 0) return

    this.sendingBatchTexts = true
    this.cancelBatch = false
    this.batchTotal = queue.length
    this.batchDone = 0

    for(const item of queue){
      if(this.cancelBatch) break
      this.sendInitText(item.resident, item.household, item.recordID)
      this.batchDone++
      await timer(2000);
    }

    // Households with nobody left to text drop off the list
    this.houseHoldRecords = this.houseHoldRecords.filter(record =>
      record.household.residents.some(resident => this.residentStatus(resident) === 'todo'))

    this.sendingBatchTexts = false
  }

  stopBatchTexting(){
    this.cancelBatch = true
  }

  // One status per person on the Send tab
  residentStatus(resident: Resident): 'todo' | 'sent' | 'replied' | 'finished' {
    if(this.textReceivedContactRecordsIDS.includes(resident.personID)) return 'replied'
    if(this.residentsSent.includes(resident.personID)) return 'sent'
    if(this.residentsFinished.includes(resident.personID)) return 'finished'
    return 'todo'
  }

  get sendCounts(){
    const counts = {todo: 0, sent: 0, replied: 0, finished: 0}
    for(const record of this.houseHoldRecords){
      for(const resident of record.household.residents){
        counts[this.residentStatus(resident)]++
      }
    }
    return counts
  }

  // The initial text as it will go out, with a sample first name
  get messagePreview(): string {
    if(!this.activity || !this.userFirstName) return ''
    return this.createFullInitTextMessage({name: {firstName: 'Alex'}} as Resident)
  }

  formatPhone(number: string): string {
    const digits = (number || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
    if(digits.length !== 10) return number || ''
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  lastFour(resident: Resident): string {
    const number = resident.phones?.[0]?.number || ''
    return number ? '•••' + number.slice(-4) : ''
  }

  //////////////////////// CONVERSATIONS ////////////////////////

  private lastMessage(record: ActivityContactRecord){
    const convo = record.textbankContactDetails?.textConvo || []
    return convo[convo.length - 1]
  }

  awaitingReply(record: ActivityContactRecord): boolean {
    return this.lastMessage(record)?.origin === 'PERSON'
  }

  lastMessageText(record: ActivityContactRecord): string {
    const last = this.lastMessage(record)
    if(!last) return ''
    return (last.origin === 'USER' ? 'You: ' : '') + (last.msg || '(image)')
  }

  // Conversations waiting on the texter first, then most recent reply first
  get sortedConversations(): ActivityContactRecord[] {
    const receivedAt = (record) => new Date(record.textbankContactDetails?.textReceived?.date || 0).getTime()
    return [...this.textReceivedContactRecords].sort((a, b) =>
      (Number(this.awaitingReply(b)) - Number(this.awaitingReply(a))) || (receivedAt(b) - receivedAt(a)))
  }

  get awaitingCount(): number {
    return this.textReceivedContactRecords.filter(record => this.awaitingReply(record)).length
  }

  closeConversation(){
    this.selectedTextContactRecord = null
  }

  // Keep the list in step with the open conversation (new messages, or finished and removed)
  onConversationUpdated(record: ActivityContactRecord){
    this.selectedTextContactRecord = record
    if(!record) return
    const index = this.textReceivedContactRecords.findIndex(x => x._id === record._id)
    if(index >= 0) this.textReceivedContactRecords[index] = record
  }

  canSendInitText(resident: Resident): boolean {
    return !this.residentsSent.includes(resident.personID) && !this.residentsFinished.includes(resident.personID)
  }

  public getConversation(textContactRecord: ActivityContactRecord){
    this.selectedTextContactRecord = textContactRecord
  }

  ngOnInit() {
    this.getActivity();
    this.clientConfig.load()
    this.userFirstName = JSON.parse(sessionStorage.getItem('user')).name.firstName
    sessionStorage.removeItem('rdr')
    sessionStorage.setItem('activityType', "Texting")
  }

}