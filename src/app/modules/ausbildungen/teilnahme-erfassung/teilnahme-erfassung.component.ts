// src/app/modules/ausbildungen/teilnahme-erfassung/teilnahme-erfassung.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';

import { AusbildungService, PersonService, TeilnahmeService } from '../../../core/services';
import { Ausbildung } from '../../../core/models/ausbildung.model';
import { Person } from '../../../core/models/person.model';
import { Ausbildungsteilnahme } from '../../../core/models/teilnahme.model';

const STATUS_OPTIONS = [
  { value: 'teilgenommen', label: 'Teilgenommen' },
  { value: 'nicht teilgenommen', label: 'Nicht teilgenommen' },
  { value: 'dispensiert', label: 'Dispensiert' }
] as const;
type TeilnahmeStatus = typeof STATUS_OPTIONS[number]['value'];

interface PersonTeilnahme extends Person {
  status?: TeilnahmeStatus;
  bemerkung?: string;
  existing?: boolean;
  teilnahmeId?: string;
}

@Component({
  selector: 'app-teilnahme-erfassung',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './teilnahme-erfassung.component.html',
  styleUrls: ['./teilnahme-erfassung.component.scss']
})
export class TeilnahmeErfassungComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private ausbildungService = inject(AusbildungService);
  private personService = inject(PersonService);
  private teilnahmeService = inject(TeilnahmeService);
  private snackBar = inject(MatSnackBar);

  // Formulare
  teilnahmeForm: FormGroup;
  
  // Zustände
  ausbildung = signal<Ausbildung | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  filterValue = signal('');
  
  // Tabellenkonfiguration
  displayedColumns: string[] = ['select', 'grad', 'name', 'funktion', 'zug', 'status', 'bemerkung'];
  dataSource = new MatTableDataSource<PersonTeilnahme>([]);
  selection = new SelectionModel<PersonTeilnahme>(true, []);
  
  // ID der Ausbildung
  ausbildungId: string | null = null;
  
  // Statusoptionen
  statusOptions = STATUS_OPTIONS;

  constructor() {
    // Formular initialisieren
    this.teilnahmeForm = this.fb.group({
      datum: [new Date(), Validators.required],
      defaultStatus: ['teilgenommen', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('ausbildungId');
      if (id) {
        this.ausbildungId = id;
        this.loadData(id);
      } else {
        this.showSnackBar('Keine Ausbildungs-ID gefunden');
        this.router.navigate(['/ausbildungen']);
      }
    });
  }

  /**
   * Lädt die erforderlichen Daten
   */
  async loadData(ausbildungId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      // Ausbildung laden
      const ausbildung = await this.ausbildungService.getAusbildungById(ausbildungId);
      this.ausbildung.set(ausbildung);
      
      if (!ausbildung) {
        this.showSnackBar('Ausbildung nicht gefunden');
        this.router.navigate(['/ausbildungen']);
        return;
      }
      
      // Personen laden
      await this.personService.loadPersonen();
      
      // Vorhandene Teilnahmen laden
      const existingTeilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(ausbildungId);
      
      // Kombinierte Daten vorbereiten
      const personen = this.personService.personen();
      const personenMitTeilnahme: PersonTeilnahme[] = personen.map(person => {
        // Nach vorhandenen Teilnahmen suchen
        const teilnahme = existingTeilnahmen.find(t => t.personId === person.id);
        
        if (teilnahme) {
          return {
            ...person,
            status: teilnahme.status,
            bemerkung: teilnahme.bemerkung || '',
            existing: true,
            teilnahmeId: teilnahme.id
          };
        }
        
        return {
          ...person,
          status: undefined,
          bemerkung: '',
          existing: false
        };
      });
      
      // Datenquelle aktualisieren
      this.dataSource.data = personenMitTeilnahme;
      this.dataSource.filterPredicate = this.createFilter();
      
      // Bereits teilnehmende Personen vorselektieren
      this.selection.clear();
      personenMitTeilnahme
        .filter(p => p.existing)
        .forEach(p => this.selection.select(p));
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      this.showSnackBar('Fehler beim Laden der Daten');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Erstellt eine Filterfunktion für die Tabelle
   */
  createFilter(): (data: PersonTeilnahme, filter: string) => boolean {
    return (data: PersonTeilnahme, filter: string): boolean => {
      const searchStr = 
        (data.grunddaten.grad + ' ' +
        data.grunddaten.nachname + ' ' +
        data.grunddaten.vorname + ' ' +
        data.grunddaten.funktion + ' ' +
        (data.zivilschutz.einteilung.zug || '')).toLowerCase();
      
      return searchStr.indexOf(filter.toLowerCase()) !== -1;
    };
  }

  /**
   * Wendet einen Filter auf die Tabelle an
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterValue.set(filterValue);
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  /**
   * Alle Zeilen auswählen oder Auswahl aufheben
   */
  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    
    // Nur die gefilterten Einträge auswählen
    this.dataSource.filteredData.forEach(row => {
      this.selection.select(row);
    });
  }

  /**
   * Prüft, ob alle Zeilen ausgewählt sind
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows && numRows > 0;
  }

  /**
   * Status einer Person ändern
   */
  setPersonStatus(person: PersonTeilnahme, status: TeilnahmeStatus): void {
    // Bestehende Implementierung
    const index = this.dataSource.data.findIndex(p => p.id === person.id);
    if (index !== -1) {
      const updatedData = [...this.dataSource.data];
      updatedData[index] = {
        ...updatedData[index],
        status: status
      };
      this.dataSource.data = updatedData;
    }
    
    // Wenn Status gesetzt wird, sollte die Person auch ausgewählt sein
    if (!this.selection.isSelected(person)) {
      this.selection.select(person);
    }
  }

  /**
   * Bemerkung einer Person ändern
   */
  updateBemerkung(person: PersonTeilnahme, event: Event): void {
    const bemerkung = (event.target as HTMLInputElement).value;
    
    // Person im DataSource finden und aktualisieren
    const index = this.dataSource.data.findIndex(p => p.id === person.id);
    if (index !== -1) {
      const updatedData = [...this.dataSource.data];
      updatedData[index] = {
        ...updatedData[index],
        bemerkung: bemerkung
      };
      this.dataSource.data = updatedData;
    }
  }

  /**
   * Speichert die Teilnahmen
   */
  async saveTeilnahmen(): Promise<void> {
    if (!this.ausbildungId || !this.ausbildung()) {
      this.showSnackBar('Keine gültige Ausbildung ausgewählt');
      return;
    }
    
    if (this.teilnahmeForm.invalid) {
      this.showSnackBar('Bitte Datum auswählen');
      return;
    }
    
    this.isSaving.set(true);
    
    try {
      const formValues = this.teilnahmeForm.value;
      const datum = formValues.datum;
      const defaultStatus = formValues.defaultStatus;
      
      // Alle aktuellen Personen durchgehen
      for (const person of this.dataSource.data) {
        const isSelected = this.selection.isSelected(person);
        
        // Person ist ausgewählt - Teilnahme erstellen oder aktualisieren
        if (isSelected) {
          const status = person.status || defaultStatus;
          
          if (person.existing && person.teilnahmeId) {
            // Bestehende Teilnahme aktualisieren
            await this.teilnahmeService.updateTeilnahme(person.teilnahmeId, {
              status: status,
              bemerkung: person.bemerkung,
              datum: datum
            });
          } else {
            // Neue Teilnahme erstellen
            await this.teilnahmeService.createTeilnahme({
              personId: person.id,
              ausbildungId: this.ausbildungId,
              datum: datum,
              status: status,
              bemerkung: person.bemerkung
            });
          }
        } 
        // Person ist nicht ausgewählt, aber hat eine bestehende Teilnahme - löschen
        else if (person.existing && person.teilnahmeId) {
          await this.teilnahmeService.deleteTeilnahme(person.teilnahmeId);
        }
      }
      
      this.showSnackBar('Teilnahmen erfolgreich gespeichert');
      this.router.navigate(['/ausbildungen', this.ausbildungId]);
    } catch (error) {
      console.error('Fehler beim Speichern der Teilnahmen:', error);
      this.showSnackBar('Fehler beim Speichern der Teilnahmen');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Abbrechen und zurück navigieren
   */
  cancel(): void {
    if (this.ausbildungId) {
      this.router.navigate(['/ausbildungen', this.ausbildungId]);
    } else {
      this.router.navigate(['/ausbildungen']);
    }
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

  // Fügen Sie diese Methode zur bestehenden Komponente hinzu

/**
 * Setzt den Status für alle aktuell ausgewählten Personen
 */
bulkSetStatus(status: TeilnahmeStatus): void {
  this.selection.selected.forEach(person => {
    this.setPersonStatus(person, status);
  });
}
}