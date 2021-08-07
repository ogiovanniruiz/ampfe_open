import { TestBed } from '@angular/core/testing';

import { TextingService } from './texting.service';

describe('TextingService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TextingService = TestBed.get(TextingService);
    expect(service).toBeTruthy();
  });
});
