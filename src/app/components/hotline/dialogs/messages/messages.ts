import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import { HotlineMessage, Incident } from 'src/app/models/hotline.model';
import { HotlineService } from 'src/app/services/hotline.service';
import { EditIncidentDialog } from '../editIncident/editIncident';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { SignalWireService } from 'src/app/services/signalWire.service';
declare const Relay: any;
import { PlatformLocation } from '@angular/common'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';


@Component({
    selector: 'app-hotline',
    templateUrl: './messages.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class MessagesDialog implements OnInit{

  hotline_messages: HotlineMessage[] = []
  safeImageUrl: SafeResourceUrl;
  videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4"

  constructor(public dialog: MatDialog, 
    public hotlineService: HotlineService, 
    public dialogRef: MatDialogRef<MessagesDialog>, 
    @Inject(MAT_DIALOG_DATA) public call: any,             
    public swService: SignalWireService,
    private sanitizer: DomSanitizer
  
  ) { }

  ngOnInit(){
    this.getMessages()
  }

  getMessages(){
    var orgID: string = sessionStorage.getItem('orgID')
    this.hotlineService.getMessages(orgID).subscribe((hotline_messages: HotlineMessage[]) => {
      
      this.safeImageUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://files.signalwire.com/c2320f01-de56-4336-a7d5-136ee5451032/8d540f81-d6f1-40a0-8a40-ee463144abc8/message-media/da3e46a8-5ccf-4d9f-8023-8217ec904b3b.mp4');
      
      this.hotline_messages = hotline_messages
      
      console.log(this.hotline_messages)
    })
  }

  return(){this.dialogRef.close()}

  sendFollowUpText(text: string, destinationNumber: string){
    var orgID: string = sessionStorage.getItem('orgID')
    this.hotlineService.sendFollowUpHotlineText(text, destinationNumber, orgID).subscribe(result =>{
      this.getMessages()
    })
  }
}