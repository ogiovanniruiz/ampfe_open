import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Group, Estimate } from 'src/app/models/group.model';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) {}

  createGroup(group: Group){
    return this.http.post(this.API_URL + '/api/createGroup', group)
  }

  editGroup(group: Group, newGroupName: string, campaignWide: boolean){
    return this.http.post(this.API_URL + '/api/editGroup', {group, newGroupName, campaignWide})
  }

  getEstimate(estimate: Estimate){
    return this.http.post(this.API_URL + '/api/getEstimate', estimate);
  }

  getOrgGroups(campaignID: number, orgID: string){
    return this.http.post(this.API_URL + '/api/getOrgGroups', {campaignID, orgID});
  }

  getAllOrgGroups(orgID: string){
    return this.http.post(this.API_URL + '/api/getAllOrgGroups', {orgID});
  }

  getGroup(_id: string){
    return this.http.post(this.API_URL + '/api/getGroup', {_id});
  }

  getAllCampaignGroups(campaignID: number){
    return this.http.post(this.API_URL + '/api/getAllCampaignGroups', {campaignID});
  }

  deleteGroup(_id: String){
    return this.http.post(this.API_URL + '/api/deleteGroup', {_id});
  }

  downloadIndividuals(potentialActivity){
    return this.http.post(this.API_URL + '/api/downloadIndividuals', potentialActivity);
  }

  downloadMailer(potentialActivity){
    return this.http.post(this.API_URL + '/api/downloadMailer', potentialActivity);
  }

  // setActive makes it idempotent; omitted, the group toggles
  archiveGroup(group: Group, setActive?: boolean){
    return this.http.post(this.API_URL + '/api/archiveGroup', {...group, setActive});
  }

  exportEmailPhoneList(group: Group, fields: any){
    return this.http.post(this.API_URL + '/api/exportEmailPhoneList', {group, fields});
  }

  getGroupByPrecinct(group: Group){
    return this.http.post(this.API_URL + '/api/getGroupByPrecinct', group);
  }

  clearGroupByPrecinct(group: Group){
    return this.http.post(this.API_URL + '/api/clearGroupByPrecinct', group);
  }

  getGeneratedGroupByPrecinctTables(campaignID: number){
    return this.http.post(this.API_URL + '/api/getGeneratedGroupByPrecinctTables', {campaignID});
  }
  
}
