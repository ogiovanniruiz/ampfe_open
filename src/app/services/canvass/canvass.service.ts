import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StorageMap } from '@ngx-pwa/local-storage';
import 'rxjs/add/operator/catch';

@Injectable({
  providedIn: 'root'
})

export class CanvassService {

  private API_URL = environment.API_URL;
  constructor(private http: HttpClient, private storage: StorageMap) {}

  updateMarkerLocation(location, person){
    return this.http.post(this.API_URL + '/canvass/updateMarkerLocation', {location, person})
  }

  getCanvassPolygon(targetIDs: any){
    return this.http.post(this.API_URL + '/canvass/getCanvassPolygon', {targetIDs});
  }

  getCanvassResidents(targetIDs: any){
    return this.http.post(this.API_URL + '/canvass/getCanvassResidents', {targetIDs});
  }

  getCanvassParcels(targetIDs: any){
    return this.http.post(this.API_URL + '/canvass/getCanvassParcels', {targetIDs});
  }

  storeParcels(parcelDataLayer: any[]){
    this.storage.set('parcelDataLayer', parcelDataLayer).subscribe(() => {});
  }

  getStoredParcels(){
    return this.storage.get('parcelDataLayer');
  }

  storePeople(personDataLayer){
    this.storage.set('personDataLayer', personDataLayer).subscribe(() => {});
    return {msg: 'success'}
  }

  getStoredPeople(){
    return this.storage.get('personDataLayer');
  }

  storeScripts(scripts: any[]){
    this.storage.set('scripts', scripts).subscribe(() => {})
  }

  saveMap(canvassData: Object){
    this.storage.set('canvassData', canvassData).subscribe(() => {})
  }

  getStoredScripts(){
    return this.storage.get('scripts');
  }

  addUnit(person: Object, unit: string){
    return this.http.post(this.API_URL + '/canvass/addUnit', {person, unit})
  }

  idPerson(person: Object, canvassContactHistory: Object){
    return this.http.post(this.API_URL + '/canvass/idPerson', {person, canvassContactHistory})
  }

  nonResponse(nonResponseData: Object){
    return this.http.post(this.API_URL + '/canvass/nonResponse', nonResponseData)
  }

  createPerson(detail: Object){
    return this.http.post(this.API_URL + '/canvass/createPerson', detail)
  }

  editPerson(newDetail, person){
    return this.http.post(this.API_URL + '/canvass/editPerson', {newDetail, person})
  }

  queuePerson(person: Object){
    this.storage.set('personQueue', person).subscribe(() => {})
  }

  getPersonQueue(){
    return this.storage.get('personQueue');
  }

  getParcelQueue(){
    return this.storage.get('parcelQueue')
  }

  queueParcel(parcel: Object){
    this.storage.set('parcelQueue', parcel).subscribe(() => {})
  }

  initPersonQueue(){
    this.storage.set('personQueue', []).subscribe(()=>{})
  }

  initParcelQueue(){
    this.storage.set('parcelQueue', []).subscribe(()=>{})
  }

  flushQueue(){

    this.storage.get('personQueue').subscribe((personQueue: any) =>{

      for( var i = 0; i < personQueue.length; i++){
        this.createPerson(personQueue[i]).subscribe(result =>{})
      }
      personQueue = []
      this.storage.set('personQueue', personQueue).subscribe(() => {});
    })
  }

  removePerson(person){
    return this.http.post(this.API_URL + '/canvass/removePerson', person)
  }

  reverseGeocode(location:  Object){
    return this.http.post(this.API_URL + '/canvass/reverseGeocode', location)
  }

}
