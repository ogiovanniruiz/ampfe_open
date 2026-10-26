import { ApplicationRef, Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { concat, interval } from 'rxjs';
import { filter, first } from 'rxjs/operators';

// How often an open tab asks the server whether a new version has been deployed
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

// The service worker keeps serving the cached app after a deploy until it is told to switch.
// This checks for new versions and offers a reload, so nobody is left on an old build.
@Injectable({ providedIn: 'root' })
export class AppUpdateService {

  private started = false;

  constructor(private swUpdate: SwUpdate, private appRef: ApplicationRef, private snackBar: MatSnackBar) {}

  start() {
    // The service worker only runs in production builds
    if (this.started || !this.swUpdate.isEnabled) return;
    this.started = true;

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.promptReload('A new version of Amplify is available.', true));

    // The cached app can't be served anymore (e.g. files were removed from the server)
    this.swUpdate.unrecoverable.subscribe(() => this.promptReload('Amplify needs to reload to keep working.', false));

    // Wait until the app is stable so polling doesn't keep the service worker from registering
    const appIsStable = this.appRef.isStable.pipe(first(isStable => isStable === true));
    concat(appIsStable, interval(CHECK_INTERVAL_MS)).subscribe(() => this.checkForUpdate());

    // Someone returning to a tab left open for hours gets checked straight away
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.checkForUpdate();
    });
  }

  private checkForUpdate() {
    this.swUpdate.checkForUpdate().catch(error => console.log('Update check failed:', error));
  }

  private promptReload(message: string, activateFirst: boolean) {
    this.snackBar.open(message, 'Reload').onAction().subscribe(async () => {
      if (activateFirst) {
        await this.swUpdate.activateUpdate().catch(error => console.log(error));
      }
      document.location.reload();
    });
  }
}
