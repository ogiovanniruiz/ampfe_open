import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ScriptService} from '../../../../services/script/script.service'
import {NonResponseSet, NonResponse, UpdatedNonResponseSet} from '../../../../models/scripts/nonResponseSet.model'

@Component({
  templateUrl: './nonResponseDialog.html',
})

export class NonResponseEditorDialog implements OnInit{

  nonResponses: NonResponse[] = [];
  campaignIDs: number[] = []
  nonResponseSet: NonResponseSet;
  nonResponseType: string = ''

  displayNonResponseMessage: boolean = false;
  userNonResponseMessage: string = ''

  errorMessage: string = ''
  displayErrorMsg: boolean = false;

  campaignLoaded: boolean = false;

  @ViewChild('nonResponseSetTitle', {static: true}) nonResponseSetTitle: ElementRef;
  @ViewChild('newNonResponse', {static: false}) newNonResponse: ElementRef;

  constructor(public dialogRef: MatDialogRef<NonResponseEditorDialog>,
              @Inject(MAT_DIALOG_DATA) public data: NonResponseSet,
              public scriptService: ScriptService
              ) 
  {
    this.nonResponseSet = data;
  }

  onNoClick(): void {this.dialogRef.close()}
  closeDialog(): void{this.dialogRef.close()}

  updateLoadedStatus(status: boolean){

    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    
    if(!status){
      for(var i = this.campaignIDs.length -1; i >= 0; i--){
        if(this.campaignIDs[i] === campaignID){
          this.campaignIDs.splice(i,1)
        }
      }
    }

    if(status) this.campaignIDs.push(campaignID)
  }

  addNonResponse(){
    var nonResponseTexts: string[] = this.nonResponses.map(x => {return x.nonResponse})
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

  removeNonResponse(nonResponse){
    for(var i = 0; i < this.nonResponses.length; i++){
      if(this.nonResponses[i].nonResponse === nonResponse){
        this.nonResponses.splice(i, 1)
        i--;
      }
    }
  }

  saveNonResponseSetChanges(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
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
                                          campaignIDs: this.campaignIDs
                                        }

    this.scriptService.editNonResponseSet(nonResponseSet, this.nonResponseSet._id, campaignID).subscribe(
      (result: UpdatedNonResponseSet)=>{
        if(result.success){
          this.dialogRef.close(result)
        }else{
          this.displayNonResponseMessage = true;
          this.userNonResponseMessage = result.msg
        }
      },
      error => {
        console.log(error)
        this.displayErrorMsg = true;
        this.errorMessage = 'There was a problem with the server.';
      }
    )
  }

  ngOnInit(){
    var campaignID: number = parseInt(sessionStorage.getItem('campaignID'))
    this.nonResponseSetTitle.nativeElement.value = this.nonResponseSet.title
    this.nonResponses = this.nonResponseSet.nonResponses
    this.campaignIDs = this.nonResponseSet.campaignIDs;
    this.campaignLoaded = this.nonResponseSet.campaignIDs.includes(campaignID)

  }
} 
