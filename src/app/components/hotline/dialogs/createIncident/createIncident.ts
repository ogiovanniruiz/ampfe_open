import { Component, OnInit, ViewChild, ElementRef, Inject, Output, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import { Incident } from 'src/app/models/hotline.model';
import { Address } from 'src/app/models/person.model';
import { User } from 'src/app/models/user.model';
import { HotlineService } from 'src/app/services/hotline.service';
import { AddressSearchService, AddressSuggestion } from 'src/app/services/addressSearch.service';

@Component({
    selector: 'app-hotline',
    templateUrl: './createIncident.html',
    styleUrls: ['../../hotline.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})

export class CreateIncidentDialog implements OnInit{

  constructor(public dialog: MatDialog, public hotlineService: HotlineService, public dialogRef: MatDialogRef<CreateIncidentDialog>, @Inject(MAT_DIALOG_DATA) public coordinates: number[], public addressSearch: AddressSearchService) { }
  
  @ViewChild('categories', {static: false}) categories: ElementRef;
  @ViewChild('status', {static: false}) status: ElementRef;
  @ViewChild('severity', {static: false}) severity: ElementRef;

  @ViewChild('address', {static: true}) address: ElementRef;
  @ViewChild('address2', {static: false}) address2: ElementRef;
  @ViewChild('city', {static: false}) city: ElementRef;
  @ViewChild('state', {static: true}) state: ElementRef;
  //@ViewChild('county', {static: false}) county: ElementRef;
  @ViewChild('zip', {static: false}) zip: ElementRef;

  @ViewChild('report', {static: false}) report: ElementRef;

  displayedColumns: string[] = ['categories', 'status', 'created_by', 'location', 'created_on'];

  incidents: Incident[] = []

  userMessage: string = ""
  displayMessage: boolean = false

  dropPin: boolean = false

  loading: boolean = false

  county: string = ""

  // Google address suggestions for the address field
  addressSuggestions: AddressSuggestion[] = []
  private suggestTimer: ReturnType<typeof setTimeout> | null = null

  ngOnInit(){
    if(this.coordinates.length > 0){
      this.getReverseGeocode()
    }
    this.state['value'] = "CA"

    this.addressSearch.load()
  }

  // Typing in the address asks Google for matching addresses
  onAddressInput(value: string){
    if(this.suggestTimer) clearTimeout(this.suggestTimer)
    this.suggestTimer = setTimeout(async () => {
      this.addressSuggestions = await this.addressSearch.suggest(value)
    }, 250)
  }

  displaySuggestion = (value: any): string => typeof value === 'string' ? value : (value?.text?.split(',')[0] || '')

  async pickAddress(suggestion: AddressSuggestion){
    this.addressSuggestions = []
    this.address.nativeElement.value = suggestion.text.split(',')[0] || ''
    const picked = await this.addressSearch.resolve(suggestion)
    if(!picked) return
    this.address.nativeElement.value = picked.line
    this.city.nativeElement.value = picked.city
    this.zip.nativeElement.value = picked.zip
    this.county = picked.county
  }

  return(){this.dialogRef.close()}

  getReverseGeocode(){
    this.loading = true;
    this.hotlineService.getReverseGeocode(this.coordinates).subscribe((results: any) =>{
      this.city.nativeElement.value = results[0].address_components.city
      this.address.nativeElement.value = results[0].address_components.number + " " + results[0].address_components.formatted_street
      this.zip.nativeElement.value = results[0].address_components.zip
      this.county = results[0].address_components.county.replace(" County", "").toUpperCase();
      this.loading = false;
    })
  }

  createIncident(){

    if(this.address.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = "Address Needed."
      return
    } 

    if(this.city.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = "City Needed."
      return
    } 

    if(this.zip.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = "Zip Needed."
      return
    } 

    if(!this.categories['value'] || this.categories['value'].length === 0){
      this.displayMessage = true;
      this.userMessage = "Categories Needed."
      return
    } 

    if(!this.status['value']){
      this.displayMessage = true;
      this.userMessage = "Status Needed."
      return
    } 

    if(!this.severity['value']){
      this.displayMessage = true;
      this.userMessage = "Severity Needed."
      return
    } 

    if(!this.state['value']){
      this.displayMessage = true;
      this.userMessage = "State Needed."
      return
    } 

    if(this.report.nativeElement.value === ""){
      this.displayMessage = true;
      this.userMessage = "Report Needed."
      return
    } 

    var orgID: string = sessionStorage.getItem('orgID')
    var user: User = JSON.parse(sessionStorage.getItem('user'))
    
    var newIncidentAddress = {address: this.address.nativeElement.value, 
                              address2: this.address2.nativeElement.value,
                              city: this.city.nativeElement.value,
                              state: this.state['value'],
                              county: this.county,
                              zip: this.zip.nativeElement.value,
                            }

    var newIncident: Incident = {
      categories: this.categories['value'],
      status: this.status['value'],
      severity: this.severity['value'],
      orgID: orgID,
      user: user,
      address: newIncidentAddress,
      reports: [{notes: this.report.nativeElement.value, userID: user._id, userName: user.name.fullName}]
    }

    if(this.coordinates.length > 0){
      newIncident.location = {coordinates: [this.coordinates[1], this.coordinates[0]], type: "Point"} 
    }

    this.loading = true

    this.hotlineService.createIncident(newIncident).subscribe((incident: Incident) =>{

      if(!incident){
        this.loading = false
        this.displayMessage = true;
        this.userMessage = "Incident Already Exists at this location."
        return
      }
      this.dialogRef.close(incident)
    })
  
  }

  toggleDropPin(check: boolean){
    this.dropPin = check
  }
}