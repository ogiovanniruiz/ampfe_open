import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityComponent } from './activity.component';
import { ActivityModule } from './activity.module';
import { testProviders, seedSession, clearSession } from '../../../testing/test-providers';

describe('ActivityComponent', () => {
  let component: ActivityComponent;
  let fixture: ComponentFixture<ActivityComponent>;

  beforeEach(async () => {
    seedSession();
    await TestBed.configureTestingModule({
      imports: [ActivityModule],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => clearSession());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
