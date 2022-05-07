import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service'
import {OrganizationService} from '../../../../services/organization/organization.service'
import {MembershipService} from '../../../../services/membership/membership.service'


@Component({
  templateUrl: './editMemberDialog.html',
  styleUrls: ['../../membership.component.scss']
})

export class EditMemberDialog implements OnInit{

  @ViewChild("firstName", {static: true}) firstName: ElementRef;
  @ViewChild("middleName", {static: true}) middleName: ElementRef;
  @ViewChild("lastName",{static: true}) lastName: ElementRef;
  @ViewChild("phone", {static: true}) phone: ElementRef;
  @ViewChild("email", {static: true}) email: ElementRef;
  @ViewChild("selectedTags", {static: true}) selectedTags: ElementRef;
  @ViewChild("address", {static: true}) address: ElementRef;
  @ViewChild("city", {static: true}) city: ElementRef;
  @ViewChild("county", {static: true}) county: ElementRef;
  @ViewChild("state", {static: true}) state: ElementRef;
  @ViewChild("zip", {static: true}) zip: ElementRef;
  @ViewChild("dob", {static: false}) dob: ElementRef;
  @ViewChild("ethnicity", {static: true}) ethnicity: ElementRef;

  personExists = false;
  tags = [];
  lat: number;
  lng: number;

  displayMessage: boolean = false;
  message: string;

  countyID: string;
  citywideID: string;
  citywardID: string;
  assemblyID: string;
  senateID: string;
  congressionalID: string;
  recreationalID: string;
  schoolID: string;
  waterID: string;

  blockgroupID: string;
  precinctID: string;

  showProgressbar: boolean = false;

  states = {/*AL: 'ALABAMA', AK: 'ALASKA', AZ: 'ARIZONA', AR: 'ARKANSAS',*/ CA: 'CALIFORNIA', /*CO: 'COLORADO', CT: 'CONNECTICUT', DE: 'DELAWARE', FL: 'FLORIDA', GA: 'GEORGIA', HI: 'HAWAII', ID: 'IDAHO', IL: 'ILLINOIS', IN: 'INDIANA', IA: 'IOWA', KS: 'KANSAS', KY: 'KENTUCKY', LA: 'LOUISIANA', ME: 'MAINE', MD: 'MARYLAND', MA: 'MASSACHUSETTS', MI: 'MICHIGAN', MN: 'MINNESOTA', MS: 'MISSISSIPPI', MO: 'MISSOURI', MT: 'MONTANA', NE: 'NEBRASKA', NV: 'NEVADA', NH: 'NEW HAMPSHIRE', NJ: 'NEW JERSEY', NM: 'NEW MEXICO', NY: 'NEW YORK', NC: 'NORTH CAROLINA', ND: 'NORTH DAKOTA', OH: 'OHIO', OK: 'OKLAHOMA', OR: 'OREGON', PA: 'PENNSYLVANIA', RI: 'RHODE ISLAND', SC: 'SOUTH CAROLINA', SD: 'SOUTH DAKOTA', TN: 'TENNESSEE', TX: 'TEXAS', UT: 'UTAH', VT: 'VERMONT', VA: 'VIRGINIA', WA: 'WASHINGTON', WV: 'WEST VIRGINIA', WI: 'WISCONSIN', WY: 'WYOMING'*/};

  ethnicities = ['Black', 'Hispanic', 'Latino', 'Asian', 'White', 'Other'];

  dobSelected: string;

  counties: string[] = ['RIVERSIDE', 'SAN BERNARDINO'];


  constructor(public dialogRef: MatDialogRef<EditMemberDialog>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              public userService: UserService,
              public memberService: MembershipService,
              public orgService: OrganizationService) {}

  getOrgTags(){
    var orgID:string = sessionStorage.getItem('orgID');
    this.orgService.getOrgTags(orgID).subscribe((result: []) => {
      this.tags = result;
    });
  }

  prefillData(){
    this.firstName.nativeElement.value = this.data.resident.name.firstName;

    if(this.data.resident.name.lastName) this.lastName.nativeElement.value = this.data.resident.name.lastName;

    if(this.data.resident.name.middleName) this.middleName.nativeElement.value = this.data.resident.name.middleName;
    if(this.data.resident.phones[0]) this.phone.nativeElement.value = this.data.resident.phones[0].number;
    if(this.data.resident.email) this.email.nativeElement.value = this.data.resident.email;
    if(this.data.fullAddress1) this.address.nativeElement.value = this.data.address.address;
    if(this.data.address.city) this.city.nativeElement.value = this.data.address.city;
    if(this.data.address.state) this.state['value'] = this.data.address.state.abbrv;
    if(this.data.address.zip) this.zip.nativeElement.value = this.data.address.zip;
    if(this.data.resident.dob) this.dobSelected = this.data.resident.dob;
    if(this.data.resident.tags.length) this.selectedTags['value'] = this.data.resident.tags;
    if(this.data.resident.ethnicity) this.ethnicity['value'] = this.data.resident.ethnicity;

    if(this.data.location) this.lat = this.data.location.coordinates[1];
    if(this.data.location) this.lng = this.data.location.coordinates[0];

    if(this.data.districts){
      if(this.data.districts.countyID) {this.countyID = this.data.districts.countyID}

      if(this.data.districts.citywideID) {this.citywideID = this.data.districts.citywideID}
      if(this.data.districts.citywardID) {this.citywardID = this.data.districts.citywardID}
      if(this.data.districts.assemblyID) {this.assemblyID = this.data.districts.assemblyID}
      if(this.data.districts.senateID) {this.senateID = this.data.districts.senateID}
      if(this.data.districts.congressionalID) {this.congressionalID = this.data.districts.congressionalID}

      if(this.data.districts.recreationalID) {this.recreationalID = this.data.districts.recreationalID}
      if(this.data.districts.schoolID) {this.schoolID = this.data.districts.schoolID}
      if(this.data.districts.waterID) {this.waterID = this.data.districts.waterID}
    }

    if(this.data.blockgroupID) {this.blockgroupID = this.data.blockgroupID}
    if(this.data.precinctID) {this.precinctID = this.data.precinctID}

  }

  editMember(){
    var firstName: string = this.firstName.nativeElement.value;
    var middleName: string = this.middleName.nativeElement.value;
    var lastName: string = this.lastName.nativeElement.value;

    var phone: string = this.phone.nativeElement.value;
    var email: string = this.email.nativeElement.value;
    var address: string = this.address.nativeElement.value;
    var city: string = this.city.nativeElement.value;
    var state: string = this.state['value'];
    var zip: string = this.zip.nativeElement.value;

    var dob: Date = this.dob['startAt'];
    var tags: object = this.selectedTags['value'];
    var ethnicity: string = this.ethnicity['value'];

    if(firstName === ''){
      this.displayMessage = true;
      this.message = 'Member needs a first name';
      return;
    }

    if(phone === '' && email === '' && address === ''){
      this.displayMessage = true;
      this.message = 'Needs either a phone, email or an address';
      return;
    }

    if (phone.length >= 1 && phone.length <= 9){
      this.displayMessage = true;
      this.message = 'Phone number needs to be at least 10 digits';
      return;
    }

    if (email.length){
      const emailExpression = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      if (!emailExpression.test(email)){
        this.displayMessage = true;
        this.message = 'Please enter a valid email';
        return;
      }
    }

    if (address){
      if (city === ''){
        this.displayMessage = true;
        this.message = 'Please enter a city';
        return;
      }
      if (zip === ''){
        this.displayMessage = true;
        this.message = 'Please enter a zip';
        return;
      }
    }

    if (zip.length >= 1 && zip.length <= 4){
      this.displayMessage = true;
      this.message = 'Zip needs to be at least 5 digits';
      return;
    }

    this.showProgressbar = true;

    var newDetail = {name: {firstName: firstName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                            middleName: middleName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                            lastName: lastName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')},
                     phones: phone ? {type: '?', number: phone} : [],
                     email: email.toLowerCase().trim(),
                     address: address.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                     city: city.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                     state: {abbrv: state, name: this.states[state]},
                     zip: zip.trim(),
                     dob: dob,
                     tags: tags,
                     ethnicity: ethnicity,
                    };

    this.memberService.editMember(this.data, newDetail).subscribe(
      result => {
        this.dialogRef.close(result);
      },
      error => {
        console.log(error);
      }
    );
  }

  deleteMember(){
    if(confirm('Are you sure you want to delete?')) {
      this.memberService.deleteMember(this.data).subscribe(
        result => {
          this.dialogRef.close(result);
        },
        error => {
          console.log(error);
        }
      );
    }
  }

  numericOnly(event) {
    var patt = /^([0-9])$/;
    var result = patt.test(event.data);
    if (!result && event.data){
      event.target.value = event.target.value.slice(0, -1);
    }
  }

  cancel(){this.dialogRef.close()}

  ngOnInit(){
    this.prefillData();
    this.getOrgTags();
  }
}
