import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {

  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) { }

  createActivity(activityDetail: Object){
    return this.http.post(this.API_URL + '/api/createActivity', activityDetail);
  }

  getActivities(campaignID: number, orgID: string, activityType: string){
    return this.http.post(this.API_URL + '/api/getActivities', {campaignID: campaignID, orgIDs: orgID, activityType: activityType});
  }

  editActivity(activityID: string, newActivityDetail: Object){
    return this.http.post(this.API_URL + '/api/editActivity', {activityID, newActivityDetail});
  }

  deleteActivity(activityID: string, activityType: string){
    return this.http.post(this.API_URL + '/api/deleteActivity', {activityID, activityType});
  }

  toggleActiveActivity(activityID: string){
    return this.http.post(this.API_URL + '/api/toggleActiveActivity', {activityID});
  }

  getActivity(activityID: string){
    return this.http.post(this.API_URL + '/api/getActivity', {activityID})
  }

  getActivitySize(activityID: string){
    return this.http.post(this.API_URL + '/api/getActivitySize', {activityID})
  }

  getPhonebankActivity(activityID: string, userID: string){
    return this.http.post(this.API_URL + '/api/getPhonebankActivity', {activityID, userID})
  }

  getTextbankActivity(activityID: string, userID: string){
    return this.http.post(this.API_URL + '/api/getTextbankActivity', {activityID, userID})
  }

  saveActivityEdits(activityID: string, edits: unknown){
    return this.http.post(this.API_URL + '/api/saveActivityEdits', {activityID, edits})
  }

  resetActivity(activityID: string){
    return this.http.post(this.API_URL + '/api/resetActivity', {activityID})
  }

}
