import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Activity } from '../../models/activities/activity.model';

import { Address} from '../../models/address/address.model'

import * as _ from 'underscore';
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';

@Injectable({
  providedIn: 'root'
})
export class TextingService {

  private API_URL = environment.API_URL;
  constructor(private http: HttpClient) {}


  allocatePhoneNumber(userID: string, activityID: string, phoneNumber: string){
    return this.http.post(this.API_URL + '/api/allocatePhoneNumber', {userID, activityID, phoneNumber})
  }

  lockNewHouseHolds(activityID: string, userID: string){
    return this.http.post(this.API_URL + '/api/lockNewHouseHolds', {activityID, userID});
  }

  loadHouseHolds(activityID: string, userID: string){
    return this.http.post(this.API_URL + '/api/loadHouseHolds', {activityID, userID});
  }

  sendInitText(resident, houseHoldRecord, tbContactRecord){
    return this.http.post(this.API_URL + '/api/sendInitText', {resident, houseHoldRecord, tbContactRecord});
  }

  sendFollowUpText(selectedTextContactRecord: unknown, textMsg: string){
    return this.http.post(this.API_URL + '/api/sendFollowUpText', {selectedTextContactRecord, textMsg})
  }

  addPushSubscriber(sub, userID: string){
    return this.http.post(this.API_URL + '/api/addPushSubscriber', {sub, userID})
  }

  getTextingReport(activityID: string, reportPickerStart: string, reportPickerEnd: string){
    return this.http.post(this.API_URL + '/api/getTextingReport', {activityID, reportPickerStart, reportPickerEnd})
  }

  submitTextNonResponse(activity: Activity, user: object, nonResponse: string, nonResponseType: string, textContactRecord, nonResponseSetID:string){
    return this.http.post(this.API_URL + '/api/submitTextNonResponse', {activity, user, nonResponse, nonResponseType, textContactRecord, nonResponseSetID})
  }

  submitTextScriptResponse(activity: Activity, user: object, idResponses: unknown, textContactRecord){
    return this.http.post(this.API_URL + '/api/submitTextScriptResponse', {activity, user, idResponses, textContactRecord})
  }

  getTextbankContactHistory(activity: unknown, userID: string, orgLevel: string){
    return this.http.post(this.API_URL + '/api/getTextbankContactHistory', {activity, userID, orgLevel})
  }

  downloadTextContactHistory(activityID){
    return this.http.post(this.API_URL + '/api/downloadTextContactHistory', {activityID})
    
  }
}
