import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private API_URL = environment.API_URL;
  constructor(private http: HttpClient) { }

  sendEmail(subject: String, message:String, userProfile: Object, orgID: String, activityID: String, campaignID: Number, isBug: Boolean, houseHold: Object){
    return this.http.post<any>(this.API_URL + '/contact/sendEmail', {subject: subject, message: message, userProfile: userProfile, orgID: orgID, activityID: activityID, campaignID: campaignID, isBug: isBug, houseHold: houseHold});
  }
}
