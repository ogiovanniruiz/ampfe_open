import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhonebankComponent } from './phonebank.component';
import { PhonebankModule } from './phonebank.module';
import { testProviders, seedSession, clearSession } from '../../../testing/test-providers';

describe('PhonebankComponent', () => {
  let component: PhonebankComponent;
  let fixture: ComponentFixture<PhonebankComponent>;

  beforeEach(async () => {
    seedSession();
    await TestBed.configureTestingModule({
      imports: [PhonebankModule],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhonebankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => clearSession());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
