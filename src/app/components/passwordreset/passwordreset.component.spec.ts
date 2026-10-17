import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordresetComponent } from './passwordreset.component';
import { PasswordresetModule } from './passwordreset.module';
import { testProviders, seedSession, clearSession } from '../../../testing/test-providers';

describe('PasswordresetComponent', () => {
  let component: PasswordresetComponent;
  let fixture: ComponentFixture<PasswordresetComponent>;

  beforeEach(async () => {
    seedSession();
    await TestBed.configureTestingModule({
      imports: [PasswordresetModule],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordresetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => clearSession());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
