import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import { HotlineService } from 'src/app/services/hotline.service';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { SignalWireService } from 'src/app/services/signalWire.service';
declare const Relay: any;


@Component({
    selector: 'app-hotline',
    templateUrl: './outgoingCall.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class OutgoingCallDialog implements OnInit{

  constructor(
    public dialog: MatDialog, 
    public hotlineService: HotlineService, 
    public dialogRef: MatDialogRef<OutgoingCallDialog>, 
    @Inject(MAT_DIALOG_DATA) public previousCall: any,             
    public swService: SignalWireService) 
  {

  }

  client: any

  status: string = "Getting Calling Token...";
  currentCall;
  tokenExpired: boolean = false;

  inCall: boolean = false;
  loading: boolean = false;

  hotline_number: string;

  @ViewChild('notes', {static: true}) notes: ElementRef;


  ngOnInit(){
    this.getSWToken()
    this.getHotlinePhonenumber()
    this.notes.nativeElement.value = this.previousCall.notes || '';

  }

  public getSWToken(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = -1

    this.loading = true
    
    this.swService.getSWToken(orgID, campaignID).subscribe(
      (callingToken: any) =>{
      
      this.client = new Relay({project: callingToken['projectID'], token: callingToken['token']});
      this.client.on('signalwire.ready', this.ready)

      this.client.on('signalwire.socket.error', (error) => {console.log("SW ERROR: ", error)})
      this.client.on('signalwire.notification', this.handleNotification);
      this.client.on('signalwire.socket.close', function() {console.log("SOCKET CLOSED: DISCONNECTED")});
      this.client.enableMicrophone()  

      this.client.remoteElement = 'remoteVideo';
      this.client.localElement = 'localVideo';
      this.client.connect()
    })
  }

  return(){
    this.dialogRef.close()
  }


  ready = () =>{
    this.status = "CALLING TOKEN READY."
    this.loading = false
  }

  handleNotification = (notification) =>{
    switch (notification.type) {
      case 'callUpdate':
        console.log(notification)
        this.handleCallUpdate(notification.call);
        break;
      case 'userMediaError':
        console.log("USER MEDIA ERROR")
        break;
      case 'participantData':
        console.log(notification)
        break;
      case 'refreshToken':
        console.log(notification)

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

  call(){
    this.inCall = true;
    const options = {callerNumber: this.hotline_number, destinationNumber: this.previousCall.remote_phonenumber, audio: true}
    this.currentCall = this.client.newCall(options)
  }

  updateCallStatus(call){

    var callDetails = {CallStatus: call.state, ParentCallSid: call.id}

    console.log(callDetails)

    
    this.hotlineService.updateHotlineCallStatus(callDetails).subscribe(results=>{
      console.log(results)
    })

  }


  initCallToDB(call){

    var newHotlineCall = {
      orgID: sessionStorage.getItem('orgID'),
      hotline_phonenumber: this.hotline_number,
      remote_phonenumber: this.previousCall.remote_phonenumber,
      callSid: call.id,
      direction: "outgoing"
    }

    this.hotlineService.outgoingHotlineCall(newHotlineCall).subscribe((result: any) =>{
      if(result){
        //this.status = "Call Connected."
        //this.inCall = true;
      }
    })

  }

  getHotlinePhonenumber(){
    var orgID: string = sessionStorage.getItem('orgID')

    this.hotlineService.getHotlineStatus(orgID).subscribe((hotline_number: any) =>{
      if(hotline_number){
        this.hotline_number = hotline_number.number
      }
    })
  }

  callConnection = () =>{
    this.status = "Connected."
  }
    
  callError = (error) =>{
    console.log(error)
    this.status = "There was an error with the call connection."
  }
    
  callDisconnected = (connection) =>{ 
    this.inCall = false;
    this.status = "Call Complete."
    this.dialogRef.close()
  }
    
  endCall(){
    if(this.currentCall){
      this.inCall = false;
      this.currentCall.hangup()
      this.dialogRef.close()
    }
  }

  saveCallNotes(){
    this.previousCall.notes = this.notes.nativeElement.value
    console.log("SAVING CALL NOTES: ", this.previousCall)
    this.hotlineService.saveCallNotes(this.previousCall).subscribe((result: any) =>{
      if(result){
        
      }
    }
    ) 

  }

}