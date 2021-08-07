import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ScriptService} from '../../../../services/script/script.service'
import {Script, Question, Response, UpdatedScript} from '../../../../models/scripts/script.model'

@Component({
  templateUrl: './scriptDialog.html',
})

export class ScriptEditorDialog implements OnInit{

  script: Script;
  questions: Question[] = [];
  campaignIDs: number[] = []
  questionType: string = ''
  idType: string = ''

  displayScriptMessage: boolean = false;
  userScriptMessage: string = ''

  errorMessage: string = ''
  displayErrorMsg: boolean = false;
  campaignLoaded: boolean = false;


  @ViewChild('newQuestion', {static: false}) newQuestion: ElementRef;
  @ViewChild('scriptTitle', {static: true}) scriptTitle: ElementRef;
  @ViewChild('newResponse', {static: false}) newResponse: ElementRef;

  constructor(public dialogRef: MatDialogRef<ScriptEditorDialog>,
              @Inject(MAT_DIALOG_DATA) public data: Script,
              public scriptService: ScriptService)
  {
    this.script = data;
  }

  onNoClick(): void {this.dialogRef.close()}
  closeDialog(): void{this.dialogRef.close()}

  updateLoadedStatus(status: boolean){

    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    
    if(!status){
      for(var i = 0; i < this.campaignIDs.length; i++){
        if(this.campaignIDs[i] === campaignID){
          this.campaignIDs.splice(i,1)
        }
      }
    }

    if(status) this.campaignIDs.push(campaignID)
  }

  addQuestion(){
    
    var questionTexts: string[] = this.questions.map(x => {return x.question})
    if(this.newQuestion.nativeElement.value === ""){
      this.displayScriptMessage = true;
      this.userScriptMessage = "Please fill out question details."
      return
    }
    
    if(questionTexts.includes(this.newQuestion.nativeElement.value)){
      this.displayScriptMessage = true;
      this.userScriptMessage = "This question already exists in this script."
      return
    }

    if(!this.questionType){
      this.displayScriptMessage = true;
      this.userScriptMessage = "Question Type is required."
      return
    }
    
    var question: Question  = {question: this.newQuestion.nativeElement.value,
                               questionType: this.questionType,
                               responses: []}

    this.questions.push(question)
    this.displayScriptMessage = false;
    this.newQuestion.nativeElement.value = ""
    this.questionType = null
    
  }

  removeQuestion(question: Question){
    for(var i = 0; i < this.questions.length; i++){
      if(this.questions[i].question === question.question){
        this.questions.splice(i, 1)
        i--;
      }
    }
  }

  addResponse(responseText: string,  idType: string, question: Question){

    if(responseText === "") {
      this.displayScriptMessage = true;
      this.userScriptMessage = "Response is required."
      return
    }

    if(!idType){
      this.displayScriptMessage = true;
      this.userScriptMessage = "ID Type is required."
      return
    }

    for(var i = 0; i < this.questions.length; i++){
      if(this.questions[i].question === question.question){
        for(var j  = 0; j < this.questions[i].responses.length; j++){
          if(this.questions[i].responses[j].response === responseText){
            this.displayScriptMessage = true;
            this.userScriptMessage = "Response already exists in this question."
            return
          }
        }
      }
    }

    var response: Response = {response: responseText, idType: idType}

    for(var i = 0; i < this.questions.length; i++){
      if(this.questions[i].question === question.question){
        this.newResponse.nativeElement.value = ''
        this.idType = null;
        this.questions[i].responses.push(response)
      }
    }
  }

  removeResponse(response: string, question: Question){
    for(var i = 0; i < this.questions.length; i++){
      if(this.questions[i].question === question.question){
        for(var j  = 0; j < this.questions[i].responses.length; j++){
          if(this.questions[i].responses[j].response === response){
            this.questions[i].responses.splice(j, 1)
          }
        }
      }
    }
  }

  saveScriptChanges(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    if(this.scriptTitle.nativeElement.value === ""){
      this.displayScriptMessage = true;
      this.userScriptMessage = "Script needs a title."
      return
    }
    
    if(this.questions.length === 0){
      this.displayScriptMessage = true;
      this.userScriptMessage = "Script needs questions."
      return
    }

    for(var i = 0; i < this.questions.length; i++){
      if(this.questions[i].questionType != "TEXT"){
        if(this.questions[i].responses.length === 0){
          this.displayScriptMessage = true;
          this.userScriptMessage = "Script question requires a response.";
          return
        }
      }
    }

    var script: Script =  {
                            title: this.scriptTitle.nativeElement.value,
                            questions: this.questions,
                            campaignIDs: this.campaignIDs
                          }

    this.scriptService.editScript(script, this.script._id, campaignID).subscribe(
      (result: UpdatedScript)=>{
        if(result.success){
          this.dialogRef.close(result)
        }else{
          this.displayScriptMessage = true;
          this.userScriptMessage = result.msg
        }
      },
      error => {
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  getIdTypeStatus(responses, idType: string): boolean {
    return responses.some(response => response.idType === idType)
  }

  ngOnInit(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.scriptTitle.nativeElement.value = this.script.title
    this.questions = this.script.questions
    this.campaignIDs = this.script.campaignIDs;
    this.campaignLoaded = this.script.campaignIDs.includes(campaignID)
  }
} 
