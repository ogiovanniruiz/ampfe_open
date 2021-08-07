import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList, Input, Output} from '@angular/core';
import { ScriptService} from '../../../services/script/script.service';
import {TextingService} from '../../../services/texting/texting.service';
import {OrganizationService} from '../../../services/organization/organization.service';
import {TextContactRecord} from '../../../models/activities/activity.model';
import { EventEmitter } from '@angular/core';
import {Activity} from '../../../models/activities/activity.model';
import {Script} from '../../../models/scripts/script.model';

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

    @Input() textReceivedContactRecords: TextContactRecord;
    @Output() textReceivedContactRecordsChange = new EventEmitter();

    @Input() userPhonenumber: string;
    quickResponses: string[];

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

    submitNonResponse(nonResponse: string, nonResponseType: string){
        var activityID: string = sessionStorage.getItem('activityID')
        var user: object = JSON.parse(sessionStorage.getItem('user'))
        this.submitingResponse = true;

        this.textingService.submitTextNonResponse(this.activity, user, nonResponse, nonResponseType, this.selectedTextContactRecord, this.nonResponseSet['_id']).subscribe(
            (textContactRecord: TextContactRecord)=>{
                //this.selectedTextContactRecord = textContactRecord
                this.getTextbankContactHistory(activityID);

            },
            error =>{
                console.log(error)
                this.errorMessage = 'There was an unknown error with the server.';
                this.displayErrorMsg = true;
            }

        );
    }

    submitScriptResponse(){
        var idResponses = this.generateIdResponses(this.script)

        if(idResponses.length === 0){
            this.userMessage = 'Script Responses are required.';
            this.displayMessage = true;
            return;
        }

        var activityID: string = sessionStorage.getItem('activityID')
        var user: object = JSON.parse(sessionStorage.getItem('user'))
        this.submitingResponse = true;

        this.textingService.submitTextScriptResponse(this.activity, user, idResponses, this.selectedTextContactRecord).subscribe(
            (textContactRecord: TextContactRecord)=>{
                //this.selectedTextContactRecord = textContactRecord
                this.getTextbankContactHistory(activityID)
            },
            error =>{
                console.log(error)
                this.errorMessage = 'There was an unknown error with the server.';
                this.displayErrorMsg = true;
            }
        )
    }

    getTextbankContactHistory(activityID: string){
        var userID: string = JSON.parse(sessionStorage.getItem('user'))._id

        this.textingService.getTextbankContactHistory(activityID, userID, this.orgLevel).subscribe(
          (residentIDs: unknown[]) =>{
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

    generateIdResponses(script: unknown): any[]{
        var idResponses = [];

        var questions = script['questions'].map(x => {return x.question})

        this.radioAnswers.forEach(div => {
          var question = div.name
          var answer = div.viewModel

          if(answer && questions.includes(question)){
            var response = answer.split(",")[0]
            var idType = answer.split(',')[1]
            var idResponse = {question: question, response: response, idType: idType}
            idResponses.push(idResponse)
          }
        });

        this.textAnswers.forEach(div => {
          var question = div.nativeElement.name
          var answer = div.nativeElement.value

          if(answer && questions.includes(question)){
            var response = {question: question, response: answer, idType: "NONE"}
            idResponses.push(response)
          }
        });

        return idResponses;

      }

    public onResponseChange(selectedResponse: string){
        this.inputResponse.nativeElement.value = selectedResponse;
      }

    ngOnInit(){
        this.getOrgLevel();
        this.quickResponses = this.activity.textMetaData.quickResponses;
        this.getNonresponseSet()
        this.getScript()
    }

}
