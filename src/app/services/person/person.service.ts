import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonService {

  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) {}

  getPerson(person: Object){
    return this.http.post(this.API_URL + '/api/getPerson', person);
  }

  getHouseHold(address: Object){
    return this.http.post(this.API_URL + '/person/getHouseHold', address);
  }

  editPerson(person: Object, newDetail: Object){
    return this.http.post(this.API_URL + '/person/editPerson', {person: person, newDetail: newDetail});
  }

  createPerson(){
    return this.http.post(this.API_URL + '/person/createPerson', {})
  }

  idPerson(person: Object, idResponses: any[], campaignID: Number, activityID: String, activityType: String, script: Object, userID: String, orgID: String){
    return this.http.post(this.API_URL + '/person/idPerson', {person, idResponses, campaignID, activityID, activityType,script, userID, orgID})
  }

  finishIdentification(person: Object, activityID: String, activityType: String){
    return this.http.post(this.API_URL + '/person/finishIdentification', {person: person, activityID: activityID, activityType:  activityType})
  }




  runMatch(formData){
    return this.http.post(this.API_URL + '/person/runMatch', formData)
  }

  assignPreferredMethodOfContact(person: Object, method: [], orgID: string, activityID: string){
    return this.http.post(this.API_URL + '/person/assignPreferredMethodOfContact', {person: person, preferredMethodOfContact: method, orgID: orgID, activityID: activityID})
  }

  assignTags(person: Object, tags: any, orgID: string){
    return this.http.post(this.API_URL + '/person/assignTags', {person: person, tags: tags, orgID: orgID})
  }

  downloadContactHistory(orgID: String){
    return this.http.post(this.API_URL + '/person/downloadContactHistory', {orgID: orgID})

  }

  //downloadAllContactData(campaignID: Number){
   // return this.http.post(this.API_URL + '/person/downloadAllContactData', {campaignID})
  //}

}
