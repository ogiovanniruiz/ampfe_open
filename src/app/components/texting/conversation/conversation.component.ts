import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList, Input, Output} from '@angular/core';
import { ScriptService} from '../../../services/script/script.service';
import {TextingService} from '../../../services/texting/texting.service';
import {OrganizationService} from '../../../services/organization/organization.service';
import {TextContactRecord} from '../../../models/activities/activity.model';
import { EventEmitter } from '@angular/core';
import {Activity} from '../../../models/activities/activity.model';
import {Script} from '../../../models/scripts/script.model';
import {MatBottomSheet, MatBottomSheetRef} from '@angular/material/bottom-sheet';
import {QuickResponseBottomSheet} from '../actions/quickResponses';
import { FinishIDBottomSheet } from '../actions/finishIdentification';

@Component({
    selector: 'conversation',
    templateUrl: './conversation.component.html',
    styleUrls: ['../texting.component.scss'],
})

export class ConversationComponent implements OnInit {
    @Input() selectedTextContactRecord: TextContactRecord;
    @Output() selectedTextContactRecordChange = new EventEmitter();

    @Input() activity: Activity;
    @Output() activityChange = new EventEmitter();

    @Input() textReceivedContactRecords: TextContactRecord[];
    @Output() textReceivedContactRecordsChange = new EventEmitter();

    @Input() userPhonenumber: string;

    script: Script;
    nonResponseSet: unknown;

    sendingText: boolean = false;
    submitingResponse: boolean = false;

    errorMessage: string = '';
    displayErrorMsg: boolean = false;

    userMessage: string = '';
    displayMessage: boolean = false;

    orgLevel: string = ''

    @ViewChild('inputResponse', {static: false}) inputResponse: ElementRef;
    @ViewChildren('radioAnswers') radioAnswers:QueryList<any>;
    @ViewChildren('textAnswers') textAnswers:QueryList<any>;

    constructor(
                private scriptService: ScriptService, 
                private textingService: TextingService,
                public orgService: OrganizationService,
                private bottomSheet: MatBottomSheet
                ) {}

    public getOrgLevel(){
        var user = JSON.parse(sessionStorage.getItem('user'));
        let orgID: string = sessionStorage.getItem('orgID');

        for (var i = 0; i< user.orgPermissions.length; i++){
            if(user.orgPermissions[i].orgID === orgID){
                this.orgLevel = user.orgPermissions[i].level;
            }
        }
    }

    sendFollowUpText(inputText: string){
        if(inputText === ''){
            this.userMessage = 'Input text required.';
            this.displayMessage = true;
            return
        }

        this.sendingText = true;

        this.textingService.sendFollowUpText(this.selectedTextContactRecord, inputText).subscribe(    
            (textContactRecord: TextContactRecord) =>{

                this.selectedTextContactRecord = textContactRecord
                this.inputResponse.nativeElement.value = ''
                this.sendingText = false;
                this.displayMessage = false;
            },
            error =>{
                console.log(error)
                this.errorMessage = "There was an unknown error with the server.";
                this.displayErrorMsg = true;
            }
        )
    }

    getScript(){
        var scriptID: string = this.activity.scriptID;

        this.scriptService.getScript(scriptID).subscribe(
            (script: Script) =>{
                this.script = script;
            },
            error =>{
                console.log(error)
                this.errorMessage = 'There was an unknown error with the server.';
                this.displayErrorMsg = true;
            }
        )
    }

    getNonresponseSet(){
        var nonResponseSetID: string = this.activity.nonResponseSetID
        this.scriptService.getNonResponseSet(nonResponseSetID).subscribe(
            (nonResponseSet: unknown) =>{
                this.nonResponseSet = nonResponseSet;
            },
            error =>{
                console.log(error)
                this.errorMessage = 'There was an unknown error with the server.';
                this.displayErrorMsg = true;
            }
        )
    }

    

    getTextbankContactHistory(){
        var userID: string = JSON.parse(sessionStorage.getItem('user'))._id
        var activityID: string = sessionStorage.getItem('activityID')

        this.textingService.getTextbankContactHistory(activityID, userID, this.orgLevel).subscribe(
          (residentIDs) =>{
            this.textReceivedContactRecords = residentIDs['residentsResponded']
            this.textReceivedContactRecordsChange.emit(this.textReceivedContactRecords)
            this.submitingResponse = false;
            this.selectedTextContactRecord = null
            this.selectedTextContactRecordChange.emit(null);
          },
          error =>{
            console.log(error)
          }
        )

      }

    openBottomSheet(): void {
        const bottomSheetRef = this.bottomSheet.open(QuickResponseBottomSheet, {data: this.activity.textMetaData.quickResponses});
        bottomSheetRef.afterDismissed().subscribe((selectedResponse) => {
            if(selectedResponse){this.inputResponse.nativeElement.value = selectedResponse;}
          });
    }

    openFinishIDBottomSheet(): void {
        const bottomSheetRef = this.bottomSheet.open(FinishIDBottomSheet, {data: {activity: this.activity, script: this.script, nonResponseSet: this.nonResponseSet, selectedTextContactRecord: this.selectedTextContactRecord}});
        bottomSheetRef.afterDismissed().subscribe((submitionResult) => {
            if(submitionResult){
                this.getTextbankContactHistory()
            }
          });
    }

    ngOnInit(){
        this.getOrgLevel();
        this.getNonresponseSet()
        this.getScript()
    }

}
