import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import * as _ from 'underscore';
import { Activity } from '../../models/activities/activity.model';

@Injectable({
  providedIn: 'root'
})
export class PhonebankService {

  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) {}

  lockHouseHold(activityID: String, userID: String){
    return this.http.post(this.API_URL + '/api/lockHouseHold', {activityID, userID: userID});
  }

  getTwilioToken(orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/getTwilioToken', {orgID, campaignID})
  }

  downloadPhonebankContactHistory(activityID: string){
    return this.http.post(this.API_URL + '/api/downloadPhonebankContactHistory', {activityID})
  }

  getPhonebankContactHistory(activityID: string, houseHold:  unknown,  userID: string, passes: number){
    return this.http.post(this.API_URL + '/api/getPhonebankContactHistory', {activityID, houseHold, userID, passes})
  }

  logCallLength(userPhoneNumber: string, orgID: string, activityID: string, passes: number, residentID: string, campaignID, userID){
    return this.http.post(this.API_URL + '/api/logCallLength', {userPhoneNumber, orgID, activityID, passes, residentID, campaignID, userID})
  }

  submitScriptResponse(activity: Activity, idResponses: unknown, personID: string, user: object, orgID: string, houseHoldID: unknown, hhSize: number){
    return this.http.post(this.API_URL + '/api/submitPhoneScriptResponse', {activity, idResponses, personID, user, orgID, houseHoldID, hhSize})
  }

  submitNonResponse(activity: Activity, nonResponse: string, nonResponseType: string, personID: string, user: object, orgID: string, houseHoldID: unknown, hhSize: number, nonResponseSetID: string){
    return this.http.post(this.API_URL + '/api/submitPhoneNonResponse', {activity, nonResponse, nonResponseType, personID, user, orgID, houseHoldID, hhSize, nonResponseSetID})
  }

  getPhonebankReport(activityID: string, reportPickerStart: string, reportPickerEnd: string){
    return this.http.post(this.API_URL + '/api/getPhonebankReport', {activityID, reportPickerStart, reportPickerEnd})
  }

  skipHouseHold(activityID: string, houseHold: unknown, idBy: string){
    return this.http.post(this.API_URL + '/api/skipHouseHold', {activityID, houseHold, idBy})
  }

}
