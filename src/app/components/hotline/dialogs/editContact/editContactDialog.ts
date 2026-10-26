import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Alert, Contact, Dispatcher, Incident, Responder } from 'src/app/models/hotline.model';
import { Name } from 'src/app/models/person.model';
import { User } from 'src/app/models/user.model';
import { HotlineService } from 'src/app/services/hotline.service';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    selector: 'app-hotline',
    templateUrl: './editContactDialog.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class EditContactDialog implements OnInit{

    constructor(public dialog: MatDialog, 
             public hotlineService: HotlineService, 
             public dialogRef: MatDialogRef<EditContactDialog>, 
            @Inject(MAT_DIALOG_DATA) public contact: Contact,
            ) { }
            
    return(){this.dialogRef.close()}

    @ViewChild('firstName', {static: true}) firstName: ElementRef;
    @ViewChild('lastName', {static: true}) lastName: ElementRef;
    @ViewChild('phonenumber', {static: true}) phonenumber: ElementRef;
    @ViewChild('email', {static: true}) email: ElementRef;
    @ViewChild('address', {static: true}) address: ElementRef;
    @ViewChild('address2', {static: true}) address2: ElementRef;
    @ViewChild('city', {static: true}) city: ElementRef;
    @ViewChild('state', {static: true}) state: ElementRef;
    @ViewChild('county', {static: true}) county: ElementRef;
    @ViewChild('zip', {static: true}) zip: ElementRef;

    @ViewChild('audience', {static: true}) audience: ElementRef;


    displayMessage: boolean = false;
    userMessage: string = ""

    blocked = false

    ngOnInit(){
        this.firstName.nativeElement.value = this.contact.name.firstName
        this.lastName.nativeElement.value = this.contact.name.lastName
        this.email.nativeElement.value = this.contact.email
        this.phonenumber.nativeElement.value = this.contact.phonenumber

        this.address.nativeElement.value = this.contact.address.address
        this.address2.nativeElement.value = this.contact.address.address2
        this.city.nativeElement.value = this.contact.address.city
        this.zip.nativeElement.value = this.contact.address.zip

        this.state['value'] = "CA"
        this.county['value'] = this.contact.address.county
        this.audience['value'] = this.contact.audience
        this.blocked = this.contact.blocked
    }
    
    editcontact(){

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

        var newcontactAddress = {address: this.address.nativeElement.value, 
            address2: this.address2.nativeElement.value,
            city: this.city.nativeElement.value,
            state: this.state['value'],
            county: this.county['value'],
            zip: this.zip.nativeElement.value,
          }


          this.contact.name = name
          this.contact.address = newcontactAddress
          this.contact.phonenumber = this.phonenumber.nativeElement.value
          this.contact.email = this.email.nativeElement.value
          this.contact.blocked = this.blocked

        this.hotlineService.editContact(this.contact).subscribe((contact: Contact) => {
            this.dialogRef.close(contact)
        })
    }

    async removeContact(){
        if((await confirmAction(this.dialog, {title: 'Remove this contact?', message: "This can't be undone.", confirmLabel: 'Remove', cancelLabel: 'Cancel', danger: true}))){
          this.hotlineService.removeContact(this.contact._id).subscribe(result =>{
            this.dialogRef.close(result)
          })
        }
      }

}