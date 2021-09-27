import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TargetService} from '../../../../services/target/target.service';
import {OrganizationService} from '../../../../services/organization/organization.service';
import { ActivityService} from '../../../../services/activity/activity.service';
import {UserService} from '../../../../services/user/user.service';
import {AmplifyService} from '../../../../services/amplify/amplify.service';
import {GeometryService} from '../../../../services/geometry/geometry.service';
import * as L from 'leaflet';

@Component({
    templateUrl: './searchDialog.html',
  })
  
  export class SearchDialog implements OnInit{

    displayAddressMessage: boolean = false;
    userAddressMessage: string = '';

    cities: string[];
    sufficies: string[];
    zips: string[];
    preficies: string[] = [ '', 'E ', 'N ', 'NE', 'NW', 'S ', 'SE', 'SW', 'W ' ];

    campaignBoundary;

    precincts = [];
    blockgroups = [];

    loadingAddressData = true;

    @ViewChild("streetNum", {static: true}) streetNum: ElementRef;
    @ViewChild("prefix", {static: true}) prefix: ElementRef;
    @ViewChild("street", {static: true}) street: ElementRef;
    @ViewChild("suffix", {static: true}) suffix: ElementRef;
    @ViewChild("city", {static: true}) city: ElementRef;
    @ViewChild("county", {static: true}) county: ElementRef;
    @ViewChild("zip", {static: true}) zip: ElementRef;

    @ViewChild("precinct", {static: true}) precinct: ElementRef;

    @ViewChild("blockgroup", {static: true}) blockgroup: ElementRef;

  constructor(
        public dialogRef: MatDialogRef<SearchDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public targetService: TargetService,
        public orgService: OrganizationService,
        public userService: UserService,
        public activityService: ActivityService,
        public ampService: AmplifyService,
        public geoService: GeometryService,
        ){
          //this.campaignBoundary = data.campaignBoundary;
          //this.precincts = data.precincts;
          //this.blockgroups = data.blockgroups;
          

        }

    getCities(){
      this.ampService.getCities(this.campaignBoundary).subscribe(
        (cities: string[]) => {
          this.cities = cities
          this.loadingAddressData = false;
      })
    }

    getSufficies(){
      this.ampService.getSufficies(this.campaignBoundary).subscribe(
        (sufficies: string[]) => {
          this.sufficies = sufficies
        })
    }

    getZips(){
      this.ampService.getZips(this.campaignBoundary).subscribe(
        (zips: string[]) => {
          this.zips = zips
        })
    }

  searchAddress(){
      var address = {}

      var streetNum = this.streetNum.nativeElement.value;
      var prefix = this.prefix['value'];
      var street: string = this.street.nativeElement.value;
      var suffix = this.suffix['value'];
      var city = this.city['value'];
      var zip = this.zip['value'];

      if(!city){
        this.displayAddressMessage = true;
        this.userAddressMessage = 'A city is required.';
        return;
      }

      this.loadingAddressData = true;

      if(streetNum != "") address['streetNum'] = streetNum;
      if(prefix) address['prefix'] = prefix;
      if(street != "") address['street'] = street.toUpperCase();
      if(suffix) address['suffix'] = suffix;
      if(city) address['city'] = city;
      if(zip) address['zip'] = zip;

      this.userService.searchAddress(address).subscribe(
        (houseHolds: unknown[]) => {
          this.loadingAddressData = false;
          if(houseHolds.length > 100 ){
            this.displayAddressMessage = true;
            this.userAddressMessage = 'There are ' + houseHolds.length + ' results. Please refine your search.';
            return;
          }

          this.dialogRef.close(houseHolds);
      });
    }

    searchBlockgroup() {
        this.geoService.getBlockgroup(this.blockgroup.nativeElement.value).subscribe((target: any) => {
            var blockgroup = {
                type: 'Blockgroup',
                value: target
            };
            this.dialogRef.close(blockgroup);
        });
    }

    searchPrecinct() {
        this.geoService.getPrecinct(this.precinct.nativeElement.value).subscribe((target: any) => {
            var precinct = {
                type: 'Precinct',
                value: target
            };
            this.dialogRef.close(precinct);
        });
    }

    cancel(): void {
      this.dialogRef.close();
    }

    ngOnInit(){
      //this.getCities();
      //this.getSufficies();
      //this.getZips();
      this.loadingAddressData = false;

    }
}
