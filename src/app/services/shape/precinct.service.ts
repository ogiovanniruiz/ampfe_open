import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';


@Injectable({
  providedIn: 'root'
})
export class PrecinctService {
    private API_URL = environment.API_URL;

    constructor(private http: HttpClient) {}

    getRegistrationPrecinctsByBounds(campaignID: number){
        return this.http.post(this.API_URL + '/api/getPrecinctsByBounds', {campaignID});
    }

    getElectionPrecinctsByBounds(campaignID: number){
      return this.http.post(this.API_URL + '/api/getElectionPrecinctsByBounds', {campaignID});
    }

    getPrecinct(precinctID: string){
      return this.http.post(this.API_URL + '/api/getPrecinct', {precinctID});
    }

    async getGeoJsonPrecincts() {
      let sburl = '/assets/sbPrecincts.geojson';
      let rivurl = '/assets/riversidePrecincts.geojson';

      const [sb, riv] = await Promise.all([
  firstValueFrom(this.http.get<GeoJSON.FeatureCollection>(sburl)),
  firstValueFrom(this.http.get<GeoJSON.FeatureCollection>(rivurl))
]);

return {
  type: 'FeatureCollection',
  features: [...sb.features, ...riv.features]
} as GeoJSON.FeatureCollection;

    }

}