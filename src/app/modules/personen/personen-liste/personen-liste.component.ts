// src/app/modules/personen/personen-liste/personen-liste.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PersonService } from '../../../core/services/person.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Person } from '../../../core/models/person.model';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-personen-liste',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatChipsModule,
    MatBadgeModule,
    MatCardModule,
    MatDividerModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './personen-liste.component.html',
  styleUrls: ['./personen-liste.component.scss'],
})
export class PersonenListeComponent implements OnInit {
  private personService = inject(PersonService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Rechte basierend auf der Benutzerrolle
  canEdit = this.authService.canEdit;
  canDelete = this.authService.canDelete;

  // Suchfeld
  searchControl = new FormControl('');

  // Tabellenkonfiguration
  displayedColumns: string[] = [
    'grad',
    'name',
    'funktion',
    'kontakt',
    'zug',
    'status',
    'aktionen',
  ];
  dataSource = new MatTableDataSource<Person>([]);

  // Status-Optionen für Filter
  statusOptions = [
    { value: 'alle', label: 'Alle' },
    { value: 'aktiv', label: 'Aktiv' },
    { value: 'inaktiv', label: 'Inaktiv' },
    { value: 'neu', label: 'Neu' },
  ];

  // Aktuell ausgewählter Filter
  selectedStatus = signal<string>('alle');

  // Gesamtanzahl der Personen nach Status
  personenCount = computed(() => {
    const counts = this.personService.getPersonCountByStatus();
    return {
      total: counts.aktiv + counts.inaktiv + counts.neu,
      aktiv: counts.aktiv,
      inaktiv: counts.inaktiv,
      neu: counts.neu,
    };
  });

  ngOnInit(): void {
    // Personen laden
    this.loadPersonen();

    // Suchfeld abonnieren
    this.searchControl.valueChanges.subscribe((value) => {
      this.personService.setFilter(value || '');
      this.applyFilter();
    });
  }

  /**
   * Lädt Personen vom Service und wendet Filter an
   */
  async loadPersonen(): Promise<void> {
    try {
      await this.personService.loadPersonen();
      this.applyFilter();
    } catch (error) {
      console.error('Fehler beim Laden der Personen:', error);
      this.showSnackBar('Fehler beim Laden der Personen');
    }
  }

  /**
   * Filter anwenden basierend auf Suchbegriff und Status
   */
  applyFilter(): void {
    const status = this.selectedStatus();

    // Gefilterte Personen vom Service bekommen
    let filteredPersonen = this.personService.filteredPersonen();

    // Status-Filter anwenden, wenn nicht "alle"
    if (status !== 'alle') {
      filteredPersonen = filteredPersonen.filter(
        (person) => person.zivilschutz.status === status
      );
    }

    // Datenquelle aktualisieren
    this.dataSource.data = filteredPersonen;
  }

  /**
   * Status-Filter setzen
   */
  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.applyFilter();
  }

  /**
   * Zur Detailseite einer Person navigieren
   */
  viewPerson(person: Person): void {
    console.log('Navigiere zu Person:', person.id); // Debug-Log hinzufügen
    this.router.navigate(['/personen', person.id]);
  }

  /**
   * Zum Bearbeitungsformular einer Person navigieren
   */
  editPerson(person: Person): void {
    this.router.navigate(['/personen', person.id, 'bearbeiten']);
  }

  /**
   * Person löschen mit Bestätigungsdialog
   */
  deletePerson(person: Person, event: Event): void {
    event.stopPropagation(); // Verhindern, dass das Event zur Zeile propagiert

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Person löschen',
        message: `Möchten Sie ${person.grunddaten.grad} ${person.grunddaten.vorname} ${person.grunddaten.nachname} wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
      },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.personService.deletePerson(person.id);
          this.showSnackBar('Person erfolgreich gelöscht');
          this.loadPersonen();
        } catch (error) {
          console.error('Fehler beim Löschen der Person:', error);
          this.showSnackBar('Fehler beim Löschen der Person');
        }
      }
    });
  }

  /**
   * Neue Person erstellen
   */
  createPerson(): void {
    this.router.navigate(['/personen/neu']);
  }

  /**
   * Statustext formatieren
   */
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      aktiv: 'Aktiv',
      inaktiv: 'Inaktiv',
      neu: 'Neu',
    };

    return statusMap[status] || status;
  }

  /**
   * Farbklasse für Status ermitteln
   */
  getStatusColorClass(status: string): string {
    const colorMap: Record<string, string> = {
      aktiv: 'status-aktiv',
      inaktiv: 'status-inaktiv',
      neu: 'status-neu',
    };

    return colorMap[status] || '';
  }

  /**
   * Snackbar-Benachrichtigung anzeigen
   */
  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
