import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList, AfterViewInit} from '@angular/core';
import { ActivityService} from '../../services/activity/activity.service'
import {TextingService} from '../../services/texting/texting.service'
import {OrganizationService} from '../../services/organization/organization.service'

import {Address} from '../../models/address/address.model'
import {Activity, TextContactRecord} from '../../models/activities/activity.model'
import {ConversationComponent} from './conversation/conversation.component'
import {SwPush} from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import * as _ from 'underscore';
import {Resident} from '../../models/houseHolds/houseHold.model'

@Component({
  selector: 'app-texting',
  templateUrl: './texting.component.html',
  styleUrls: ['./texting.component.scss'],
})

export class TextingComponent implements OnInit {

  vapidKey = {publicKey:"BNePgr0mFlyTAfrgaWgIyeqSyV3uy-gqCKBB5JFa2OmO2dcChvZaP_VCuvy7aoKad2TOam9y2cdYgocdoCe2wtk"}

  errorMessage: string = '';
  displayErrorMsg: boolean = false;

  phoneNumbers: unknown[] = []

  activityLoaded: boolean = false;
  houseHoldsLoaded: boolean = false;
  loadingHouseHolds: boolean = false;

  numbersUnavailable: boolean = false;

  userPhoneNumber: string = '';

  @ViewChild(ConversationComponent, { static: false}) 

  identifiedPeople: unknown[] = []
  userFirstName: string;
  sendingText = false;
  houseHoldRecords: unknown[]= []

  orgLevel: string = ''
  sentHouseHoldRecords: unknown[] = []
  residentsSent = []
  textReceivedContactRecords = []
  textReceivedContactRecordsIDS = []

  selectedTextContactRecord: TextContactRecord;

  activity: Activity;
  houseHoldsCompleted: boolean = false;
  houseHoldsNewLockCompleted: boolean = false;
  alreadyLocked: boolean = false;
  demoVersion: boolean = environment.demoVersion;

  constructor(private activityService: ActivityService, 
              private textingService: TextingService,
              public orgService: OrganizationService,
              private swPush: SwPush,
              ) {
                this.swPush.messages.subscribe(event=>{
                  console.log(event)
                  this.getActivity()
                })
               }

  subscribeToNotifications() {

    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id

    this.swPush.requestSubscription({
        serverPublicKey: this.vapidKey.publicKey
    })
    .then(sub => this.textingService.addPushSubscriber(sub, userID).subscribe(result=>{
      //console.log(result)
    })).catch(err => console.error("Could not subscribe to notifications", err));
  }

  public getOrgLevel(){
    var user = JSON.parse(sessionStorage.getItem('user'));
    let orgID: string = sessionStorage.getItem('orgID');

    for (var i = 0; i< user.orgPermissions.length; i++){
      if(user.orgPermissions[i].orgID === orgID){
        this.orgLevel = user.orgPermissions[i].level;
        return
      }
    }
  }

  public getActivity(){
    var activityID: string = sessionStorage.getItem('activityID')

    this.activityService.getActivity(activityID).subscribe(
      (activity: Activity) =>{
        this.activity = activity

        var numberAllocated: boolean = this.getUserPhoneNumber(activity.textMetaData.activityPhonenums);

        if(!numberAllocated) {
          this.getOrgPhoneNumbers()
          return
        }

        this.activityLoaded = true;
        
        if(!this.demoVersion){
          this.subscribeToNotifications()
        }
        
        this.loadHouseHolds();
        
        this.sendingText = false;
      },
      error=>{
        console.log(error)
        this.errorMessage = "There was an unknown error with the server.";
        this.displayErrorMsg = true;
      }
    )
  }

  getTextbankContactHistory(){
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

    this.textingService.getTextbankContactHistory(this.activity, userID, this.orgLevel).subscribe(
      (residentIDs: unknown[]) =>{
        this.textReceivedContactRecords = residentIDs['residentsResponded'];
        this.textReceivedContactRecordsIDS = residentIDs['residentsRespondedIDS'];
        this.residentsSent = residentIDs['residentsSent'];
      },
      error =>{
        console.log(error)
      }
    )
  }

  public getUserPhoneNumber(phonenums){
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id
    for(var i = 0; i < phonenums.length; i++){
      if(phonenums[i].userID === userID){
        this.userPhoneNumber = phonenums[i].number  
        return true  
      }
    }
    return false
  }

  public getOrgPhoneNumbers(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    var orgID: string = sessionStorage.getItem('orgID')

    this.orgService.getOrgPhoneNumbers(orgID, campaignID).subscribe(
      (phoneNumbers: unknown[])  =>{
        this.activityLoaded = true;

        var allocatedNumbers = this.activity.textMetaData.activityPhonenums.map(x => {return x['number'] })

        for(var i = 0; i < phoneNumbers.length; i++){
          if(!allocatedNumbers.includes(phoneNumbers[i]['phoneNumber'])){
            this.phoneNumbers.push(phoneNumbers[i]['phoneNumber']);
          }
        }

        if(this.phoneNumbers.length === 0) {
          this.numbersUnavailable = true;
          return;
        } else {
          this.orgService.getOrgPhoneNumbersFilter(campaignID, this.phoneNumbers).subscribe(
              (result: any) => {
              if (result.length) {
                const filteredPhoneNumbers = result[0].filteredNums;
                for (var i = 0; i < filteredPhoneNumbers.length; i++) {
                  this.phoneNumbers = this.phoneNumbers.filter(function (e) {return e !== filteredPhoneNumbers[i]});
                }
              }
            }
          );
        }
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was an unknown error with the server.";
        this.displayErrorMsg = true;
      }
    )
  }

  public numberSelected(selectedNumber){
    var activityID: string = sessionStorage.getItem('activityID')
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id

    this.activityLoaded = false;
    this.textingService.allocatePhoneNumber(userID, activityID, selectedNumber.value).subscribe(
      (result: unknown) =>{
        this.activityLoaded = false;
        this.getActivity()
      },
      error =>{
        console.log(error)
        this.errorMessage = 'There was an unknown error with the server.';
        this.displayErrorMsg = true;
      }
    )
  }

  public loadHouseHolds(){
    var activityID: string = sessionStorage.getItem('activityID');
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

    this.textingService.loadHouseHolds(activityID, userID).subscribe(
      result =>{
        this.houseHoldRecords = result['lockedHouseHoldRecords'];
        this.houseHoldsLoaded = true;

        if(this.houseHoldRecords.length === 0 && this.alreadyLocked){
          this.houseHoldsCompleted = true;
        }else{
          this.houseHoldsCompleted = false;
        }

        this.sentHouseHoldRecords = result['sentHouseHoldRecords'];

        for(var j = this.sentHouseHoldRecords.length - 1; j >= 0; j--){
          if(this.sentHouseHoldRecords[j]['houseHold']['residents'].length === this.sentHouseHoldRecords[j]['numTextSent']){
            this.sentHouseHoldRecords.splice(j, 1);
          }
        }

        this.getTextbankContactHistory();

        this.loadingHouseHolds = false;
      }
    );
  }

  public lockNewHouseHolds(){
    this.loadingHouseHolds = true;
    var activityID: string = sessionStorage.getItem('activityID')
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id
    this.alreadyLocked = true;

    this.textingService.lockNewHouseHolds(activityID, userID).subscribe(
      result =>{
        if(result['success']){
          this.houseHoldRecords = this.houseHoldRecords.concat(result['lockedHouseHoldIDs']);
          this.loadingHouseHolds = false;
          this.alreadyLocked = true;
        } else {
          this.houseHoldsNewLockCompleted = true;
        }
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was an unknown error with the server.";
        this.displayErrorMsg = true;
      }
    )
  }

  sendInitText(resident: Resident, houseHoldRecord: unknown){

    this.sendingText = true;
    var activityID: string = sessionStorage.getItem('activityID')
    var orgID: string = sessionStorage.getItem('orgID')
    var userID: string = JSON.parse(sessionStorage.getItem('user'))._id
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'));

    var fullInitTextMsg: string = this.activity.textMetaData.initTextMsg

    var correctlyCappedUsername = this.userFirstName.charAt(0).toUpperCase() + this.userFirstName.slice(1).toLowerCase()
    var correctlyCappedResidentName = resident['name']['firstName'].charAt(0).toUpperCase() + resident['name']['firstName'].slice(1).toLowerCase()

    if(this.activity.textMetaData.sendSenderName && this.activity.textMetaData.sendReceiverName){
      fullInitTextMsg = "this is " + correctlyCappedUsername + fullInitTextMsg
    }

    if(this.activity.textMetaData.sendSenderName && !this.activity.textMetaData.sendReceiverName){
      fullInitTextMsg = "This is " + correctlyCappedUsername + " " + fullInitTextMsg
    }

    if(this.activity.textMetaData.sendReceiverName){
      fullInitTextMsg = "Hello " + correctlyCappedResidentName + ", " + fullInitTextMsg
    }

    console.log(fullInitTextMsg)

    var tbContactRecord = {
      orgID: orgID,
      campaignID: campaignID,
      userID: userID,
      activityID: activityID,
      initTextMsg: fullInitTextMsg,
      userPhonenum: this.userPhoneNumber,
      personID: resident['personID'],
      pass: this.activity.passes,
      idBy: this.activity.idByHousehold
    }

    console.log(resident)

    this.textingService.sendInitText(resident, houseHoldRecord, tbContactRecord).subscribe(
      async (textContactHistory: TextContactRecord) =>{
        console.log(textContactHistory)
        this.loadHouseHolds()

        /*
        for (var i = 0; i < this.sentHouseHolds.length; i++){
          if(this.sentHouseHolds[i]['indexNum'] === indexNum){
            this.sentHouseHolds[i]['initTextSent'] = true;
            this.sentHouseHolds[i]['numTextSent'] = await (this.sentHouseHolds[i]['numTextSent'] + 1);
            break;
          }
        }

        for (var i = 0; i < this.houseHolds.length; i++){
          if(this.houseHolds[i]['indexNum'] === indexNum){
            this.houseHolds[i]['initTextSent'] = true;
            this.houseHolds[i]['numTextSent'] = await (this.houseHolds[i]['numTextSent'] + 1);
            await this.sentHouseHolds.push(this.houseHolds[i]);
            await this.houseHolds.splice(i, 1);
            break;
          }
        }*/

        if(!this.residentsSent.includes(textContactHistory.personID)){
          await this.residentsSent.push(textContactHistory.personID);
        }

        //await this.loadHouseHolds(this.houseHolds, this.sentHouseHolds);
        this.sendingText = false;
      },
      error =>{
        console.log(error)
        this.errorMessage = "There was an unknown error with the server.";
        this.displayErrorMsg = true;
      }
    )
  }

  public getConversation(textContactRecord: TextContactRecord){
    this.selectedTextContactRecord = textContactRecord
  }

  ngOnInit() {
    this.getOrgLevel();
    this.getActivity();
    this.userFirstName = JSON.parse(sessionStorage.getItem('user')).name.firstName
    sessionStorage.removeItem('rdr')
    sessionStorage.setItem('activityType', "Texting")
  }
}
