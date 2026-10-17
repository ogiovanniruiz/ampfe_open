import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { StorageMap } from '@ngx-pwa/local-storage';


@Injectable({
  providedIn: 'root'
})

export class SummaryService {

  private API_URL = environment.API_URL;
  constructor(private http: HttpClient, private storage: StorageMap) {}

  getSurveySummary(campaignID: number, startDate, endDate, surveyID: string, activityType: string, summaryType: string, activityName: string, orgID: string, geoType: string, userID: string){
    return this.http.post(this.API_URL + '/api/getSurveySummary', {campaignID,  startDate, endDate, surveyID, activityType, summaryType, activityName, orgID, geoType, userID})
  }

  getNonresponseSummary(campaignID: number, orgID: string, startDate, endDate, nonResponseSetID: string, summaryType: string, activityName: string, geoType: string, activityType: string, userID: string){
    return this.http.post(this.API_URL + '/api/getNonresponseSummary', {campaignID, orgID, startDate, endDate, nonResponseSetID, summaryType, activityName, geoType, activityType, userID})
  }

  getActivitySummary(campaignID: number, orgID: string, startDate, endDate, activityName: string, summaryType: string, geoType: string, activityType: string, userID: string){
    return this.http.post(this.API_URL + '/api/getActivitySummary', {campaignID, orgID, startDate, endDate, activityName, summaryType, geoType, activityType, userID})
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////


  // districtID: a district identifier, 'ALL', or omitted for the campaign's first district
  getDistrictDataSummary(campaignID: number, districtID?: string, refresh: boolean = false){
    return this.http.post(this.API_URL + '/api/getDistrictDataSummary', {campaignID, districtID, refresh})
  }

  getPrecinctPlanningSummary(campaignID: number){
    return this.http.post(this.API_URL + '/api/getPrecinctPlanningSummary', {campaignID})
  }


  //////////////////////////////////////////////////////////////

  getRawSurveyData(campaignID: number, surveyID: string, mode: string, orgID: string, fields: any, includeNonResponses: boolean = false){
    return this.http.post(this.API_URL + '/api/getRawSurveyData', {campaignID, surveyID, mode, orgID, fields, includeNonResponses})
  }

  syncGoogleSheets(campaignID: number, surveyID: string, mode: string, googleSheetURL: string){
    return this.http.post(this.API_URL + '/api/syncGoogleSheets', {campaignID, surveyID, mode, googleSheetURL})
  }

  syncBigQuerySurveyData(data: any){
    return this.http.post(this.API_URL + '/api/syncBigQuerySurveyData', data)
  }

  getAnalysisSummary(campaignID: number, surveyID: string, orgID: string){
    return this.http.post(this.API_URL + '/api/getAnalysisSummary', {campaignID, surveyID, orgID})
  }

}