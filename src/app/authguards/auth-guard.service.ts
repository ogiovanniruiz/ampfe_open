import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, Route, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import decode from 'jwt-decode';
import { UserService } from '../services/user.service';
import { map } from 'rxjs';
import { version } from '../../environments/version';
import {MatDialog} from '@angular/material/dialog';
import { LoginDialog, loginDialogConfig } from '../dialogs/loginDialog/loginDialog';
import { OAuthService } from 'angular-oauth2-oidc';

@Injectable({
  providedIn: 'root'
})

export class AuthGuard  {

  constructor(private userService: UserService, private router: Router, public dialog: MatDialog, private oauthService: OAuthService) {}

  canActivate(activatedRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | UrlTree | Promise<boolean | UrlTree> | boolean {

    const user = sessionStorage.getItem('user');
    
    if (!user && !state.url.includes('/home')) {
      this.openLoginDialog();
      console.log("NO USER", state.url)
      return this.router.createUrlTree(['/']);
    }

    const token = sessionStorage.getItem('jwt');

    if (token && decode(token).exp < Math.floor(Date.now() / 1000)) {
      console.log("TOKEN EXPIRED")
      this.logOut(false);
      return this.router.createUrlTree(['/']);
    }

    return this.userService.checkVersion(version.version).pipe(
      map((result) => {
        if (result?.['sync']) return true;

        console.log("VERSION MISMATCH")

        this.clearSessionAndRedirect();
        return this.router.createUrlTree(['/']);
      })
    );
  }

  // Same as clicking Log Off: used when the JWT expires
  logOut(navigate: boolean = true): void {
    ['user', 'jwt', 'rdr'].forEach(key => sessionStorage.removeItem(key));
    this.oauthService.logOut();
    if (navigate) this.router.navigate(['/']);
    this.openLoginDialog();
  }

  clearSessionAndRedirect(): void {
    ['user', 'jwt', 'rdr'].forEach(key => sessionStorage.removeItem(key));
    this.openLoginDialog();
  }

  openLoginDialog(){
    this.dialog.open(LoginDialog, loginDialogConfig());
  }
    
}
