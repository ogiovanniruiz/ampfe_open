import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { OAuthModule } from 'angular-oauth2-oidc';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from './material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


import { ContactFormDialog } from './dialogs/contactForm';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { UserProfileDialog } from './dialogs/userProfile';
import { StorageModule } from '@ngx-pwa/local-storage';
import { FlexLayoutModule } from "@angular/flex-layout";
import { DatePipe } from '@angular/common';


@NgModule({
  declarations: [AppComponent, ContactFormDialog, UserProfileDialog],
  entryComponents: [ContactFormDialog, UserProfileDialog],
  imports: [
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MaterialModule,
    FlexLayoutModule,


    OAuthModule.forRoot({   
      resourceServer: {
        allowedUrls: ['http://localhost:4200'],
        sendAccessToken: true
      }
    }),

    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),

    StorageModule.forRoot({ IDBNoWrap: true })  
  ],
  providers: [DatePipe],
  bootstrap: [AppComponent]
})

export class AppModule { }
