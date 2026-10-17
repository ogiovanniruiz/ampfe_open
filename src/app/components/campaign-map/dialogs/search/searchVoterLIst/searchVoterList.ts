import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { PersonService } from 'src/app/services/person.service';
import { formatAddress } from 'src/app/components/canvass/canvassUtils';

// The server returns one extra match so we know there are more than we show
const RESULT_LIMIT = 50;

@Component({
    templateUrl: './searchVoterList.html',
    styleUrls: ['../search-dialogs.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class SearchVoterListDialog {

  firstName: string = ''
  lastName: string = ''

  results: any[] = null
  hasMore: boolean = false
  searchedName: string = ''

  searching: boolean = false
  errorMessage: string = ''

  constructor(
    public dialogRef: MatDialogRef<SearchVoterListDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public personService: PersonService
  ){}

  cancel(): void {
    this.dialogRef.close();
  }

  search(){
    const firstName = this.firstName.trim()
    const lastName = this.lastName.trim()

    // A first name alone matches too many voters to be useful
    if(!lastName){
      this.errorMessage = 'Enter a last name.'
      return
    }
    if(this.searching) return

    const person: any = {lastName, campaignID: parseInt(sessionStorage.getItem('campaignID'))}
    if(firstName) person.firstName = firstName

    this.searching = true
    this.errorMessage = ''

    this.personService.getPerson(person).subscribe(
      (results: any[]) => {
        this.searching = false
        const rows = results || []
        this.hasMore = rows.length > RESULT_LIMIT
        this.results = rows.slice(0, RESULT_LIMIT)
        this.searchedName = [firstName, lastName].filter(Boolean).join(' ')
      },
      error => {
        console.log(error)
        this.searching = false
        this.errorMessage = 'The voter search failed. Please try again.'
      }
    )
  }

  fullName(voter: any): string {
    const name = voter?.resident?.name || {}
    return [name.firstName, name.middleName, name.lastName].filter(Boolean).join(' ')
  }

  addressLine(voter: any): string {
    const street = voter?.address ? formatAddress(voter.address) : (voter?.fullAddress1 || '')
    const city = [voter?.address?.city, voter?.address?.zip].filter(Boolean).join(' ')
    return [street, city].filter(Boolean).join(', ')
  }

  hasLocation(voter: any): boolean {
    return Array.isArray(voter?.location?.coordinates) && voter.location.coordinates.length === 2
  }

  showOnMap(voter: any){
    this.dialogRef.close({type: 'voter', voter, name: this.fullName(voter), address: this.addressLine(voter)})
  }

  trackVoter(index: number, voter: any){ return voter?._id || index }
}
