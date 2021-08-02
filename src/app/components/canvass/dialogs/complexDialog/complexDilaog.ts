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
    houseHolds: any[] = []
    houseHold: any;

    gridColumns: number;

    activity: any;
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
        private observableMedia: MediaObserver, 
        private canvassService: CanvassService
        ) {
          this.fullAddress1 = data.selected.houseHold.fullAddress1
          this.fullAddress2 = data.selected.houseHold.fullAddress2

          this.houseHolds = data.selected.houseHolds
          this.houseHold = data.selected.houseHold
          this.records = data.selected.records
          console.log(data)
        }

  openHouseHold(houseHold){
    this.dialogRef.close(houseHold)
  }

  ngOnInit(): void{
    this.getHouseholdContactHistory()
  }

  getHouseholdContactHistory(){
    var activityID = sessionStorage.getItem('activityID')
    this.canvassService.getCanvassHouseHold(activityID, this.houseHold._id).subscribe(
      (result: any[]) =>{
        this.records = result['cHHRecord'][0].records
        //this.residentsContacted = result['ccHistory'].map(x =>{ return x.personID})
      }
    )
    
  }

  ngAfterContentInit() {
    setTimeout(() => this.disableAnimation = false);
    this.observableMedia.media$.subscribe((change: MediaChange) => {
      this.gridColumns = this.gridByBreakpoint[change.mqAlias];
    });
  }
}
