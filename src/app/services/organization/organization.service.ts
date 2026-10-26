import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, startWith } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Organization } from 'src/app/models/organization.model';

// Terms are accepted once per organization, by any one of its owners
export interface OrgTermsStatus {
  version: string;
  accepted: boolean;
  acceptedBy: {userID: string, name: string, date: string} | null;
  hasOwner: boolean;
  ownerNames: string[];
}

// The org's Google service account as the server describes it; empty when no key is uploaded.
// The key itself never leaves the server
export interface OrgServiceAccount {
  clientEmail?: string;
  projectId?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})

export class OrganizationService {
  private API_URL = environment.API_URL;
  // One logo request per org, shared by every page that shows it
  private orgLogos = new Map<string, Observable<SafeUrl | null | undefined>>();
  constructor(private http: HttpClient, private sanitizer: DomSanitizer) { }

  requestOrganization(userID: string, orgID: string){
    return this.http.post(this.API_URL + '/api/requestOrg', {userID, orgID});
  }

  editOrganization(editOrganizationData: any){ 
    return this.http.post(this.API_URL + '/api/editOrg', editOrganizationData);
  }

  createOrganization(detail: {name: string, description?: string, contactEmail?: string, subscription?: string, callingService?: string}){ 
    return this.http.post(this.API_URL + '/api/createOrg', detail);
  }

  // Names only, with the user's status in each ('member' | 'requested' | null)
  getAllOrgs(userID?: string){
    return this.http.post(this.API_URL + '/api/getAllOrgs', {userID});
  }

  getAllOrgsByIDs(orgIDs: string[]){
    return this.http.post(this.API_URL + '/api/getAllOrgsByIDs', {orgIDs});
  }

  // The user's organizations (all of them for developers), display fields only
  getOrgPermissions(userID: string){
    return this.http.post(this.API_URL + '/api/getOrgPermissions', {_id: userID});
  }

  getOrganization(orgID: string){
    return this.http.post(this.API_URL + '/api/getOrg', {orgID});
  }

  getOrgUsers(orgID: string){
    return this.http.post(this.API_URL + '/api/getOrgUsers', {orgID});
  }

  getOrgUserRequests(orgID: string){
    return this.http.post(this.API_URL + '/api/getOrgUserRequests', {orgID})
  }


  getOrgLogo(orgID: string){
    return this.http.post(this.API_URL + '/api/getOrgLogo', {orgID})
  }

  // The org's logo as an image URL: undefined while loading, null with no logo (or on error) so pages keep their default look
  getOrgLogoUrl(orgID: string): Observable<SafeUrl | null | undefined> {
    if(!orgID) return of(null)
    if(!this.orgLogos.has(orgID)){
      this.orgLogos.set(orgID, this.getOrgLogo(orgID).pipe(
        map((data: any) => data?.image?.data ? this.sanitizer.bypassSecurityTrustUrl('data:image/png;base64,' + arrayBufferToBase64(data.image.data)) : null),
        catchError(error => { console.log(error); return of(null) }),
        startWith(undefined),
        shareReplay(1)
      ))
    }
    return this.orgLogos.get(orgID)
  }

  // After a logo upload, so other pages fetch the new one
  clearOrgLogo(orgID: string){
    this.orgLogos.delete(orgID)
  }

  uploadLogo(file: any){
    return this.http.post(this.API_URL + '/api/uploadLogo', file)
  }

  getOrgServiceAccount(orgID: string): Observable<OrgServiceAccount> {
    return this.http.post<OrgServiceAccount>(this.API_URL + '/api/getOrgServiceAccount', {orgID})
  }

  // FormData with the key file under the org ID, like uploadLogo
  uploadServiceAccount(file: any){
    return this.http.post(this.API_URL + '/api/uploadServiceAccount', file)
  }

  removeServiceAccount(orgID: string){
    return this.http.post(this.API_URL + '/api/removeServiceAccount', {orgID})
  }

  getOrgTags(orgID: string){
    return this.http.post(this.API_URL + '/api/getTags', {orgID})
  }

  // Moves members, the tag list and saved group filters from the given tags to one tag
  mergeTags(orgID: string, tags: string[], newTag: string){
    return this.http.post(this.API_URL + '/api/mergeTags', {orgID, tags, newTag})
  }

  getTagDefinitions(orgID: string){
    return this.http.post(this.API_URL + '/api/getTagDefinitions', {orgID})
  }

  // A tag with values and colors; its label is also added to the org's tags
  // Changes a tag's name, values and colors; members and saved groups follow. preview: only counts what would change.
  updateTagDefinition(orgID: string, label: string, update: {newLabel: string, valueType: string, range?: {min: number, max: number}, values?: {value: string, color: string, from?: string}[], color?: string, userID?: string}, preview: boolean = false){
    return this.http.post(this.API_URL + '/api/updateTagDefinition', {orgID, label, ...update, preview})
  }

  createTagDefinition(orgID: string, userID: string, definition: {label: string, valueType: string, range?: {min: number, max: number}, values?: {value: string, color: string}[], color?: string}){
    return this.http.post(this.API_URL + '/api/createTagDefinition', {orgID, userID, ...definition})
  }

  deleteTag(orgID: string, tag: string){
    return this.http.post(this.API_URL + '/api/deleteTag', {orgID, tag})
  }

  getCampaignOrgs(campaignID: Number){
    return this.http.post<Organization[]>(this.API_URL + '/api/getCampaignOrgs', {campaignID});
  }

  getCampaignUsers(campaignID: Number, orgID: string){
    return this.http.post(this.API_URL + '/api/getCampaignUsers', {campaignID, orgID});
  }

  hangUpNumber(orgID: string, userPhoneNumber: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/hangUpNumber', {orgID, userPhoneNumber, campaignID})
  }

  downloadOrgContactHistory(orgID: string){
    return this.http.post(this.API_URL + '/api/downloadOrgContactHistory', {orgID})
  }

  updateAgreement(orgID: string, status: boolean){
    return this.http.post(this.API_URL + '/api/updateAgreement', {orgID, status})
  }

  getOrgTermsStatus(orgID: string){
    return this.http.post<OrgTermsStatus>(this.API_URL + '/api/getOrgTermsStatus', {orgID})
  }

  getTerms(){
    return this.http.post<{html: string | null, url: string, version: string}>(this.API_URL + '/api/getTerms', {})
  }
}

export function arrayBufferToBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
     binary += String.fromCharCode( bytes[ i ] );
  }
  return window.btoa( binary );
}
