import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private API_URL = environment.API_URL;
  constructor(private http: HttpClient) { }

  requestOrganization(user: any, org: any){
    return this.http.post(this.API_URL + '/api/requestOrg', {user, org});
  }

  editOrganization(name: String, description: String, orgID: Object, command: String){ 
    return this.http.post(this.API_URL + '/api/editOrg', {name, description, orgID, command});
  }

  createOrganization(name: string, description: string){ 
    return this.http.post(this.API_URL + '/api/createOrg', {name, description});
  }

  getAllOrgs(){
    return this.http.post(this.API_URL + '/api/getAllOrgs', {});
  }

  getAllOrgsByIDs(orgIDs){
    return this.http.post(this.API_URL + '/api/getAllOrgsByIDs', {orgIDs});
  }

  getOrgPermissions(user: Object){
    return this.http.post(this.API_URL + '/api/getOrgPermissions', user);
  }

  getOrganization(orgID: string){
    return this.http.post(this.API_URL + '/api/getOrg', {orgID});
  }

  getOrgUsers(orgID: string){
    return this.http.post(this.API_URL + '/api/getOrgUsers', {orgID});
  }

  createTwilioSubAccount(orgID: string){
    return this.http.post(this.API_URL + '/api/createTwilioAccount', {orgID})
  }

  updateTwilioAccount(orgID: string){
    return this.http.post(this.API_URL + '/api/updateTwilioAccount', {orgID})
  }

  getOrgPhoneNumbers(orgID: string, campaignID){
    return this.http.post(this.API_URL + '/api/getOrgPhoneNumbers', {orgID, campaignID});
  }

  getOrgPhoneNumbersFilter(campaignID: number, numbers: object){
    return this.http.post(this.API_URL + '/api/getOrgPhoneNumbersFilter', {campaignID, numbers});
  }

  checkTwilioAccount(orgID: string){
    return this.http.post(this.API_URL + '/api/checkTwilioAccount', {orgID});
  }

  buyPhoneNumber(orgID: string, areaCode: string){
    return this.http.post(this.API_URL + '/api/buyPhoneNumber', {orgID, areaCode});
  }

  releasePhoneNumber(phoneNumber, orgID: string){
    return this.http.post(this.API_URL + '/api/releasePhoneNumber', {phoneNumber, orgID})
  }

  updateFundedStatus(orgID: string, status: Boolean){
    return this.http.post(this.API_URL + '/api/updateFundedStatus', {orgID, status})
  }

  updateSubscribedStatus(orgID: string, status: Boolean){
    return this.http.post(this.API_URL + '/api/updateSubscribedStatus', {orgID, status})
  }

  getFundedStatus(campaignID, orgID){
    return this.http.post(this.API_URL + '/api/getFundedStatus', {campaignID, orgID})
  }

  getOrgLogo(orgID: string){
    return this.http.post(this.API_URL + '/api/getOrgLogo', {orgID}, {responseType: 'text'})
  }

  uploadLogo(file){
    return this.http.post(this.API_URL + '/api/uploadLogo', file)
  }

  getOrgTags(orgID: string){
    return this.http.post(this.API_URL + '/api/getTags', {orgID})
  }

  createTag(orgID: string, tag: string){
    return this.http.post(this.API_URL + '/api/createTag', {orgID, tag})
  }

  deleteTag(orgID: string, tag: string){
    return this.http.post(this.API_URL + '/api/deleteTag', {orgID, tag})
  }

  getCampaignOrgs(campaignID: Number){
    return this.http.post(this.API_URL + '/api/getCampaignOrgs', {campaignID});
  }

  getCampaignUsers(campaignID: Number, orgID: string){
    return this.http.post(this.API_URL + '/api/getCampaignUsers', {campaignID, orgID});
  }

  updateCallPool(orgID: string, campaignID){
    return this.http.post(this.API_URL + '/api/updateCallPool', {orgID, campaignID})
  }

  hangUpNumber(orgID: string, userPhoneNumber, campaignID){
    return this.http.post(this.API_URL + '/api/hangUpNumber', {orgID, userPhoneNumber, campaignID})
  }

  hangUpAllNumbers(orgID: string, campaignID){
    return this.http.post(this.API_URL + '/api/hangUpAllNumbers', {orgID, campaignID})
  }

  downloadOrgContactHistory(orgID: string){
    return this.http.post(this.API_URL + '/api/downloadOrgContactHistory', {orgID})
  }
}
