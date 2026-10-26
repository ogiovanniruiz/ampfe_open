import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Survey, UpdatedSurvey } from '../models/survey.model';
import { NonResponseSet } from '../models/nonResponseSet.model';

@Injectable({
  providedIn: 'root'
})
export class SurveyService {
  private API_URL= environment.API_URL;

  constructor(private http: HttpClient) { }

  createSurvey(survey: Survey){
    return this.http.post<UpdatedSurvey>(this.API_URL + '/api/createSurvey', survey);
  }

  getAllSurveys(orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/getAllSurveys', {orgID: orgID, campaignID: campaignID});
  }

  getCampaignSurveys(orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/getCampaignSurveys', {orgID: orgID, campaignID: campaignID});
  }

  editSurvey(survey: Survey, surveyID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/editSurvey', {survey, surveyID, campaignID});
  }

  removeSurvey(survey: Survey){
    return this.http.post(this.API_URL + '/api/removeSurvey', survey);
  }

  // setActive: false archives, true restores; omitted toggles (older behavior)
  archiveSurvey(survey: Survey, setActive?: boolean){
    return this.http.post(this.API_URL + '/api/archiveSurvey', {...survey, setActive});
  }

  // Recorded answers per question/response; used wording is locked in the survey editor
  getSurveyUsage(surveyID: string){
    return this.http.post(this.API_URL + '/api/getSurveyUsage', {surveyID});
  }

  getSurvey(surveyID: string){
    return this.http.post(this.API_URL + '/api/getSurvey', {surveyID});
  }

  ////////////////////////////////////////////////////////////////////////////////////////////

  createNonResponseSet(nonResponseSet: Object){
    return this.http.post(this.API_URL + '/api/createNonResponseSet', nonResponseSet);
  }

  getAllNonResponseSets(orgID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/getAllNonResponseSets', {orgID: orgID, campaignID: campaignID});
  }

  editNonResponseSet(nonResponseSet: Object, nonResponseSetID: string, campaignID: number){
    return this.http.post(this.API_URL + '/api/editNonResponseSet', {nonResponseSet, nonResponseSetID, campaignID});
  }

  removeNonResponseSet(nonResponseSet: NonResponseSet){
    return this.http.post(this.API_URL + '/api/removeNonResponseSet', nonResponseSet);
  }

  // setActive: true restores, false archives; omitted toggles (older behavior)
  archiveNonResponseSet(nonResponseSet: NonResponseSet, setActive?: boolean){
    return this.http.post(this.API_URL + '/api/archiveNonResponseSet', {...nonResponseSet, setActive});
  }

  // Contacts recorded per response; used responses are locked in the editor
  getNonResponseSetUsage(nonResponseSetID: string){
    return this.http.post(this.API_URL + '/api/getNonResponseSetUsage', {nonResponseSetID});
  }

  getNonResponseSet(nonResponseSetID: string){
    return this.http.post(this.API_URL + '/api/getNonResponseSet', {nonResponseSetID});
  }

}