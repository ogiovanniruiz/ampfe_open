import {Component, Inject, ViewChildren, QueryList,} from '@angular/core';
import {MatBottomSheet, MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA} from '@angular/material/bottom-sheet';
import {TextingService} from '../../../services/texting/texting.service';

@Component({
    selector: 'finishIdentification',
    templateUrl: 'finishIdentification.html',
  })
  export class FinishIDBottomSheet {

    errorMessage: string = '';
    displayErrorMsg: boolean = false;

    userMessage: string = '';
    displayMessage: boolean = false;

    submitingResponse: boolean = false;

    selectedTextContactRecord
    activity;
    script;
    nonResponseSet: unknown;

    @ViewChildren('radioAnswers') radioAnswers:QueryList<any>;
    @ViewChildren('textAnswers') textAnswers:QueryList<any>;

    constructor(private _bottomSheetRef: MatBottomSheetRef<FinishIDBottomSheet>,
                @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
                private textingService: TextingService,) {
                  this.script = data['script']
                  this.activity = data['activity']
                  this.nonResponseSet = data['nonResponseSet']
                  this.selectedTextContactRecord = data['selectedTextContactRecord']


                }

    submitNonResponse(nonResponse: string, nonResponseType: string){
      var user: object = JSON.parse(sessionStorage.getItem('user'))
      this.submitingResponse = true;

      this.textingService.submitTextNonResponse(this.activity, user, nonResponse, nonResponseType, this.selectedTextContactRecord, this.nonResponseSet['_id']).subscribe(
          (textContactRecord)=>{
            this._bottomSheetRef.dismiss(textContactRecord);
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

      var user: object = JSON.parse(sessionStorage.getItem('user'))
      this.submitingResponse = true;

      this.textingService.submitTextScriptResponse(this.activity, user, idResponses, this.selectedTextContactRecord).subscribe(
          (textContactRecord)=>{
            this._bottomSheetRef.dismiss(textContactRecord);
          },
          error =>{
              console.log(error)
              this.errorMessage = 'There was an unknown error with the server.';
              this.displayErrorMsg = true;
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
  
  }