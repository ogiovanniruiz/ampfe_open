import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TextingComponent } from './texting.component';

describe('TextingComponent', () => {
  let component: TextingComponent;
  let fixture: ComponentFixture<TextingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ TextingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TextingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
