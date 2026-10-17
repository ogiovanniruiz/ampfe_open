import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Alert, Dispatcher, Incident, Responder } from 'src/app/models/hotline.model';
import { Name } from 'src/app/models/person.model';
import { User } from 'src/app/models/user.model';
import { HotlineService } from 'src/app/services/hotline.service';

@Component({
    selector: 'app-hotline',
    templateUrl: './createResponderDialog.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class CreateResponderDialog implements OnInit{

    constructor(public dialog: MatDialog, 
             public hotlineService: HotlineService, 
             public dialogRef: MatDialogRef<CreateResponderDialog>, 
            @Inject(MAT_DIALOG_DATA) public user: User,
            ) { }
            
    return(){this.dialogRef.close()}

    @ViewChild('firstName', {static: true}) firstName: ElementRef;
    @ViewChild('lastName', {static: true}) lastName: ElementRef;
    @ViewChild('phonenumber', {static: true}) phonenumber: ElementRef;
    @ViewChild('email', {static: true}) email: ElementRef;
    @ViewChild('address', {static: false}) address: ElementRef;
    @ViewChild('address2', {static: false}) address2: ElementRef;
    @ViewChild('city', {static: false}) city: ElementRef;
    @ViewChild('state', {static: true}) state: ElementRef;
    @ViewChild('county', {static: false}) county: ElementRef;
    @ViewChild('zip', {static: false}) zip: ElementRef;

    @ViewChild('audience', {static: false}) audience: ElementRef;


    displayMessage: boolean = false;
    userMessage: string = ""

    ngOnInit(){
        this.state['value'] = "CA"
    }
    
    saveResponder(){

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

          if(this.address.nativeElement.value === ""){
            this.displayMessage = true;
            this.userMessage = "Address Needed."
            return
          } 
      
          if(this.city.nativeElement.value === ""){
            this.displayMessage = true;
            this.userMessage = "City Needed."
            return
          } 
      
          if(this.zip.nativeElement.value === ""){
            this.displayMessage = true;
            this.userMessage = "Zip Needed."
            return
          } 

          if(!this.county['value']){
            this.displayMessage = true;
            this.userMessage = "County Needed."
            return
          } 

          if(!this.audience['value']){
            this.displayMessage = true;
            this.userMessage = "Auidence Needed."
            return
          } 
  
          if(this.audience['value'].length === 0){
            this.displayMessage = true;
            this.userMessage = "Auidence Needed."
            return
          } 

        var fullName = this.firstName.nativeElement.value + " " + this.lastName.nativeElement.value

        var name: Name = {firstName: this.firstName.nativeElement.value, lastName: this.lastName.nativeElement.value, fullName: fullName}

        var newResponderAddress = {address: this.address.nativeElement.value, 
            address2: this.address2.nativeElement.value,
            city: this.city.nativeElement.value,
            state: this.state['value'],
            county: this.county['value'],
            zip: this.zip.nativeElement.value,
          }

        var newResponder: Responder = {
                                         orgID: orgID, 
                                         name: name, 
                                         phonenumber: this.phonenumber.nativeElement.value,
                                         email: this.email.nativeElement.value,
                                         address: newResponderAddress,
                                         audience: this.audience['value']
                                        }

        this.hotlineService.createResponder(newResponder).subscribe((responder: Responder) => {
            this.dialogRef.close(responder)
        })

    }

}