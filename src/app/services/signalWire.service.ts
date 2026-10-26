import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { StorageMap } from '@ngx-pwa/local-storage';
import { PhonebankContactDetails } from '../models/contact.record.model';


@Injectable({
  providedIn: 'root'
})

export class SignalWireService {
    private API_URL = environment.API_URL;
    constructor(private http: HttpClient, private storage: StorageMap) {}
    getOrgBrand(orgID: string){
        return this.http.post(this.API_URL + '/api/getOrgBrand', {orgID})
      }

    getOrgSWCampaigns(orgID: string, campaignID: number, includeInactive: boolean = false){
      return this.http.post(this.API_URL + '/api/getOrgSWCampaigns', {orgID, campaignID, includeInactive})
    }

    getSWCampaignPhonenumbers(textCampaignID: string, campaignID: number, orgID: string){
      return this.http.post(this.API_URL + '/api/getSWCampaignPhonenumbers', {textCampaignID, campaignID, orgID})
    }

    releaseSWPhonenumber(phonenumberID: string, orgID: string, phonenumber: string){
      return this.http.post(this.API_URL + '/api/releaseSWPhonenumber', {phonenumberID, orgID, phonenumber})
    }

    buySWPhonenumber(areacode: string, textCampaignID: string, orgID: string){
      return this.http.post(this.API_URL + '/api/buySWPhonenumber', {areacode, textCampaignID, orgID})
    }

    buySWCallingPhonenumber(areacode: string, orgID: string){
      return this.http.post(this.API_URL + '/api/buySWCallingPhonenumber', {areacode, orgID})
    }

    getSWUsageSummary(orgID: string, startDate: string, endDate: string){
      return this.http.post(this.API_URL + '/api/getSWUsageSummary', {orgID, startDate, endDate})
    }

    updateSWPhonenumber(phonenumber){
      return this.http.post(this.API_URL + '/api/updateSWPhonenumber', phonenumber)
    }

    checkSWAccount(orgID: string){
      return this.http.post(this.API_URL + '/api/checkSWAccount', {orgID})
    }

    createSWAccount(orgID: string){
      return this.http.post(this.API_URL + '/api/createSWAccount', {orgID})
    }

    getSWToken(orgID: string, campaignID: number){
      return this.http.post(this.API_URL + '/api/getSWToken', {orgID, campaignID})
    }

    updateSWCallPool(orgID: string, campaignID: number, activityID?: string){
      return this.http.post(this.API_URL + '/api/updateSWCallPool', {orgID, campaignID, activityID})
    }

    hangUpSWNumber(orgID: string, userPhoneNumber, campaignID){
      return this.http.post(this.API_URL + '/api/hangUpSWNumber', {orgID, userPhoneNumber, campaignID})
    }

    swCall(phonebankContactDetails: PhonebankContactDetails){
      return this.http.post(this.API_URL + '/api/swCall', phonebankContactDetails)
    }

    swCallStatus(callDetails){
      return this.http.post(this.API_URL + '/api/swCallStatus', callDetails)
    }

    getAllSWPhonenumbers(orgID: string){
      return this.http.post(this.API_URL + '/api/getAllSWPhonenumbers', {orgID})
    }

    assignSWCampaign(textingCampaign, phonenumber, orgID){
      return this.http.post(this.API_URL + '/api/assignSWCampaign', {textingCampaign, phonenumber, orgID})
    }

    removeSWCampaignAssignment(assignmentID: string, orgID: string){
      return this.http.post(this.API_URL + '/api/removeSWCampaignAssignment', {assignmentID, orgID})
    }

    patchThroughCall(call: any){
      return this.http.post(this.API_URL + '/api/patchThroughCall', call)
    }

    getSWCallPool(orgID: string){
      return this.http.post(this.API_URL + '/api/getSWCallPool', {orgID})
    } 

    forceHangUpSWPhonenumber(orgID: string, phoneNumber: string){
      return this.http.post(this.API_URL + '/api/forceHangUpSWPhonenumber', {orgID, phoneNumber})
    }

}