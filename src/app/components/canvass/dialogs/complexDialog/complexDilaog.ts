import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MediaChange, MediaObserver } from '@angular/flex-layout';
import { CanvassService } from 'src/app/services/canvass/canvass.service';


@Component({
    templateUrl: './complexDialog.html',
  })
  
  export class ComplexDialog implements OnInit{

    disableAnimation = true;

    userMessage: string = ''
    displayMessage: boolean = false;

    fullAddress1: string = ''
    fullAddress2: string = ''

    records: any[] = []

    @ViewChildren('radioAnswers') radioAnswers:QueryList<any>;
    @ViewChildren('textAnswers') textAnswers:QueryList<any>;
  
    gridByBreakpoint = {
      xl: 4,
      lg: 4,
      md: 3,
      sm: 2,
      xs: 2
    }

    constructor(
        public dialogRef: MatDialogRef<ComplexDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public canvassService: CanvassService
        ) {
          this.records = data.selected.records
          this.fullAddress1 = this.records[0].houseHold.fullAddress1
          this.fullAddress2 = this.records[0].houseHold.fullAddress2
        }

  openHouseHold(houseHold){
    this.dialogRef.close(houseHold)
  }


  ngOnInit(): void{}

}
