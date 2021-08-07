import { TestBed } from '@angular/core/testing';

import { AddressParserService } from './address-parser.service';

describe('AddressParserService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AddressParserService = TestBed.get(AddressParserService);
    expect(service).toBeTruthy();
  });
});
