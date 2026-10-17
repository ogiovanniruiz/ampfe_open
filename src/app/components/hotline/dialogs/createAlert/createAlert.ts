import { Component, OnInit, ViewChild, ElementRef, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Alert, Incident, Responder } from 'src/app/models/hotline.model';
import { User } from 'src/app/models/user.model';
import { HotlineService } from 'src/app/services/hotline.service';

@Component({
    selector: 'app-hotline',
    templateUrl: './createAlert.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class CreateAlertDialog implements OnInit{

    disabled = false;
    max = 10;
    min = 1;
    showTicks = false;
    step = 1;
    thumbLabel = false;
    radius = 2;

    userMessage: string = ""
    displayMessage: boolean = false

    numResponders: Number

    @ViewChild('textMessage', {static: false}) textMessage: ElementRef;
    @ViewChild('audience', {static: false}) audience: ElementRef;



    constructor(public dialog: MatDialog, 
                public hotlineService: HotlineService, 
                public dialogRef: MatDialogRef<CreateAlertDialog>, 
                @Inject(MAT_DIALOG_DATA) public incident: Incident,

            ) { }

    return(){        
        this.dialogRef.close()}

    ngOnInit(){

        this.getAlerts()
    }

    createAlert(){

        var orgID: string = sessionStorage.getItem('orgID')
        var user: User = JSON.parse(sessionStorage.getItem('user'))

        if(this.textMessage.nativeElement.value === ""){
            this.displayMessage = true;
            this.userMessage = "Text Message Needed."
            return
        } 

        var newAlert: Alert = { 
                                orgID: orgID, 
                                incidentID: this.incident._id, 
                                textMessage: this.textMessage.nativeElement.value, 
                                audiences: this.audience['value'], 
                                createdBy: user._id,
                                coordinates: this.incident.location.coordinates, 
                                radius: this.radius
                              }

        this.hotlineService.createAlert(newAlert).subscribe((alert: Alert) =>{
            if(alert){
                this.dialogRef.close(alert)
            }
        })
    }

    getNumResponders(){
        var orgID: string = sessionStorage.getItem('orgID')
        var coordinates: Number[] = this.incident.location.coordinates

        this.hotlineService.getNumResponders(orgID, coordinates, this.radius).subscribe((responders: Responder[]) =>{
            this.numResponders = responders.length
        })

    }

    getAlerts(){
        var orgID: string = sessionStorage.getItem('orgID');
    
        var activeIncidentIDs: string[] = [this.incident._id]
    
        this.hotlineService.getAlerts(orgID, activeIncidentIDs).subscribe(
            (alerts: Alert[]) =>{
                if(alerts.length === 1){
                    this.radius = 5
                    this.getNumResponders()
                    return
                }

                if(alerts.length > 1 ){
                    this.radius = 10
                    this.getNumResponders()
                    return
                }

                this.getNumResponders()

                
            }
        )
      }
}