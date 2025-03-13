// src/app/modules/personen/notfallkontakte/notfallkontakte.component.ts
import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { NotfallkontaktService } from '../../../core/services/notfallkontakt.service';
import { PersonService } from '../../../core/services/person.service';
import { AuthService } from '../../../auth/services/auth.service';

import { Notfallkontakt } from '../../../core/models/notfallkontakt.model';
import { Person } from '../../../core/models/person.model';

import { KontaktDialogComponent } from './kontakt-dialog/kontakt-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-notfallkontakte',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './notfallkontakte.component.html',
  styleUrls: ['./notfallkontakte.component.scss']
})
export class NotfallkontakteComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  private kontaktService = inject(NotfallkontaktService);
  private personService = inject(PersonService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  
  // Berechtigungen
  canEdit = this.authService.canEdit;
  canDelete = this.authService.canDelete;
  
  // Filter-Controls
  searchControl = new FormControl('');
  priorityFilter = new FormControl('alle');
  
  // View mode - properly typed as union type
  viewMode: 'table' | 'cards' = 'table';
  
  // Für Kartenansicht - erweiterte Gruppen
  expandedGroups = new Set<string>();
  
  // Für gruppierte Kontakte nach Person
  groupedContacts: Record<string, Notfallkontakt[]> = {};
  
  // Daten
  notfallkontakte: Notfallkontakt[] = [];
  personen: Person[] = [];
  personMap = new Map<string, Person>();
  
  // Tabellenkonfiguration
  displayedColumns: string[] = ['person', 'name', 'beziehung', 'telefonnummer', 'prioritaet', 'aktionen'];
  dataSource = new MatTableDataSource<Notfallkontakt>([]);
  
  // Ladezustand
  isLoading = true;
  
  ngOnInit(): void {
    this.loadData();
    
    // Suchfeld initialisieren
    this.searchControl.valueChanges.subscribe(value => {
      this.applyFilter(value || '');
    });
    
    // Prioritätsfilter initialisieren
    this.priorityFilter.valueChanges.subscribe(value => {
      this.applyPriorityFilter(value || 'alle');
    });
  }
  
  ngAfterViewInit() {
    if (this.sort && this.paginator) {
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    }
  }
  
  /**
   * Switches between table and card views
   * @param mode The view mode to set ('table' or 'cards')
   */
  setViewMode(mode: 'table' | 'cards'): void {
    this.viewMode = mode;
    if (mode === 'cards') {
      this.groupContacts();
    }
  }
  
  /**
   * Gruppiert Kontakte nach Person für die Kartenansicht
   */
  groupContacts(): void {
    this.groupedContacts = {};
    this.notfallkontakte.forEach(kontakt => {
      if (!this.groupedContacts[kontakt.personId]) {
        this.groupedContacts[kontakt.personId] = [];
      }
      this.groupedContacts[kontakt.personId].push(kontakt);
    });
    
    // Kontakte nach Priorität sortieren
    Object.keys(this.groupedContacts).forEach(personId => {
      this.groupedContacts[personId].sort((a, b) => a.prioritaet - b.prioritaet);
    });
    
    // Die ersten 3 Gruppen standardmäßig erweitern
    this.expandedGroups.clear();
    Object.keys(this.groupedContacts).slice(0, 3).forEach(personId => {
      this.expandedGroups.add(personId);
    });
  }
  
  /**
   * Erweitert oder schließt eine Personengruppe
   */
  togglePersonGroup(personId: string): void {
    if (this.expandedGroups.has(personId)) {
      this.expandedGroups.delete(personId);
    } else {
      this.expandedGroups.add(personId);
    }
  }
  
  /**
   * Wendet einen Textfilter auf die Tabelle an
   */
  applyFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  
  /**
   * Wendet einen Prioritätsfilter an
   */
  applyPriorityFilter(priority: string): void {
    const originalData = this.notfallkontakte;
    let filteredData: Notfallkontakt[];
    
    if (priority === 'alle') {
      filteredData = originalData;
    } else {
      const priorityNumber = parseInt(priority);
      filteredData = originalData.filter(kontakt => kontakt.prioritaet === priorityNumber);
    }
    
    this.dataSource.data = filteredData;
    
    // Gruppierte Daten aktualisieren wenn im Kartenansichtsmodus
    if (this.viewMode === 'cards') {
      this.groupContacts();
    }
  }
  
  /**
   * Lädt Personendaten und Notfallkontakte
   */
  async loadData(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Personen und Notfallkontakte parallel laden
      await Promise.all([
        this.loadPersonen(),
        this.loadNotfallkontakte()
      ]);
      
      // Datentabelle vorbereiten
      this.prepareDataSource();
      
      // Gruppierte Daten für Kartenansicht
      this.groupContacts();
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      this.showSnackBar('Fehler beim Laden der Daten');
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Lädt alle Personen und erstellt eine Lookup-Map
   */
  private async loadPersonen(): Promise<void> {
    await this.personService.loadPersonen();
    this.personen = this.personService.personen();
    
    // Lookup-Map erstellen
    this.personMap = new Map(
      this.personen.map(person => [person.id, person])
    );
  }
  
  /**
   * Lädt alle Notfallkontakte
   */
  private async loadNotfallkontakte(): Promise<void> {
    await this.kontaktService.loadNotfallkontakte();
    this.notfallkontakte = this.kontaktService.notfallkontakte();
  }
  
  /**
   * Prepares the DataSource for the table with custom filtering and sorting
   */
  private prepareDataSource(): void {
    this.dataSource.data = this.notfallkontakte;
    
    // Custom filter
    this.dataSource.filterPredicate = (data: Notfallkontakt, filter: string) => {
      const person = this.personMap.get(data.personId);
      const searchStr = [
        data.name,
        data.beziehung,
        data.telefonnummer,
        person?.grunddaten.vorname,
        person?.grunddaten.nachname,
        person?.grunddaten.grad
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchStr.includes(filter);
    };
    
    // Custom sorting
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch(property) {
        case 'person':
          const person = this.personMap.get(item.personId);
          return person ? `${person.grunddaten.nachname} ${person.grunddaten.vorname}` : '';
        default:
          // Fix: Use type assertion to tell TypeScript this is safe
          return (item as any)[property];
      }
    };
  }
  
  /**
   * Öffnet den Dialog zum Erstellen/Bearbeiten eines Notfallkontakts
   */
  openKontaktDialog(kontakt: Notfallkontakt | null = null): void {
    const dialogRef = this.dialog.open(KontaktDialogComponent, {
      width: '500px',
      data: {
        kontakt: kontakt,
        person: null,
        personOptions: this.personen
      }
    });
    
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          if (kontakt) {
            // Bestehenden Kontakt aktualisieren
            await this.kontaktService.updateKontakt(kontakt.id, result);
            this.showSnackBar('Notfallkontakt erfolgreich aktualisiert');
          } else {
            // Neuen Kontakt erstellen
            await this.kontaktService.createKontakt(result);
            this.showSnackBar('Notfallkontakt erfolgreich erstellt');
          }
          
          // Daten neu laden
          this.loadData();
        } catch (error) {
          console.error('Fehler beim Speichern des Notfallkontakts:', error);
          this.showSnackBar('Fehler beim Speichern des Notfallkontakts');
        }
      }
    });
  }
  
  /**
   * Löscht einen Notfallkontakt nach Bestätigung
   */
  deleteKontakt(kontakt: Notfallkontakt): void {
    const person = this.personMap.get(kontakt.personId);
    const personName = person 
      ? `${person.grunddaten.grad} ${person.grunddaten.nachname}`
      : 'Unbekannt';
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Notfallkontakt löschen',
        message: `Möchten Sie den Notfallkontakt "${kontakt.name}" für ${personName} wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });
    
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.kontaktService.deleteKontakt(kontakt.id);
          this.showSnackBar('Notfallkontakt erfolgreich gelöscht');
          this.loadData();
        } catch (error) {
          console.error('Fehler beim Löschen des Notfallkontakts:', error);
          this.showSnackBar('Fehler beim Löschen des Notfallkontakts');
        }
      }
    });
  }
  
  /**
   * Navigiert zur Detailansicht einer Person
   */
  navigateToPerson(personId: string): void {
    this.router.navigate(['/personen', personId]);
  }
  
  /**
   * Gibt den Namen einer Person anhand der ID zurück
   */
  getPersonName(personId: string): string {
    const person = this.personMap.get(personId);
    if (!person) return 'Unbekannt';
    
    return `${person.grunddaten.grad} ${person.grunddaten.nachname} ${person.grunddaten.vorname}`;
  }
  
  /**
   * Formatiert die Priorität
   */
  formatPrioritaet(prioritaet: number): string {
    return prioritaet === 1 ? 'Primärkontakt' : 'Sekundärkontakt';
  }
  
  /**
   * Zeigt eine Snackbar-Benachrichtigung
   */
  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}