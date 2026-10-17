import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TwilioNumber } from '../models/organization.model';

@Injectable({
  providedIn: 'root'
})
export class TwilioService {

    private API_URL = environment.API_URL;
    constructor(private http: HttpClient) {}

    createTwilioSubAccount(orgID: string){
        return this.http.post(this.API_URL + '/api/createTwilioAccount', {orgID})
    }

    updateTwilioAccount(orgID: string){
        return this.http.post(this.API_URL + '/api/updateTwilioAccount', {orgID})
    }

    getTwilioPhonenumbers(orgID: string){
        return this.http.post(this.API_URL + '/api/getOrgPhoneNumbers', {orgID});
    }

    checkTwilioAccount(orgID: string){
        return this.http.post(this.API_URL + '/api/checkTwilioAccount', {orgID});
    }

    buyPhoneNumber(orgID: string, areaCode: string){
        return this.http.post(this.API_URL + '/api/buyPhoneNumber', {orgID, areaCode});
    }

    releaseTwilioPhonenumber(phoneNumber: TwilioNumber, orgID: string){
        return this.http.post(this.API_URL + '/api/releasePhoneNumber', {phoneNumber, orgID})
    }

    updateTwilioCallPool(orgID: string, campaignID, activityID?: string){
        return this.http.post(this.API_URL + '/api/updateCallPool', {orgID, campaignID, activityID})
    }

    getTwilioUsageSummary(orgID: string, startDate: string, endDate: string){
        return this.http.post(this.API_URL + '/api/getTwilioUsageSummary', {orgID, startDate, endDate})
    }

    getTwilioCallPool(orgID: string){
        return this.http.post(this.API_URL + '/api/getTwilioCallPool', {orgID});
    }

    releaseAllTwilioPhonenumbers(orgID: string, twilioNumbers: TwilioNumber[]){
        return this.http.post(this.API_URL + '/api/releaseAllTwilioPhonenumbers', {orgID, twilioNumbers});
    }

    // Frees every reserved number in the org's calling pool
    forceHangUpAllTwilioPhonenumbers(orgID: string){
        return this.http.post(this.API_URL + '/api/forceHangUpAllTwilioPhonenumbers', {orgID});
    }

    forceHangUpTwilioPhonenumber(orgID: string, phoneNumber: string){
        return this.http.post(this.API_URL + '/api/forceHangUpTwilioPhonenumber', {orgID, phoneNumber});
    }

    trustHubChecks(orgID: string){
        return this.http.post(this.API_URL + '/api/trustHubChecks', {orgID});
    }   

}