import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, Route } from '@angular/router';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/map';
import decode from 'jwt-decode';
import { version } from '../../../package.json';
import { UserService } from '../services/user/user.service';

@Injectable({
  providedIn: 'root'
})

export class AuthGuard implements CanActivate {

  constructor(private userService: UserService) {}

  canActivate(activatedRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise <boolean> | boolean {
    
    if (activatedRoute.queryParams.dir) {
      return this.userService.processLink(activatedRoute.queryParams.dir).map(
        activityDetails => {

          if (activityDetails['exp'] < Math.floor(Date.now() / 1000)) {
            return false;
          }

          if (!activityDetails['campaignID']) { return false; }
          if (!activityDetails['orgID']) { return false; }

          return true;
      });
    }

    const stringProfile = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('jwt');

    if (token) {
      const tokenPayload = decode(token);

      if (tokenPayload.exp < Math.floor(Date.now() / 1000)) {
        return false;
      }

      if (tokenPayload.version !== version) {
        return false;
      }

      if (stringProfile) {
        return true;
      }

      return false;
    }

    return false;
  }
}
