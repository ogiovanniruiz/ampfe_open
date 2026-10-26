import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Alert, Dispatcher, Incident } from 'src/app/models/hotline.model';
import { HotlineService } from 'src/app/services/hotline.service';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    selector: 'app-hotline',
    templateUrl: './editDispatcherDialog.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class EditDispatcherDialog implements OnInit{

  constructor(public dialog: MatDialog, 
             public hotlineService: HotlineService, 
             public dialogRef: MatDialogRef<EditDispatcherDialog>, 
            @Inject(MAT_DIALOG_DATA) public dispatcher: Dispatcher,
            ) { }
            
  return(){this.dialogRef.close()}

            @ViewChild('firstName', {static: true}) firstName: ElementRef;
            @ViewChild('lastName', {static: true}) lastName: ElementRef;
            @ViewChild('phonenumber', {static: true}) phonenumber: ElementRef;
            @ViewChild('email', {static: true}) email: ElementRef;
     
  ngOnInit(){
    this.firstName.nativeElement.value = this.dispatcher.name.firstName
    this.lastName.nativeElement.value = this.dispatcher.name.lastName
    this.email.nativeElement.value = this.dispatcher.email
    this.phonenumber.nativeElement.value = this.dispatcher.phonenumber
  }

  editDispatcher(){
    if(this.phonenumber.nativeElement.value === ""){
      //this.displayMessage = true;
      //this.userMessage = "Phonenumber Needed."
      return
    } 
    this.dispatcher.phonenumber = this.phonenumber.nativeElement.value
    this.hotlineService.editDispatcher(this.dispatcher).subscribe(result =>{
      this.dialogRef.close(result)
    })

  }

  async removeDispatcher(){
    if((await confirmAction(this.dialog, {title: 'Remove this dispatcher?', message: "This can't be undone.", confirmLabel: 'Remove', cancelLabel: 'Cancel', danger: true}))){
      this.hotlineService.removeDispatcher(this.dispatcher.userID).subscribe(result =>{
        this.dialogRef.close(result)
      })
    }
  }

}