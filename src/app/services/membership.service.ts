import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Membership, Resident, MemberSource, MemberTag } from 'src/app/models/person.model';

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private API_URL = environment.API_URL;
  constructor(private http: HttpClient) { }

  getUploadMembershipList(orgID: string, uploadID: string){
    return this.http.post(this.API_URL + '/api/getUploadMembershipList', {orgID, uploadID})
  }

  getTagMembershipList(tag: string, orgID: string){
    return this.http.post(this.API_URL + '/api/getTagMembershipList', {tag, orgID})
  }

  // Adds one tag to every member of the given uploads, tags and organizer lists
  // value: one of the tag's values when it has them
  bulkTagMembers(orgID: string, tag: string, lists: {uploadIDs: string[], tags: string[], userIDs: string[]}, value: string = ''){
    return this.http.post(this.API_URL + '/api/bulkTagMembers', {orgID, tag, value, ...lists})
  }

  getUserMembershipList(userID: string, orgID: string){
    return this.http.post(this.API_URL + '/api/getUserMembershipList', {userID, orgID})
  }

  getMember(personID: string,orgID: string){
    return this.http.post(this.API_URL + '/api/getMember', {orgID, personID})
  }

  createMemberWithForm(member: Membership){
    return this.http.post(this.API_URL + '/api/createMemberWithForm', member)
  }

  editMember(newDetailMember: Membership){
    return this.http.post(this.API_URL + '/api/editMember', newDetailMember)
  }

  deleteMember(member: Membership){
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

  editUpload(uploadID: string, newUploadName: string){
    return this.http.post(this.API_URL + '/api/editUpload', {uploadID, newUploadName})
  }

  // Adds texting/email consent to a member already on the list (found by personID); never removes consent
  updateMemberOptins(orgID: string, personID: string, optinTexting: boolean, optinEmail: boolean, phonenumber: string, email: string){
    return this.http.post(this.API_URL + '/api/updateMemberOptins', {orgID, personID, optinTexting, optinEmail, phonenumber, email})
  }

  createMemberWithVoter(personID: string, orgID: string, userID: string, activityID: string, phonenumber: string, email: string, optinTexting: boolean, optinEmail: boolean, tags: MemberTag[] = []){
    return this.http.post(this.API_URL + '/api/createMemberWithVoter', {personID, orgID, userID, activityID, phonenumber, email, optinTexting, optinEmail, tags})
  }

  getMemberMetaData(residents: Resident[], orgID: string){
    return this.http.post(this.API_URL + '/api/getMemberMetaData', {residents, orgID})
  }

  // One page of a member list; summary counts ignore filters so they can act as filter toggles
  // tagValues: in a tag's list, only members with these values of it ('' = no value)
  getMembers(orgID: string, source: MemberSource, search: string, filters: string[], page: number, pageSize: number, all: boolean = false, tagValues: string[] = []){
    return this.http.post(this.API_URL + '/api/getMembers', {orgID, source, search, filters, page, pageSize, all, tagValues})
  }

  getMemberActivities(orgID: string){
    return this.http.post(this.API_URL + '/api/getMemberActivities', {orgID})
  }

  getMemberHistory(orgID: string, memberID: string){
    return this.http.post(this.API_URL + '/api/getMemberHistory', {orgID, memberID})
  }

  getDuplicateMembers(orgID: string){
    return this.http.post(this.API_URL + '/api/getDuplicateMembers', {orgID})
  }

  bulkUpdateMembers(orgID: string, memberIDs: string[], action: 'addTag' | 'removeTag' | 'delete', tag: string = '', value: string = ''){
    return this.http.post(this.API_URL + '/api/bulkUpdateMembers', {orgID, memberIDs, action, tag, value})
  }

  // Each group becomes one member: keepID when given, otherwise the group's oldest member
  mergeMembers(orgID: string, groups: {memberIDs: string[], keepID?: string}[]){
    return this.http.post(this.API_URL + '/api/mergeMembers', {orgID, groups})
  }

  dismissDuplicateGroup(orgID: string, memberIDs: string[], reason: string){
    return this.http.post(this.API_URL + '/api/dismissDuplicateGroup', {orgID, memberIDs, reason})
  }

}
