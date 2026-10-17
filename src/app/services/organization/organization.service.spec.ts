import { TestBed } from '@angular/core/testing';

import { testProviders } from '../../../testing/test-providers';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  beforeEach(() => TestBed.configureTestingModule({providers: testProviders}));

  it('should be created', () => {
    const service: OrganizationService = TestBed.inject(OrganizationService);
    expect(service).toBeTruthy();
  });
});
