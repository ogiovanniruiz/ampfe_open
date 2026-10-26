import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';
import { HomeModule } from './home.module';
import { testProviders, seedSession, clearSession } from '../../../testing/test-providers';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    seedSession();
    await TestBed.configureTestingModule({
      imports: [HomeModule],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => clearSession());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
