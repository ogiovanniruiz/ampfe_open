import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScriptService {
  private API_URL= environment.API_URL;

  constructor(private http: HttpClient) { }

  createScript(script: Object){
    return this.http.post(this.API_URL + '/api/createScript', script);
  }

  getAllScripts(orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/getAllScripts', {orgID: orgID, campaignID: campaignID});
  }

  getCampaignScripts(orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/getCampaignScripts', {orgID: orgID, campaignID: campaignID});
  }

  editScript(script: Object, scriptID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/editScript', {script, scriptID, campaignID});
  }

  removeScript(script: Object){
    return this.http.post(this.API_URL + '/api/removeScript', script);
  }

  archiveScript(script: Object){
    return this.http.post(this.API_URL + '/api/archiveScript', script);
  }

  createNonResponseSet(nonResponseSet: Object){
    return this.http.post(this.API_URL + '/api/createNonResponseSet', nonResponseSet);
  }

  getAllNonResponseSets(orgID: string, campaignID: Number){
    return this.http.post(this.API_URL + '/api/getAllNonResponseSets', {orgID: orgID, campaignID: campaignID});
  }

  editNonResponseSet(nonResponseSet: Object, nonResponseSetID: string, campaignID){
    return this.http.post(this.API_URL + '/api/editNonResponseSet', {nonResponseSet, nonResponseSetID, campaignID});
  }

  removeNonResponseSet(nonResponseSet: Object){
    return this.http.post(this.API_URL + '/api/removeNonResponseSet', nonResponseSet);
  }

  archiveNonResponseSet(nonResponseSet: Object){
    return this.http.post(this.API_URL + '/api/archiveNonResponseSet', nonResponseSet);
  }

  getScript(scriptID: string){
    return this.http.post(this.API_URL + '/api/getScript', {scriptID});
  }

  getNonResponseSet(nonResponseSetID: string){
    return this.http.post(this.API_URL + '/api/getNonResponseSet', {nonResponseSetID});
  }


  ///////////////////////////////////////////////////////////////////////////

  //NOT IN USE: CHECKED: 9/26/21
  getActivityScripts(scriptIDs: any[]){
    return this.http.post(this.API_URL + '/scripts/getActivityScripts', scriptIDs);
  }

  //NOT IN USE: CHECKED: 9/26/21
  getEveryScript(){
    return this.http.post(this.API_URL + '/scripts/getEveryScript', {});
  }

}
