import { Component, OnInit, ViewChild, ElementRef, ViewChildren, QueryList, Input, Output, AfterViewChecked, ChangeDetectionStrategy } from '@angular/core';
import { SurveyService} from '../../../services/survey.service';
import {TextingService} from '../../../services/texting.service';
import {OrganizationService} from '../../../services/organization/organization.service';
import {ActivityContactRecord} from '../../../models/contact.record.model';
import { EventEmitter } from '@angular/core';
import {Activity} from '../../../models/activity.model';
import {Survey} from '../../../models/survey.model';
import {MatBottomSheet, MatBottomSheetRef} from '@angular/material/bottom-sheet';
import {QuickResponseBottomSheet} from '../actions/quickResponses';
import { FinishIDBottomSheet } from '../actions/finishIdentification';



@Component({
    selector: 'conversation',
    templateUrl: './conversation.component.html',
    styleUrls: ['./conversation.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class ConversationComponent implements OnInit, AfterViewChecked {
    @Input() selectedTextContactRecord: ActivityContactRecord;
    @Output() selectedTextContactRecordChange = new EventEmitter();

    @Input() activity: Activity;
    @Output() activityChange = new EventEmitter();

    @Input() textReceivedContactRecords: ActivityContactRecord[];
    @Output() textReceivedContactRecordsChange = new EventEmitter();

    @Input() userPhonenumber: string;

    // Phone layout: return to the conversation list
    @Output() back = new EventEmitter<void>();

    draft: string = '';
    @ViewChild('messageList', {static: false}) messageList: ElementRef;
    private renderedMessageCount = -1;
    private renderedRecordID: string;

    survey: Survey;
    nonResponseSet: unknown;

    sendingText: boolean = false;
    submitingResponse: boolean = false;

    errorMessage: string = '';
    displayErrorMsg: boolean = false;

    userMessage: string = '';
    displayMessage: boolean = false;

    orgLevel: string = ''

    @ViewChildren('radioAnswers') radioAnswers:QueryList<any>;
    @ViewChildren('textAnswers') textAnswers:QueryList<any>;

    constructor(
                private surveyService: SurveyService, 
                private textingService: TextingService,
                public orgService: OrganizationService,
                private bottomSheet: MatBottomSheet,
             
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
        const text = (inputText || '').trim()
        if(!text || this.sendingText) return

        this.sendingText = true;
        this.displayErrorMsg = false;

        this.textingService.sendFollowUpText(this.selectedTextContactRecord, text).subscribe(    
            (textContactRecord: ActivityContactRecord) =>{
                this.selectedTextContactRecord = textContactRecord
                this.selectedTextContactRecordChange.emit(textContactRecord)
                this.draft = ''
                this.sendingText = false;
            },
            error =>{
                console.log(error)
                this.sendingText = false;
                this.errorMessage = "Your message could not be sent. Please try again.";
                this.displayErrorMsg = true;
            }
        )
    }

    // Enter sends; Shift+Enter adds a new line
    onComposerKeydown(event: KeyboardEvent){
        if(event.key === 'Enter' && !event.shiftKey){
            event.preventDefault()
            this.sendFollowUpText(this.draft)
        }
    }

    useQuickResponse(response: string){
        this.draft = response
    }

    get quickResponses(): string[] {
        return this.activity?.textMetaData?.quickResponses || []
    }

    get messages(){
        return this.selectedTextContactRecord?.textbankContactDetails?.textConvo || []
    }

    // The sender's name is shown once per run of messages from the same side
    showSender(index: number): boolean {
        return index === 0 || this.messages[index - 1].origin !== this.messages[index].origin
    }

    senderName(origin: string): string {
        return origin === 'PERSON'
            ? this.selectedTextContactRecord.person?.resident?.name?.firstName || 'Voter'
            : this.selectedTextContactRecord.user?.name?.firstName || 'You'
    }

    // Scroll to the newest message when a conversation opens or a message arrives
    ngAfterViewChecked(){
        const count = this.messages.length
        const recordID = this.selectedTextContactRecord?._id
        if(!this.messageList || (count === this.renderedMessageCount && recordID === this.renderedRecordID)) return
        this.renderedMessageCount = count
        this.renderedRecordID = recordID
        const element = this.messageList.nativeElement
        element.scrollTop = element.scrollHeight
    }

    getScript(){
        var surveyID: string = this.activity.surveyID;

        this.surveyService.getSurvey(surveyID).subscribe(
            (survey: Survey) =>{
                this.survey = survey;
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
        this.surveyService.getNonResponseSet(nonResponseSetID).subscribe(
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
            if(selectedResponse){this.draft = selectedResponse;}
          });
    }

    openFinishIDBottomSheet(): void {
        const bottomSheetRef = this.bottomSheet.open(FinishIDBottomSheet, {data: {activity: this.activity, survey: this.survey, nonResponseSet: this.nonResponseSet, selectedTextContactRecord: this.selectedTextContactRecord}});
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
