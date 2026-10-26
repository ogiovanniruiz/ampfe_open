import { Component, OnInit, ViewChild, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { Dispatcher } from 'src/app/models/hotline.model';
import {MatDialog} from '@angular/material/dialog';
import { HotlineService } from 'src/app/services/hotline.service';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { EditDispatcherDialog } from '../editDispatcher/editDispatcherDialog';
import { User } from 'src/app/models/user.model';
import { OrganizationService } from 'src/app/services/organization/organization.service';
import { CreateDispatcherDialog } from '../createDispatcher/createDispatcherDialog';

@Component({
  selector: 'app-hotline',
  templateUrl: './dispatchers.html',
  styleUrls: ['../../hotline.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class DispatchersDialogComponent implements OnInit {
    
  constructor(public dialog: MatDialog, 
              public hotlineService: HotlineService, 
              public dialogRef: MatDialogRef<DispatchersDialogComponent>,  public orgService: OrganizationService) { }

  dispatchers: Dispatcher[] = []
  dispatcherIDs: string[] = []
  screenSize: string = '75%'
  users: User[]

  ngOnInit() {
    this.getDispatchers()
    this.getApprovedUsers()
  }

  displayedColumns: string[] = ['name', 'email', 'phonenumber', 'active_call', 'on_duty', 'edit_dispatcher'];

  return(){this.dialogRef.close()}

  getDispatchers(){

    var orgID: string = sessionStorage.getItem('orgID')
    this.hotlineService.getDispatchers(orgID).subscribe((dispatchers: Dispatcher[]) => {
      this.dispatchers = dispatchers

      this.dispatcherIDs = dispatchers.map(dispatcher => dispatcher.userID)
    })
    
  }

  openEditDispatcherDialog(dispatcher: Dispatcher){
      const dialogRef = this.dialog.open(EditDispatcherDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize, data: dispatcher});
      dialogRef.afterClosed().subscribe((dispatcher: Dispatcher) => {
        if(dispatcher){
          this.getDispatchers()

        }
      })
  }

    getApprovedUsers(){      
      var orgID: string = sessionStorage.getItem('orgID')

      this.orgService.getOrgUsers(orgID).subscribe(
        (users: User[]) =>
          {
            this.users = users
          },
        error =>{
          console.log(error)
        }
        )
    }

    createNewDispatcher(user: User){
      if(this.dispatcherIDs.includes(user._id)){
        return
      }

      const dialogRef = this.dialog.open(CreateDispatcherDialog, {autoFocus: false, width: this.screenSize, maxWidth: this.screenSize, data: user});

      dialogRef.afterClosed().subscribe((dispatcher: Dispatcher) => {
        if(dispatcher){
          this.getDispatchers()
        }
      })
    }

  toggleOnDuty(check: boolean, userID: string){

    this.hotlineService.toggleOnDuty(userID, check).subscribe((dispatcher: Dispatcher) =>{
      if(dispatcher){
        this.getDispatchers()
      }
    })
  }

}