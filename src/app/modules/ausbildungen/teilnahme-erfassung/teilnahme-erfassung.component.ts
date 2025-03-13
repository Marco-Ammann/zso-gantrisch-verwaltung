// src/app/modules/ausbildungen/teilnahme-erfassung/teilnahme-erfassung.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { SelectionModel } from '@angular/cdk/collections';

import { AusbildungService, PersonService, TeilnahmeService } from '../../../core/services';
import { Ausbildung, Person, Ausbildungsteilnahme } from '../../../core/models';

@Component({
  selector: 'app-teilnahme-erfassung',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatCheckboxModule, 
    MatDatepickerModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule
  ],
  templateUrl: './teilnahme-erfassung.component.html',
  styleUrls: ['./teilnahme-erfassung.component.scss']
})
export class TeilnahmeErfassungComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ausbildungService = inject(AusbildungService);
  private personService = inject(PersonService);
  private teilnahmeService = inject(TeilnahmeService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // Zustände
  ausbildung = signal<Ausbildung | null>(null);
  personen = signal<Person[]>([]);
  teilnahmen = signal<Ausbildungsteilnahme[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);

  // ID der Ausbildung
  ausbildungId: string | null = null;

  // Form
  teilnahmeForm: FormGroup;

  // Table data
  displayedColumns: string[] = ['select', 'grad', 'name', 'funktion', 'zug'];
  dataSource = new MatTableDataSource<Person>([]);
  selection = new SelectionModel<Person>(true, []);
  
  // Statusoptionen
  statusOptions = [
    { value: 'teilgenommen', label: 'Teilgenommen' },
    { value: 'nicht teilgenommen', label: 'Nicht teilgenommen' },
    { value: 'dispensiert', label: 'Dispensiert' }
  ];

  constructor() {
    this.teilnahmeForm = this.fb.group({
      datum: [new Date(), Validators.required],
      status: ['teilgenommen', Validators.required],
      bemerkung: ['']
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
   * Lädt alle benötigten Daten
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
      this.personen.set(this.personService.personen().filter(p => p.zivilschutz.status === 'aktiv'));
      
      // Bestehende Teilnahmen für diese Ausbildung laden
      const teilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(ausbildungId);
      this.teilnahmen.set(teilnahmen);
      
      // Datentabelle vorbereiten
      this.dataSource.data = this.personen();
      
      // Vorauswahl basierend auf bestehenden Teilnahmen
      this.vorauswählen(teilnahmen);
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      this.showSnackBar('Fehler beim Laden der Daten');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Markiert Personen, die bereits teilgenommen haben
   */
  private vorauswählen(teilnahmen: Ausbildungsteilnahme[]): void {
    const teilnehmerIds = teilnahmen
      .filter(t => t.status === 'teilgenommen')
      .map(t => t.personId);
    
    this.personen().forEach(person => {
      if (teilnehmerIds.includes(person.id)) {
        this.selection.select(person);
      }
    });
  }

  /**
   * Speichert die Teilnahmen
   */
  async saveTeilnahmen(): Promise<void> {
    if (this.teilnahmeForm.invalid || !this.ausbildungId) {
      return;
    }

    this.isSaving.set(true);
    
    try {
      const { datum, status, bemerkung } = this.teilnahmeForm.value;
      const selectedPersonenIds = this.selection.selected.map(person => person.id);
      
      // Bestehende Teilnahmen für diese Ausbildung abrufen
      const bestehendeIds = this.teilnahmen()
        .map(teilnahme => teilnahme.personId);
      
      // Für jede ausgewählte Person Teilnahme erstellen/aktualisieren
      for (const personId of selectedPersonenIds) {
        // Prüfen, ob für diese Person bereits eine Teilnahme besteht
        const bestehendeTeilnahme = this.teilnahmen()
          .find(t => t.personId === personId);
        
        if (bestehendeTeilnahme) {
          // Teilnahme aktualisieren
          await this.teilnahmeService.updateTeilnahme(bestehendeTeilnahme.id, {
            datum,
            status,
            bemerkung
          });
        } else {
          // Neue Teilnahme erstellen
          await this.teilnahmeService.createTeilnahme({
            personId,
            ausbildungId: this.ausbildungId,
            datum,
            status,
            bemerkung
          });
        }
      }
      
      // Für jede nicht ausgewählte Person, die aber eine Teilnahme hatte,
      // Status auf "nicht teilgenommen" setzen
      for (const personId of bestehendeIds) {
        if (!selectedPersonenIds.includes(personId)) {
          const bestehendeTeilnahme = this.teilnahmen()
            .find(t => t.personId === personId);
          
          if (bestehendeTeilnahme) {
            await this.teilnahmeService.updateTeilnahme(bestehendeTeilnahme.id, {
              datum,
              status: 'nicht teilgenommen',
              bemerkung
            });
          }
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
   * Zurück zur Ausbildungsdetailseite
   */
  goBack(): void {
    if (this.ausbildungId) {
      this.router.navigate(['/ausbildungen', this.ausbildungId]);
    } else {
      this.router.navigate(['/ausbildungen']);
    }
  }

  /**
   * Prüft, ob alle Personen ausgewählt sind
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /**
   * Wählt alle oder keine Personen aus
   */
  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.dataSource.data);
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
}