import { Pipe, PipeTransform } from '@angular/core';

// Passes are stored from 0 (activity.passes, record.pass); people see them from 1: 0 -> "1st pass"
export function passLabel(pass: number | null | undefined): string {
  const n = (Number(pass) || 0) + 1
  const lastTwo = n % 100
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({1: 'st', 2: 'nd', 3: 'rd'} as {[digit: number]: string})[n % 10] || 'th'
  return `${n}${suffix} pass`
}

@Pipe({
  name: 'passLabel',
  standalone: true,
})
export class PassLabelPipe implements PipeTransform {
  transform(pass: number | null | undefined): string {
    return passLabel(pass)
  }
}
