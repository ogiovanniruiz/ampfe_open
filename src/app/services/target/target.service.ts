import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { popup } from 'leaflet';


@Injectable({
  providedIn: 'root'
})
export class TargetService {
  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) {}

  createTarget(target: Object){
    return this.http.post(this.API_URL + '/api/createTarget', target)
  }

  getEstimate(estimate: Object){
    return this.http.post(this.API_URL + '/api/getEstimate', estimate);
  }

  getCampaignWideTargets(campaignID: number){
    return this.http.post(this.API_URL + '/api/getCampaignWideTargets', {campaignID});
  }

  getOrgTargets(campaignID: number, orgID: string){
    return this.http.post(this.API_URL + '/api/getOrgTargets', {campaignID, orgID});
  }

  getTarget(_id: string){
    return this.http.post(this.API_URL + '/api/getTarget', {_id});
  }

  getAllCampaignTargets(campaignID: number){
    return this.http.post(this.API_URL + '/api/getAllCampaignTargets', {campaignID});
  }

  removeTarget(_id: String){
    return this.http.post(this.API_URL + '/api/removeTarget', {_id});
  }

  downloadTargetList(potentialActivity){
    return this.http.post(this.API_URL + '/api/downloadTargetList', potentialActivity);
  }
}
