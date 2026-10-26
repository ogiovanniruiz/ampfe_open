import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class DistrictService {
  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) {}

  getBlocksByBounds(bounds){
    return this.http.post(this.API_URL + '/api/getBlocksByBounds', {bounds});
  }

  getStateDistrict(name: string){
    return this.http.post(this.API_URL + '/api/getStateDistrict', {name});
  }

}
