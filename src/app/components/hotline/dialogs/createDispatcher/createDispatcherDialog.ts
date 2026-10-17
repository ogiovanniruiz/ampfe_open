import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Alert, Dispatcher, Incident } from 'src/app/models/hotline.model';
import { Name } from 'src/app/models/person.model';
import { User } from 'src/app/models/user.model';
import { HotlineService } from 'src/app/services/hotline.service';

@Component({
    selector: 'app-hotline',
    templateUrl: './createDispatcherDialog.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class CreateDispatcherDialog implements OnInit{

    constructor(public dialog: MatDialog, 
             public hotlineService: HotlineService, 
             public dialogRef: MatDialogRef<CreateDispatcherDialog>, 
            @Inject(MAT_DIALOG_DATA) public user: User,
            ) { }
            
    return(){this.dialogRef.close()}

    @ViewChild('firstName', {static: true}) firstName: ElementRef;
    @ViewChild('lastName', {static: true}) lastName: ElementRef;
    @ViewChild('phonenumber', {static: true}) phonenumber: ElementRef;
    @ViewChild('email', {static: true}) email: ElementRef;

    displayMessage: boolean = false;
    userMessage: string = ""

    ngOnInit(){

      this.firstName.nativeElement.value = this.user.name.firstName
      this.lastName.nativeElement.value = this.user.name.lastName
      this.email.nativeElement.value = this.user.loginEmail

    }
    
    saveDispatcher(){
        var orgID: string = sessionStorage.getItem('orgID')

        if(this.firstName.nativeElement.value === ""){
            this.displayMessage = true;
            this.userMessage = "Address Needed."
            return
          } 
      
          if(this.lastName.nativeElement.value === ""){
            this.displayMessage = true;
            this.userMessage = "City Needed."
            return
          } 
      
          if(this.phonenumber.nativeElement.value === ""){
            this.displayMessage = true;
            this.userMessage = "Phonenumber Needed."
            return
          } 

          if(this.email.nativeElement.value === ""){
            this.displayMessage = true;
            this.userMessage = "Email Needed."
            return
          } 

        var fullName = this.firstName.nativeElement.value + " " + this.lastName.nativeElement.value

        var name: Name = {firstName: this.firstName.nativeElement.value, lastName: this.lastName.nativeElement.value, fullName: fullName}

        var newDispatcher: Dispatcher = {
                                         orgID: orgID, 
                                         name: name, 
                                         phonenumber: this.phonenumber.nativeElement.value,
                                         email: this.email.nativeElement.value,
                                         userID: this.user._id
                                        }

        this.hotlineService.createDispatcher(newDispatcher).subscribe((dispatcher: Dispatcher) => {
            this.dialogRef.close(dispatcher)
        })

    }

}