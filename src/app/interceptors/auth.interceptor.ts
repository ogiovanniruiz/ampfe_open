import { Injectable, Injector } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthGuard } from '../authguards/auth-guard.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  // AuthGuard depends on HttpClient, so resolve it lazily to avoid a circular dependency
  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only send the token to our own API, never to third parties
    if (!req.url.startsWith(environment.API_URL)) return next.handle(req);

    const token = sessionStorage.getItem('jwt');
    const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Only the first 401 logs out; later ones find the session already cleared
        if (error.status === 401 && sessionStorage.getItem('jwt')) {
          this.injector.get(AuthGuard).logOut();
        }
        return throwError(() => error);
      })
    );
  }
}
