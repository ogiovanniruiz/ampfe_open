import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {

  // Url of the Identity Provider
  issuer: 'https://accounts.google.com',

  // URL of the SPA to redirect the user to after login
  redirectUri: window.location.origin,

  // The SPA's id. The SPA is registerd with this id at the auth-server
  //clientId: '1004270452653-m396kcs7jc3970turlp7ffh6bv4t1b86.apps.googleusercontent.com',
  clientId: '644176538798-2el72bkqm0er53npir2sd1imr3vj4ou2.apps.googleusercontent.com', 

  strictDiscoveryDocumentValidation: false,
  // set the scope for the permissions the client should request
  // The first three are defined by OIDC. The 4th is a usecase-specific one
  scope: 'openid profile email',

  showDebugInformation: false,

  sessionChecksEnabled: false
}
