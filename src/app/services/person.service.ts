import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonService {

  private API_URL = environment.API_URL;

  constructor(private http: HttpClient) {}

  getPerson(person: Object){
    return this.http.post(this.API_URL + '/api/getPerson', person);
  }

}
