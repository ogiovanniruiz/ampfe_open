import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})

export class AmplifyService {
  private API_URL = environment.API_URL;
  public userLocation =  new Subject();

  constructor(private http: HttpClient) {}

  getCities(boundary: unknown){
    return this.http.post(this.API_URL + '/api/getCities', boundary);
  }

  getDistricts(value){
    return this.http.post(this.API_URL + '/api/getFullDistricts', {value});
  }

  getSufficies(boundary: unknown){
    return this.http.post(this.API_URL + '/api/getSufficies', boundary);
  }

  getZips(boundary: unknown){
    return this.http.post(this.API_URL + '/api/getZips', boundary);
  }

  massGeocode(){
    return this.http.post(this.API_URL + '/api/massGeocodeVoters', {});
  }

  appendGeoids(){
    return this.http.post(this.API_URL + '/api/appendGeoids', {});
  }

  geocode(address: string){
    return this.http.post(this.API_URL + '/api/geocode', {address: address})
  }


}
