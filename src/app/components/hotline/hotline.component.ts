import { Component, OnInit,ViewChild, ElementRef } from '@angular/core';
import { ActivityService } from 'src/app/services/activity/activity.service';
import {PhonebankService} from '../../services/phonebank/phonebank.service'
declare const Twilio: any;
import {HotlineService} from '../../services/hotline/hotline.service'
import { Router } from '@angular/router';

@Component({
  selector: 'app-hotline',
  templateUrl: './hotline.component.html',
  styleUrls: ['./hotline.component.scss']
})
export class HotlineComponent implements OnInit {

  @ViewChild('firstName', {static: false}) firstName: ElementRef
  @ViewChild('lastName', {static: false}) lastName: ElementRef
  @ViewChild('email', {static: false}) email: ElementRef
  @ViewChild('address', {static: false}) address: ElementRef
  @ViewChild('notes', {static: false}) notes: ElementRef
  
  phoneNumber: string;

  status = "Loading Hotline..."
  errorMessage: string = '';
  displayErrorMsg: boolean = false;
  loading = true;
  connection: any;
  incomingCall: boolean = false;
  inCall: boolean = false;
  showForm: boolean = false;
  incomingPhoneNum: unknown;
  noNotes: boolean = false;
  activityEmail: string = ''
  selectedUrgency: unknown;
  activityName: string = ''
  callSid: string;
  activities: unknown[]

  constructor(
              private activityService: ActivityService,
              private hotlineService: HotlineService,
              private router: Router
              ) { }

  ngOnInit(): void {
    this.addUserIDtoHotline()
    
    this.getActivity();
    this.getHotlineActivities()
  }

  public getActivity(){

    var activityID: string = sessionStorage.getItem('activityID')

    this.activityService.getActivity(activityID).subscribe(
      (result: unknown) =>{
      var phonenumber: string = result['hotlineMetaData']['mainPhoneNumber']
      this.activityName = result['name']
      this.activityEmail = result['hotlineMetaData']['email']
      this.phoneNumber = phonenumber
      this.getIncomingTwilioToken(phonenumber);
    })

  }

  public getIncomingTwilioToken(phonenumber){
    this.status = "Fetching Calling Token..."
    Twilio.Device.destroy()
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var userID =  JSON.parse(sessionStorage.getItem('user'))._id;
    var activityID: string = sessionStorage.getItem('activityID')


    this.hotlineService.getIncomingTwilioToken(orgID, campaignID, phonenumber, userID, activityID).subscribe(
      result=>{
        var token = result['token'];
        Twilio.Device.setup(token, { debug: true });
        Twilio.Device.on('ready', this.ready);
        Twilio.Device.on('incoming', this.incomingCallDetected)
        Twilio.Device.on('disconnect', this.callDisconnected);
        Twilio.Device.on('cancel', this.callCanceled);
        Twilio.Device.on('error', this.callError);
        //Twilio.Device.on('tokenAboutToExpire', this.updateToken)

      },
      error =>{
        this.errorMessage = "Sorry, could not get twilio token. Please refresh to try again.";
        this.displayErrorMsg = true;
        console.log(error)
      }
    )
  }

  addUserIDtoHotline(){
    var activityID: string = sessionStorage.getItem('activityID')
    var userID =  JSON.parse(sessionStorage.getItem('user'))._id;
    this.hotlineService.addUserIDtoHotline(activityID, userID).subscribe(result =>{
      console.log(result)
    })
    

  }

  submitData(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var activityID: string = sessionStorage.getItem('activityID')
    var userID =  JSON.parse(sessionStorage.getItem('user'))._id;

    var firstName = this.firstName.nativeElement.value;
    var lastName = this.lastName.nativeElement.value;
    var email = this.email.nativeElement.value;
    var notes = this.notes.nativeElement.value;
    var address = this.address.nativeElement.value;
    var incomingPhoneNum = this.incomingPhoneNum

    if(notes === '' || !notes){
      this.noNotes = true;
      return
    }

    if(!this.selectedUrgency['value']){
      this.noNotes = true;
      return
    }

    var hotlineResponse = {
      orgID: orgID,
      campaignID: campaignID,
      activityID: activityID,
      name: {firstName: firstName, lastName: lastName},
      email: email,
      notes: notes,
      residentPhoneNum: incomingPhoneNum,
      userPhoneNum: this.phoneNumber,
      contactUserID: userID,
      address: address,
      activityEmail: this.activityEmail,
      urgencyLevel: this.selectedUrgency['value'],
      activityName: this.activityName,
      blocked: false
  
    }

    this.hotlineService.submitHotlineResponse(hotlineResponse).subscribe(
      (result: unknown) =>{
        this.noNotes = false;
        this.showForm = false;
      },
      error =>{
        console.log(error)
      }
    )
  }

  block(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var activityID: string = sessionStorage.getItem('activityID')
    var userID =  JSON.parse(sessionStorage.getItem('user'))._id;

    var firstName = this.firstName.nativeElement.value;
    var lastName = this.lastName.nativeElement.value;
    var email = this.email.nativeElement.value;
    var notes = this.notes.nativeElement.value;
    var address = this.address.nativeElement.value;
    var incomingPhoneNum = this.incomingPhoneNum

    var hotlineResponse = {
      orgID: orgID,
      campaignID: campaignID,
      activityID: activityID,
      name: {firstName: firstName, lastName: lastName},
      email: email,
      notes: notes,
      residentPhoneNum: incomingPhoneNum,
      userPhoneNum: this.phoneNumber,
      contactUserID: userID,
      address: address,
      blocked: true,
      activityEmail: this.activityEmail,
      activityName: this.activityName
    }

    this.hotlineService.submitHotlineResponse(hotlineResponse).subscribe(
      (result: unknown) =>{
        console.log(result)
        this.noNotes = false
        this.showForm = false
      },
      error =>{
        console.log(error)
      }
    )
  }

  lobby(){
    this.showForm = false
  }

  disconnectFromHotline(){
    if(this.connection){
      this.connection.reject()
    }
    
    Twilio.Device.destroy()
    this.router.navigate(['/activity']);
  }

  public urgencySelected(selectedUrgency){
    this.selectedUrgency = selectedUrgency
  }

  incomingCallDetected = (conn) =>{
    this.callSid = conn.parameters.CallSid
    this.status = "You have an incoming call from " + conn.parameters.From
    this.connection = conn
    this.incomingCall = true;
    this.incomingPhoneNum = conn.parameters.From
  }

  acceptCall(){
    this.incomingCall = false;
    this.connection.accept()
    this.inCall = true
    this.showForm = true
  }
  
  hangupCall(){
    Twilio.Device.disconnectAll();
  }

  callDisconnected = () =>{
    this.connection = undefined
    this.incomingCall = false;
    this.status = "Ready to Receive Calls."
    this.inCall = false;
  }

  redirectCall(redirectPhoneNum){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var orgID: string = sessionStorage.getItem('orgID')
    this.hotlineService.redirectCall(this.callSid, orgID, redirectPhoneNum['value'], campaignID).subscribe(
      (result: unknown) =>{
        console.log(result)
      }
    )
  }

  getHotlineActivities(){
    var activityID: string = sessionStorage.getItem('activityID')
    const campaignID: number = parseInt(sessionStorage.getItem('campaignID'));
    const orgID: string = sessionStorage.getItem('orgID');

    this.activityService.getActivities(campaignID, orgID, 'Hotline').subscribe(
      (activities: unknown[]) => {
        this.activities = activities.filter(function (activity) { return activity['active'] && activity['_id'] != activityID });

      }, 
      error =>{
        console.log(error)
      }
    )

  }

  callCanceled = () =>{
    this.incomingCall = false;
    this.status = "Ready to Receive Calls."
    this.inCall = false;
  }

  callError = (error) =>{
    if(error.message === "JWT Token Expired"){
      this.status = "Token has expired. Getting a new token."
      this.getIncomingTwilioToken(this.phoneNumber)
      return
    }

    this.status = ""
    this.errorMessage = "There was an error. Please refresh the page."

  }

  ready = () =>{
    this.status = "Ready to Receive Calls to " + this.phoneNumber
    this.loading = false;
  }

}
