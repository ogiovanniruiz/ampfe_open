import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) { }

  requestCampaign(orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/requestCampaign', {orgID, campaignID});
  }
  
  createCampaign(name: string, description: string, boundaryType: string, boundaryID: object, electionType: string, fundedByCreatorOrg: boolean, orgID: string, userID: string, geographical: boolean){
    return this.http.post(this.API_URL + '/api/createCampaign', {name, description, boundaryType, boundaryID, electionType, fundedByCreatorOrg, orgID, userID, geographical});
  }

  getCampaign(campaignID: number){
    return this.http.post(this.API_URL + '/api/getCampaign', {campaignID});
  }

  getOrgCampaigns(orgID: string){
    return this.http.post(this.API_URL + '/api/getOrgCampaigns', {orgID});
  }

  getDistricts(state: string, districtType: string){
    return this.http.post(this.API_URL + '/api/getDistricts', {state, districtType});
  }

  getStatewide(state: string){
    return this.http.post(this.API_URL + '/api/getStatewide', {state});
  }

  getCampaignRequests(campaignID: number){
    return this.http.post(this.API_URL + '/api/getCampaignRequests', {campaignID});
  }

  manageCampaignRequest(campaignID: number, orgID: string, action: string){
    return this.http.post(this.API_URL + '/api/manageCampaignRequest', {campaignID, orgID, action});
  }

  removeOrg(campaignID: number, orgID: string){
    return this.http.post(this.API_URL + '/api/removeOrg', {campaignID, orgID});
  }

  getCampaignBoundery(campaignID: number){
    return this.http.post(this.API_URL + '/api/getCampaignBoundary', {campaignID});
  }

  editCampaign(name: string, description: string, editData: object, campaignID: number, command: string){
    return this.http.post(this.API_URL + '/api/editCampaign', {name, description, editData, campaignID, command});
  }

  wipeReport(campaignID: number){
    return this.http.post(this.API_URL + '/api/wipeReport', {campaignID});
  }

  deleteCampaign(campaignID: number, orgIDs: object){
    return this.http.post(this.API_URL + '/api/deleteCampaign', {campaignID, orgIDs});
  }

  downloadCampaignContactHistory(campaignID: number){
    return this.http.post(this.API_URL + '/api/downloadCampaignContactHistory', {campaignID});
  }


  uploadContactList(formData){
    return this.http.post(this.API_URL + '/api/uploadContactList', formData);
  }

}
