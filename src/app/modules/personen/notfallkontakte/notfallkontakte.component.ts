// src/app/modules/personen/notfallkontakte/notfallkontakte.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { NotfallkontaktService } from '../../../core/services/notfallkontakt.service';
import { PersonService } from '../../../core/services/person.service';
import { AuthService } from '../../../auth/services/auth.service';

import { Notfallkontakt } from '../../../core/models/notfallkontakt.model';
import { Person } from '../../../core/models/person.model';

import { KontaktDialogComponent } from './kontakt-dialog/kontakt-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-notfallkontakte',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatPaginatorModule
  ],
  templateUrl: './notfallkontakte.component.html',
  styleUrls: ['./notfallkontakte.component.scss']
})
export class NotfallkontakteComponent implements OnInit {
  private kontaktService = inject(NotfallkontaktService);
  private personService = inject(PersonService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  
  // Berechtigungen
  canEdit = this.authService.canEdit;
  canDelete = this.authService.canDelete;
  
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
  }
  
  /**
   * Lädt Notfallkontakte und Personen
   */
  async loadData(): Promise<void> {
    this.isLoading = true;
    console.log('Lade Notfallkontakte-Daten...');
    
    try {
      // Personen laden
      await this.personService.loadPersonen();
      this.personen = this.personService.personen();
      console.log(`${this.personen.length} Personen geladen`);
      
      // Personen-Map erstellen
      this.personMap.clear();
      this.personen.forEach(person => {
        this.personMap.set(person.id, person);
      });
      
      // Wenn keine Personen vorhanden sind
      if (this.personen.length === 0) {
        this.showSnackBar('Keine Personen in der Datenbank gefunden');
        return;
      }
      
      // Notfallkontakte laden
      await this.kontaktService.loadNotfallkontakte();
      this.notfallkontakte = this.kontaktService.notfallkontakte();
      console.log(`${this.notfallkontakte.length} Notfallkontakte geladen`);
      
      // Datenquelle aktualisieren
      this.dataSource.data = this.notfallkontakte.map(kontakt => ({
        ...kontakt,
        personName: this.getPersonName(kontakt.personId)
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      this.showSnackBar('Fehler beim Laden der Daten');
    } finally {
      this.isLoading = false;
    }
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
    return prioritaet === 1 ? 'Erste Priorität' : 'Zweite Priorität';
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

    /**
   * Navigiert zur Detailseite einer Person
   */
    navigateToPerson(personId: string): void {
      if (personId) {
        this.router.navigate(['/personen', personId]);
      }
    }
}