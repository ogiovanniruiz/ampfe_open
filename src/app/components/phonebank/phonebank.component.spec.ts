import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PhonebankComponent } from './phonebank.component';

describe('PhonebankComponent', () => {
  let component: PhonebankComponent;
  let fixture: ComponentFixture<PhonebankComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PhonebankComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PhonebankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
