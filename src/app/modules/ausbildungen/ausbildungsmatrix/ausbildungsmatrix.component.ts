// src/app/modules/ausbildungen/ausbildungsmatrix/ausbildungsmatrix.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ViewChild } from '@angular/core';

import { AusbildungService, PersonService, TeilnahmeService } from '../../../core/services';
import { Ausbildung } from '../../../core/models/ausbildung.model';
import { Person } from '../../../core/models/person.model';
import { Ausbildungsteilnahme } from '../../../core/models/teilnahme.model';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/utils/custom-date-adapter';
interface MatrixRow {
  person: Person;
  ausbildungen: Map<string, TeilnahmeInfo>;
}

interface TeilnahmeInfo {
  status: 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert';
  datum?: Date;
  bemerkung?: string;
}

@Component({
  selector: 'app-ausbildungsmatrix',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'de-CH' },
    { provide: DateAdapter, useClass: CustomDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }
  ],
  templateUrl: './ausbildungsmatrix.component.html',
  styleUrls: ['./ausbildungsmatrix.component.scss']
})
export class AusbildungsmatrixComponent implements OnInit {
  private personService = inject(PersonService);
  private ausbildungService = inject(AusbildungService);
  private teilnahmeService = inject(TeilnahmeService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Daten
  personen = signal<Person[]>([]);
  ausbildungen = signal<Ausbildung[]>([]);
  teilnahmen = signal<Ausbildungsteilnahme[]>([]);
  displayedColumns = signal<string[]>(['name']);
  
  // Filter
  jahrFilter = new FormControl<number | null>(new Date().getFullYear());
  typFilter = new FormControl<string>('alle');
  searchControl = new FormControl<string>('');
  
  // Zustände
  isLoading = signal(true);
  matrixData = signal<MatrixRow[]>([]);
  
  // Ausbildungstypoptionen
  typOptions = [
    { value: 'alle', label: 'Alle Typen' },
    { value: 'WK', label: 'WK' },
    { value: 'LG', label: 'LG' },
    { value: 'KVK', label: 'KVK' },
    { value: 'Übung', label: 'Übung' },
    { value: 'Kurs', label: 'Kurs' }
  ];
  
  // Datenquellen für die Tabelle
  dataSource = new MatTableDataSource<MatrixRow>([]);
  
  // Jahre für das Auswahlfeld
  jahrOptions: number[] = [];

  ngOnInit(): void {
    this.loadData();
    
    // Filter-Events abonnieren
    this.jahrFilter.valueChanges.subscribe(() => this.updateMatrix());
    this.typFilter.valueChanges.subscribe(() => this.updateMatrix());
    this.searchControl.valueChanges.subscribe(value => {
      this.dataSource.filter = value?.toLowerCase() || '';
    });
  }

  /**
   * Initialisiert die Datenquelle mit MatSort und MatPaginator
   */
  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    
    // Suchfilter definieren
    this.dataSource.filterPredicate = (data: MatrixRow, filter: string) => {
      const searchStr = (
        data.person.grunddaten.grad + ' ' +
        data.person.grunddaten.nachname + ' ' +
        data.person.grunddaten.vorname + ' ' +
        data.person.grunddaten.funktion + ' ' +
        data.person.zivilschutz.einteilung.zug
      ).toLowerCase();
      
      return searchStr.indexOf(filter) !== -1;
    };
  }

  /**
   * Lädt alle erforderlichen Daten
   */
  async loadData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      // Personen laden
      await this.personService.loadPersonen();
      this.personen.set(this.personService.personen());
      
      // Ausbildungen laden
      await this.ausbildungService.loadAusbildungen();
      this.ausbildungen.set(this.ausbildungService.ausbildungen());
      
      // Verfügbare Jahre extrahieren für den Filter
      const jahre = [...new Set(this.ausbildungen().map(a => a.jahr))];
      this.jahrOptions = jahre.sort((a, b) => b - a); // Absteigend sortieren
      
      // Standardwert für Jahrfilter setzen
      if (this.jahrOptions.length > 0 && !this.jahrFilter.value) {
        this.jahrFilter.setValue(this.jahrOptions[0]);
      }
      
      // Teilnahmen laden
      await this.teilnahmeService.loadTeilnahmen();
      this.teilnahmen.set(this.teilnahmeService.teilnahmen());
      
      // Matrix erstellen
      this.updateMatrix();
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      this.showSnackBar('Fehler beim Laden der Daten');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Aktualisiert die Matrix basierend auf den Filtern
   */
  updateMatrix(): void {
    // Filter anwenden
    const selectedJahr = this.jahrFilter.value;
    const selectedTyp = this.typFilter.value;
    
    // Ausbildungen nach Jahr und Typ filtern
    let filteredAusbildungen = this.ausbildungen();
    
    if (selectedJahr !== null) {
      filteredAusbildungen = filteredAusbildungen.filter(a => a.jahr === selectedJahr);
    }
    
    if (selectedTyp && selectedTyp !== 'alle') {
      filteredAusbildungen = filteredAusbildungen.filter(a => a.typ === selectedTyp);
    }
    
    // Nach Titel sortieren
    filteredAusbildungen.sort((a, b) => a.titel.localeCompare(b.titel));
    
    // Spalten für die Tabelle definieren
    const columns = ['name', ...filteredAusbildungen.map(a => a.id)];
    this.displayedColumns.set(columns);
    
    // Matrix-Daten erstellen
    const matrixData: MatrixRow[] = this.personen().map(person => {
      const row: MatrixRow = {
        person,
        ausbildungen: new Map()
      };
      
      // Für jede Ausbildung prüfen, ob eine Teilnahme existiert
      filteredAusbildungen.forEach(ausbildung => {
        const teilnahme = this.teilnahmen().find(
          t => t.personId === person.id && t.ausbildungId === ausbildung.id
        );
        
        if (teilnahme) {
          row.ausbildungen.set(ausbildung.id, {
            status: teilnahme.status,
            datum: teilnahme.datum as Date,
            bemerkung: teilnahme.bemerkung
          });
        }
      });
      
      return row;
    });
    
    this.matrixData.set(matrixData);
    this.dataSource.data = matrixData;
  }

  /**
   * Prüft, ob eine Person an einer Ausbildung teilgenommen hat
   */
  getTeilnahmeInfo(row: MatrixRow, ausbildungId: string): TeilnahmeInfo | undefined {
    return row.ausbildungen.get(ausbildungId);
  }

  /**
   * Liefert die CSS-Klasse für eine Teilnahme basierend auf dem Status
   */
  getTeilnahmeClass(status?: string): string {
    if (!status) return '';
    
    switch (status) {
      case 'teilgenommen': return 'teilgenommen';
      case 'dispensiert': return 'dispensiert';
      case 'nicht teilgenommen': return 'nicht-teilgenommen';
      default: return '';
    }
  }

  /**
   * Liefert ein Symbol für eine Teilnahme basierend auf dem Status
   */
  getTeilnahmeIcon(status?: string): string {
    if (!status) return '';
    
    switch (status) {
      case 'teilgenommen': return 'check_circle';
      case 'dispensiert': return 'warning';
      case 'nicht teilgenommen': return 'cancel';
      default: return '';
    }
  }

  /**
   * Formatiert ein Datum für die Anzeige
   */
  formatDate(date: any): string {
    if (!date) return '';
    
    try {
      // Wenn date ein Firestore Timestamp ist
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('de-CH');
      }
      
      // Wenn date ein Date-Objekt oder ein String ist
      return new Date(date).toLocaleDateString('de-CH');
    } catch (error) {
      return '';
    }
  }

  /**
   * Navigiert zur Personendetailansicht
   */
  viewPerson(person: Person): void {
    this.router.navigate(['/personen', person.id]);
  }

  /**
   * Navigiert zur Ausbildungsdetailansicht
   */
  viewAusbildung(ausbildungId: string): void {
    this.router.navigate(['/ausbildungen', ausbildungId]);
  }

  /**
   * Exportiert die Matrix als CSV-Datei
   */
  exportCsv(): void {
    // Ausbildungen basierend auf aktueller Filterung holen
    const filteredAusbildungen = this.ausbildungen().filter(a => {
      const matchesJahr = this.jahrFilter.value === null || a.jahr === this.jahrFilter.value;
      const matchesTyp = !this.typFilter.value || this.typFilter.value === 'alle' || a.typ === this.typFilter.value;
      return matchesJahr && matchesTyp;
    });
    
    // Header-Zeile erstellen
    let csvContent = 'Grad,Name,Vorname,Funktion,Zug';
    filteredAusbildungen.forEach(ausbildung => {
      csvContent += `,${ausbildung.titel}`;
    });
    csvContent += '\n';
    
    // Daten-Zeilen erstellen
    this.dataSource.filteredData.forEach(row => {
      const person = row.person;
      
      csvContent += `${person.grunddaten.grad},`;
      csvContent += `${person.grunddaten.nachname},`;
      csvContent += `${person.grunddaten.vorname},`;
      csvContent += `${person.grunddaten.funktion},`;
      csvContent += `${person.zivilschutz.einteilung.zug}`;
      
      // Ausbildungsteilnahmen hinzufügen
      filteredAusbildungen.forEach(ausbildung => {
        const teilnahme = row.ausbildungen.get(ausbildung.id);
        csvContent += `,${teilnahme ? teilnahme.status : ''}`;
      });
      
      csvContent += '\n';
    });
    
    // CSV-Datei erstellen und herunterladen
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Ausbildungsmatrix_${this.jahrFilter.value || 'Alle'}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Zeigt eine Snackbar-Benachrichtigung an
   */
  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  /**
   * Gibt den Titel einer Ausbildung zurück
   */
  getAusbildungTitel(ausbildungId: string): string {
    const ausbildung = this.ausbildungen().find(a => a.id === ausbildungId);
    return ausbildung ? ausbildung.titel : '';
  }

  /**
   * Gibt den Typ einer Ausbildung zurück
   */
  getAusbildungTyp(ausbildungId: string): string {
    const ausbildung = this.ausbildungen().find(a => a.id === ausbildungId);
    return ausbildung ? ausbildung.typ : '';
  }
}