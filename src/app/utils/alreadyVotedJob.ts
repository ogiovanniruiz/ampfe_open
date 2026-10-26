import { Observable, timer } from 'rxjs';
import { exhaustMap, filter, map, switchMap, take, tap, timeout } from 'rxjs/operators';
import { LOAD_TIMEOUT_MS } from './loading';

const POLL_MS = 2000

// A whole campaign can take minutes to check; give up after this and show the retry message
const JOB_TIMEOUT_MS = 10 * 60 * 1000

// The server runs removals in the background ({jobID} back right away); poll until the counts are ready.
// Errors if the job fails, disappears (server restarted) or runs past JOB_TIMEOUT_MS.
export function runAlreadyVotedJob(start$: Observable<any>, poll: (jobID: string) => Observable<any>,
                                   onProgress: (done: number, total: number) => void): Observable<any> {
  return start$.pipe(
    timeout(LOAD_TIMEOUT_MS),
    switchMap((started: any) => timer(0, POLL_MS).pipe(
      exhaustMap(() => poll(started.jobID).pipe(timeout(LOAD_TIMEOUT_MS))),
      tap((job: any) => onProgress(job.done || 0, job.total || 0)),
      filter((job: any) => job.status !== 'running'),
      take(1),
      map((job: any) => {
        if(job.status !== 'done') throw new Error('Already voted job failed')
        return job.result
      })
    )),
    timeout({first: JOB_TIMEOUT_MS})
  )
}

// "Checking activities… 12 of 43"
export function alreadyVotedProgressText(done: number, total: number): string {
  return total ? `Checking activities… ${done} of ${total}` : 'Checking activities…'
}
