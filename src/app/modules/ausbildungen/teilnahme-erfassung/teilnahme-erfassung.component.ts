// src/app/modules/ausbildungen/teilnahme-erfassung/teilnahme-erfassung.component.ts
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { signal } from '@angular/core';

import { AusbildungService } from '../../../core/services/ausbildung.service';
import { PersonService } from '../../../core/services/person.service';
import { TeilnahmeService } from '../../../core/services/teilnahme.service';
import { Ausbildung } from '../../../core/models/ausbildung.model';
import { Person } from '../../../core/models/person.model';
import { Ausbildungsteilnahme } from '../../../core/models/teilnahme.model';
import { TeilnehmerSelectionDialogComponent } from '../teilnehmer-selection-dialog/teilnehmer-selection-dialog.component';

interface TeilnehmerWithInfo extends Person {
  teilnahmeInfo?: Ausbildungsteilnahme;
  isNew?: boolean;
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
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule
  ],
  templateUrl: './teilnahme-erfassung.component.html',
  styleUrls: ['./teilnahme-erfassung.component.scss']
})
export class TeilnahmeErfassungComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private ausbildungService = inject(AusbildungService);
  private personService = inject(PersonService);
  private teilnahmeService = inject(TeilnahmeService);
  private snackBar = inject(MatSnackBar);

  // Zustände
  ausbildung = signal<Ausbildung | null>(null);
  personen = signal<Person[]>([]);
  teilnahmen = signal<Ausbildungsteilnahme[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  
  // Selected participants - this will only contain participants that are actually added
  selectedTeilnehmer = signal<TeilnehmerWithInfo[]>([]);

  // ID der Ausbildung
  ausbildungId: string | null = null;

  // Form
  teilnahmeForm: FormGroup;

  // Neue Form Controls für Suche, Filter und Datum
  searchControl = new FormControl('');
  statusFilterControl = new FormControl('alle');
  datumControl = new FormControl(new Date(), Validators.required);

  // Table data
  displayedColumns: string[] = ['grad', 'name', 'einteilung', 'status', 'bemerkung', 'aktionen'];
  dataSource = new MatTableDataSource<TeilnehmerWithInfo>([]);
  
  // IDs der hervorgehobenen Personen
  highlightedPersonIds: string[] = [];
  newlyAddedPersonIds: string[] = [];
  
  // Statusoptionen
  statusOptions = [
    { value: 'teilgenommen', label: 'Teilgenommen' },
    { value: 'nicht teilgenommen', label: 'Nicht teilgenommen' },
    { value: 'dispensiert', label: 'Dispensiert' }
  ];

  constructor() {
    this.teilnahmeForm = this.fb.group({
      datum: [new Date(), Validators.required],
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

    // Set up initial filter behavior
    this.searchControl.valueChanges.subscribe(() => {
      this.updateDataSource();
    });

    this.statusFilterControl.valueChanges.subscribe(() => {
      this.updateDataSource();
    });
    
    // Connect datum form control to the main form
    this.datumControl.valueChanges.subscribe(value => {
      this.teilnahmeForm.patchValue({ datum: value });
    });
  }

  /**
   * Formats a date for display
   */
  formatDate(date: any): string {
    if (!date) return '';
    
    const jsDate = typeof date.toDate === 'function' 
      ? date.toDate() 
      : new Date(date);
      
    return jsDate.toLocaleDateString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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
      
      // Set initial date from the training data if available
      if (ausbildung.datum) {
        const date = typeof ausbildung.datum.toDate === 'function' 
          ? ausbildung.datum.toDate() 
          : new Date(ausbildung.datum);
          
        this.datumControl.setValue(date);
        this.teilnahmeForm.patchValue({ datum: date });
      }
      
      // Load participants data
      await this.loadTeilnehmerData();
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      this.showSnackBar('Fehler beim Laden der Daten');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Lädt Teilnehmer und Teilnahmedaten
   */
  async loadTeilnehmerData(): Promise<void> {
    if (!this.ausbildungId) return;
    
    try {
      // Load all persons for potential selection
      await this.personService.loadPersonen();
      const aktivPersonen = this.personService.personen().filter(p => p.zivilschutz?.status === 'aktiv');
      this.personen.set(aktivPersonen);
      
      // Load existing participations for this training
      const teilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(this.ausbildungId);
      this.teilnahmen.set(teilnahmen);
      
      // Create initial selected teilnehmer from existing teilnahmen
      const initialTeilnehmer: TeilnehmerWithInfo[] = [];
      
      for (const teilnahme of teilnahmen) {
        const person = aktivPersonen.find(p => p.id === teilnahme.personId);
        if (person) {
          initialTeilnehmer.push({
            ...person,
            teilnahmeInfo: teilnahme,
            isNew: false
          });
        }
      }
      
      // Set the selected teilnehmer
      this.selectedTeilnehmer.set(initialTeilnehmer);
      
      // Update data source
      this.updateDataSource();
    } catch (error) {
      console.error('Fehler beim Laden der Teilnehmerdaten:', error);
      this.showSnackBar('Fehler beim Laden der Teilnehmerdaten');
    }
  }
  
  /**
   * Aktualisiert die Datenquelle basierend auf den Filtern und Teilnahmedaten
   */
  updateDataSource(): void {
    // Get filtered participants from the selected teilnehmer only
    let filteredPersons = this.filteredTeilnehmer();
    
    // Update data source
    this.dataSource.data = filteredPersons;
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
   * Gibt die Anzahl der Teilnehmer für einen bestimmten Status zurück
   */
  getCountByStatus(status: string): number {
    const teilnehmer = this.selectedTeilnehmer();
    
    if (status === 'anwesend') {
      return teilnehmer.filter(t => t.teilnahmeInfo?.status === 'teilgenommen').length;
    } else if (status === 'entschuldigt') {
      return teilnehmer.filter(t => t.teilnahmeInfo?.status === 'dispensiert').length;
    } else if (status === 'abwesend') {
      return teilnehmer.filter(t => t.teilnahmeInfo?.status === 'nicht teilgenommen').length;
    } else if (status === 'unbearbeitet') {
      return teilnehmer.filter(t => !t.teilnahmeInfo || !t.teilnahmeInfo.status).length;
    }
    return 0;
  }

  /**
   * Filtert Teilnehmer basierend auf Suche und Status-Filter
   */
  filteredTeilnehmer(): TeilnehmerWithInfo[] {
    // Start with all selected teilnehmer
    let filteredPersons = [...this.selectedTeilnehmer()];
    
    // Apply search filter if there's a search term
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filteredPersons = filteredPersons.filter(p => 
        p.grunddaten?.nachname?.toLowerCase().includes(searchTerm) ||
        p.grunddaten?.vorname?.toLowerCase().includes(searchTerm) ||
        p.grunddaten?.grad?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply status filter if not "alle"
    const statusFilter = this.statusFilterControl.value;
    if (statusFilter && statusFilter !== 'alle') {
      filteredPersons = filteredPersons.filter(p => {
        if (!p.teilnahmeInfo && statusFilter === 'unbearbeitet') {
          return true;
        } else if (!p.teilnahmeInfo) {
          return false;
        }
        
        if (statusFilter === 'anwesend') {
          return p.teilnahmeInfo.status === 'teilgenommen';
        } else if (statusFilter === 'entschuldigt') {
          return p.teilnahmeInfo.status === 'dispensiert';
        } else if (statusFilter === 'abwesend') {
          return p.teilnahmeInfo.status === 'nicht teilgenommen';
        }
        
        return false;
      });
    }
    
    return filteredPersons;
  }

  /**
   * Setzt alle Filtereinstellungen zurück
   */
  resetFilters(): void {
    this.searchControl.setValue('');
    this.statusFilterControl.setValue('alle');
  }

  /**
   * Öffnet einen Dialog zum Hinzufügen von Personen zur Ausbildung
   */
  openAddPersonDialog(): void {
    if (!this.ausbildungId) return;
    
    // Alle aktiven Personen holen
    const aktivPersonen = this.personService.personen().filter(p => p.zivilschutz?.status === 'aktiv');
    
    // Already selected person IDs for preselection
    const preselectedPersonIds = this.selectedTeilnehmer().map(teilnehmer => teilnehmer.id);
    
    const dialogRef = this.dialog.open(TeilnehmerSelectionDialogComponent, {
      width: '800px',
      data: {
        availablePersons: aktivPersonen,
        preselectedPersonIds: preselectedPersonIds
      }
    });

    dialogRef.afterClosed().subscribe(async (selectedPersons: Person[]) => {
      if (selectedPersons && selectedPersons.length > 0) {
        await this.updateTeilnehmerSelection(selectedPersons);
      }
    });
  }
  
  /**
   * Aktualisiert die Teilnahmen basierend auf der Personenauswahl
   */
  private async updateTeilnehmerSelection(selectedPersons: Person[]): Promise<void> {
    if (!this.ausbildungId || !this.teilnahmeForm.valid) return;
    
    this.isSaving.set(true);
    
    try {
      const { datum } = this.teilnahmeForm.value;
      const currentTeilnehmer = this.selectedTeilnehmer();
      
      // Find newly added persons (those in selectedPersons but not in currentTeilnehmer)
      const newlyAdded: Person[] = selectedPersons.filter(person => 
        !currentTeilnehmer.some(t => t.id === person.id)
      );
      
      // Find removed persons (those in currentTeilnehmer but not in selectedPersons)
      const removedTeilnehmer = currentTeilnehmer.filter(teilnehmer => 
        !selectedPersons.some(p => p.id === teilnehmer.id)
      );
      
      // Store the IDs of newly added persons
      const newlyAddedIds = newlyAdded.map(p => p.id);
      this.highlightedPersonIds = [...newlyAddedIds];
      this.newlyAddedPersonIds = [...newlyAddedIds];
      
      // Create updated list of teilnehmer
      const updatedTeilnehmer: TeilnehmerWithInfo[] = [];
      
      // First add existing teilnehmer that are still selected
      currentTeilnehmer.forEach(teilnehmer => {
        if (selectedPersons.some(p => p.id === teilnehmer.id)) {
          updatedTeilnehmer.push(teilnehmer);
        }
      });
      
      // Then add newly added teilnehmer
      for (const person of newlyAdded) {
        const existing = this.teilnahmen().find(t => t.personId === person.id);
        
        if (existing) {
          // Person already has a participation record
          updatedTeilnehmer.push({
            ...person,
            teilnahmeInfo: existing,
            isNew: true
          });
        } else {
          // Create new participation record with default values
          const newTeilnahmeId = await this.teilnahmeService.createTeilnahme({
            personId: person.id,
            ausbildungId: this.ausbildungId,
            datum,
            status: 'teilgenommen',  // Default to present
            bemerkung: ''
          });
          
          // Add to the teilnehmer list with the new record
          updatedTeilnehmer.push({
            ...person,
            teilnahmeInfo: {
              id: newTeilnahmeId,
              personId: person.id,
              ausbildungId: this.ausbildungId,
              datum,
              status: 'teilgenommen',
              bemerkung: ''
            },
            isNew: true
          });
        }
      }
      
      // Handle removed teilnehmer if needed
      for (const teilnehmer of removedTeilnehmer) {
        if (teilnehmer.teilnahmeInfo) {
          // In a real application, you might want to delete these or mark them differently
          await this.teilnahmeService.deleteTeilnahme(teilnehmer.teilnahmeInfo.id);
        }
      }
      
      // Update the selected teilnehmer and reload data
      this.selectedTeilnehmer.set(updatedTeilnehmer);
      this.updateDataSource();
      
      if (newlyAdded.length > 0) {
        this.showSnackBar(`${newlyAdded.length} neue Teilnehmer hinzugefügt`);
      } else {
        this.showSnackBar('Teilnehmerliste aktualisiert');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Teilnehmer:', error);
      this.showSnackBar('Fehler beim Aktualisieren der Teilnehmer');
    } finally {
      this.isSaving.set(false);
      
      // Clear highlighting after a delay
      setTimeout(() => {
        this.highlightedPersonIds = [];
      }, 3000);
    }
  }

  /**
   * Aktualisiert den Status eines einzelnen Teilnehmers
   */
  async updateStatus(person: TeilnehmerWithInfo, newStatus: string): Promise<void> {
    if (!this.ausbildungId || !this.teilnahmeForm.valid) return;
    
    try {
      const { datum } = this.teilnahmeForm.value;
      
      if (person.teilnahmeInfo) {
        // Update existing attendance
        await this.teilnahmeService.updateTeilnahme(person.teilnahmeInfo.id, {
          datum,
          status: newStatus as 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert',
          bemerkung: person.teilnahmeInfo.bemerkung
        });
        
        // Update the local data
        person.teilnahmeInfo.status = newStatus as 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert';
        
        // Update the data source
        this.updateDataSource();
        
        this.showSnackBar(`Status für ${person.grunddaten?.nachname} aktualisiert`);
      } else {
        // Create new attendance record
        const newId = await this.teilnahmeService.createTeilnahme({
          personId: person.id,
          ausbildungId: this.ausbildungId,
          datum,
          status: newStatus as 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert',
          bemerkung: ''
        });
        
        // Update the local data
        person.teilnahmeInfo = {
          id: newId,
          personId: person.id,
          ausbildungId: this.ausbildungId,
          datum,
          status: newStatus as 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert',
          bemerkung: ''
        };
        
        // Update the data source
        this.updateDataSource();
        
        this.showSnackBar(`Status für ${person.grunddaten?.nachname} gesetzt`);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      this.showSnackBar('Fehler beim Aktualisieren des Status');
    }
  }

  /**
   * Aktualisiert die Bemerkung eines Teilnehmers
   */
  async updateBemerkung(person: TeilnehmerWithInfo, event: Event): Promise<void> {
    if (!this.ausbildungId || !this.teilnahmeForm.valid) return;
    
    const input = event.target as HTMLInputElement;
    const bemerkung = input.value;
    
    try {
      const { datum } = this.teilnahmeForm.value;
      
      if (person.teilnahmeInfo) {
        // Update existing attendance
        await this.teilnahmeService.updateTeilnahme(person.teilnahmeInfo.id, {
          datum,
          bemerkung
        });
        
        // Update local data
        person.teilnahmeInfo.bemerkung = bemerkung;
        
        this.showSnackBar(`Bemerkung für ${person.grunddaten?.nachname} aktualisiert`);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Bemerkung:', error);
      this.showSnackBar('Fehler beim Aktualisieren der Bemerkung');
    }
  }

  /**
   * Entfernt einen Teilnehmer aus der Ausbildung
   */
  async entfernePersonVonAusbildung(person: TeilnehmerWithInfo): Promise<void> {
    try {
      if (person.teilnahmeInfo) {
        await this.teilnahmeService.deleteTeilnahme(person.teilnahmeInfo.id);
      }
      
      // Remove from selected teilnehmer
      const updatedTeilnehmer = this.selectedTeilnehmer().filter(t => t.id !== person.id);
      this.selectedTeilnehmer.set(updatedTeilnehmer);
      
      // Update data source
      this.updateDataSource();
      
      this.showSnackBar(`${person.grunddaten?.nachname} wurde aus der Ausbildung entfernt`);
    } catch (error) {
      console.error('Fehler beim Entfernen des Teilnehmers:', error);
      this.showSnackBar('Fehler beim Entfernen des Teilnehmers');
    }
  }

  /**
   * Gets CSS class based on participation status
   */
  getStatusClass(person: TeilnehmerWithInfo): string {
    if (!person.teilnahmeInfo) return '';
    
    switch (person.teilnahmeInfo.status) {
      case 'teilgenommen': return 'status-anwesend';
      case 'dispensiert': return 'status-entschuldigt';
      case 'nicht teilgenommen': return 'status-abwesend';
      default: return '';
    }
  }
  
  /**
   * Gets status label for display
   */
  getStatusLabel(person: TeilnehmerWithInfo): string {
    if (!person.teilnahmeInfo) return 'Unbearbeitet';
    
    switch (person.teilnahmeInfo.status) {
      case 'teilgenommen': return 'Anwesend';
      case 'dispensiert': return 'Entschuldigt';
      case 'nicht teilgenommen': return 'Abwesend';
      default: return 'Unbearbeitet';
    }
  }
  
  /**
   * Save all changes and go back to detail page
   */
  async saveAndExit(): Promise<void> {
    if (!this.ausbildungId) return;
    
    this.isSaving.set(true);
    
    try {
      // Save any pending changes
      await this.savePendingChanges();
      
      this.showSnackBar('Teilnehmerliste gespeichert');
      this.router.navigate(['/ausbildungen', this.ausbildungId]);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      this.showSnackBar('Fehler beim Speichern');
    } finally {
      this.isSaving.set(false);
    }
  }
  
  /**
   * Save any pending changes to the database
   */
  private async savePendingChanges(): Promise<void> {
    // Implement any needed logic to ensure all changes are saved
    // This is just a placeholder in case we need to add specific save logic
    return Promise.resolve();
  }
  
  /**
   * Navigate to person detail page
   */
  viewPersonDetails(person: Person): void {
    this.router.navigate(['/personen', person.id]);
  }
  
  /**
   * Open context menu for a person
   */
  openMenu(event: MouseEvent, trigger: MatMenuTrigger, person: TeilnehmerWithInfo): void {
    event.preventDefault();
    event.stopPropagation();
    trigger.openMenu();
  }

  /**
   * Checks if a person was newly added
   */
  isNewlyAdded(personId: string): boolean {
    return this.newlyAddedPersonIds.includes(personId);
  }
  
  /**
   * Generate PDF for person
   */
  generatePDF(person: TeilnehmerWithInfo): void {
    // Implement PDF generation or call appropriate service
    this.showSnackBar(`PDF für ${person.grunddaten.nachname} wird generiert...`);
  }
  
  /**
   * Send email to person
   */
  sendEmail(person: TeilnehmerWithInfo): void {
    // Open email client or integrate with email service
    if (person.kontaktdaten?.email) {
      window.open(`mailto:${person.kontaktdaten.email}`);
    } else {
      this.showSnackBar('Keine E-Mail-Adresse hinterlegt');
    }
  }
}