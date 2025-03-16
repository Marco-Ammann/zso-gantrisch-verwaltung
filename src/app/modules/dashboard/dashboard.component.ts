import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AuthService } from '../../auth/services/auth.service';
import { AusbildungService } from '../../core/services/ausbildung.service';
import { PersonService } from '../../core/services/person.service';
import { TeilnahmeService } from '../../core/services/teilnahme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
    DatePipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private ausbildungService = inject(AusbildungService);
  private personService = inject(PersonService);
  private teilnahmeService = inject(TeilnahmeService);

  // State signals
  isLoading = signal(true);
  upcomingTrainings = signal<any[]>([]);
  pastTrainings = signal<any[]>([]);
  personCount = signal({ total: 0, aktiv: 0, inaktiv: 0, neu: 0 });
  trainingStats = signal({ total: 0, thisYear: 0, upcoming: 0 });
  recentParticipations = signal<any[]>([]);
  
  // User permissions
  canEdit = this.authService.canEdit;
  canDelete = this.authService.canDelete;
  userName = signal('');
  currentDate = new Date();

  ngOnInit(): void {
    // Set user name for greeting
    const user = this.authService.currentUser();
    if (user?.displayName) {
      this.userName.set(user.displayName.split(' ')[0]);
    }
    
    this.loadDashboardData();
  }

  /**
   * Load all dashboard data including trainings, persons and participations
   */
  async loadDashboardData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      await Promise.all([
        this.loadPersonData(),
        this.loadTrainingData(),
        this.loadParticipationData()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Load person statistics for dashboard
   */
  private async loadPersonData(): Promise<void> {
    await this.personService.loadPersonen();
    const persons = this.personService.personen();
    
    const counts = {
      total: persons.length,
      aktiv: persons.filter(p => p.zivilschutz.status === 'aktiv').length,
      inaktiv: persons.filter(p => p.zivilschutz.status === 'inaktiv').length,
      neu: persons.filter(p => p.zivilschutz.status === 'neu').length
    };
    
    this.personCount.set(counts);
  }
  
  /**
   * Load training data and split into upcoming/past trainings
   */
  private async loadTrainingData(): Promise<void> {
    await this.ausbildungService.loadAusbildungen();
    const ausbildungen = this.ausbildungService.ausbildungen();
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Process all ausbildungen to determine upcoming and past
    const upcoming: any[] = [];
    const past: any[] = [];
    let upcomingCount = 0;
    let thisYearCount = 0;
    
    ausbildungen.forEach(ausbildung => {
      // Choose which date field to use (either datum or startDatum)
      let trainDate: Date;
      if (ausbildung.startDatum && typeof ausbildung.startDatum.toDate === 'function') {
        trainDate = ausbildung.startDatum.toDate();
      } else if (ausbildung.datum && typeof ausbildung.datum.toDate === 'function') {
        trainDate = ausbildung.datum.toDate();
      } else {
        // If no valid date, use a fallback
        trainDate = new Date(ausbildung.jahr, 0, 1); // January 1st of the year
      }
      
      if (trainDate.getFullYear() === currentYear) {
        thisYearCount++;
      }
      
      const isUpcoming = trainDate >= today;
      const formattedItem = {
        ...ausbildung,
        formattedDate: this.formatDate(trainDate),
        daysUntil: isUpcoming ? this.daysBetween(today, trainDate) : null,
        daysAgo: !isUpcoming ? this.daysBetween(trainDate, today) : null,
        trainDate: trainDate
      };
      
      if (isUpcoming) {
        upcomingCount++;
        upcoming.push(formattedItem);
      } else {
        past.push(formattedItem);
      }
    });
    
    // Sort upcoming by date (ascending)
    upcoming.sort((a, b) => a.trainDate - b.trainDate);
    
    // Sort past by date (descending)
    past.sort((a, b) => b.trainDate - a.trainDate);
    
    // Take only the most recent trainings for display
    this.upcomingTrainings.set(upcoming.slice(0, 5));
    this.pastTrainings.set(past.slice(0, 5));
    
    // Update training stats
    this.trainingStats.set({
      total: ausbildungen.length,
      thisYear: thisYearCount,
      upcoming: upcomingCount
    });
  }
  
  /**
   * Load recent participation data
   */
  private async loadParticipationData(): Promise<void> {
    await this.teilnahmeService.loadTeilnahmen();
    const teilnahmen = this.teilnahmeService.teilnahmen();
    
    // Add person info to participations
    const personsMap = new Map(
      this.personService.personen().map(p => [p.id, p])
    );
    
    // Add ausbildung info to participations
    const ausbildungenMap = new Map(
      this.ausbildungService.ausbildungen().map(a => [a.id, a])
    );
    
    // Combine data for display
    const participationsWithDetails = teilnahmen
      .filter(t => personsMap.has(t.personId) && ausbildungenMap.has(t.ausbildungId))
      .map(t => {
        const person = personsMap.get(t.personId)!;
        const ausbildung = ausbildungenMap.get(t.ausbildungId)!;
        
        return {
          ...t,
          personName: `${person.grunddaten.grad} ${person.grunddaten.nachname} ${person.grunddaten.vorname}`,
          ausbildungTitle: ausbildung.titel,
          ausbildungTyp: ausbildung.typ,
          formattedDate: this.formatDate(t.datum)
        };
      });
    
    // Sort by date (descending) and take only recent ones
    participationsWithDetails.sort((a, b) => {
      const dateA = this.getDateObject(a.datum);
      const dateB = this.getDateObject(b.datum);
      return dateB.getTime() - dateA.getTime();
    });
    
    this.recentParticipations.set(participationsWithDetails.slice(0, 10));
  }
  
  /**
   * Helper to get JavaScript Date object from various date formats
   */
  private getDateObject(date: any): Date {
    if (typeof date === 'object' && date !== null && typeof date.toDate === 'function') {
      return date.toDate();
    }
    if (date instanceof Date) {
      return date;
    }
    return new Date(date);
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    const diff = Math.abs(date2.getTime() - date1.getTime());
    return Math.round(diff / oneDay);
  }
  
  /**
   * Format date for display
   */
  formatDate(date: any): string {
    if (!date) return 'Kein Datum';
    
    try {
      let jsDate: Date;
      if (typeof date.toDate === 'function') {
        jsDate = date.toDate();
      } else if (date instanceof Date) {
        jsDate = date;
      } else {
        jsDate = new Date(date);
      }
      
      return jsDate.toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Ungültiges Datum';
    }
  }
  
  /**
   * Navigate to persons list
   */
  navigateToPersons(): void {
    this.router.navigate(['/personen']);
  }
  
  /**
   * Navigate to trainings list
   */
  navigateToTrainings(): void {
    this.router.navigate(['/ausbildungen']);
  }
  
  /**
   * Navigate to training details
   */
  viewTraining(ausbildungId: string): void {
    this.router.navigate(['/ausbildungen', ausbildungId]);
  }
  
  /**
   * Navigate to person details
   */
  viewPerson(personId: string): void {
    this.router.navigate(['/personen', personId]);
  }
  
  /**
   * Get class for training type
   */
  getTypClass(typ: string): string {
    return typ ? `typ-${typ}` : '';
  }
}