import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user/user.service'

import {OrganizationService} from '../../../../services/organization/organization.service'
import {PersonService} from '../../../../services/person/person.service'
import {FormControl} from '@angular/forms';
import {MembershipService} from '../../../../services/membership/membership.service'

@Component({
  templateUrl: './createMemberDialog.html',
})

export class CreateMemberDialog implements OnInit{

  @ViewChild("firstName", {static: true}) firstName: ElementRef;
  @ViewChild("middleName", {static: true}) middleName: ElementRef;
  @ViewChild("lastName",{static: true}) lastName: ElementRef;
  @ViewChild("phone", {static: true}) phone: ElementRef;
  @ViewChild("email", {static: true}) email: ElementRef;
  @ViewChild("address", {static: true}) address: ElementRef;
  @ViewChild("city", {static: true}) city: ElementRef;
  @ViewChild("county", {static: true}) county: ElementRef;
  @ViewChild("state", {static: true}) state: ElementRef;
  @ViewChild("zip", {static: true}) zip: ElementRef;
  @ViewChild("dob", {static: false}) dob: ElementRef;
  @ViewChild("ethnicity", {static: true}) ethnicity: ElementRef;

  personExists = false;
  tags = [];
  displayMessage: boolean = false;
  message: string;

  selectedTags = new FormControl();
  showProgressbar: boolean = false;

  states = {/*AL: 'ALABAMA', AK: 'ALASKA', AZ: 'ARIZONA', AR: 'ARKANSAS',*/ CA: 'CALIFORNIA', /*CO: 'COLORADO', CT: 'CONNECTICUT', DE: 'DELAWARE', FL: 'FLORIDA', GA: 'GEORGIA', HI: 'HAWAII', ID: 'IDAHO', IL: 'ILLINOIS', IN: 'INDIANA', IA: 'IOWA', KS: 'KANSAS', KY: 'KENTUCKY', LA: 'LOUISIANA', ME: 'MAINE', MD: 'MARYLAND', MA: 'MASSACHUSETTS', MI: 'MICHIGAN', MN: 'MINNESOTA', MS: 'MISSISSIPPI', MO: 'MISSOURI', MT: 'MONTANA', NE: 'NEBRASKA', NV: 'NEVADA', NH: 'NEW HAMPSHIRE', NJ: 'NEW JERSEY', NM: 'NEW MEXICO', NY: 'NEW YORK', NC: 'NORTH CAROLINA', ND: 'NORTH DAKOTA', OH: 'OHIO', OK: 'OKLAHOMA', OR: 'OREGON', PA: 'PENNSYLVANIA', RI: 'RHODE ISLAND', SC: 'SOUTH CAROLINA', SD: 'SOUTH DAKOTA', TN: 'TENNESSEE', TX: 'TEXAS', UT: 'UTAH', VT: 'VERMONT', VA: 'VIRGINIA', WA: 'WASHINGTON', WV: 'WEST VIRGINIA', WI: 'WISCONSIN', WY: 'WYOMING'*/};

  ethnicities = ['Black', 'Hispanic', 'Latino', 'Asian', 'White', 'Other'];

  counties: string[] = ['RIVERSIDE', 'SAN BERNARDINO'];


  constructor(public dialogRef: MatDialogRef<CreateMemberDialog>,
              @Inject(MAT_DIALOG_DATA) public data: any,
              public userService: UserService,
              public personService: PersonService,
              public memberService: MembershipService,
              public orgService: OrganizationService) {}

  getOrgTags(){
    var orgID: string = sessionStorage.getItem('orgID');
    this.orgService.getOrgTags(orgID).subscribe(
      (tags: string[]) =>{
        this.tags = tags;
      }
    );
  }

  createMember(){
    var orgID: string = sessionStorage.getItem('orgID');
    var userID: string = JSON.parse(sessionStorage.getItem('user'))['_id'];

    var firstName: string = this.firstName.nativeElement.value;
    var middleName: string = this.middleName.nativeElement.value;
    var lastName: string = this.lastName.nativeElement.value;
    var phone: string = this.phone.nativeElement.value;
    var email: string = this.email.nativeElement.value;
    var address: string = this.address.nativeElement.value;
    var city: string = this.city.nativeElement.value;
    var state: string = this.state['value'] ? this.state['value'] : 'CA';
    var zip: string = this.zip.nativeElement.value;
    var dob: Date = this.dob['startAt'];
    var tags: object = this.selectedTags.value;
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

    this.displayMessage = false;
    this.showProgressbar = true;

    var member = {
                  resident: {name: {firstName: firstName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                                    middleName: middleName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                                    lastName: lastName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                            },
                            phones: phone ? {type: '?', number: phone} : [],
                            email: email.toLowerCase().trim(),
                            orgID: orgID,
                            userID: userID,
                            method: 'MANUAL',
                            dob: dob,
                            tags: tags,
                            ethnicity: ethnicity,
                          },
                  address:{
                    address: address.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                    city: city.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                    state: {abbrv: state, name: this.states[state]},
                    zip: zip.trim(),
                  },
                  fullAddress1: address.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
                  fullAddress2: (city + ' ' + state + ' ' + zip).toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),

                  location: {type: 'Point', coordinates: []},
                };


    this.memberService.createMember(member).subscribe(result =>{
      if(result['status']){
        this.dialogRef.close(result);
      }else{
        this.displayMessage = true;
        this.showProgressbar = false;
        this.message = 'A member with these contact details already exists within your list.';
      }
    })
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
    this.getOrgTags();
  }
}
