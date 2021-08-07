 import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { ShepherdService } from 'angular-shepherd';

import {AssetService} from '../../../services/asset/asset.service'
import {Questions} from '../../../models/questions'

@Component({
    templateUrl: './createCOIDialog.html',
  })

  export class CreateCOIDialog implements OnInit{

    @ViewChild('polygonName', {static: true}) coiName:ElementRef;
    @ViewChild('q1', {static: true}) q1:ElementRef;
    @ViewChild('q2', {static: true}) q2:ElementRef;
    @ViewChild('q3', {static: true}) q3:ElementRef;

    userMessage: string = '';
    displayMessage: boolean = false;
    languageMode: string = 'ENGLISH';
    creating: boolean = false;

    questions = [];

    errorMessage: string = '';
    displayErrorMsg: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<CreateCOIDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public assetService: AssetService,
        private shepherdService: ShepherdService
        ) {
          this.questions = Questions;
          this.languageMode = data.langMode;
        }

    createCOI(){
      this.creating = true;

      var coiName: string = this.coiName.nativeElement.value;
      var q1: string = this.q1.nativeElement.value;
      var q2: string = this.q2.nativeElement.value;
      var q3: string = this.q3.nativeElement.value;

      var orgID: string = sessionStorage.getItem('orgID')
      var userID: string = JSON.parse(sessionStorage.getItem('user'))._id;

      if(coiName === ''){
        this.userMessage = 'COI needs a name.';
        this.displayMessage = true;
        this.creating = false;
        return;
      }

      if(q1 === ''){
        this.userMessage = 'Tell us about your community.';
        this.displayMessage = true;
        this.creating = false;
        return;
      }

      var coiDetail = {
        properties: {
          name: coiName,
          orgID: orgID,
          userID: userID,
          questions: [{question: this.questions[1].english + '/' + this.questions[1].spanish, answer: q1},
                     {question: this.questions[2].english + '/' + this.questions[2].spanish, answer: q2},
                     {question: this.questions[3].english + '/' + this.questions[3].spanish, answer: q3}]
        },
        geometry: this.data.polygonCreated.geometry
      };


      //if (this.shepherdService.isActive) {
      //  this.dialogRef.close(coiDetail);
      //  this.creating = false;
      //  return true;
      //}

      this.assetService.createCOI(coiDetail).subscribe(
        result =>{
          console.log(result)
          this.dialogRef.close(result);
          this.creating = false;
        },
        error =>{
          console.log(error);
          this.displayErrorMsg = true;
          this.creating = false;
          this.errorMessage = 'Failed to create community of interest. Check to make sure the Polygon does not cross over itself.';
        }
      );

    }

    cancelCOI(){
      if (this.shepherdService.isActive) {
        
        this.creating = false;
        return true;
      }

      this.dialogRef.close('cancel');
    }

    ngOnInit(){}
}
