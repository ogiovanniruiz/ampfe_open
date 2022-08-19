import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private API_URL = environment.API_URL;
  public userLocation =  new Subject();

  constructor(private http: HttpClient) {}

  updateDataManager(user: Object, campaignID: number){
    return this.http.post(this.API_URL + '/api/updateDataManager', {user, campaignID})
  }

  searchAddress(address: any){
    return this.http.post<any>(this.API_URL + '/api/searchAddress', address);
  }

  contactDevs(subject: string, message: string, user: Object, orgID: string){
    return this.http.post<any>(this.API_URL + '/api/contactDevs', {subject, message, user, orgID});
  }

  updateUserOrgLevel(userID: string, orgID: string, level: string){
    return this.http.post(this.API_URL + '/api/updateUserOrgLevel', {userID, orgID, level});
  }

  updateDevStatus(user: Object, developer: boolean){
    return this.http.post(this.API_URL + '/api/updateDevStatus', {user: user, developer: developer});
  }

  getUser(user: Object){
    return this.http.post(this.API_URL + '/api/getUser', user);
  }

  getAllUsers(){
    return this.http.post(this.API_URL + '/api/getAllUsers',{});
  }
  submitAgreement(data: Object){
    return this.http.post(this.API_URL + '/api/submitAgreement', data)
  }
  
  checkVersion(version: string){
    return this.http.post(this.API_URL + '/api/checkVersion', {version})
  }

  oauthLogin(claims: Object){
    return this.http.post(this.API_URL + '/api/oauthLogin', claims)
  }

  createOauthUser(claims: any){
    return this.http.post(this.API_URL+'/api/createOauthUser', claims);
  }

  localLogin(email: string, password: string){
    return this.http.post(this.API_URL + '/api/localLogin', {email, password})
  }

  createUser(user: any, password: string){
    return this.http.post(this.API_URL + '/api/createUser', {user, password})
  }

  createRdrUser(user: Object, orgID: string){
    return this.http.post(this.API_URL + '/api/createRdrUser', {user, orgID})
  }

  passwordReset(email: string, url: string){
    return this.http.post(this.API_URL + '/api/passwordReset', {email, url});
  }

  setNewPassword(upr: string, password: string){
    return this.http.post(this.API_URL+'/api/setNewPassword', {upr, password});
  }

  generateNewUserLink(userDetails: Object){
    console.log(userDetails)
    return this.http.post(this.API_URL+'/api/generateNewUserLink', userDetails);
  }

  processLink(linkID: string){
    return this.http.post(this.API_URL+'/api/processLink', {linkID});

  }

  updateHomeOrg(orgID: string, userID: string){
    return this.http.post(this.API_URL+'/api/updateHomeOrg', {orgID, userID});
  }

  ////////////////////////////////////////////////////////////

  getUserProfile(userProfile: Object){
    return this.http.post(this.API_URL + '/users/getUserProfile', userProfile);
  }

  editUser(userID: String, newUserDetails: Object){
     return this.http.post(this.API_URL + '/users/editUser', {newUserDetails: newUserDetails})
  }
 
  getUserLocation(){
    if (navigator.geolocation) {navigator.geolocation.watchPosition(showPosition);} 
    else {alert("Geolocation is not supported by this browser.")}

    var that = this 

    function showPosition(position){
      that.userLocation.next(position);
    };
  }
}
