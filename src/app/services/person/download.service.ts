import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {PersonService} from './person.service'

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  private API_URL = environment.API_URL;

  constructor(private http: HttpClient, public personService: PersonService) {}

  downloadContactHistory(){
    var orgID = sessionStorage.getItem('orgID')
    //this.downloadingContactHistory = true;

    this.personService.downloadContactHistory(orgID).subscribe((contactHistory: []) =>{
      console.log(contactHistory)

      var campaignArray = {3: "Census 2020", 7:"RivCountyCensus2020",8: "SBCountyCensus2020"}

      var data = "firstName,middleName,lastName,phones,emails,address,city,zip,pmc_text,pmc_phone,pmc_email,membership,script,question,response,date,campaignName\n"
      for(var i = 0; i < contactHistory.length; i++){
        for(var j = 0; j < contactHistory[i]['phonebankContactHistory']['length']; j++){
          for(var k = 0; k < contactHistory[i]['phonebankContactHistory'][j]['idHistory']['length']; k++){
            for(var l = 0; l < contactHistory[i]['phonebankContactHistory'][j]['idHistory'][k]['idResponses']['length']; l++){
              data = this.constructRecord(data, contactHistory[i])
              //data = data + this.scriptsArray[contactHistory[i]['phonebankContactHistory'][j]['idHistory'][k]['scriptID']] + ','
              data = data + contactHistory[i]['phonebankContactHistory'][j]['idHistory'][k]['idResponses'][l]['question'] + ','
              data = data + contactHistory[i]['phonebankContactHistory'][j]['idHistory'][k]['idResponses'][l]['responses'] + ','
              data = data + contactHistory[i]['phonebankContactHistory'][j]['idHistory'][k]['date'] + ','
              data = data + campaignArray[contactHistory[i]['phonebankContactHistory'][j]['campaignID']] + '\n'
            }
          }
        }

        for(var j = 0; j < contactHistory[i]['petitionContactHistory']['length']; j++){
          for(var k = 0; k < contactHistory[i]['petitionContactHistory'][j]['idHistory']['length']; k++){
            for(var l = 0; l < contactHistory[i]['petitionContactHistory'][j]['idHistory'][k]['idResponses']['length']; l++){
              data = this.constructRecord(data, contactHistory[i])
              //data = data + this.scriptsArray[contactHistory[i]['petitionContactHistory'][j]['idHistory'][k]['scriptID']] + ','
              data = data + contactHistory[i]['petitionContactHistory'][j]['idHistory'][k]['idResponses'][l]['question'] + ','
              data = data + contactHistory[i]['petitionContactHistory'][j]['idHistory'][k]['idResponses'][l]['responses'] + ','
              data = data + contactHistory[i]['petitionContactHistory'][j]['idHistory'][k]['date'] + ','
              data = data + campaignArray[contactHistory[i]['petitionContactHistory'][j]['campaignID']] + '\n'
            }
          }
        }

        for(var j = 0; j < contactHistory[i]['canvassContactHistory']['length']; j++){
          for(var k = 0; k < contactHistory[i]['canvassContactHistory'][j]['idHistory']['length']; k++){
            for(var l = 0; l < contactHistory[i]['canvassContactHistory'][j]['idHistory'][k]['idResponses']['length']; l++){
              data = this.constructRecord(data, contactHistory[i])
              //data = data + this.scriptsArray[contactHistory[i]['canvassContactHistory'][j]['idHistory'][k]['scriptID']] + ','
              data = data + contactHistory[i]['canvassContactHistory'][j]['idHistory'][k]['idResponses'][l]['question'] + ','
              data = data + contactHistory[i]['canvassContactHistory'][j]['idHistory'][k]['idResponses'][l]['responses'] + ','
              data = data + contactHistory[i]['canvassContactHistory'][j]['idHistory'][k]['date'] + ','
              data = data + campaignArray[contactHistory[i]['canvassContactHistory'][j]['campaignID']] + '\n'
            }
          }
        }

        for(var j = 0; j < contactHistory[i]['textContactHistory']['length']; j++){
          for(var k = 0; k < contactHistory[i]['textContactHistory'][j]['idHistory']['length']; k++){
            for(var l = 0; l < contactHistory[i]['textContactHistory'][j]['idHistory'][k]['idResponses']['length']; l++){
              data = this.constructRecord(data, contactHistory[i])
              //data = data + this.scriptsArray[contactHistory[i]['textContactHistory'][j]['idHistory'][k]['scriptID']] + ','
              data = data + contactHistory[i]['textContactHistory'][j]['idHistory'][k]['idResponses'][l]['question'] + ','
              data = data + contactHistory[i]['textContactHistory'][j]['idHistory'][k]['idResponses'][l]['responses'] + ','
              data = data + contactHistory[i]['textContactHistory'][j]['idHistory'][k]['date'] + ','
              data = data + campaignArray[contactHistory[i]['textContactHistory'][j]['campaignID']] + '\n'
            }
          }
        }
      }

      const blob = new Blob([data], {type: 'text/csv' });
      const url= window.URL.createObjectURL(blob);
         
      window.open(url);
      //this.downloadingContactHistory = false

    })
  }

  constructRecord(data, contactHistory){

    var orgID = sessionStorage.getItem("orgID")
    var address = ""

    if(contactHistory['address']){
      if(contactHistory['address']['streetNum']){address = address + contactHistory['address']['streetNum'] + " "}
      if(contactHistory['address']['prefix']){address = address + contactHistory['address']['prefix'] + " "}
      if(contactHistory['address']['street']){address = address + contactHistory['address']['street'] + " "}
      if(contactHistory['address']['suffix']){address = address + contactHistory['address']['suffix']}
      if(contactHistory['address']['unit']){address = address + " " + contactHistory['address']['unit']}
    }

    if(contactHistory['firstName']){data = data + contactHistory['firstName']}
    data = data + ","
    if(contactHistory['middleName']){data = data + contactHistory['middleName']}
    data = data + ","
    if(contactHistory['lastName']){data = data + contactHistory['lastName']}
    data = data + ","
    if(contactHistory['phones']){
      var phone = ""
      phone = contactHistory['phones']
      var newPhone = phone.toString().replace(/\-/g,'').replace(/\(/g,'').replace(/\)/g,'')
      data = data + newPhone
  
    }
    data = data + ","
    if(contactHistory['emails']){data = data + contactHistory['emails']}
    data = data + "," + address +  ","
    if(contactHistory['address']){
      if(contactHistory['address']['city']){data = data + contactHistory['address']['city']}
    }
    data = data + ","
    if(contactHistory['address']){
      if(contactHistory['address']['zip']){data = data + contactHistory['address']['zip']}
    }
    data = data + ","
    if(contactHistory['preferredMethodContact']){

      var contactArray = []
      contactArray = contactHistory['preferredMethodContact']
      contactArray = contactArray.map(x => {return x.method})

      if(contactArray.includes('TEXT')){data = data + "Y,"}
      else{data = data + "Y,"}
      if(contactArray.includes('PHONE')){data = data + "Y,"}
      else{data = data + "N,"}
      if(contactArray.includes('EMAIL')){data = data + "Y"}
      else{data = data + "N"}        
    }
    data = data + ","
    if(contactHistory['membership']){
      var orgIDs = contactHistory['membership'].map(x=> {return x.orgID})
      if(orgIDs.includes(orgID)){
        data = data + "Y"
      }else{
        data = data + "N"
      }
      
    }
    data = data + ","

    return data

  }


}
