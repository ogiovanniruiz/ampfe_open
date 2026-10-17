import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Alert, Contact, Dispatcher, Incident, Responder } from '../models/hotline.model';

@Injectable({
  providedIn: 'root'
})

export class HotlineService {
  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) {}

  getCalls(orgID: string){
    return this.http.post(this.API_URL + '/api/getCalls', {orgID: orgID});
  }

  getDispatchers(orgID: string){
    return this.http.post(this.API_URL + '/api/getDispatchers', {orgID: orgID});
  }

  getIncidents(orgID: string){
    return this.http.post(this.API_URL + '/api/getIncidents', {orgID: orgID});
  }

  createIncident(newIncident){
    return this.http.post(this.API_URL + '/api/createIncident', newIncident);
  }

  deleteIncident(incidentID: string){
    return this.http.post(this.API_URL + '/api/deleteIncident', {incidentID});
  }

  editIncident(newIncident: Incident){
    return this.http.post(this.API_URL + '/api/editIncident', newIncident);
  }

  createAlert(newAlert: Alert){
    return this.http.post(this.API_URL + '/api/createAlert', newAlert);
  }

  getAlerts(orgID: string, activeIncidentIDs: string[]){
    return this.http.post(this.API_URL + '/api/getAlerts', {orgID: orgID, activeIncidentIDs})
  }

  createDispatcher(newDispatcher: Dispatcher){
    return this.http.post(this.API_URL + '/api/createDispatcher', newDispatcher)
  }

  removeDispatcher(userID: string){
    return this.http.post(this.API_URL + '/api/removeDispatcher', {userID})
  }

  getDispatcherAccount(userID: string){
    return this.http.post(this.API_URL + '/api/getDispatcherAccount', {userID})
  }

  toggleOnDuty(userID: string, check: boolean){
    return this.http.post(this.API_URL + '/api/toggleOnDuty', {userID, check})
  }

  getReverseGeocode(coordinates: Number[]){
    return this.http.post(this.API_URL + '/api/getReverseGeocode', {coordinates})
  }

  editDispatcher(dispatcher: Dispatcher){
    return this.http.post(this.API_URL + '/api/editDispatcher', dispatcher)
  }

  createResponder(responder: Responder){
    return this.http.post(this.API_URL + '/api/createResponder', responder)
  }

  editResponder(responder: Responder){
    return this.http.post(this.API_URL + '/api/editResponder', responder)
  }

  removeResponder(responderID: string){
    return this.http.post(this.API_URL + '/api/removeResponder', {responderID})
  }

  getResponders(orgID: string){
    return this.http.post(this.API_URL + '/api/getResponders', {orgID})
  }

  getNumResponders(orgID: string, coordinates: Number[], radius: Number){
    return this.http.post(this.API_URL + '/api/getNumResponders', {orgID, coordinates, radius})
  }

  enableHotlinePhonenumber(phonenumber, checked){
    return this.http.post(this.API_URL + '/api/enableHotlinePhonenumber', {phonenumber, checked})
  }

  getHotlineStatus(orgID: string){
    return this.http.post(this.API_URL + '/api/getHotlineStatus', {orgID})
  }

  getMessages(orgID: string){
    return this.http.post(this.API_URL + '/api/getMessages', {orgID})
  }

  sendFollowUpHotlineText(text: string, destinationNumber: string, orgID: string){
    return this.http.post(this.API_URL + '/api/sendFollowUpHotlineText', {text, destinationNumber, orgID})
  }

  getContacts(orgID: string){
    return this.http.post(this.API_URL + '/api/getContacts', {orgID})
  }

  createContact(contact: Contact){
    return this.http.post(this.API_URL + '/api/createContact', contact)
  }

  editContact(contact: Contact){
    return this.http.post(this.API_URL + '/api/editContact', contact)
  }

  removeContact(contactID: string){
    return this.http.post(this.API_URL + '/api/removeContact', {contactID})
  }

  outgoingHotlineCall(options: any){
    return this.http.post(this.API_URL + '/api/outgoingHotlineCall', options)
  }

  updateHotlineCallStatus(call) {
    return this.http.post(this.API_URL + '/api/updateHotlineCallStatus', call)
  }

  getHotlineRecording(call) {
    return this.http.post(this.API_URL + '/api/getHotlineRecording', call)
  }

  saveCallNotes(call) {
    return this.http.post(this.API_URL + '/api/saveCallNotes', call)
  }
  
}
