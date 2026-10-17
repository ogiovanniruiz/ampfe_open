import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextingComponent } from './texting.component';
import { TextingModule } from './texting.module';
import { testProviders, seedSession, clearSession } from '../../../testing/test-providers';

describe('TextingComponent', () => {
  let component: TextingComponent;
  let fixture: ComponentFixture<TextingComponent>;

  beforeEach(async () => {
    seedSession();
    await TestBed.configureTestingModule({
      imports: [TextingModule],
      providers: testProviders
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => clearSession());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
