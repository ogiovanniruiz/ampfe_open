import { Component, OnInit, ViewChild, ElementRef, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {GeometryService} from '../../../../services/geometry/geometry.service';
import {AssetService} from '../../../../services/asset/asset.service';

import {AmplifyService} from '../../../../services/amplify/amplify.service';

@Component({
    templateUrl: './searchDialog.html',
  })
  
  export class SearchDialog implements OnInit{

    campaignBoundary;

    cois = {};
    blockgroups = [];
    byCoiLabel = {tabLabel: 'By COI', placeHolder: "COI"}
    byBGLabel = {tabLabel: 'By Blockgroup', placeHolder: "Blockgroup"}
    byAddressLabel = {tabLabel: 'By Address', placeHolder: "Address"}
    langMode: string = ""

    message: string = ""
    showMessage: boolean = false;

    cities: string[];
    zips: string[];

    @ViewChild("address", {static: true}) address: ElementRef;
    @ViewChild("city", {static: true}) city: ElementRef;
    @ViewChild("county", {static: true}) county: ElementRef;
    @ViewChild("zip", {static: true}) zip: ElementRef;

    @ViewChild("coi", {static: true}) coi: ElementRef;

    @ViewChild("blockgroup", {static: true}) blockgroup: ElementRef;

  constructor(
        public dialogRef: MatDialogRef<SearchDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public geoService: GeometryService,
        public assetService: AssetService,
        public ampService: AmplifyService,
        ){
          this.campaignBoundary = data.campaignBoundary;
          this.cois = data.cois;
          this.blockgroups = data.blockgroups;
          this.langMode = data.langMode

          if(data.langMode === 'SPANISH'){
            this.byCoiLabel = {tabLabel: 'Por Comunidad de Interes', placeHolder: "Comunidad de Interes"}
            this.byBGLabel = {tabLabel: 'Por Grupo de bloque', placeHolder: "Grupo de bloque"}

          }
        }

    searchBlockgroup() {
        this.geoService.getBlockgroup(this.blockgroup['selected'].value).subscribe((target: any) => {
            var blockgroup = {
                type: 'Blockgroup',
                value: target
            };
            this.dialogRef.close(blockgroup);
        });
    }

    searchCOI() {
        this.assetService.getCOI(this.coi['selected'].value).subscribe((target: any) => {
            var coi = {
                type: 'COI',
                value: target
            };
            this.dialogRef.close(coi);
        });
    }

    cancel(): void {
      this.dialogRef.close();
    }

    getCities(){
      this.ampService.getCities(this.campaignBoundary).subscribe(
        (cities: string[]) => {
          
          this.cities = cities
      })
    }

    getZips(){
      this.ampService.getZips(this.campaignBoundary).subscribe(
        (zips: string[]) => {
          this.zips = zips
        })
    }

    searchAddress(){

      var addressString: string = this.address.nativeElement.value;
      var city = this.city['value'];
      var zip = this.zip['value'];

      var address = addressString + " " + city + " CA, " + zip


      if(!city && !zip){
        this.message = "Needs a city or zip."
        this.showMessage = true;
        console.log(city)
        return
      }

      var zoom = 16

      if(addressString === ""){
        zoom = 12
      }

      this.showMessage = false;

      this.ampService.geocode(address).subscribe(location =>{

        var address = {
          type: 'location',
          value: location,
          zoom: zoom
        };
        this.dialogRef.close(address);
      })
    }

    ngOnInit(){

      this.getCities()
      this.getZips()
    }
}
