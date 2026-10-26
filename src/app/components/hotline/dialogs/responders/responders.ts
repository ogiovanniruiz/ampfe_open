import { Component, OnInit, ViewChild, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { Responder } from 'src/app/models/hotline.model';
import {MatDialog} from '@angular/material/dialog';
import { HotlineService } from 'src/app/services/hotline.service';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { EditDispatcherDialog } from '../editDispatcher/editDispatcherDialog';
import { User } from 'src/app/models/user.model';
import { OrganizationService } from 'src/app/services/organization/organization.service';
import { CreateDispatcherDialog } from '../createDispatcher/createDispatcherDialog';
import { CreateResponderDialog } from '../createResponder/createResponderDialog';
import { EditResponderDialog } from '../editResponder/editResponderDialog';

@Component({
  selector: 'app-hotline',
  templateUrl: './responders.html',
  styleUrls: ['../../hotline.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class RespondersDialogComponent implements OnInit {
    
    constructor(public dialog: MatDialog, 
              public hotlineService: HotlineService, 
              public dialogRef: MatDialogRef<RespondersDialogComponent>,  
              public orgService: OrganizationService) { }

  responders: Responder[] = []
  screenSize: string = '75%'

  ngOnInit() {
    this.getResponders()
  }

    displayedColumns: string[] = ['name', 'email', 'phonenumber', 'address', 'city','edit_responder'];

    return(){this.dialogRef.close()}

    getResponders(){

        var orgID: string = sessionStorage.getItem('orgID')
        this.hotlineService.getResponders(orgID).subscribe((responders: Responder[]) => {
          this.responders = responders
        })
    }

    openEditResponderDialog(responder: Responder){
        const dialogRef = this.dialog.open(EditResponderDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize, data: responder});
        dialogRef.afterClosed().subscribe((responder: Responder) => {
            if(responder){
                this.getResponders()
            }
        })
    }

    openCreateResponderDialog(){
      const dialogRef = this.dialog.open(CreateResponderDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize});

      dialogRef.afterClosed().subscribe((responder: Responder) => {
        if(responder){
          this.getResponders()
        }
      })
    }

}