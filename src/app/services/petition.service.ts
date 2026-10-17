import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as _ from 'underscore';
import { Activity } from '../models/activity.model';
import { Address, Household } from '../models/person.model';


@Injectable({
  providedIn: 'root'
})
export class PetitionService {

    private API_URL = environment.API_URL;

    constructor(private http: HttpClient) {}

    submitSurveyResponse(surveyResponseData){
        return this.http.post(this.API_URL + '/api/submitPetitionSurveyResponse', surveyResponseData)
    }

    getPetitions(orgID: string){
        return this.http.post(this.API_URL + '/api/getPetitions', {orgID})
    }


}