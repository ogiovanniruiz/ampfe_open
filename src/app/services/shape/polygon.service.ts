import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class PolygonService {
  private API_URL = environment.API_URL;
  constructor(private http: HttpClient) {}
  // withoutGeometry returns names and properties only (for lists)
  getPolygons(campaignID: number, orgID: string, mode: string, withoutGeometry?: boolean){
    return this.http.post(this.API_URL + '/api/getPolygons', {campaignID, orgID, mode, withoutGeometry});
  }
  
  createPolygon(polygon: Object){
    return this.http.post(this.API_URL + '/api/createPolygon', polygon);
  }
  
  editPolygon(polygon: any){
    return this.http.post(this.API_URL + '/api/editPolygon', polygon);
  }

  deletePolygon(_id: string){
    return this.http.post(this.API_URL + '/api/deletePolygon', {_id});
  }

  getPolygon(polygonID: string){
    return this.http.post(this.API_URL + '/api/getPolygon', {polygonID});
  }

  getPolygonUsage(polygonID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/getPolygonUsage', {polygonID, campaignID});
  }

  // Groups and activities in the campaign using each polygon: {[polygonID]: {groups, activities}}
  getPolygonsUsage(polygonIDs: string[], campaignID: number){
    return this.http.post(this.API_URL + '/api/getPolygonsUsage', {polygonIDs, campaignID});
  }

  getPolygonsByIDs(campaignID: number, orgID: string, activityType: string){
    return this.http.post(this.API_URL + '/api/getPolygonsByIDs', {campaignID: campaignID, orgIDs: orgID, activityType: activityType});
  }

  // setActive makes it idempotent; omitted, the polygon toggles
  archivePolygon(polygonID: string, setActive?: boolean){
    return this.http.post(this.API_URL + '/api/archivePolygon', {polygonID, setActive});
  }

}