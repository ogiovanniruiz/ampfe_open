import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class AssetService {
  private API_URL = environment.API_URL;
  public userLocation =  new Subject();

  constructor(private http: HttpClient) {}

  createCOI(coiDetail: unknown){
    return this.http.post(this.API_URL + '/api/createCOI', coiDetail);
  }

  getNewCOIDemographics(coi){
    return this.http.post(this.API_URL + '/api/getNewCOIDemographics', coi)
  }

  getCOI(coiID: string){
    return this.http.post(this.API_URL + '/api/getCOI', {coiID});
  }

  getCOIs(campaignID: number){
    return this.http.post(this.API_URL + '/api/getCOIs', {campaignID});
  }

  editCOI(coiID: string, properties: unknown){
    return this.http.post(this.API_URL + '/api/editCOI', {coiID, properties});
  }

  deleteCOI(coiID: string){
    return this.http.post(this.API_URL + '/api/deleteCOI', {coiID});
  }

  editCOIGeometry(feature: unknown){
    return this.http.post(this.API_URL + '/api/editCOIGeometry', {feature});
  }

  cloneCOI(geometry: unknown, properties: unknown){
    return this.http.post(this.API_URL + '/api/cloneCOI', {geometry, properties});
  }

  getClinics(){

    return this.http.post(this.API_URL + '/api/getClinics', {});

  }
  
}
