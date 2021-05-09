import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ParcelService {
  private API_URL= environment.API_URL;
  private YELP_URL = environment.YELP_URL
  private YELP_KEY = environment.YELP_KEY

  constructor(private http: HttpClient) { }

  getParcels(city: String, type: String, bounds: Object){
    return this.http.post<any>(this.API_URL + '/parcels/getParcels', {city: city, type: type, bounds: bounds});
  }

  getCanvassParcels(type: String, targetIDs: any){
    return this.http.post<any>(this.API_URL + '/parcels/getCanvassParcels', {type, targetIDs })
  }

  search(address){
    return this.http.post<any>(this.API_URL + '/parcels/search', {address: address});
  }

  getAssets(filter: String){
    return this.http.post<any>(this.API_URL + '/parcels/getAssets', filter);
  }

  deleteAsset(assetDetail: Object){
    return this.http.post<any>(this.API_URL + '/parcels/deleteAsset', assetDetail);
  }

  createAsset(assetDetail: Object, parcelData: Object){
    return this.http.post<any>(this.API_URL + '/parcels/createAsset', {assetDetail: assetDetail, parcelData:parcelData});
  }

  editParcel(parcelData: Object){
    return this.http.post<any>(this.API_URL + '/parcels/editParcel', parcelData);
  }

  createParcel(parcelData: Object, address: Object){
    return this.http.post<any>(this.API_URL + '/parcels/createParcel', {parcelData: parcelData, address: address});
  }

  getNumParcelsWithin(type: String, geoid: String){
    return this.http.post<any>(this.API_URL + '/parcels/getNumParcelsWithin', {type, geoid })
  }

  completeHousehold(parcel: Object, campaignID: Number, activityID: String, orgID: String, userID: String, locationIdentified: any, canvassContactHistory: Object){
    return this.http.post<any>(this.API_URL + '/parcels/completeHousehold', {parcel: parcel, campaignID: campaignID, activityID: activityID, orgID: orgID, userID: userID, locationIdentified: locationIdentified, canvassContactHistory})
  }

  pullYelpAPI(lat: Number, lng: Number){

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded',
                                      'Authorization': this.YELP_KEY
                                    });

    var latString = 'latitude='+lat
    var lngString = 'longitude='+lng
    var url = this.YELP_URL + latString + "&" + lngString + "&" + 'radius=20'
    
    return this.http.get(url, {headers: headers})
  }

  tagParcels(orgID: String){

    return this.http.post(this.API_URL + '/parcels/tagParcels', {orgID: orgID})
  }
}
