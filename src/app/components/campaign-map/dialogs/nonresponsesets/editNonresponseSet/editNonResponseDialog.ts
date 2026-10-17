import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {SurveyService} from '../../../../../services/survey.service'
import {NonResponseSet, NonResponse, UpdatedNonResponseSet} from '../../../../../models/nonResponseSet.model'

import { EditableNonResponse, NonResponseUsage, cleanText, responsesValid } from '../nonResponseEditor/nonResponseEditor';

@Component({
  templateUrl: './editNonResponseDialog.html',
  styleUrls: ['./editNonResponseDialog.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class EditNonResponseDialog implements OnInit{

  name: string = ''
  nonResponses: EditableNonResponse[] = [];
  campaignIDs: number[] = []
  campaignID: number

  errorMessage: string = ''
  saving: boolean = false

  // Recorded contacts per response; used responses are locked until this is known
  usage: NonResponseUsage = null
  loadingUsage: boolean = true
  usageFailed: boolean = false

  private snapshot: string = ''

  constructor(public dialogRef: MatDialogRef<EditNonResponseDialog>,
              @Inject(MAT_DIALOG_DATA) public nonResponseSet: NonResponseSet,
              public surveyService: SurveyService,
              private snackBar: MatSnackBar) {}

  ngOnInit(){
    this.campaignID = parseInt(sessionStorage.getItem('campaignID'))
    this.name = this.nonResponseSet.name || ''

    // Work on copies so Cancel leaves the caller's set untouched
    this.nonResponses = (this.nonResponseSet.nonResponses || []).map(nr => ({
      nonResponse: nr.nonResponse,
      nonResponseType: nr.nonResponseType,
      originalText: nr.nonResponse,
    }))
    this.campaignIDs = [...(this.nonResponseSet.campaignIDs || [])]

    this.snapshot = this.serialize()
    this.getUsage()
  }

  getUsage(){
    this.loadingUsage = true
    this.usageFailed = false
    this.surveyService.getNonResponseSetUsage(this.nonResponseSet._id).subscribe(
      (usage: NonResponseUsage) => {
        this.usage = usage || {total: 0, responses: {}}
        this.loadingUsage = false
      },
      error => {
        console.log(error)
        this.loadingUsage = false
        this.usageFailed = true
      }
    )
  }

  get recordedCount(): number {
    return this.usage?.total || 0
  }

  closeDialog(): void{this.dialogRef.close()}

  //////////////////////// CAMPAIGN ////////////////////////

  get loadedInCampaign(): boolean {
    return this.campaignIDs.includes(this.campaignID)
  }

  setLoaded(checked: boolean){
    this.campaignIDs = this.campaignIDs.filter(id => id !== this.campaignID)
    if(checked) this.campaignIDs.push(this.campaignID)
  }

  //////////////////////// SAVE ////////////////////////

  private serialize(): string {
    return JSON.stringify([
      this.name.trim(),
      this.nonResponses.map(nr => [nr.nonResponse.trim(), nr.nonResponseType]),
      [...this.campaignIDs].sort(),
    ])
  }

  get hasChanges(): boolean {
    return this.serialize() !== this.snapshot
  }

  get formValid(): boolean {
    return !!this.name.trim() && responsesValid(this.nonResponses)
  }

  saveNonResponseSetChanges(){
    if(!this.formValid){
      this.errorMessage = !this.name.trim() ? 'The set needs a name.'
        : this.nonResponses.length === 0 ? 'Add at least one response.'
        : 'Fix the highlighted responses before saving.'
      return
    }
    if(this.saving || this.loadingUsage || this.usageFailed) return

    const nonResponseSet: NonResponseSet = {
      name: this.name.trim(),
      // originalText is only for this dialog
      nonResponses: this.nonResponses.map(nr => ({nonResponse: cleanText(nr.nonResponse), nonResponseType: nr.nonResponseType})),
      campaignIDs: this.campaignIDs,
    }

    this.saving = true
    this.errorMessage = ''

    this.surveyService.editNonResponseSet(nonResponseSet, this.nonResponseSet._id, this.campaignID).subscribe(
      (result: UpdatedNonResponseSet) => {
        this.saving = false
        if(result?.success){
          this.snackBar.open('Set saved.', 'Dismiss', {duration: 2500})
          this.dialogRef.close(result)
          return
        }
        this.errorMessage = result?.msg || 'The set could not be saved.'
      },
      error => {
        console.log(error)
        this.saving = false
        this.errorMessage = 'There was a problem with the server. Please try again.'
      }
    )
  }

  copyID(){
    const id = this.nonResponseSet._id
    if(!id) return
    navigator.clipboard?.writeText(id).then(
      () => this.snackBar.open('Set ID copied.', 'Dismiss', {duration: 2500}),
      () => this.snackBar.open('Could not copy the ID.', 'Dismiss', {duration: 2500})
    )
  }
}
