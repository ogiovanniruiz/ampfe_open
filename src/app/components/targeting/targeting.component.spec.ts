import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TargetingComponent } from './targeting.component';

describe('TargetingComponent', () => {
  let component: TargetingComponent;
  let fixture: ComponentFixture<TargetingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TargetingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TargetingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
