import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'customTitleCase',
  standalone: true
})
export class CustomTitleCasePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
}