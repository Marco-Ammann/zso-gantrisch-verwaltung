// src/app/core/utils/custom-date-adapter.ts
import { Injectable, Inject } from '@angular/core';
import { NativeDateAdapter, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

// Anpassung des DateAdapters für das schweizer Format
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  constructor(@Inject(MAT_DATE_LOCALE) matDateLocale: string) {
    super(matDateLocale);
  }
  
  override parse(value: string): Date | null {
    if (!value) return null;
    
    // Parsen von dd/mm/yyyy Format
    const parts = value.split('/');
    if (parts.length === 3) {
      const day = Number(parts[0]);
      const month = Number(parts[1]) - 1; // Monate sind 0-indexiert
      const year = Number(parts[2]);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
        // Überprüfen, ob das Datum gültig ist
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date;
        }
      }
    }
    
    return super.parse(value);
  }
  
  override format(date: Date, displayFormat: any): string {
    if (!date) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }
}

// Definition der Datumsformate
export const CUSTOM_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};