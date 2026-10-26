import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private API_URL = environment.API_URL;
  public userLocation =  new Subject();

  constructor(private http: HttpClient) {}

  // enabled sets the state explicitly; leaving it out toggles (older behavior)
  updateDataManager(user: Object, campaignID: number, enabled?: boolean){
    return this.http.post(this.API_URL + '/api/updateDataManager', {user, campaignID, enabled})
  }

  searchAddress(address: any){
    return this.http.post<any>(this.API_URL + '/api/searchAddress', address);
  }

  contactDevs(subject: string, message: string, user: Object, orgID: string){
    return this.http.post<any>(this.API_URL + '/api/contactDevs', {subject, message, user, orgID});
  }

  // transfer: make userID the org's owner and the current owner an administrator
  updateUserOrgLevel(userID: string, orgID: string, level: string, transfer: boolean = false){
    return this.http.post(this.API_URL + '/api/updateUserOrgLevel', {userID, orgID, level, transfer});
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
    return this.http.post(this.API_URL+'/api/generateNewUserLink', userDetails);
  }

  processLink(linkID: string){
    return this.http.post(this.API_URL+'/api/processLink', {linkID});

  }

  updateHomeOrg(orgID: string, userID: string){
    return this.http.post(this.API_URL+'/api/updateHomeOrg', {orgID, userID});
  }

  public editDataDetails: any = [];
  public subject = new Subject<any>();
  private messageSource = new  BehaviorSubject(this.editDataDetails);
  currentMessage = this.messageSource.asObservable();
  changeMessage(message: string) {this.messageSource.next(message)}


  deleteUser(userID: string){
    return this.http.post(this.API_URL+'/api/deleteUser', {userID});
  }

  updateUser(user: User){
    return this.http.post(this.API_URL + '/api/updateUser', user);
  }
}
