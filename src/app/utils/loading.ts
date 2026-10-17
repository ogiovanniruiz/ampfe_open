import { TimeoutError } from 'rxjs';

// How long a page's first load may take before it gives up and shows an error with Retry
export const LOAD_TIMEOUT_MS = 20000

// Searches and reports that scan a lot of data get longer before giving up
export const SLOW_LOAD_TIMEOUT_MS = 60000

export const MISSING_ACTIVITY_MSG = "This activity couldn't be found. It may have been deleted."

// "Couldn't load your campaigns: the server didn't respond." and the like
export function loadErrorText(what: string, error: any): string {
  return error instanceof TimeoutError
    ? `Couldn't load ${what}: the server didn't respond.`
    : `Couldn't load ${what}: the server had a problem.`
}
