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

import {
  AusbildungService,
  PersonService,
  TeilnahmeService,
} from '../../../core/services';
import { Ausbildung } from '../../../core/models/ausbildung.model';
import { Person } from '../../../core/models/person.model';
import { Ausbildungsteilnahme } from '../../../core/models/teilnahme.model';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  CustomDateAdapter,
  CUSTOM_DATE_FORMATS,
} from '../../../core/utils/custom-date-adapter';
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
    MatSnackBarModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'de-CH' },
    {
      provide: DateAdapter,
      useClass: CustomDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS },
  ],
  templateUrl: './ausbildungsmatrix.component.html',
  styleUrls: ['./ausbildungsmatrix.component.scss'],
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


  /**
   * Options for training type filter dropdown
   * 
   * Defines the available course types that can be filtered in the training matrix
   */
  typOptions = [
    { value: 'alle', label: 'Alle Typen' },
    { value: 'WK', label: 'WK' }, // Wiederholungskurs
    { value: 'LG', label: 'LG' }, // Lehrgang
    { value: 'KVK', label: 'KVK' }, // Kadervorbereitungskurs
    { value: 'Übung', label: 'Übung' },
    { value: 'Kurs', label: 'Kurs' },
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
    this.searchControl.valueChanges.subscribe((value) => {
      this.dataSource.filter = value?.toLowerCase() || '';
    });
  }


  /**
   * Lifecycle hook that runs after the component view is fully initialized.
   * Configures sorting, pagination, and custom filtering for the data table.
   */
  ngAfterViewInit(): void {
    // Set up sorting and pagination
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;

    // Configure custom search filter across multiple person properties
    this.dataSource.filterPredicate = (data: MatrixRow, filter: string) => {
      const personData = data.person.grunddaten;
      
      // Build searchable text by combining relevant person properties
      const searchableText = [
        personData.grad,
        personData.nachname,
        personData.vorname,
        personData.funktion,
        data.person.zivilschutz.einteilung.zug
      ]
        .filter(Boolean)  // Remove any undefined/null values
        .join(' ')
        .toLowerCase();

      return searchableText.includes(filter);
    };
  }


  /**
   * Loads and initializes all data for the training matrix.
   */
  async loadData(): Promise<void> {
    this.isLoading.set(true);

    try {
      await this.loadAllData();
      this.setupYearFilter();
      this.updateMatrix();
    } catch (error) {
      this.handleError(error);
    } finally {
      this.isLoading.set(false);
    }
  }


  /**
   * Loads people, trainings, and participations from services.
   */
  private async loadAllData(): Promise<void> {
    await this.personService.loadPersonen();
    this.personen.set(this.personService.personen());

    await this.ausbildungService.loadAusbildungen();
    this.ausbildungen.set(this.ausbildungService.ausbildungen());

    await this.teilnahmeService.loadTeilnahmen();
    this.teilnahmen.set(this.teilnahmeService.teilnahmen());
  }


  /**
   * Sets up the year filter with available options.
   */
  private setupYearFilter(): void {
    const years = [...new Set(this.ausbildungen().map(a => a.jahr))];
    this.jahrOptions = years.sort((a, b) => b - a);

    if (this.jahrOptions.length > 0 && !this.jahrFilter.value) {
      this.jahrFilter.setValue(this.jahrOptions[0]);
    }
  }


  /**
   * Handles errors during data loading.
   */
  private handleError(error: any): void {
    console.error('Fehler beim Laden der Daten:', error);
    this.showSnackBar('Fehler beim Laden der Daten');
  }


  /**
   * Updates the training matrix data based on selected filters.
   * 
   * Creates a matrix showing each person's participation status in relevant trainings.
   */
  updateMatrix(): void {
    const filteredAusbildungen = this.getFilteredAusbildungen();
    this.updateDisplayColumns(filteredAusbildungen);
    this.buildMatrixData(filteredAusbildungen);
  }


  /**
   * Applies year and type filters to the training data.
   */
  private getFilteredAusbildungen(): Ausbildung[] {
    const selectedJahr = this.jahrFilter.value;
    const selectedTyp = this.typFilter.value;
    
    let filtered = this.ausbildungen();
    
    if (selectedJahr !== null) {
      filtered = filtered.filter(a => a.jahr === selectedJahr);
    }
    
    if (selectedTyp && selectedTyp !== 'alle') {
      filtered = filtered.filter(a => a.typ === selectedTyp);
    }
    
    return filtered.sort((a, b) => a.titel.localeCompare(b.titel));
  }


  /**
   * Updates table columns based on filtered trainings.
   */
  private updateDisplayColumns(filteredAusbildungen: Ausbildung[]): void {
    const columns = ['name', ...filteredAusbildungen.map(a => a.id)];
    this.displayedColumns.set(columns);
  }


  /**
   * Builds matrix data by mapping persons to their training participations.
   */
  private buildMatrixData(filteredAusbildungen: Ausbildung[]): void {
    const matrixData = this.personen().map(person => {
      const ausbildungenMap = new Map<string, TeilnahmeInfo>();
      
      filteredAusbildungen.forEach(ausbildung => {
        const teilnahme = this.getTeilnahmeForPersonAndAusbildung(person.id, ausbildung.id);
        
        if (teilnahme) {
          ausbildungenMap.set(ausbildung.id, {
            status: teilnahme.status,
            datum: teilnahme.datum as Date,
            bemerkung: teilnahme.bemerkung,
          });
        }
      });
      
      return { person, ausbildungen: ausbildungenMap };
    });
    
    this.matrixData.set(matrixData);
    this.dataSource.data = matrixData;
  }


  /**
   * Finds participation record for a specific person and training.
   */
  private getTeilnahmeForPersonAndAusbildung(personId: string, ausbildungId: string): Ausbildungsteilnahme | undefined {
    return this.teilnahmen().find(
      t => t.personId === personId && t.ausbildungId === ausbildungId
    );
  }


  /**
   * Prüft, ob eine Person an einer Ausbildung teilgenommen hat
   */
  getTeilnahmeInfo(
    row: MatrixRow,
    ausbildungId: string
  ): TeilnahmeInfo | undefined {
    return row.ausbildungen.get(ausbildungId);
  }


  /**
   * Liefert die CSS-Klasse für eine Teilnahme basierend auf dem Status
   */
  getTeilnahmeClass(status?: string): string {
    if (!status) return '';

    switch (status) {
      case 'teilgenommen':
        return 'teilgenommen';
      case 'dispensiert':
        return 'dispensiert';
      case 'nicht teilgenommen':
        return 'nicht-teilgenommen';
      default:
        return '';
    }
  }


  /**
   * Liefert ein Symbol für eine Teilnahme basierend auf dem Status
   */
  getTeilnahmeIcon(status?: string): string {
    if (!status) return '';

    switch (status) {
      case 'teilgenommen':
        return 'check_circle';
      case 'dispensiert':
        return 'warning';
      case 'nicht teilgenommen':
        return 'cancel';
      default:
        return '';
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
   * Exports the current filtered training matrix data as a CSV file.
   * 
   * Generates a CSV containing person details and their training participation status
   * based on the currently applied filters, then triggers the download.
   */
  exportCsv(): void {
    const filteredAusbildungen = this.getFilteredAusbildungen();
    const csvContent = this.generateCsvContent(filteredAusbildungen);
    this.downloadCsv(csvContent);
    
    this.showSnackBar('CSV-Export erfolgreich');
  }


  /**
   * Generates the CSV content with header row and data rows
   */
  private generateCsvContent(filteredAusbildungen: Ausbildung[]): string {
    // Create header row
    let csvContent = this.generateCsvHeader(filteredAusbildungen);
    
    // Create data rows for each person
    this.dataSource.filteredData.forEach(row => {
      csvContent += this.generateCsvRow(row, filteredAusbildungen);
    });
    
    return csvContent;
  }


  /**
   * Generates the CSV header row with person fields and training titles
   */
  private generateCsvHeader(filteredAusbildungen: Ausbildung[]): string {
    const baseHeader = 'Grad,Name,Vorname,Funktion,Zug';
    const ausbildungsHeader = filteredAusbildungen
      .map(ausbildung => ausbildung.titel)
      .join(',');
      
    return `${baseHeader},${ausbildungsHeader}\n`;
  }


  /**
   * Generates a CSV row for a person with their training participation status
   */
  private generateCsvRow(row: MatrixRow, filteredAusbildungen: Ausbildung[]): string {
    const person = row.person;
    
    // Add person details
    let rowContent = [
      person.grunddaten.grad,
      person.grunddaten.nachname,
      person.grunddaten.vorname,
      person.grunddaten.funktion,
      person.zivilschutz.einteilung.zug
    ].join(',');
    
    // Add participation status for each training
    const teilnahmenContent = filteredAusbildungen
      .map(ausbildung => {
        const teilnahme = row.ausbildungen.get(ausbildung.id);
        return teilnahme ? teilnahme.status : '';
      })
      .join(',');
    
    return `${rowContent},${teilnahmenContent}\n`;
  }


  /**
   * Creates and triggers download of CSV file
   */
  private downloadCsv(csvContent: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = `Ausbildungsmatrix_${this.jahrFilter.value || 'Alle'}.csv`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
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
      verticalPosition: 'bottom',
    });
  }


  /**
   * Gibt den Titel einer Ausbildung zurück
   */
  getAusbildungTitel(ausbildungId: string): string {
    const ausbildung = this.ausbildungen().find((a) => a.id === ausbildungId);
    return ausbildung ? ausbildung.titel : '';
  }


  /**
   * Gibt den Typ einer Ausbildung zurück
   */
  getAusbildungTyp(ausbildungId: string): string {
    const ausbildung = this.ausbildungen().find((a) => a.id === ausbildungId);
    return ausbildung ? ausbildung.typ : '';
  }
}
