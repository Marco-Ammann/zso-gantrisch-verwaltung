import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { PersonService, AusbildungService, TeilnahmeService } from '../../core/services';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Ausbildung } from '../../core/models/ausbildung.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule,
    MatTableModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private personService = inject(PersonService);
  private ausbildungService = inject(AusbildungService);
  private teilnahmeService = inject(TeilnahmeService);
  private router = inject(Router);
  anstehendeAusbildungen = signal<Ausbildung[]>([]);
  
  // Benutzer aus dem AuthService
  currentUser = this.authService.currentUser;
  
  // Ladezustände
  isLoading = signal(true);
  
  // Statistiken
  personenStats = signal({
    total: 0,
    aktiv: 0,
    inaktiv: 0,
    neu: 0
  });
  
  ausbildungsStats = signal({
    total: 0,
    wk: 0,
    lg: 0,
    andere: 0,
    aktuellesJahr: 0
  });
  
  teilnahmeStats = signal({
    total: 0,
    teilgenommen: 0,
    dispensiert: 0,
    nichtTeilgenommen: 0,
    teilnahmeQuote: 0
  });
  
  // Kommende Ausbildungen
  kommendeAusbildungen = signal<any[]>([]);
  
  // Letzte Ausbildungen mit Teilnahmen
  letzteAusbildungen = signal<any[]>([]);
  
  // Aktuelle Woche und Datum
  currentWeek = 'KW ' + this.getWeekNumber(new Date());
  today = new Date();
  
  // Anzeige-Spalten für die Tabellen
  displayedColumnsKommend = ['titel', 'typ', 'jahr', 'teilnehmer', 'aktionen'];
  displayedColumnsLetzt = ['titel', 'typ', 'datum', 'teilnehmer', 'aktionen'];
  
  constructor() {
    // Daten laden
    this.loadData();
  }
  
  /**
   * Lädt alle benötigten Daten
   */
  async loadData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      // Personen laden
      await this.personService.loadPersonen();
      const personen = this.personService.personen();
      
      // Personenstatistik berechnen
      const personenCounts = this.personService.getPersonCountByStatus();
      this.personenStats.set({
        total: personen.length,
        aktiv: personenCounts.aktiv,
        inaktiv: personenCounts.inaktiv,
        neu: personenCounts.neu
      });
      
      // Ausbildungen laden
      await this.ausbildungService.loadAusbildungen();
      const ausbildungen = this.ausbildungService.ausbildungen();
      
      // Aktuelles Jahr
      const currentYear = new Date().getFullYear();
      
      // Ausbildungsstatistik berechnen
      const ausbildungenAktuellesJahr = ausbildungen.filter(a => a.jahr === currentYear);
      const wkCount = ausbildungen.filter(a => a.typ === 'WK').length;
      const lgCount = ausbildungen.filter(a => a.typ === 'LG').length;
      
      this.ausbildungsStats.set({
        total: ausbildungen.length,
        wk: wkCount,
        lg: lgCount,
        andere: ausbildungen.length - wkCount - lgCount,
        aktuellesJahr: ausbildungenAktuellesJahr.length
      });
      
      // Teilnahmen laden
      await this.teilnahmeService.loadTeilnahmen();
      const teilnahmen = this.teilnahmeService.teilnahmen();
      
      // Teilnahmestatistik berechnen
      const teilgenommenCount = teilnahmen.filter(t => t.status === 'teilgenommen').length;
      const dispensiertCount = teilnahmen.filter(t => t.status === 'dispensiert').length;
      const nichtTeilgenommenCount = teilnahmen.filter(t => t.status === 'nicht teilgenommen').length;
      
      this.teilnahmeStats.set({
        total: teilnahmen.length,
        teilgenommen: teilgenommenCount,
        dispensiert: dispensiertCount,
        nichtTeilgenommen: nichtTeilgenommenCount,
        teilnahmeQuote: teilnahmen.length > 0 ? Math.round((teilgenommenCount / teilnahmen.length) * 100) : 0
      });
      
      // Kommende Ausbildungen (des aktuellen oder nächsten Jahres)
      const kommend = ausbildungen
        .filter(a => a.jahr >= currentYear)
        .sort((a, b) => a.jahr - b.jahr || a.titel.localeCompare(b.titel))
        .slice(0, 5)
        .map(a => ({
          ...a,
          teilnehmerCount: teilnahmen.filter(t => t.ausbildungId === a.id).length
        }));
      
      this.kommendeAusbildungen.set(kommend);
      
      // Letzte Ausbildungen mit Teilnahmen
      const ausbildungenMitTeilnahmen = ausbildungen
        .filter(a => teilnahmen.some(t => t.ausbildungId === a.id))
        .map(a => {
          const ausbildungsTeilnahmen = teilnahmen.filter(t => t.ausbildungId === a.id);
          const letzteDatum = this.getLatestDate(ausbildungsTeilnahmen.map(t => t.datum));
          
          return {
            ...a,
            teilnehmerCount: ausbildungsTeilnahmen.length,
            letztesDatum: letzteDatum
          };
        })
        .sort((a, b) => {
          if (!a.letztesDatum) return 1;
          if (!b.letztesDatum) return -1;
          return this.compareDates(b.letztesDatum, a.letztesDatum); // Absteigend sortieren
        })
        .slice(0, 5);
      
      this.letzteAusbildungen.set(ausbildungenMitTeilnahmen);
    } catch (error) {
      console.error('Fehler beim Laden der Dashboard-Daten:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
  
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
  
  /**
   * Gibt das neueste Datum aus einem Array von Datumsobjekten zurück
   */
  private getLatestDate(dates: (Date | any)[]): Date | null {
    if (!dates || dates.length === 0) return null;
    
    return dates.reduce((latest, current) => {
      // Wenn current ein Firestore Timestamp ist
      if (current && typeof current.toDate === 'function') {
        current = current.toDate();
      } else if (typeof current === 'string' || typeof current === 'number') {
        current = new Date(current);
      }
      
      if (!latest) return current;
      
      // Wenn latest ein Firestore Timestamp ist
      if (latest && typeof latest.toDate === 'function') {
        latest = latest.toDate();
      } else if (typeof latest === 'string' || typeof latest === 'number') {
        latest = new Date(latest);
      }
      
      return current > latest ? current : latest;
    }, null);
  }
  
  /**
   * Vergleicht zwei Datumsobjekte
   */
  private compareDates(date1: any, date2: any): number {
    // Konvertieren zu Date-Objekten, falls es sich um Timestamps handelt
    let d1: Date;
    let d2: Date;
    
    if (date1 && typeof date1.toDate === 'function') {
      d1 = date1.toDate();
    } else if (date1 instanceof Date) {
      d1 = date1;
    } else {
      d1 = new Date(date1);
    }
    
    if (date2 && typeof date2.toDate === 'function') {
      d2 = date2.toDate();
    } else if (date2 instanceof Date) {
      d2 = date2;
    } else {
      d2 = new Date(date2);
    }
    
    return d1.getTime() - d2.getTime();
  }
  
  /**
   * Formatiert ein Datum für die Anzeige
   */
  formatDate(date: any): string {
    if (!date) return '-';
    
    try {
      // Wenn date ein Firestore Timestamp ist
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('de-CH');
      }
      
      // Wenn date ein Date-Objekt oder ein String ist
      return new Date(date).toLocaleDateString('de-CH');
    } catch (error) {
      return '-';
    }
  }
  
  /**
   * Navigiert zur Ausbildungsdetailansicht
   */
  viewAusbildung(ausbildungId: string): void {
    this.router.navigate(['/ausbildungen', ausbildungId]);
  }
  
  /**
   * Navigiert zur Teilnahmeerfassung
   */
  erfasseTeilnahme(ausbildungId: string): void {
    this.router.navigate(['/ausbildungen/teilnahmen', ausbildungId]);
  }
  
  /**
   * Navigiert zur Personenliste
   */
  gotoPersonen(): void {
    this.router.navigate(['/personen']);
  }
  
  /**
   * Navigiert zur Ausbildungsliste
   */
  gotoAusbildungen(): void {
    this.router.navigate(['/ausbildungen']);
  }
  
  /**
   * Navigiert zur Ausbildungsmatrix
   */
  gotoMatrix(): void {
    this.router.navigate(['/ausbildungen/matrix']);
  }
}