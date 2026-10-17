import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { provideOAuthClient } from 'angular-oauth2-oidc';

// What the app module gives every page, for specs: HTTP requests go to the testing backend (none reach a
// server; they stay pending), an empty router, no animations, the real OAuth service and the service worker
// disabled as in development (SwPush and SwUpdate exist but do nothing)
export const testProviders: (Provider | EnvironmentProviders)[] = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  provideNoopAnimations(),
  provideOAuthClient(),
  provideServiceWorker('ngsw-worker.js', {enabled: false}),
];

// A signed-in session as the pages expect to find it in sessionStorage
export function seedSession(){
  sessionStorage.setItem('user', JSON.stringify({_id: 'test-user', name: {firstName: 'Test', lastName: 'User'}, dev: false}));
  sessionStorage.setItem('orgID', 'test-org');
  sessionStorage.setItem('orgName', 'Test Org');
  sessionStorage.setItem('campaignID', 'test-campaign');
  sessionStorage.setItem('campaignName', 'Test Campaign');
  sessionStorage.setItem('activityID', 'test-activity');
}

export function clearSession(){
  sessionStorage.clear();
}
