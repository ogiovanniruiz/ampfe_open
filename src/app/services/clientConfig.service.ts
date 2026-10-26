import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ClientConfig {
  googleMapsKey: string;
  testCallingNumber: string;
}

const EMPTY: ClientConfig = {googleMapsKey: '', testCallingNumber: ''}

/**
 * Runtime settings kept in server env vars (Maps key, demo test number), fetched once after login.
 * A failed fetch yields empty values: address suggestions stay off and demo calls/texts are refused.
 */
@Injectable({ providedIn: 'root' })
export class ClientConfigService {

  private config: ClientConfig = EMPTY
  private loading: Promise<ClientConfig> | null = null

  constructor(private http: HttpClient) {}

  load(): Promise<ClientConfig> {
    if(!this.loading){
      this.loading = this.http.post<ClientConfig>(environment.API_URL + '/api/getClientConfig', {}).toPromise()
        .then(config => this.config = {...EMPTY, ...(config || {})})
        .catch(error => {
          console.log('Could not load client config', error)
          // Try again next time instead of caching the failure
          this.loading = null
          return EMPTY
        })
    }
    return this.loading
  }

  get googleMapsKey(): string {
    return this.config.googleMapsKey
  }

  get testCallingNumber(): string {
    return this.config.testCallingNumber
  }
}
