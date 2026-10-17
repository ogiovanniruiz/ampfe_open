import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit, ViewChild, ElementRef, Inject, ViewChildren, QueryList, ChangeDetectionStrategy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {UserService} from '../../../../services/user.service'
import {OrganizationService} from '../../../../services/organization/organization.service'
import {MembershipService} from '../../../../services/membership.service'

import { Address, FlatPerson, MemberHistory, Membership, Name, Phone, Resident } from 'src/app/models/person.model';
import { hasEmailConsent, hasTextingConsent, withoutConsentTags } from 'src/app/utils/consent';
import { asMemberTags } from 'src/app/utils/memberTags';
import { TagDefinition } from 'src/app/models/organization.model';
import { MemberTag } from 'src/app/models/person.model';
import { confirmAction } from '../../../../dialogs/confirmDialog/confirmDialog';


@Component({
  templateUrl: './editMemberDialog.html',
  styleUrls: ['../../membership.component.scss', './editMemberDialog.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})

export class EditMemberDialog implements OnInit{

  @ViewChild("firstName", {static: true}) firstName: ElementRef;
  @ViewChild("middleName", {static: true}) middleName: ElementRef;
  @ViewChild("lastName",{static: true}) lastName: ElementRef;
  @ViewChild("phone", {static: true}) phone: ElementRef;
  @ViewChild("email", {static: true}) email: ElementRef;
  @ViewChild("address", {static: true}) address: ElementRef;
  @ViewChild("unit", {static: true}) unit: ElementRef;
  @ViewChild("city", {static: true}) city: ElementRef;
  @ViewChild("county", {static: true}) county: ElementRef;
  @ViewChild("state", {static: true}) state: ElementRef;
  @ViewChild("zip", {static: true}) zip: ElementRef;

  personExists: boolean = false;
  tags: string[] = [];
  tagDefinitions: TagDefinition[] = [];
  // The member's tags as edited here (label + value)
  memberTags: MemberTag[] = [];

  // Consent switches; staff can turn consent off as well as on
  textingConsent: boolean = false;
  emailConsent: boolean = false;
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
  bosID: string;

  blockgroupID: string;
  precinctID: string;

  showProgressbar: boolean = false;

  history: MemberHistory;
  loadingHistory: boolean = false;

  //member: Membership;

  states = {/*AL: 'ALABAMA', AK: 'ALASKA', AZ: 'ARIZONA', AR: 'ARKANSAS',*/ CA: 'CALIFORNIA', /*CO: 'COLORADO', CT: 'CONNECTICUT', DE: 'DELAWARE', FL: 'FLORIDA', GA: 'GEORGIA', HI: 'HAWAII', ID: 'IDAHO', IL: 'ILLINOIS', IN: 'INDIANA', IA: 'IOWA', KS: 'KANSAS', KY: 'KENTUCKY', LA: 'LOUISIANA', ME: 'MAINE', MD: 'MARYLAND', MA: 'MASSACHUSETTS', MI: 'MICHIGAN', MN: 'MINNESOTA', MS: 'MISSISSIPPI', MO: 'MISSOURI', MT: 'MONTANA', NE: 'NEBRASKA', NV: 'NEVADA', NH: 'NEW HAMPSHIRE', NJ: 'NEW JERSEY', NM: 'NEW MEXICO', NY: 'NEW YORK', NC: 'NORTH CAROLINA', ND: 'NORTH DAKOTA', OH: 'OHIO', OK: 'OKLAHOMA', OR: 'OREGON', PA: 'PENNSYLVANIA', RI: 'RHODE ISLAND', SC: 'SOUTH CAROLINA', SD: 'SOUTH DAKOTA', TN: 'TENNESSEE', TX: 'TEXAS', UT: 'UTAH', VT: 'VERMONT', VA: 'VIRGINIA', WA: 'WASHINGTON', WV: 'WEST VIRGINIA', WI: 'WISCONSIN', WY: 'WYOMING'*/};

  constructor(public dialogRef: MatDialogRef<EditMemberDialog>,
              @Inject(MAT_DIALOG_DATA) public member: Membership,
              public userService: UserService,
              public memberService: MembershipService,
              public orgService: OrganizationService,
              private dialog: MatDialog,
              private snackBar: MatSnackBar) {
              }

  getOrgTags(){
    var orgID:string = sessionStorage.getItem('orgID');
    this.orgService.getOrgTags(orgID).subscribe((tags: string[]) => {
      this.tags = withoutConsentTags(tags);
    });
    this.orgService.getTagDefinitions(orgID).subscribe((definitions: TagDefinition[]) => {
      this.tagDefinitions = definitions || [];
    });
  }

  prefillData(){

    this.firstName.nativeElement.value = this.member.resident.name.firstName;

    if(this.member.resident.name.lastName) this.lastName.nativeElement.value = this.member.resident.name.lastName;

    if(this.member.resident.name.middleName) this.middleName.nativeElement.value = this.member.resident.name.middleName;
    if(this.member.resident.phones[0]) this.phone.nativeElement.value = this.member.resident.phones[0].number;
    if(this.member.resident.emails) this.email.nativeElement.value = this.member.resident.emails;
    if(this.member.fullAddress1) this.address.nativeElement.value = this.member.fullAddress1;
    if(this.member.address.city) this.city.nativeElement.value = this.member.address.city;
    if(this.member.address.unit) this.unit.nativeElement.value = this.member.address.unit;
    if(this.member.address.state) this.state['value'] = this.member.address.state.abbrv;
    if(this.member.address.zip) this.zip.nativeElement.value = this.member.address.zip;
    this.memberTags = asMemberTags(this.member.tags);
    this.textingConsent = hasTextingConsent(this.member);
    this.emailConsent = hasEmailConsent(this.member);

    if(this.member.location) this.lat = this.member.location.coordinates[1];
    if(this.member.location) this.lng = this.member.location.coordinates[0];

    if(this.member.districts){
      if(this.member.districts.countyID) {this.countyID = this.member.districts.countyID}

      if(this.member.districts.citywideID) {this.citywideID = this.member.districts.citywideID}
      if(this.member.districts.citywardID) {this.citywardID = this.member.districts.citywardID}
      if(this.member.districts.assemblyID) {this.assemblyID = this.member.districts.assemblyID}
      if(this.member.districts.senateID) {this.senateID = this.member.districts.senateID}
      if(this.member.districts.congressionalID) {this.congressionalID = this.member.districts.congressionalID}

      if(this.member.districts.recreationalID) {this.recreationalID = this.member.districts.recreationalID}
      if(this.member.districts.schooldistrictID) {this.schoolID = this.member.districts.schooldistrictID}
      if(this.member.districts.waterID) {this.waterID = this.member.districts.waterID}
      if(this.member.districts.bosID) {this.bosID = this.member.districts.bosID}
    }

    //if(this.member.blockgroupID) {this.blockgroupID = this.member.blockgroupID}
    //if(this.member.precinctID) {this.precinctID = this.member.precinctID}

  }

  editMember(){
    var firstName: string = this.firstName.nativeElement.value;
    var middleName: string = this.middleName.nativeElement.value;
    var lastName: string = this.lastName.nativeElement.value;

    var phone: string = this.phone.nativeElement.value;
    var email: string = this.email.nativeElement.value;
    var address: string = this.address.nativeElement.value;
    var unit: string = this.unit.nativeElement.value;
    var city: string = this.city.nativeElement.value;
    var state: string = this.state['value'];
    var zip: string = this.zip.nativeElement.value;
    var tags: MemberTag[] = this.memberTags;

    // Members who only ever had consent (once recorded as tags) can be saved without a tag
    if((!tags || tags.length === 0) && !this.textingConsent && !this.emailConsent){
      this.displayMessage = true;
      this.message = 'Member needs a tag.';
      return;
    }

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

    var memberFirstName = firstName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')
    var memberLastName = lastName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')
    var memberMiddleName = middleName.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')
    var memberFullName = memberFirstName + " " + memberMiddleName + " " + memberLastName

    var memberPhones: Phone[] = (phone ? [{type: '?', number: phone}] : [])
    var memberEmails: string[] = (email != '' ? [email.toLowerCase().trim()]: [])

    var memberCity = city.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')
    var memberZip = zip.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '') 

    var fullAddress1 =  address.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, '')                        
    var fullAddress2 = memberCity + " " + state + ", " + memberZip  
    
    var memberName: Name = {
      firstName: memberFirstName,
      middleName: memberMiddleName,
      lastName: memberLastName,
      fullName: memberFullName
    }


    var memberResidentDetails: Resident = {name: memberName, 
                                           phones: memberPhones,
                                           emails: memberEmails,
                                          }

            var memberAddress: Address = {streetNum: "", 
                                          street: "", 
                                          unit: unit, 
                                          prefix: "", 
                                          suffix: "", 
                                          city: memberCity, 
                                          zip: memberZip,  
                                          state: {name: this.states[this.state['value']], abbrv: this.state['value']}}                      
    
    var newMemberDetail = {_id: this.member._id,
                           resident: memberResidentDetails,
                           address: memberAddress,
                           fullAddress1: fullAddress1,
                           fullAddress2: fullAddress2,
                           tags: tags || [],
                           enrollment: {
                             optinTexting: {status: this.textingConsent},
                             optinEmail: {status: this.emailConsent},
                           },
                    };

    this.memberService.editMember(newMemberDetail).subscribe(
      (result: any) => {
        // e.g. a tag value the tag doesn't offer
        if(result && result.status === false){
          this.showProgressbar = false;
          this.displayMessage = true;
          this.message = result.msg || 'The member could not be saved.';
          return;
        }
        this.snackBar.open('Member saved.', 'Dismiss', {duration: 2500});
        this.dialogRef.close(result);
      },
      error => {
        console.log(error);
        this.showProgressbar = false;
        this.displayMessage = true;
        this.message = 'There was a problem with the server. Please try again.';
      }
    );
  }

  async deleteMember(){
    if((await confirmAction(this.dialog, {title: 'Delete this member?', message: "This can't be undone.", confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true}))) {
      this.memberService.deleteMember(this.member).subscribe(
        result => {
          this.snackBar.open('Member deleted.', 'Dismiss', {duration: 3000});
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

  // Where the member came from and every contact the org has logged with them
  getHistory(){
    if(!this.member?._id) return
    this.loadingHistory = true;
    this.memberService.getMemberHistory(sessionStorage.getItem('orgID'), this.member._id).subscribe(
      (history: MemberHistory) => {
        this.history = history.success ? history : undefined;
        this.loadingHistory = false;
      },
      error => {
        console.log(error)
        this.loadingHistory = false;
      }
    )
  }

  ngOnInit(){
    this.prefillData();

    this.getOrgTags();
    this.getHistory();
  }
}
