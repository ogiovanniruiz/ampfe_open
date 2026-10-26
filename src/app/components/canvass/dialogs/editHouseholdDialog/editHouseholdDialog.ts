import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS } from 'src/app/utils/loading';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig} from '@angular/material/dialog';

//SERVICES
import { CanvassService } from '../../../../services/canvass.service'

//MODELS
import {CanvassDialogData, ActivityContactRecord} from 'src/app/models/contact.record.model'
import { Household } from 'src/app/models/person.model';
import { formatAddress } from '../../canvassUtils';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';

// Every place that opens this dialog uses it: full width on phones, a centered card elsewhere
export function editHouseholdDialogConfig(data: CanvassDialogData): MatDialogConfig {
  const isMobile = window.innerWidth < 600
  return isMobile
    ? {autoFocus: false, disableClose: true, data, width: '100vw', maxWidth: '100vw', maxHeight: '100vh'}
    : {autoFocus: false, disableClose: true, data, width: '640px', maxWidth: '94vw', maxHeight: '96vh'}
}

const fullName = (name: any): string =>
  [name?.firstName, name?.middleName, name?.lastName].filter(Boolean).join(' ')

@Component({
    templateUrl: './editHouseholdDialog.html',
    styleUrls: ['../../../../styles/dialog-common.scss', './editHouseholdDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })

// Review of a finished door (complete or passed), with a reset so it can be canvassed again
export class EditHouseholdDialog implements OnInit{

    loading: boolean = false
    resetting: boolean = false
    errorMessage: string = '';

    fullAddress1: string = ''
    fullAddress2: string = ''
    household: Household;
    householdStatus: 'complete' | 'passed' | '' = ''

    // Newest first
    records: ActivityContactRecord[] = []

    constructor(
        public dialogRef: MatDialogRef<EditHouseholdDialog>,
        @Inject(MAT_DIALOG_DATA) public canvassDialogData: CanvassDialogData,
        public canvassService: CanvassService,
        private dialog: MatDialog
        ) {
          const householdRecord = canvassDialogData.canvassHouseholdRecord
          this.household = householdRecord.household

          this.fullAddress1 = formatAddress(this.household._id)
          this.fullAddress2 = this.household.fullAddress2
          this.householdStatus = householdRecord.complete ? 'complete' : householdRecord.passed ? 'passed' : ''
        }

    ngOnInit(): void{
        this.getHouseholdContactHistory();
    }

    //////////////////////// DISPLAY ////////////////////////

    personName(record: ActivityContactRecord): string {
      return fullName(record.person?.resident?.name) || 'Unnamed resident'
    }

    // "Jane D." keeps the line short; older records may have no user
    canvasserName(record: ActivityContactRecord): string {
      const first = record.user?.name?.firstName || ''
      const last = record.user?.name?.lastName || ''
      if(!first && !last) return 'Unknown canvasser'
      return last ? `${first} ${last.charAt(0)}.`.trim() : first
    }

    outcomeKind(record: ActivityContactRecord): 'survey' | 'nonresponse' | 'contact' {
      if(record.surveyResponse?.questionResponses?.length) return 'survey'
      if(record.nonResponse?.nonResponse) return 'nonresponse'
      return 'contact'
    }

    outcome(record: ActivityContactRecord): string {
      const kind = this.outcomeKind(record)
      if(kind === 'survey') return 'Completed survey'
      if(kind === 'nonresponse') return record.nonResponse.nonResponse
      return 'Contacted'
    }

    // Multiple-choice answers can come back as lists
    answerText(response: any): string {
      if(Array.isArray(response)) return response.join(', ')
      return response === undefined || response === null || response === '' ? '—' : String(response)
    }

    //////////////////////// LOAD / RESET ////////////////////////

    getHouseholdContactHistory(){
        const activityID = sessionStorage.getItem('activityID') || this.canvassDialogData.activity?._id
        this.loading = true;
        this.errorMessage = ''
        this.canvassService.getCanvassContactHistory(activityID, this.household._id, this.canvassDialogData.canvassHouseholdRecord._id).pipe(timeout(LOAD_TIMEOUT_MS)).subscribe(
          (canvassContactHistories: ActivityContactRecord[]) =>{
            this.loading = false;
            this.records = [...(canvassContactHistories || [])].sort((a, b) =>
              new Date(b.creationDate || 0).getTime() - new Date(a.creationDate || 0).getTime())
          }, error =>{
            console.log(error)
            this.loading = false;
            this.errorMessage = "Couldn't load this door's responses. Please try again."
          }
        )
    }

    async reset(){
        if(this.resetting) return
        const count = this.records.length
        const what = count ? `the ${count} ${count === 1 ? 'response' : 'responses'} recorded at this door` : 'this door\'s status'
        if(!(await confirmAction(this.dialog, {title: `Reset ${this.fullAddress1}?`, message: `This deletes ${what} so it can be canvassed again. This can't be undone.`, confirmLabel: 'Reset', cancelLabel: 'Cancel', danger: true}))) return

        const activityID = sessionStorage.getItem('activityID') || this.canvassDialogData.activity?._id
        this.resetting = true;
        this.errorMessage = ''

        this.canvassService.editCanvassContactRecord(activityID, this.canvassDialogData.canvassHouseholdRecord._id).subscribe(
          (updatedHouseholdRecord: any) =>{
            this.resetting = false
            if(!updatedHouseholdRecord || updatedHouseholdRecord.success === false){
              this.errorMessage = updatedHouseholdRecord?.msg || "The door couldn't be reset. Please try again."
              return
            }
            // Callers replace the door's record with this one
            this.dialogRef.close(updatedHouseholdRecord)
          }, error =>{
            console.log(error)
            this.resetting = false;
            this.errorMessage = "The door couldn't be reset because of a server error. Please try again."
          }
        )
    }

    close(){
      if(this.resetting) return
      this.dialogRef.close()
    }
}
