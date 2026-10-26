import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Activity } from 'src/app/models/activity.model';

@Injectable({
  providedIn: 'root'
})
export class ContactRecordService {

  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) { }

  getCanvassReport(activityID: string, startDate: Date, endDate: Date){
    return this.http.post(this.API_URL + '/api/getCanvassReport', {activityID, startDate, endDate})
  }

  getPhonebankReport(activityID: string, startDate: Date, endDate: Date){
    return this.http.post(this.API_URL + '/api/getPhonebankReport', {activityID, startDate, endDate})
  }

  getTextbankReport(activityID: string, startDate: Date, endDate: Date){
    return this.http.post(this.API_URL + '/api/getTextbankReport', {activityID, startDate, endDate})
  }

  getPetitionReport(activityID: string, startDate: Date, endDate: Date){
    return this.http.post(this.API_URL + '/api/getPetitionReport', {activityID, startDate, endDate})
  }

  getActivitySurveyReport(activityID: string, startDate: Date, endDate: Date, question: string){
    return this.http.post(this.API_URL + '/api/getActivitySurveyReport', {activityID, startDate, endDate, question})
  }

  getActivityNonresponseSetReport(activityID: string, startDate: Date, endDate: Date ){
    return this.http.post(this.API_URL + '/api/getActivityNonresponseSetReport', {activityID, startDate, endDate})
  }

  // Survey responses and nonresponses in an activity, 50 per page; includeUsers adds the volunteer list
  searchActivityEntries(activityID: string, filters: any, page: number, includeUsers: boolean = false){
    return this.http.post(this.API_URL + '/api/searchActivityEntries', {activityID, filters, page, includeUsers})
  }

  // Send either surveyResponse or nonResponse; the server keeps the old value in the entry's edit history
  editActivityEntry(edit: {recordID: string, activityID: string, editorID: string, surveyResponse?: any, nonResponse?: any}){
    return this.http.post(this.API_URL + '/api/editActivityEntry', edit)
  }

}