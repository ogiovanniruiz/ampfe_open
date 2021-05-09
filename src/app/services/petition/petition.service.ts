import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StorageMap } from '@ngx-pwa/local-storage';

@Injectable({
  providedIn: 'root'
})

export class PetitionService {

  private API_URL = environment.API_URL;
  constructor(private http: HttpClient, private storage: StorageMap) {}

  submitPetition(petition: unknown){
    return this.http.post(this.API_URL + '/api/submitPetition', petition);
  }

  getPetitionReport(activityID: string, reportPickerStart: string, reportPickerEnd: string){
    return this.http.post(this.API_URL + '/api/getPetitionReport', {activityID, reportPickerStart, reportPickerEnd});
  }

  /////////////////////////////////////////////////////////////////

  getNumSub(activityID: string){
    return this.http.post(this.API_URL + '/petition/getNumSub', {activityID: activityID})
  }

  storeCounty(county: any){
    this.storage.set('petitionCounty', county).subscribe(() => {})
  }

  getCounty(){
    return this.storage.get('petitionCounty')
  }
  
  generateLink(petitionDetails){
    return this.http.post(this.API_URL + '/petition/generateLink', petitionDetails)
  }

  processLink(linkID: string){
    return this.http.post(this.API_URL + '/petition/processLink', {linkID: linkID})
  }

  uploadPetitions(formData){
    return this.http.post(this.API_URL + '/petition/uploadPetitions', formData)
  }
}
