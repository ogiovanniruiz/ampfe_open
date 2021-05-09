import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TextingComponent } from './texting.component';

describe('TextingComponent', () => {
  let component: TextingComponent;
  let fixture: ComponentFixture<TextingComponent>;

  beforeEach(async(() => {
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
