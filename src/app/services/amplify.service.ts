import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';


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

  getCommunityListCities(orgID: string){
    return this.http.post(this.API_URL + '/api/getCommunityListCities', {orgID});
  }

  getDistrictsByID(ids: string[]){
    return this.http.post(this.API_URL + '/api/getFullDistricts', {ids});
  }

  getSufficies(boundary: unknown){
    return this.http.post(this.API_URL + '/api/getSufficies', boundary);
  }

  getZips(boundary: unknown){
    return this.http.post(this.API_URL + '/api/getZips', boundary);
  }

  massGeocodeVoters(){
    return this.http.post(this.API_URL + '/api/massGeocodeVoters', {});
  }

  appendGeoids(){
    return this.http.post(this.API_URL + '/api/appendGeoids', {});
  }

  appendPrecinctIDs(){
    return this.http.post(this.API_URL + '/api/appendPrecinctIDs', {});
  }

  geocode(address: string){
    return this.http.post(this.API_URL + '/api/geocode', {address: address})
  }

  getElectionPrecincts(county: string, year: string){
    return this.http.post(this.API_URL + '/api/getElectionPrecincts', {county, year})
  }

  getRegistrationPrecincts(county: string){
    return this.http.post(this.API_URL + '/api/getRegistrationPrecincts', {county})
  }

  getBlockgroups(county: string){
    return this.http.post(this.API_URL + '/api/getBlockgroups', {county});
  }

  getBlocks(county: string){
    return this.http.post(this.API_URL + '/api/getBlocks', {county});
  }

  getCensusTracts(county: string){
    return this.http.post(this.API_URL + '/api/getCensusTracts', {county});
  }

  removePrecinct(precinctID: string){
    return this.http.post(this.API_URL + '/api/removePrecinct', {precinctID});

  }

  getCityShapes(){
    return this.http.post(this.API_URL +'/api/getCityShapes', {});
  }

  getNearestVoteCenters(location, county?: string){
    return this.http.post(this.API_URL + '/api/getNearestVoteCenters', {location, county});
  }

  // Every vote center and drop-off inside the campaign boundary, for the campaign map
  getVoteCentersByCampaign(campaignID: number){
    return this.http.post(this.API_URL + '/api/getVoteCentersByCampaign', {campaignID});
  }

  getLiveElectionResults(){
    return this.http.post(this.API_URL + '/api/getLiveElectionResults', {});
  }

  getLiveRiversideResults(){
    return this.http.post(this.API_URL + '/api/getLiveRiversideResults', {});
  }
  getLiveSBResults(){
    return this.http.post(this.API_URL + '/api/getLiveSBResults', {});
  }
  getLiveSOSResults(){
    return this.http.post(this.API_URL + '/api/getLiveSOSResults', {});
  }



}
