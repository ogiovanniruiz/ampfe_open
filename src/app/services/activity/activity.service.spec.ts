import { TestBed } from '@angular/core/testing';

import { ActivityService } from './activity.service';

describe('ActivitiesService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ActivityService = TestBed.get(ActivityService);
    expect(service).toBeTruthy();
  });
});
