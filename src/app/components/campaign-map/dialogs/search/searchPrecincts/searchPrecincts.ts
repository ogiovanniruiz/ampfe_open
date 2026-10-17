import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { PrecinctService } from 'src/app/services/shape/precinct.service';

@Component({
    templateUrl: './searchPrecincts.html',
    styleUrls: ['../search-dialogs.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class SearchPrecinctsDialog {

  precinctID: string = ''
  searching: boolean = false
  errorMessage: string = ''

  constructor(
    public dialogRef: MatDialogRef<SearchPrecinctsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public precinctService: PrecinctService
  ){}

  cancel(): void {this.dialogRef.close()}

  search(){
    // Pasted IDs often carry stray spaces
    const precinctID = this.precinctID.trim()
    if(!precinctID){
      this.errorMessage = 'Enter a precinct ID.'
      return
    }
    if(this.searching) return

    this.searching = true
    this.errorMessage = ''

    this.precinctService.getPrecinct(precinctID).subscribe(
      (precinct: any) => {
        this.searching = false
        if(precinct?.geometry){
          this.dialogRef.close(precinct)
          return
        }
        this.errorMessage = `No precinct found with ID "${precinctID}".`
      },
      error => {
        console.log(error)
        this.searching = false
        this.errorMessage = 'The precinct search failed. Please try again.'
      }
    )
  }
}
