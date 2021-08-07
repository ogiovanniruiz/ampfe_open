import { TestBed } from '@angular/core/testing';

import { CanvassService } from './canvass.service';

describe('CanvassService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CanvassService = TestBed.get(CanvassService);
    expect(service).toBeTruthy();
  });
});
