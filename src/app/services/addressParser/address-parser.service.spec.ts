import { TestBed } from '@angular/core/testing';

import { testProviders } from '../../../testing/test-providers';
import { AddressParserService } from './address-parser.service';

describe('AddressParserService', () => {
  beforeEach(() => TestBed.configureTestingModule({providers: testProviders}));

  it('should be created', () => {
    const service: AddressParserService = TestBed.inject(AddressParserService);
    expect(service).toBeTruthy();
  });
});
