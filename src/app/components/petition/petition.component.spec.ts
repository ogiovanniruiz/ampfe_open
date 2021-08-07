import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PetitionComponent } from './petition.component';

describe('PetitionComponent', () => {
  let component: PetitionComponent;
  let fixture: ComponentFixture<PetitionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PetitionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PetitionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
