import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';

@Pipe({
  name: 'dateFormat'
})

export class dateFormatPipe implements PipeTransform {
  transform(value: any): any {
    return formatDate(value, 'dd/MM/yyyy', 'en');
  }
}
