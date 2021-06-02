import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CanvassComponent } from './canvass.component';

describe('HotlineComponent', () => {
  let component: CanvassComponent;
  let fixture: ComponentFixture<CanvassComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CanvassComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CanvassComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
