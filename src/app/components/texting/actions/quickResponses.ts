import {Component, Inject} from '@angular/core';
import {MatBottomSheet, MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA} from '@angular/material/bottom-sheet';

@Component({
    selector: 'quickResponses',
    templateUrl: 'quickResponses.html',
  })
  export class QuickResponseBottomSheet {
    quickResponses: string[]
    constructor(private _bottomSheetRef: MatBottomSheetRef<QuickResponseBottomSheet>,
                @Inject(MAT_BOTTOM_SHEET_DATA) public data: any) {
                  this.quickResponses = data

                }

    public onResponseChange(selectedResponse: string){
      this._bottomSheetRef.dismiss(selectedResponse);
    }
  
  }