import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import { HotlineCall } from 'src/app/models/hotline.model';
import { HotlineService } from 'src/app/services/hotline.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { OutgoingCallDialog } from '../outgoingCall/outgoingCall';
import { User } from 'src/app/models/user.model';


@Component({
    selector: 'app-hotline',
    templateUrl: './calls.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

export class CallsDialog implements OnInit{

  constructor(public dialog: MatDialog, public hotlineService: HotlineService, public dialogRef: MatDialogRef<CallsDialog>, ) { }
  
  screenSize: string = '75%'

  displayedColumns: string[] = ['phonenumber', 'direction', 'status', 'created_on', 'call_back'];

  calls: HotlineCall[] = []

  dev: boolean = false;

  return(){this.dialogRef.close()}

  ngOnInit(){
    this.getCalls();
    var user: User =  JSON.parse(sessionStorage.getItem('user'))
    this.dev = user.dev
    
  }

  getCalls(){
    var orgID: string = sessionStorage.getItem('orgID')
    this.hotlineService.getCalls(orgID).subscribe((calls: HotlineCall[]) =>{
      this.calls = calls
    })
  }

  openCallDialog(call: HotlineCall){
    this.dialogRef.close(call)
    const dialogRef = this.dialog.open(OutgoingCallDialog, { position: {
      bottom: '0px'
    },autoFocus: false, width: this.screenSize, maxWidth: this.screenSize, data: call, disableClose: true, hasBackdrop: false});
  }

  getHotlineRecording(call: HotlineCall){
    this.hotlineService.getHotlineRecording(call).subscribe((res: any) => {
     console.log(res)  
    })
  }
}