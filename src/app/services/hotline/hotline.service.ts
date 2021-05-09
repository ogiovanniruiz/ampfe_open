import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HotlineService {
  private API_URL = environment.API_URL;
  constructor(private http: HttpClient) { }

  getUsedHotlineNumbers(){
    return this.http.post(this.API_URL + '/api/getUsedHotlineNumbers', {});
  }

  submitHotlineResponse(hotlineResponse){
    return this.http.post(this.API_URL + '/api/submitHotlineResponse', hotlineResponse);
  }

  getIncomingTwilioToken(orgID: string, campaignID: number, phonenumber: string, userID: string, activityID: string){
    return this.http.post(this.API_URL + '/api/getIncomingTwilioToken', {orgID, campaignID, phonenumber, userID, activityID})
  }

  redirectCall(callSid: string, orgID: string, redirectPhoneNum: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/redirectCall', {callSid, orgID, redirectPhoneNum, campaignID})
  }

  downloadHotlineContactHistory(activityID: string){
    return this.http.post(this.API_URL + '/api/downloadHotlineContactHistory', {activityID})
  }

  addUserIDtoHotline(activityID: string, userID: string){
    return this.http.post(this.API_URL + '/api/addUserIDtoHotline', {activityID, userID})
  }
}