import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import {NonResponseSet, UpdatedNonResponseSet} from '../../../../../models/nonResponseSet.model'
import {SurveyService} from '../../../../../services/survey.service'
import { EditableNonResponse, cleanText, responsesValid } from '../nonResponseEditor/nonResponseEditor';
import { confirmAction } from '../../../../../dialogs/confirmDialog/confirmDialog';

@Component({
    templateUrl: './createNonresponseSet.html',
    styleUrls: ['../editNonresponseSet/editNonResponseDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class CreateNonresponseSetDialog {

  name: string = ''
  nonResponses: EditableNonResponse[] = [];

  errorMessage: string = ''
  saving: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<CreateNonresponseSetDialog>, 
    public surveyService: SurveyService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  get canCreate(): boolean {
    return !!this.name.trim() && responsesValid(this.nonResponses) && !this.saving
  }

  get isDirty(): boolean {
    return !!this.name.trim() || this.nonResponses.length > 0
  }

  createNonResponseSet(){
    if(!this.name.trim()){
      this.errorMessage = 'The set needs a name.'
      return
    }
    if(!responsesValid(this.nonResponses)){
      this.errorMessage = this.nonResponses.length ? 'Fix the highlighted responses first.' : 'Add at least one response.'
      return
    }
    if(this.saving) return

    const nonResponseSet: NonResponseSet = {
      name: this.name.trim(),
      nonResponses: this.nonResponses.map(nr => ({nonResponse: cleanText(nr.nonResponse), nonResponseType: nr.nonResponseType})),
      userID: JSON.parse(sessionStorage.getItem('user') || '{}')._id,
      campaignIDs: [parseInt(sessionStorage.getItem('campaignID'))],
      orgID: sessionStorage.getItem('orgID'),
      active: true
    }

    this.saving = true;
    this.errorMessage = '';

    this.surveyService.createNonResponseSet(nonResponseSet).subscribe(
      (result: UpdatedNonResponseSet) => {
        this.saving = false;
        if(result?.success){
          // Closing with the result lets the campaign map refresh its list
          this.snackBar.open(`Non-response set "${nonResponseSet.name}" created.`, 'Dismiss', {duration: 3000})
          this.dialogRef.close(result)
          return
        }
        this.errorMessage = result?.msg || 'The set could not be created.'
      },
      error => {
        console.log(error)
        this.saving = false;
        this.errorMessage = 'There was a problem with the server. Please try again.';
      }
    )
  }

  clear(){
    this.name = ''
    this.nonResponses = []
    this.errorMessage = ''
  }

  async return(){
    if(this.isDirty && !(await confirmAction(this.dialog, {title: 'Discard this new non-response set?', message: 'Its name and responses will be lost.', danger: true}))) return
    this.dialogRef.close()
  }
}
