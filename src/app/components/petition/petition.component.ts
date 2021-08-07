import { Component, OnInit, ViewChildren, QueryList, ViewChild, ElementRef, ComponentFactoryResolver } from '@angular/core';
import {ActivityService} from '../../services/activity/activity.service'
import {ScriptService} from '../../services/script/script.service'
import {PersonService} from '../../services/person/person.service'
import {FormControl} from '@angular/forms';
import {PetitionService} from '../../services/petition/petition.service'
import {OrganizationService} from '../../services/organization/organization.service'
import { DomSanitizer } from '@angular/platform-browser';


@Component({
  selector: 'app-petition',
  templateUrl: './petition.component.html',
  styleUrls: ['./petition.component.scss']
})
export class PetitionComponent implements OnInit {

  constructor(
              private sanitizer: DomSanitizer,
              private activityService: ActivityService, 
              public scriptService: ScriptService, 
              public personService: PersonService,
              public petitionService: PetitionService,
              public orgService: OrganizationService,
     
              ) {}

  activity: Object;
  scriptIDs = []
  script
  counties = ['SAN BERNARDINO', 'RIVERSIDE']
  countySelected = [];
  showExisting = false;
  preExistingPeople = []
  preferredMethodOfContact = new FormControl();
  selectedTags = new FormControl()
  showError = false;
  showNameError = false;
  tags = []
  numSub: Number
  dataLoaded = false;
  petitionName: string;
  file: any;
  image: any;
  loggedIn = false;
  displayMessage: boolean = false;
  message: string;

  @ViewChildren('radioAnswers') radioAnswers:QueryList<any>;
  @ViewChildren('textAnswers') textAnswers:QueryList<any>;
  @ViewChild('firstName', {static: false}) firstName: ElementRef
  @ViewChild('middleName', {static: false}) middleName: ElementRef
  @ViewChild('lastName', {static: false}) lastName: ElementRef
  @ViewChild('phone', {static: false}) phone: ElementRef
  @ViewChild('email', {static: false}) email: ElementRef
  @ViewChild('address', {static: false}) address: ElementRef
  @ViewChild('unit', {static: false}) unit: ElementRef
  @ViewChild('city', {static: false}) city: ElementRef
  @ViewChild('county', {static: false}) county: ElementRef
  @ViewChild('zip', {static: false}) zip: ElementRef
  @ViewChild("dob", {static: false}) dob: ElementRef;
  @ViewChild("state", {static: true}) state: ElementRef;



  getActivity(){
    var activityID = sessionStorage.getItem('activityID')

    this.activityService.getActivity(activityID).subscribe(activity =>{
      this.activity = activity
      var scriptID = this.activity['scriptID']
      this.petitionName = this.activity['name']
      this.getScript(scriptID)
    })
  }

  getScript(scriptID: string){
    this.scriptService.getScript(scriptID).subscribe((script: unknown) =>{
      this.script = script;
      this.dataLoaded = true;
    })
  }

  submitPetition(){

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

    var idResponses = this.generateIdResponses(this.script);
    var activityID: string = sessionStorage.getItem('activityID')
    var orgID: string = sessionStorage.getItem('orgID')

    var userID:string = 'URL';

    if(JSON.parse(sessionStorage.getItem('user'))){
      userID =  JSON.parse(sessionStorage.getItem('user'))._id;
    }

    var person = {
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
              },
      address:{
        address: address.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
        city: city.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
        //state: {abbrv: state, name: this.states[state]},
        zip: zip.trim(),
      },
      fullAddress1: address.toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),
      fullAddress2: (city + ' ' + state + ' ' + zip).toUpperCase().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gmi, ''),

      location: {type: 'Point', coordinates: []},
    };

    var petition = {
      person: person,
      activityID: this.activity['_id'],
      campaignID: this.activity['campaignID'],
      scriptID: this.activity['scriptID'],
      userID: userID,
      orgIDs: this.activity['orgIDs'],
      orgID: orgID,
      scriptResponse: {contactedBy: userID, questionResponses: idResponses}
    }

    this.petitionService.submitPetition(petition).subscribe(
      result =>{
        console.log(result)
        //this.clear()
      },
      error =>{
        console.log(error)
      }
    )
  }

  storeCounty(county){
    this.petitionService.storeCounty(county)
  }

  getCounty(){
    this.petitionService.getCounty().subscribe((county: any)=>{
      if(county != ''){
         this.countySelected = county
      }
    })
  }

  generateIdResponses(script): any[]{
    var idResponses = [];
    
    var questions = script['questions'].map(x => {return x.question})

    this.radioAnswers.forEach(div => {
      var question = div.name;
      var answer = div.viewModel;
      
      if(answer && questions.includes(question)){
        var responses = answer.split(",")[0]
        var idType = answer.split(',')[1]
        var response = {question: question, responses: responses, idType: idType}
        idResponses.push(response);
      }
    });

    this.textAnswers.forEach(div => {
      var question = div.nativeElement.name;
      var answer = div.nativeElement.value;

      if(answer && questions.includes(question)){
        var response = {question: question, responses: answer, idType: "NONE"}
        idResponses.push(response);
      }
    });

    return idResponses

  }

  clear(){
    location.reload();
  }

  getOrgLogo(){
    var orgID = sessionStorage.getItem('orgID')
    this.orgService.getOrgLogo(orgID).subscribe((data: any)=>{

      if(data){
        var JSONdata = JSON.parse(data)

        let TYPED_ARRAY = new Uint8Array(JSONdata.image.data);
        const STRING_CHAR = String.fromCharCode.apply(null, TYPED_ARRAY);
        let base64String = btoa(STRING_CHAR);
        this.image = this.sanitizer.bypassSecurityTrustUrl('data:image/jpg;base64, ' + base64String);
      }
    })
  }

  ngOnInit() {

    if(sessionStorage.getItem('userProfile')){
      this.loggedIn = true;
    }

    this.getActivity();
    this.getCounty();
    this.getOrgLogo();
  }

}
