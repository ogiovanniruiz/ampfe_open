import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ScriptService} from '../../../services/script/script.service'
import {Script} from '../../../models/scripts/script.model'
import { MediaChange, MediaObserver } from '@angular/flex-layout';
import {CanvassService} from '../../../services/canvass/canvass.service'

@Component({
    templateUrl: './houseHoldDialog.html',
  })
  
export class HouseHoldDialog implements OnInit{

  disableAnimation = true;
  userMessage: string = ''
  displayMessage: boolean = false;
  loading: boolean = false
  displayErrorMsg: boolean = false;
  errorMessage: string = '';


  selectedCOI;
  questions = []
  fullAddress1: string = ''
  fullAddress2: string = ''
  houseHold: any;
  //residentsResponded: string[] = [];
  residentsContacted: string[] = [];
  residentsComplete: string[] = []
  script: Script;
  nonResponseSet: unknown;
  gridColumns: number;
  activity: any;

  needsResponses: boolean = false;

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
        public dialogRef: MatDialogRef<HouseHoldDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private observableMedia: MediaObserver, 
        public scriptService: ScriptService,
        public canvassService: CanvassService

        ) {

          this.houseHold = data.selected.houseHold
          
          this.fullAddress1 = this.houseHold.fullAddress1
          this.fullAddress2 = this.houseHold.fullAddress2
          
          this.activity = data.activity
          this.script = data.script
          this.nonResponseSet = data.nonResponseSet
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
      this.needsResponses = true;
      return;
    }

    this.loading = true

    var personID: string = resident['personID']
    var user: object = JSON.parse(sessionStorage.getItem('user'))
    var orgID: string = sessionStorage.getItem('orgID')
           
    this.canvassService.submitScriptResponse(this.activity, idResponses, personID, user, orgID, houseHoldID, hhSize).subscribe(
      (houseHold: unknown)=>{ 

        if(houseHold['complete']) this.dialogRef.close(houseHold)
        if(houseHold['numResContacted'].length >= this.houseHold.residents.length ){
          this.dialogRef.close(houseHold)
        } 
        this.houseHold = houseHold['houseHold']
        this.getHouseholdContactHistory();
        this.loading = false;


      },
      error =>{
        console.log(error)
        this.errorMessage = 'Sorry, could not submit response. Please try again in a few seconds.';
        this.displayErrorMsg = true;
        this.loading = false;
      })
  }

  submitNonResponse(resident: unknown, nonResponse: string, nonResponseType: string, houseHoldID: unknown, hhSize: number){
    var personID: string = resident['personID']
    var user: object = JSON.parse(sessionStorage.getItem('user'))
    var orgID: string = sessionStorage.getItem('orgID')

    this.loading = true

    this.canvassService.submitNonResponse(this.activity, nonResponse, nonResponseType, personID, user, orgID, houseHoldID, hhSize, this.nonResponseSet['_id']).subscribe(
      (houseHold: unknown)=>{
        if(houseHold['numResContacted'] >= this.houseHold.residents.length ){
          this.dialogRef.close(houseHold)
        }
        this.houseHold = houseHold['houseHold']
        this.getHouseholdContactHistory();
        this.loading = false;
      },
      error =>{
        console.log(error)
        this.errorMessage = 'Sorry, could not submit response. Please try again in a few seconds.';
        this.displayErrorMsg = true;
        this.loading = false;
      }
    )
  }

  getHouseholdContactHistory(){
    var activityID = sessionStorage.getItem('activityID')
    this.canvassService.getCanvassContactHistory(activityID, this.houseHold._id).subscribe(
      (result: any[]) =>{
        this.residentsContacted = result.map(x =>{ return x.personID})//result.filter(x=>{return x.passed}).map(x =>{ return x.personID})
        this.residentsComplete = result.filter(x=>{return x.complete}).map(x =>{ return x.personID})
      }
    )
  }

  ngOnInit(): void{
    this.getHouseholdContactHistory();
  }

  ngAfterContentInit() {
    setTimeout(() => this.disableAnimation = false);
    this.observableMedia.media$.subscribe((change: MediaChange) => {
      this.gridColumns = this.gridByBreakpoint[change.mqAlias];
    });
  }
}
