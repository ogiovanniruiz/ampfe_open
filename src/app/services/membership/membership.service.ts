import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private API_URL = environment.API_URL;
  constructor(private http: HttpClient) { }

  getMembers(orgID: string){
    return this.http.post(this.API_URL + '/api/getMembers', {orgID})
  }

  createMember(member: Object){
    return this.http.post(this.API_URL + '/api/createMember', member)
  }

  editMember(oldMember, newMember: Object){
    return this.http.post(this.API_URL + '/api/editMember', {oldMember, newMember})
  }

  deleteMember(member){
    return this.http.post(this.API_URL + '/api/deleteMember', member)
  }


  uploadMembership(formData: any){
    return this.http.post(this.API_URL + '/api/uploadMembership', formData)
  }

  getUploads(orgID: string){
    return this.http.post(this.API_URL + '/api/getUploads', {orgID})
  }

  deleteUpload(uploadID: string){
    return this.http.post(this.API_URL + '/api/deleteUpload', {uploadID})

  }

}
