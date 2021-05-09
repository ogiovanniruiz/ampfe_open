import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StorageMap } from '@ngx-pwa/local-storage';
import { Capability } from 'protractor';

@Injectable({
  providedIn: 'root'
})

export class UpdateService {

  private API_URL = environment.API_URL;
  constructor(private http: HttpClient, private storage: StorageMap) {}

  updateReport(){
    return this.http.post(this.API_URL + '/update/updateReport', {}).toPromise();
  }

  updateImpressions(){
    return this.http.post(this.API_URL + '/update/updateImpressions', {}).toPromise();
  }

  updateImpressions2(){
    return this.http.post(this.API_URL + '/update/updateImpressions2', {}).toPromise();
  }

  updateImpressions3(){
    return this.http.post(this.API_URL + '/update/updateImpressions3', {}).toPromise();
  }

  updateAddressGeocode(){
    return this.http.post(this.API_URL + '/update/updateAddressGeocode', {}).toPromise();
  }
}
