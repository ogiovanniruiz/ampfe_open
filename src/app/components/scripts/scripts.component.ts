import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {ScriptService} from '../../services/script/script.service'
import {ScriptEditorDialog} from './dialogs/scripts/scriptDialog'
import {NonResponseEditorDialog} from './dialogs/nonResponseSets/nonResponseDialog'
import {Script, Question, Response, UpdatedScript} from '../../models/scripts/script.model'
import {NonResponseSet, NonResponse, UpdatedNonResponseSet} from '../../models/scripts/nonResponseSet.model'


@Component({
  selector: 'app-scripts',
  templateUrl: './scripts.component.html',
  styleUrls: ['./scripts.component.scss']
})
export class ScriptsComponent implements OnInit {

  @ViewChild('newQuestion', {static: false}) newQuestion: ElementRef;
  @ViewChild('scriptTitle', {static: false}) scriptTitle: ElementRef;
  @ViewChild('newResponse', {static: false}) newResponse: ElementRef;

  @ViewChild('nonResponseSetTitle', {static: false}) nonResponseSetTitle: ElementRef;
  @ViewChild('newNonResponse', {static: false}) newNonResponse: ElementRef;

  questions: Question[] = [];

  nonResponses: NonResponse[] = [];

  displayScriptMessage: boolean = false;
  userScriptMessage: string = ''

  displayNonResponseMessage: boolean = false;
  userNonResponseMessage: string = ''
  
  questionType: string = ''
  nonResponseType: string = ''
  idType: string = ''

  scripts: Script[] = [];
  orgScripts: Script[] = [];
  campaignScripts: Script[] = [];
  //participatingOrgScripts: Script[] = [];
  archivedScripts: Script[] = []

  nonResponseSets: NonResponseSet[] = []
  orgNonResponseSets: NonResponseSet[] = [];
  campaignNonResponseSets: NonResponseSet[] = [];
  archivedNonResponseSets: NonResponseSet[]= []

  errorMessage: string = ''
  displayErrorMsg: boolean = false;

  constructor(public scriptService: ScriptService,
              public dialog: MatDialog) {}

  addQuestion(){
    
    var questionTexts = this.questions.map(x => {return x.question})
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


    for(var i = 0; i < this.questions.length; i++){
      if(this.questions[i].question === question.question){
        for(var j  = 0; j < this.questions[i].responses.length; j++){
          if(this.questions[i].responses[j].idType === idType){
            this.displayScriptMessage = true;
            this.userScriptMessage = "This idType already exists."
            return
          }
        }
      }
    }

    this.displayScriptMessage = false;

    var response: Response = {response: responseText, idType: idType}

    for(var i = 0; i < this.questions.length; i++){
      if(this.questions[i].question === question.question){
        this.newResponse.nativeElement.value = ''
        this.idType = null;
        this.questions[i].responses.push(response)
      }
    }
  }

  clearScript(){
    this.scriptTitle.nativeElement.value = ""
    this.displayScriptMessage = false;
    this.newQuestion.nativeElement.value = ""
    this.questionType = null
    this.questions = []
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

  createScript(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var userID: string = JSON.parse(sessionStorage.getItem('user'))['_id'];
    var orgID: string = sessionStorage.getItem('orgID')

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

    var script: Script = {
      title: this.scriptTitle.nativeElement.value,
      questions: this.questions,
      createdBy: userID,
      campaignIDs: [campaignID],
      orgStatus: {orgID: orgID}
    }

    this.scriptService.createScript(script).subscribe(
      (result: UpdatedScript) =>{
        if(result.success){
          this.getAllScripts();
          this.clearScript();
          this.displayErrorMsg = false;
        }else{
          this.displayScriptMessage = true;
          this.userScriptMessage = result.msg
        }
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  getAllScripts(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.scriptService.getAllScripts(orgID, campaignID).subscribe(
      (scripts: Script[]) =>{
        this.displayErrorMsg = false;
        
        this.campaignScripts = scripts.filter(script => {
          return script.campaignIDs.includes(campaignID) && script.orgStatus.active
        })

        this.orgScripts = scripts.filter(script =>{
          return (script.orgStatus.orgID === orgID) && (script.orgStatus.active)
        })
        
        //this.participatingOrgScripts = scripts.filter(script => {
        //  var orgIDs = script.participatingOrgs.map(x => {return x.orgID})
        //  return orgIDs.includes(orgID)
        //})

        this.archivedScripts = scripts.filter(script =>{
          return (script.orgStatus.orgID === orgID) && (!script.orgStatus.active)
        })

        this.scripts = scripts
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  editScript(script: Script){
    const dialogRef = this.dialog.open(ScriptEditorDialog, {data: script, width: "50%"});
    dialogRef.afterClosed().subscribe(result => {
      if(result){}
      this.getAllScripts()
    });
  }

  removeScript(script: Script){
    if (confirm('Are you sure you want to remove this Script?')) {
    this.scriptService.removeScript(script).subscribe(
      (result: Script) =>{
        if(result){
          this.getAllScripts()
        }
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
    }
  }

  archiveScript(script: Script){
    this.scriptService.archiveScript(script).subscribe(
      (result: Script) =>{
        if(result){
          this.getAllScripts()
        }
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
      
    )
  }

  getIdTypeStatus(responses, idType: string): boolean {
    return responses.some(response => response.idType === idType)
  }

  /////////////////NON RESPONSE METHODS BELOW///////////////////////////////

  addNonResponse(){
    var nonResponseTexts = this.nonResponses.map(x => {return x.nonResponse})
    if(this.newNonResponse.nativeElement.value === ""){
      this.displayNonResponseMessage = true;
      this.userNonResponseMessage = "Please fill out nonResponse text."
      return
    }
    
    if(nonResponseTexts.includes(this.newNonResponse.nativeElement.value)){
      this.displayNonResponseMessage = true;
      this.userNonResponseMessage = "This non-resonse already exists."
      return
    }

    if(!this.nonResponseType){
      this.displayNonResponseMessage = true;
      this.userNonResponseMessage = "Non-Response Type is required."
      return
    }

    var nonResponse: NonResponse  = {nonResponse: this.newNonResponse.nativeElement.value,
                                     nonResponseType: this.nonResponseType}

    this.nonResponses.push(nonResponse)
    this.displayNonResponseMessage = false;
    this.newNonResponse.nativeElement.value = ""
    this.nonResponseType = null
  }

  removeNonResponse(nonResponse: string){
    for(var i = 0; i < this.nonResponses.length; i++){
      if(this.nonResponses[i].nonResponse === nonResponse){
        this.nonResponses.splice(i, 1)
        i--;
      }
    }
  }

  createNonResponseSet(){

    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    var userID: string = JSON.parse(sessionStorage.getItem('user'))['_id'];
    var orgID: string = sessionStorage.getItem('orgID')

    if(this.nonResponseSetTitle.nativeElement.value === ""){
      this.displayNonResponseMessage = true;
      this.userNonResponseMessage = "Non-Response Set needs a title."
      return
    }
    
    if(this.nonResponses.length === 0){
      this.displayNonResponseMessage = true;
      this.userNonResponseMessage = "Non-Response Set needs non-responses."
      return
    }

    var nonResponseSet: NonResponseSet = {
                                          title: this.nonResponseSetTitle.nativeElement.value,
                                          nonResponses: this.nonResponses,
                                          createdBy: userID,
                                          campaignIDs: [campaignID],
                                          orgStatus: {orgID: orgID}
                                          }

    this.scriptService.createNonResponseSet(nonResponseSet).subscribe(
      (result: UpdatedNonResponseSet) =>{
        if(result.success){
          this.getAllNonResponseSets();
          this.clearNonResponseSet();
        }else{
          this.displayNonResponseMessage = true;
          this.userNonResponseMessage = result.msg
        }
        this.displayErrorMsg = false;
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  getAllNonResponseSets(){
    var orgID: string = sessionStorage.getItem('orgID')
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.scriptService.getAllNonResponseSets(orgID, campaignID).subscribe(
      (nonResponseSets: NonResponseSet[]) =>{
        this.displayErrorMsg = false;

        this.campaignNonResponseSets = nonResponseSets.filter(nonResponseSet => {
          return nonResponseSet.campaignIDs.includes(campaignID) && nonResponseSet.orgStatus.active
        })

        this.orgNonResponseSets = nonResponseSets.filter(nonResponseSet =>{
          return (nonResponseSet.orgStatus.orgID === orgID) && (nonResponseSet.orgStatus.active)
        })
        
        this.archivedNonResponseSets = nonResponseSets.filter(nonResponseSet =>{
          return (nonResponseSet.orgStatus.orgID === orgID) && (!nonResponseSet.orgStatus.active)
        })
      },
      error=>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  editNonResponseSet(nonResponseSet: NonResponseSet){
    const dialogRef = this.dialog.open(NonResponseEditorDialog, {data: nonResponseSet, width: "50%"});
    dialogRef.afterClosed().subscribe(result => {
      if(result){}
      this.getAllNonResponseSets()
    });
  }

  removeNonResponseSet(nonResponseSet: NonResponseSet){
    if (confirm('Are you sure you want to remove this Non-Response Set?')) {
      this.scriptService.removeNonResponseSet(nonResponseSet).subscribe(
        (result: NonResponseSet) =>{
          if(result){
            this.getAllNonResponseSets()
          }
        },
        error =>{
          console.log(error)
          this.displayErrorMsg = true;
          this.errorMessage = 'There was a problem with the server.';
        }
      )
    }
  }

  archiveNonResponseSet(set: NonResponseSet){
    this.scriptService.archiveNonResponseSet(set).subscribe(
      (result: NonResponseSet) =>{
        if(result){
          this.getAllNonResponseSets()
        }
      },
      error =>{
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
      
    )
  }

  clearNonResponseSet(){
    this.nonResponseSetTitle.nativeElement.value = ""
    this.displayNonResponseMessage = false;
    this.newNonResponse.nativeElement.value = ""
    this.nonResponseType = null
    this.nonResponses = []
  }

  ngOnInit() {
    this.getAllScripts()
    this.getAllNonResponseSets()
  }

}
