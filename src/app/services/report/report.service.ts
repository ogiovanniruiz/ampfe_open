import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StorageMap } from '@ngx-pwa/local-storage';


@Injectable({
  providedIn: 'root'
})

export class ReportService {

  private API_URL = environment.API_URL;
  constructor(private http: HttpClient, private storage: StorageMap) {}


  getUserReport(campaignID: Number, orgID: string, data){
    return this.http.post(this.API_URL + '/api/getUserReport', {campaignID, orgID, data})
  }

  getOrgReport(campaignID: Number, data){
    return this.http.post(this.API_URL + '/api/getOrgReport', {campaignID, data})
  }

  getPrecBlockReport(campaignID: Number, orgID: string, data){
    return this.http.post(this.API_URL + '/api/getPrecBlockReport', {campaignID, orgID, data})
  }

  getScriptReport(campaignID: Number, orgID: string, data){
    return this.http.post(this.API_URL + '/api/getScriptReport', {campaignID, orgID, data})
  }

  downloadNotes(scripts: string){
    return this.http.post(this.API_URL + '/api/downloadNotes', {scripts})

  }



}
