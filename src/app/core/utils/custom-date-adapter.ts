// src/app/core/utils/custom-date-adapter.ts
import { Injectable, Inject } from '@angular/core';
import { NativeDateAdapter, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

// Anpassung des DateAdapters für das schweizer Format
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  constructor(@Inject(MAT_DATE_LOCALE) matDateLocale: string) {
    super(matDateLocale);
  }
  
  /**
   * Parses a date string in the format `dd/mm/yyyy` and returns a `Date` object.
   * If the input string is not in the correct format or represents an invalid date,
   * it falls back to the base class's `parse` method.
   *
   * @param value - The date string to parse.
   * @returns A `Date` object if the input string is valid, otherwise `null`.
   */
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
  
  /**
   * Formats a given date into a string based on the specified display format.
   *
   * @param date - The date to format. If the date is null or undefined, an empty string is returned.
   * @param displayFormat - The format in which the date should be displayed. This parameter is not used in the current implementation.
   * @returns A string representing the formatted date in the format 'dd/MM/yyyy'.
   */
  override format(date: Date, displayFormat: any): string {
    if (!date) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }
}

// Definition der Datumsformate
/**
 * Custom date formats used for parsing and displaying dates in the application.
 * 
 * The `CUSTOM_DATE_FORMATS` object defines the formats for parsing and displaying dates.
 * 
 * - `parse.dateInput`: Format used for parsing date input strings.
 * - `display.dateInput`: Format used for displaying date input strings.
 * - `display.monthYearLabel`: Format used for displaying month and year labels.
 * - `display.dateA11yLabel`: Format used for displaying accessible date labels.
 * - `display.monthYearA11yLabel`: Format used for displaying accessible month and year labels.
 * 
 * Formats:
 * - `DD/MM/YYYY`: Day/Month/Year format.
 * - `MMM YYYY`: Abbreviated month and year format.
 * - `MMMM YYYY`: Full month and year format.
 */
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