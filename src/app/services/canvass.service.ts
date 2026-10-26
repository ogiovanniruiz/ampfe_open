import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { StorageMap } from '@ngx-pwa/local-storage';
import {  ActivityContactRecord } from '../models/contact.record.model';
import { Address } from '../models/person.model';
import { User } from '../models/user.model';
;


@Injectable({
  providedIn: 'root'
})

export class CanvassService {

  private API_URL = environment.API_URL;
  constructor(private http: HttpClient, private storage: StorageMap) {}

  getCanvassBuildingRecords(activityID: string){
    return this.http.post(this.API_URL + '/api/getCanvassBuildingRecords', {activityID})
  }

  // Drops a household with no residents at [lng, lat]; the server reverse geocodes its address
  createCanvassHousehold(activityID: string, coordinates: number[], userID: string){
    return this.http.post(this.API_URL + '/api/createCanvassHousehold', {activityID, coordinates, userID})
  }

  // Adds a new person to a dropped household and marks the door done
  addCanvassHouseholdResident(activityHouseholdRecordID: string, resident: unknown){
    return this.http.post(this.API_URL + '/api/addCanvassHouseholdResident', {activityHouseholdRecordID, resident})
  }

  editCanvassContactRecord(activityID: string, householdID: string){
    return this.http.post(this.API_URL + '/api/editCanvassContactRecord', {activityID, householdID})
  }

  createCanvassContactRecord(activityContactRecord){
    return this.http.post(this.API_URL + '/api/createCanvassContactRecord', activityContactRecord)
  }

  // activityHouseholdRecordID matches the exact household; the address alone can match neighbors
  getCanvassContactHistory(activityID: string, householdID: unknown, activityHouseholdRecordID?: string){
    return this.http.post(this.API_URL + '/api/getCanvassContactHistory', {activityID, householdID, activityHouseholdRecordID})
  }

  getCanvassReport(activityID: string, reportPickerStart, reportPickerEnd){
    return this.http.post(this.API_URL + '/api/getCanvassReport', {activityID, reportPickerEnd, reportPickerStart})
  }

  downloadCanvassContactHistory(activityID: string){
    return this.http.post(this.API_URL + '/api/downloadCanvassContactHistory', {activityID})
  }

  getCanvassStreetList(activityID: string){
    return this.http.post( this.API_URL + '/api/getCanvassStreetList', {activityID})
  }

  getCanvassLocations(activityID: string){
    return this.http.post( this.API_URL + '/api/getCanvassLocations', {activityID})
  }

  // coordinates are GeoJSON order: [lng, lat]. Only the id and name are sent,
  // since every canvasser on the activity can see these records.
  updateCanvassLocation(activityID: string, user: User, coordinates: number[]){
    return this.http.post( this.API_URL + '/api/updateCanvassLocation', {activityID, userID: user._id, name: user.name, coordinates})
  }

  removeCanvassLocation(activityID: string, userID: string){
    return this.http.post( this.API_URL + '/api/removeCanvassLocation', {activityID, userID})
  }
}
