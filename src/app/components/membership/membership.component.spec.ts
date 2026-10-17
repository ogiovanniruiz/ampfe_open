import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembershipComponent } from './membership.component';
import { MembershipModule } from './membership.module';
import { testProviders, seedSession, clearSession } from '../../../testing/test-providers';

describe('MembershipComponent', () => {
  let component: MembershipComponent;
  let fixture: ComponentFixture<MembershipComponent>;

  beforeEach(async () => {
    seedSession();
    await TestBed.configureTestingModule({
      imports: [MembershipModule],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembershipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => clearSession());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
