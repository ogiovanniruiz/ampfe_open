import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {AssetService} from '../../../../services/asset/asset.service'
import { ShepherdService } from 'angular-shepherd';

import {Questions} from '../../../../models/questions'

@Component({
    templateUrl: './cloneCOIDialog.html',
  })
  
  export class CloneCOIDialog implements OnInit{

    @ViewChild('polygonName', {static: true}) coiName:ElementRef;
    @ViewChild('q1', {static: true}) q1:ElementRef;
    @ViewChild('q2', {static: true}) q2:ElementRef;
    @ViewChild('q3', {static: true}) q3:ElementRef;

    userMessage: string = ''
    displayMessage: boolean = false;

    selectedCOI;

    languageMode: string = 'ENGLISH'

    questions = []

    constructor(
        public dialogRef: MatDialogRef<CloneCOIDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public assetService: AssetService,
        private shepherdService: ShepherdService
        ) {
          this.selectedCOI = data.selected;
          this.languageMode = data.langMode;
          this.questions = Questions;
        }


    cloneCOI(){
      var coiName: string = this.coiName.nativeElement.value;
      var q1: string = this.q1.nativeElement.value;
      var q2: string = this.q2.nativeElement.value;
      var q3: string = this.q3.nativeElement.value;

      var orgID: string = sessionStorage.getItem('orgID')
      var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

      if(coiName === ''){
        this.userMessage = 'COI needs a name.';
        this.displayMessage = true;
        return
      }

      if(q1 === ''){
        this.userMessage = 'Tell us about your community.';
        this.displayMessage = true;
        return
      }

      var properties = {
          name: coiName,
          orgID: orgID,
          userID: userID,
          questions: [{question: this.questions[1].english + '/' + this.questions[1].spanish, answer: q1},
                      {question: this.questions[2].english + '/' + this.questions[2].spanish, answer: q2},
                      {question: this.questions[3].english + '/' + this.questions[3].spanish, answer: q3}]
      }

      if (this.shepherdService.isActive) {
        this.dialogRef.close(properties);
        return true;
      }

      this.assetService.cloneCOI(this.selectedCOI.geometry, properties).subscribe(
        (clonedCOI: unknown) =>{
          this.dialogRef.close(clonedCOI);
        },
        error =>{
          console.log(error)
        }
      )
    }

    prefillCOIDetails(){
      if (!this.shepherdService.isActive) {
        this.coiName.nativeElement.value = this.selectedCOI.properties.name
        this.q1.nativeElement.value = this.selectedCOI.properties.questions[0].answer
        this.q2.nativeElement.value = this.selectedCOI.properties.questions[1].answer
        this.q3.nativeElement.value = this.selectedCOI.properties.questions[2].answer
      }
    }

    ngOnInit(): void{
      this.prefillCOIDetails();
    }
}
