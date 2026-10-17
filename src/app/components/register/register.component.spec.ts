import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterComponent } from './register.component';
import { RegisterModule } from './register.module';
import { testProviders, seedSession, clearSession } from '../../../testing/test-providers';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    seedSession();
    await TestBed.configureTestingModule({
      imports: [RegisterModule],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => clearSession());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
