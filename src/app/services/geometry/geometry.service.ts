import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class GeometryService {
  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) {}

  lockGeometries(data, orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/lockGeometries', {data, orgID, campaignID});
  }

  getPolygons(campaignID: number, orgID: string){
    return this.http.post(this.API_URL + '/api/getPolys', {campaignID, orgID});
  }

  getBlockgroup(blockgroupID: string){
    return this.http.post(this.API_URL + '/api/getBlockgroup', {blockgroupID});
  }

  getBlockgroups(blockgroupIDS: object, campaignID: number){
    return this.http.post(this.API_URL + '/api/getBlockgroups', {blockgroupIDS, campaignID});
  }

  getBlockgroupsByBounds(blockgroupIDS: object, bounds){
    return this.http.post(this.API_URL + '/api/getBlockgroupsByBounds', {blockgroupIDS, bounds});
  }

  getPrecinct(precinctID: string){
    return this.http.post(this.API_URL + '/api/getPrecinct', {precinctID});
  }

  getPrecincts(precinctIDS: object, campaignID: number){
    return this.http.post(this.API_URL + '/api/getPrecincts', {precinctIDS, campaignID});
  }

  getPrecinctsByBounds(precinctIDS: object, bounds){
    return this.http.post(this.API_URL + '/api/getPrecinctsByBounds', {precinctIDS, bounds});
  }

  createPolygon(polygon: Object){
    return this.http.post(this.API_URL + '/api/createPolygon', polygon);
  }

  removePolygon(_id: String){
    return this.http.post(this.API_URL + '/api/removePolygon', {_id});
  }

  registerGeometry(type: string, geometryID: string, campaignID: number, orgID: string){
    return this.http.post(this.API_URL + '/api/registerGeometry', {type, geometryID, campaignID, orgID});
  }

  unregisterGeometry(type: string, geometryID: string, campaignID: number, orgID: string){
    return this.http.post(this.API_URL + '/api/unregisterGeometry', {type, geometryID, campaignID, orgID});
  }

  lockGeometry(type: string, geometryID: string, campaignID: number, orgID: string){
    return this.http.post(this.API_URL + '/api/lockGeometry', {type, geometryID, campaignID, orgID});
  }

  unlockGeometry(type: string, geometryID: string, campaignID: number, orgID: string){
    return this.http.post(this.API_URL + '/api/unlockGeometry', {type, geometryID, campaignID, orgID});
  }

  finishGeometry(type: string, geometryID: string, campaignID: number, orgID: string){
    return this.http.post(this.API_URL + '/api/finishGeometry', {type, geometryID, campaignID, orgID});
  }

  getCountyDistrictBounderies(){
    return this.http.post(this.API_URL + '/api/getCountyDistrictBounderies', {});

  }

  getCityDistrictBounderies(bounds){
    return this.http.post(this.API_URL + '/api/getCityDistrictBounderies', {bounds});
  }

  getDistrictBounderies(bounds, type){
    return this.http.post(this.API_URL + '/api/getDistrictBounderies', {bounds, type})
  }


}
