import { Component, OnInit,ViewChild, ElementRef } from '@angular/core';
import { ActivityService } from 'src/app/services/activity/activity.service';
import {PhonebankService} from '../../services/phonebank/phonebank.service'
declare const Twilio: any;
import {HotlineService} from '../../services/hotline/hotline.service'
import { Router } from '@angular/router';

@Component({
  selector: 'app-canvass',
  templateUrl: './canvass.component.html',
  styleUrls: ['./canvass.component.scss']
})
export class CanvassComponent implements OnInit {

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

  }



}
