import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Activity } from 'src/app/models/activity.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {

  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) { }

  //removeNumber(number: Object, activityID: string){
 //   return this.http.post(this.API_URL + '/api/removeNumber', {number, activityID});
  //}

  createActivity(activityDetail: Activity){
    return this.http.post(this.API_URL + '/api/createActivity', activityDetail);
  }

  getActivities(campaignID: number, orgID: string, activityType: string){
    return this.http.post(this.API_URL + '/api/getActivities', {campaignID: campaignID, orgIDs: orgID, activityType: activityType});
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

  saveActivityEdits(editedAcitivity: Activity){
    return this.http.post(this.API_URL + '/api/saveActivityEdits', editedAcitivity)
  }

  resetActivity(activityID: string){
    return this.http.post(this.API_URL + '/api/resetActivity', {activityID})
  }

  cloneActivity(activityID: string){
    return this.http.post(this.API_URL + '/api/cloneActivity', {activityID})
  }

  // apply false only counts; apply true removes them from this activity. Returns {jobID}
  removeAlreadyVoted(activityID: string, apply: boolean){
    return this.http.post(this.API_URL + '/api/removeAlreadyVoted', {activityID, apply})
  }

  // Progress and counts of a removeAlreadyVoted / removeAlreadyVotedFromCampaign run
  getAlreadyVotedJob(jobID: string){
    return this.http.post(this.API_URL + '/api/getAlreadyVotedJob', {jobID})
  }

  updateActivityNotes(activityID: string, notes: string){
    return this.http.post(this.API_URL + '/api/updateActivityNotes', {activityID, notes})
  } 

  getGroupActivities(groupID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/getGroupActivities', {groupID, campaignID})
  } 

  updateActivityCompletionStatus(activityID: string){
    return this.http.post(this.API_URL + '/api/updateActivityCompletionStatus', {activityID}) 
  }

}