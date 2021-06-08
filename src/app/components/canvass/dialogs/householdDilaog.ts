import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ScriptService} from '../../../services/script/script.service'
import {Script} from '../../../models/scripts/script.model'
import { MediaChange, MediaObserver } from '@angular/flex-layout';
import {CanvassService} from '../../../services/canvass/canvass.service'

@Component({
    templateUrl: './householdDialog.html',
  })
  
  export class HouseholdDialog implements OnInit{

    disableAnimation = true;

    userMessage: string = ''
    displayMessage: boolean = false;

    selectedCOI;

    questions = []

    fullAddress1: string = ''
    fullAddress2: string = ''
    houseHold: any;
    residentsResponded: string[] = [];
    residentsCalled: string[] = [];

    script: Script;
    nonResponseSet: unknown;

    gridColumns: number;

    activity: any;

    @ViewChildren('radioAnswers') radioAnswers:QueryList<any>;
    @ViewChildren('textAnswers') textAnswers:QueryList<any>;
  
    gridByBreakpoint = {
      xl: 4,
      lg: 4,
      md: 3,
      sm: 2,
      xs: 2
    }

    constructor(
        public dialogRef: MatDialogRef<HouseholdDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private observableMedia: MediaObserver, 
        public scriptService: ScriptService,
        public canvassService: CanvassService

        ) {
          this.fullAddress1 = data.selected.houseHold.fullAddress1
          this.fullAddress2 = data.selected.houseHold.fullAddress2
          console.log(data)
          this.houseHold = data.selected.houseHold
          this.getScript(data.activity.scriptID)
          this.activity = data.activity
          this.getNonResponseSet(data.activity.nonResponseSetID)

        }

    getScript(scriptID: string){
          this.scriptService.getScript(scriptID).subscribe(
            (script: Script) =>{
              this.script = script
            },
            error=>{
              console.log(error)
              //this.displayErrorMsg = true;
              //this.loading = false;
              //this.errorMessage = 'There was a problem loading the script. Please refresh the page.';
            }
          )
        }
      
        getNonResponseSet(nonResponseSetID: string){
          this.scriptService.getNonResponseSet(nonResponseSetID).subscribe(
            (nonResponseSet: unknown) =>{
              console.log(nonResponseSet)
              this.nonResponseSet = nonResponseSet
            },
            error=>{
              console.log(error)
              //this.displayErrorMsg = true;
              //this.loading = false;
              //this.errorMessage = 'There was a problem loading the script. Please refresh the page.';
            }
          )
        }

        generateIdResponses(script: Script, radioAnswers, textAnswers): any[]{
          var idResponses = [];
      
          var questions = script['questions'].map(x => {return x.question})
      
          radioAnswers.forEach(div => {
            var question = div['name'];
            var answer = div['viewModel'];
            
            if(answer && questions.includes(question)){
              var response = answer.split(",")[0];
              var idType = answer.split(',')[1];
              var idResponse = {question: question, response: response, idType: idType};
              idResponses.push(idResponse);
            }
          });
      
          textAnswers.forEach(div => {
            var question = div.nativeElement.name;
            var answer = div.nativeElement.value;
      
            if(answer && questions.includes(question)){
              var idResponse = {question: question, response: answer, idType: "NONE"};
              idResponses.push(idResponse);
            }
          });
      
          return idResponses
      
        }

        submitScriptResponse(resident: unknown, radioAnswers, textAnswers, houseHoldID: unknown, hhSize: number){
          var idResponses = this.generateIdResponses(this.script, radioAnswers, textAnswers);
      
          if(idResponses.length === 0){
            //this.needsResponses = true;
            return;
          }
          //this.submittingResponse = true;
          //this.needsResponses = false;
      
          var personID: string = resident['personID']
          var user: object = JSON.parse(sessionStorage.getItem('user'))
          var orgID: string = sessionStorage.getItem('orgID')
      
          
          this.canvassService.submitScriptResponse(this.activity, idResponses, personID, user, orgID, houseHoldID, hhSize).subscribe(
            (result: unknown)=>{          
                //this.submittingResponse = false;
                if(result['success']){
                  //this.loading = false;
                  //this.status = null
                  //this.ready()
                  this.houseHold = result['houseHold'];
                  //this.getPhonebankContactHistory(this.activity['_id'], this.houseHold)
                }else{
      
                  //this.status = "All members of this list have been contacted.";
                  //this.houseHold = null
                  //this.loading = false;
                  //this.errorMessage = '';
                  //this.twilioStatusMessage = ''
                }
            },
            error =>{
                console.log(error)
                //this.errorMessage = 'Sorry, could not submit response. Please try again in a few seconds.';
                //this.displayErrorMsg = true;
                //this.loading = false;
            }
          )
        
      
        }



    ngOnInit(): void{
    }

    ngAfterContentInit() {
      setTimeout(() => this.disableAnimation = false);
      this.observableMedia.media$.subscribe((change: MediaChange) => {
        this.gridColumns = this.gridByBreakpoint[change.mqAlias];
      });
    }
}
