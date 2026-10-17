import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { LeafletDrawModule } from '@bluehalo/ngx-leaflet-draw';
import { StorageModule } from '@ngx-pwa/local-storage';

import { AppComponent } from './app.component';
import { MaterialModule } from './material.module';
import { ContactFormDialog } from './dialogs/contactForm/contactForm';
import { UserProfileDialog } from './dialogs/userProfile/userProfile';
import { LoginDialog } from './dialogs/loginDialog/loginDialog';
import { MapDialog } from './dialogs/mapDialog/mapDialog';
import { testProviders, clearSession } from '../testing/test-providers';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    // The app shell's own declarations and imports from app.module (routing comes from testProviders).
    // The toolbar labels use a plain <menu-font> tag styled in styles.scss, so custom elements are allowed here.
    await TestBed.configureTestingModule({
      imports: [RouterModule, MaterialModule, LeafletModule, LeafletDrawModule, StorageModule.forRoot({ IDBNoWrap: true })],
      declarations: [AppComponent, ContactFormDialog, UserProfileDialog, LoginDialog, MapDialog],
      providers: testProviders,
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => clearSession());

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should render the toolbar', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('mat-toolbar')).toBeTruthy();
  });
});
