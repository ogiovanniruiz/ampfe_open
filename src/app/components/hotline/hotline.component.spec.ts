import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HotlineComponent } from './hotline.component';

describe('HotlineComponent', () => {
  let component: HotlineComponent;
  let fixture: ComponentFixture<HotlineComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HotlineComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HotlineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
