import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {AmplifyService} from '../../../../../services/amplify.service';

export interface AddressSearchResult {
  // GeoJSON order: [lng, lat]
  coordinates: number[];
  label: string;
}

@Component({
    templateUrl: './searchDialog.html',
    styleUrls: ['../search-dialogs.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
  })
  
export class SearchDialog {

  fullAddress: string = '';
  searching: boolean = false;
  errorMessage: string = '';

  constructor(
    public dialogRef: MatDialogRef<SearchDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public ampService: AmplifyService,
  ){}

  geocodeAddress(){
    const address = this.fullAddress.trim()
    if(!address){
      this.errorMessage = 'Enter an address to search for.'
      return
    }
    if(this.searching) return

    this.searching = true;
    this.errorMessage = '';

    this.ampService.geocode(address).subscribe(
      (results: any) => {
        this.searching = false;

        const coordinates = results?.coordinates
        if(!Array.isArray(coordinates) || coordinates.length !== 2){
          this.errorMessage = "We couldn't find that address. Check the spelling, or add the city and state."
          return
        }

        // Show the address the geocoder actually matched, not just what was typed
        const parsed = results.parsedAddress || {}
        const matched = [parsed.formatted_street && [parsed.number, parsed.formatted_street].filter(Boolean).join(' '), parsed.city, parsed.state]
          .filter(Boolean).join(', ')

        const result: AddressSearchResult = {coordinates, label: matched || address}
        this.dialogRef.close(result);
      },
      error => {
        console.log(error)
        this.searching = false;
        this.errorMessage = 'The address search failed. Please try again.'
      }
    )
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
