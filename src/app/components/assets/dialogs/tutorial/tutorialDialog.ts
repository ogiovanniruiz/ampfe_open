import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
    templateUrl: './tutorialDialog.html',
  })

  export class TutorialDialog implements OnInit{

  constructor(
        public dialogRef: MatDialogRef<TutorialDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        ){}

    createCOI(): void {
        this.dialogRef.close('createCOI');
    }

    cloneCOI(): void {
        this.dialogRef.close('cloneCOI');
    }

    editCOI(): void {
        this.dialogRef.close('editCOI');
    }

    deleteCOI(): void {
        this.dialogRef.close('deleteCOI');
    }

    cancel(): void {
      this.dialogRef.close();
    }

    ngOnInit(){}
}
