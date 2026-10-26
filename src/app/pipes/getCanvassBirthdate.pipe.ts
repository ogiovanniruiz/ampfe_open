import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'getCanvassBirthdate',
  standalone: false
})

export class GetCanvassBirthdatePipe implements PipeTransform {
  transform(value: any): any {
    let timeDiff = Math.abs(Date.now() - (new Date(value).getTime()));
    let age = Math.floor((timeDiff / (1000 * 3600 * 24))/365.25);
    return age;
  }
}
