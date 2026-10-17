import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';

import { CanvassService } from 'src/app/services/canvass.service';
import { HouseholdDialog, householdDialogConfig } from '../householdDialog/householdDialog';
import { EditHouseholdDialog, editHouseholdDialogConfig } from '../editHouseholdDialog/editHouseholdDialog';
import { CanvassDialogData, ActivityHouseholdRecord } from 'src/app/models/contact.record.model';
import { formatAddress, syncBuildingStatus } from '../../canvassUtils';

type UnitStatus = 'todo' | 'passed' | 'complete';

// Unit number without the "APT", "UNIT" or "#" prefix; empty when the record has no unit
const unitKey = (record: any): string =>
  String(record?.household?._id?.unit || '').replace(/APT|UNIT|#|\s/gi, '')

@Component({
    templateUrl: './complexDialog.html',
    styleUrls: ['../../canvass.component.scss', './complexDialog.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
  export class ComplexDialog implements OnInit{

    fullAddress1: string = ''
    fullAddress2: string = ''

    // Blocks a second tap from opening another dialog on top of the first
    opening: boolean = false

    constructor(
        public dialogRef: MatDialogRef<ComplexDialog>,
        @Inject(MAT_DIALOG_DATA) public canvassDialogData: CanvassDialogData,
        public canvassService: CanvassService,
        public dialog: MatDialog,

        ) {

          // numeric: true sorts 2 before 10 and still handles letters
          this.canvassDialogData.building.records.sort((a, b) =>
            unitKey(a).localeCompare(unitKey(b), undefined, {numeric: true})
          )

          // Some records only carry a flat address string, not structured parts
          const first = this.canvassDialogData.building.records[0]?.household
          this.fullAddress1 = first?._id?.streetNum ? formatAddress(first._id, false) : (first?.fullAddress1 || 'Building')
          this.fullAddress2 = first?.fullAddress2 || ''
        }

  get records(): ActivityHouseholdRecord[] {
    return this.canvassDialogData.building.records
  }

  get progress(){
    const done = this.records.filter(record => record.complete || record.passed).length
    return {done, total: this.records.length}
  }

  unitLabel(record: ActivityHouseholdRecord): string {
    return unitKey(record) || 'Main'
  }

  unitStatus(record: ActivityHouseholdRecord): UnitStatus {
    if(record.complete) return 'complete'
    if(record.passed) return 'passed'
    return 'todo'
  }

  residentCount(record: ActivityHouseholdRecord): number {
    return record.household?.residents?.length || 0
  }

  trackRecord(index: number, record: ActivityHouseholdRecord){ return record._id }

  openHousehold(canvassHouseholdRecord: ActivityHouseholdRecord){
    if(this.opening) return
    this.opening = true

    // Each unit's dialog gets its own data; the shared building object isn't touched
    const data: CanvassDialogData = {...this.canvassDialogData, canvassHouseholdRecord}
    const finished = canvassHouseholdRecord.complete || canvassHouseholdRecord.passed
    const dialogComponent: any = finished ? EditHouseholdDialog : HouseholdDialog

    const dialogRef = this.dialog.open(dialogComponent, finished ? editHouseholdDialogConfig(data) : householdDialogConfig(data));

    dialogRef.afterClosed().subscribe((updatedCanvassHouseholdRecord: ActivityHouseholdRecord) =>{
      this.opening = false

      if(!updatedCanvassHouseholdRecord){ return}

      for(var i = 0; i < this.records.length; i++){
        if(this.records[i]._id === updatedCanvassHouseholdRecord._id){
          this.records[i] = updatedCanvassHouseholdRecord
        }
      }

      if(syncBuildingStatus(this.canvassDialogData.building)) this.return()
    })
  }

  // Always hands back the whole building so the caller can redraw it from every unit's state
  return(){
    syncBuildingStatus(this.canvassDialogData.building)
    this.dialogRef.close({building: this.canvassDialogData.building})
  }

  ngOnInit(): void{}

}
