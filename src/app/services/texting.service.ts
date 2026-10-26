import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Activity} from '../models/activity.model';
import {  ActivityContactRecord, NonResponse, SurveyResponse } from '../models/contact.record.model';


@Injectable({
  providedIn: 'root'
})
export class TextingService {

  private API_URL = environment.API_URL;
  constructor(private http: HttpClient) {}

  lockNewHouseHolds(activityID: string, userID: string){
    return this.http.post(this.API_URL + '/api/lockNewHouseHolds', {activityID, userID});
  }

  loadHouseHolds(activityID: string, userID: string){
    return this.http.post(this.API_URL + '/api/loadHouseHolds', {activityID, userID});
  }

  // Stores the image on our server and returns {success, url, msg}; the url goes in imageUrl
  uploadTextImage(formData: FormData){
    return this.http.post(this.API_URL + '/api/uploadTextImage', formData);
  }

  sendInitText(tbContactRecord: ActivityContactRecord){
    return this.http.post(this.API_URL + '/api/sendInitText', tbContactRecord);
  }

  sendFollowUpText(selectedTextContactRecord: ActivityContactRecord, textMsg: string){
    return this.http.post(this.API_URL + '/api/sendFollowUpText', {selectedTextContactRecord, textMsg})
  }

  addPushSubscriber(sub, userID: string){
    return this.http.post(this.API_URL + '/api/addPushSubscriber', {sub, userID})
  }

  getTextingReport(activityID: string, reportPickerStart: string, reportPickerEnd: string){
    return this.http.post(this.API_URL + '/api/getTextingReport', {activityID, reportPickerStart, reportPickerEnd})
  }

  submitTextNonResponse(activity: Activity, nonResponseObject: NonResponse, textContactRecord: ActivityContactRecord){
    return this.http.post(this.API_URL + '/api/submitTextNonResponse', {activity, nonResponseObject, textContactRecord})
  }

  submitTextSurveyResponse(activity: Activity, surveyResponse: SurveyResponse, textContactRecord: ActivityContactRecord){
    return this.http.post(this.API_URL + '/api/submitTextSurveyResponse', {activity, surveyResponse, textContactRecord})
  }

  // pass limits "sent" to the current pass of a reset textbank
  getTextbankContactHistory(activityID: string, userID: string, orgLevel: string, pass?: number){
    return this.http.post(this.API_URL + '/api/getTextbankContactHistory', {activityID, userID, orgLevel, pass})
  }

  getPhonebankTextResponses(activityID: string){
    return this.http.post(this.API_URL + '/api/getPhonebankTextResponses', {activityID})
  }

  sendTestText(testData: any){
    return this.http.post(this.API_URL + '/api/sendTestText', testData)
  }

  sendSingularText(tbContactRecord: ActivityContactRecord){
    return this.http.post(this.API_URL + '/api/sendSingularText', tbContactRecord);
  }

  getAvailableTextingNumbers(textCampaignID: string, campaignID: number, orgID: string) {
    return this.http.post(this.API_URL + '/api/getAvailableTextingNumbers', {textCampaignID, campaignID, orgID});
  }

  getTextingTemplates(campaignID: number){
    return this.http.post(this.API_URL + '/api/getTextingTemplates', {campaignID});
  }

  deleteTextingTemplate(campaignID: number, templateID: string){
    return this.http.post(this.API_URL + '/api/deleteTextingTemplate', {campaignID, templateID});
  }

  createTextingTemplate(templateData: any){
    return this.http.post(this.API_URL + '/api/createTextingTemplate', templateData);
  }

  editTextingTemplate(templateData: any){
    return this.http.post(this.API_URL + '/api/editTextingTemplate', templateData);
  }
}
