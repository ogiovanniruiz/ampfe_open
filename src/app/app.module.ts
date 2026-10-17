import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { OAuthModule } from 'angular-oauth2-oidc';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig } from '@angular/material/dialog';
import { MAT_PAGINATOR_DEFAULT_OPTIONS } from '@angular/material/paginator';
import { MAT_BUTTON_TOGGLE_DEFAULT_OPTIONS } from '@angular/material/button-toggle';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { MaterialModule } from './material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


import { ContactFormDialog } from './dialogs/contactForm/contactForm';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { UserProfileDialog } from './dialogs/userProfile/userProfile';
import { StorageModule } from '@ngx-pwa/local-storage';

import { DatePipe } from '@angular/common';
import { LoginDialog } from './dialogs/loginDialog/loginDialog';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { MapDialog } from './dialogs/mapDialog/mapDialog';
import { LeafletDrawModule } from '@bluehalo/ngx-leaflet-draw';

@NgModule({
    declarations: [AppComponent, ContactFormDialog, UserProfileDialog, LoginDialog, MapDialog],
    imports: [
        AppRoutingModule,
        BrowserAnimationsModule,
        MaterialModule,
       
        LeafletModule,
        LeafletDrawModule,
        OAuthModule.forRoot({
            resourceServer: {
                allowedUrls: ['http://localhost:4200'],
                sendAccessToken: true
            }
        }),
        ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
        StorageModule.forRoot({ IDBNoWrap: true })
    ],
    providers: [DatePipe, provideHttpClient(withXhr(), withInterceptorsFromDi()), {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
                // Every dialog gets the app-dialog panel: full screen on phones (styles.scss); on desktop each keeps its own size
                {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {...new MatDialogConfig(), panelClass: 'app-dialog'}},
                // Legacy paginators used an underline page-size field (MDC: a compact outline); fill gets the legacy underline look in styles.scss
                {provide: MAT_PAGINATOR_DEFAULT_OPTIONS, useValue: {formFieldAppearance: 'fill'}},
                // v17 toggles show a checkmark on the selected button; ours never had one
                {provide: MAT_BUTTON_TOGGLE_DEFAULT_OPTIONS, useValue: {hideSingleSelectionIndicator: true, hideMultipleSelectionIndicator: true}}],
    bootstrap: [AppComponent]
})

export class AppModule { }
