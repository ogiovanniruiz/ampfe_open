import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Contact, Incident } from 'src/app/models/hotline.model';
import { HotlineService } from 'src/app/services/hotline.service';
import { CreateContactDialog } from '../createContact/createContactDialog';
import { EditContactDialog } from '../editContact/editContactDialog';

@Component({
    selector: 'app-hotline',
    templateUrl: './contacts.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class ContactsDialog implements OnInit{

    contacts: any[] = []
    screenSize: string = '75%'

    constructor(public dialog: MatDialog, 
        public hotlineService: HotlineService, 
        public dialogRef: MatDialogRef<ContactsDialog>, 
        @Inject(MAT_DIALOG_DATA) public incident: Incident,

    ) { }

    displayedColumns: string[] = ['name', 'email', 'phonenumber', 'address', 'city','edit_contact'];

    return(){this.dialogRef.close()}

    ngOnInit(){
        this.getContacts()
    }

    getContacts(){
        var orgID: string = sessionStorage.getItem('orgID')
        this.hotlineService.getContacts(orgID).subscribe((contacts: Contact[]) => {
          this.contacts = contacts
        })
    }

    openEditContactDialog(contact: Contact){

        
        const dialogRef = this.dialog.open(EditContactDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize, data: contact});
        dialogRef.afterClosed().subscribe((contact: Contact) => {
            if(contact){
                this.getContacts()
            }
        })
        
    }
    
    openCreateContactDialog(){
        const dialogRef = this.dialog.open(CreateContactDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});
        dialogRef.afterClosed().subscribe(
            (contact: Contact) => {
                if(contact){               
                    this.getContacts()
                }
            }
        )
    }
}