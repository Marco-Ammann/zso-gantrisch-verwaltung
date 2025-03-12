import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  private authService = inject(AuthService);
  
  // Benutzer aus dem AuthService
  currentUser = this.authService.currentUser;
  
  // Platzhalterdaten für das Dashboard
  stats = {
    aktiveBetreuer: 25,
    anstehendeKurse: 3,
    offeneAufgaben: 7,
    auslastungProzent: 85
  };
  
  // Aktuelle Woche und Datum
  currentWeek = 'KW ' + this.getWeekNumber(new Date());
  today = new Date();
  
  /**
   * Berechnet die Kalenderwoche
   * @param date Datum
   * @returns Kalenderwoche als Zahl
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}