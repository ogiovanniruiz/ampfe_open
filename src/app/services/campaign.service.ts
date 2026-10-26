import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) { }

  requestCampaign(orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/requestCampaign', {orgID, campaignID});
  }
  
  createCampaign(campaignDetail: Object){
    return this.http.post(this.API_URL + '/api/createCampaign', campaignDetail);
  }

  getCampaign(campaignID: number){
    return this.http.post(this.API_URL + '/api/getCampaign', {campaignID});
  }

  getOrgCampaigns(orgID: string){
    return this.http.post(this.API_URL + '/api/getOrgCampaigns', {orgID});
  }

  getDistrictProperties(state: string, districtType: string){
    return this.http.post(this.API_URL + '/api/getDistricts', {state, districtType});
  }

  // Admins and owners of the campaign's organizations (who can be data managers)
  getCampaignPermissionUsers(campaignID: number){
    return this.http.post(this.API_URL + '/api/getCampaignPermissionUsers', {campaignID})
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

  getCampaignBoundary(campaignID: number){
    return this.http.post(this.API_URL + '/api/getCampaignBoundary', {campaignID});
  }

  editCampaign(name: string, description: string, editData: object, campaignID: number, command: string){
    return this.http.post(this.API_URL + '/api/editCampaign', {name, description, editData, campaignID, command});
  }

  deleteCampaign(campaignID: number, orgIDs: object){
    return this.http.post(this.API_URL + '/api/deleteCampaign', {campaignID, orgIDs});
  }

  uploadContactList(formData){
    return this.http.post(this.API_URL + '/api/uploadContactList', formData);
  }

  getCampaignHouseholds(bounds: Object){
    return this.http.post(this.API_URL + '/api/getCampaignHouseholds', bounds);
  }

  toggleAllOrgPolygons(campaignID: Number, value: boolean){
    return this.http.post(this.API_URL + '/api/toggleAllOrgPolygons', {campaignID, value});
  }

  districtTypes = [
    {"name": "Schooldistrict", "label": "School District"},
    {"name": "Schooldistrictarea", "label": "School District Area"},
    {"name": "County", "label": "County"},
    {"name": "Bos", "label": "Board Of Supervisors"},
    {"name": "Citywide", "label": "Full City"},
    {"name": "Cityward", "label": "City Ward"},
    {"name": "Assembly", "label": "Assembly"},
    //{"name": "Congressional", "label": "Congressional"},
    {"name": "New_Congressional", "label": "New Congressional"},
    {"name": "Board Of Equalization", "label": "Board Of Equalization"},
    {"name": "Senate", "label": "Senate"},
    {"name": "Recreational", "label": "Recreational"},
    {"name": "Water", "label": "Water"},
    {"name": "Statewide", "label": "Statewide"},
    {"name": "Boe", "label": "Board of Education"}
  ]

  getDistrictTypes() {
    return this.districtTypes;
  }

  updateCampaignDefaultGroup(campaignID: number, groupID: string){
    return this.http.post(this.API_URL + '/api/updateCampaignDefaultGroup', {campaignID, groupID});
  }

  // apply false only counts; apply true removes them from every active activity. Returns {jobID}
  removeAlreadyVoted(campaignID: number, apply: boolean){
    return this.http.post(this.API_URL + '/api/removeAlreadyVotedFromCampaign', {campaignID, apply});
  }

}
