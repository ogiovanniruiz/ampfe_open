import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as _ from 'underscore';
import { Activity } from '../models/activity.model';
import { Address, Household } from '../models/person.model';


@Injectable({
  providedIn: 'root'
})
export class PhonebankService {

  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) {}

  lockHousehold(activityID: String, userID: String){
    return this.http.post(this.API_URL + '/api/lockHousehold', {activityID, userID: userID});
  }

  getTwilioToken(orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/getTwilioToken', {orgID, campaignID})
  }

  downloadPhonebankContactHistory(activityID: string){
    return this.http.post(this.API_URL + '/api/downloadPhonebankContactHistory', {activityID})
  }

  getPhonebankContactRecords(activityID: string, household:  Household,  userID: string, passes: number){
    return this.http.post(this.API_URL + '/api/getPhonebankContactRecords', {activityID, household, userID, passes})
  }

  finishCall(finishCallDetail){
    return this.http.post(this.API_URL + '/api/finishCall', finishCallDetail)
  }

  submitSurveyResponse(surveyResponseData){
    return this.http.post(this.API_URL + '/api/submitPhoneSurveyResponse', surveyResponseData)
  }

  submitNonResponse(nonResponseData){
    return this.http.post(this.API_URL + '/api/submitPhoneNonResponse', nonResponseData)
  }

  getPhonebankReport(activityID: string, reportPickerStart: string, reportPickerEnd: string){
    return this.http.post(this.API_URL + '/api/getPhonebankReport', {activityID, reportPickerStart, reportPickerEnd})
  }

  skipHouseHold(pbHHRecordID: string){
    return this.http.post(this.API_URL + '/api/skipHouseHold', {pbHHRecordID})
  }

  getOrphanedTexts(campaignID: number){
    return this.http.post(this.API_URL + '/api/getOrphanedTexts', {campaignID})

  }

  getPhonebankNotes(campaignID: number, orgID: string, household: Household){
    return this.http.post(this.API_URL + '/api/getPhonebankNotes', {campaignID, orgID, household})
  }

  patchThroughCallTwilio(call: any){
    return this.http.post(this.API_URL + '/api/patchThroughCallTwilio', call)
  }

}
