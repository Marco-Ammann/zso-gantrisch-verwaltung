// src/app/modules/personen/person-detail/person-detail.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PersonService } from '../../../core/services/person.service';
import { PdfGeneratorService } from '../../../core/services/pdf-generator.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Person } from '../../../core/models/person.model';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-person-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './person-detail.component.html',
  styleUrls: ['./person-detail.component.scss'],
})
export class PersonDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private personService = inject(PersonService);
  private pdfService = inject(PdfGeneratorService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Benutzerberechtigungen
  canEdit = this.authService.canEdit;
  canDelete = this.authService.canDelete;

  // Person-ID aus der Route
  personId: string | null = null;

  // Aktuelle Person
  person: Person | null = null;

  // Ladeindikator
  isLoading = false;

  ngOnInit(): void {
    // Klare Anzeige des Ladezustands
    this.isLoading = true;

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      console.log('Person-ID aus Route:', id);

      if (id) {
        this.personId = id;
        this.loadPerson(id);
      } else {
        console.error('Keine Person-ID in den Routenparametern gefunden');
        this.isLoading = false;
      }
    });
  }

  /**
   * Lädt Person-Details
   */
  async loadPerson(id: string): Promise<void> {
    try {
      console.log('Lade Person mit ID:', id);
      const person = await this.personService.getPersonById(id);

      if (person) {
        console.log('Person geladen:', person.grunddaten.nachname);
        this.person = person;
      } else {
        console.error('Person nicht gefunden');
        this.showSnackBar('Person nicht gefunden');
      }
    } catch (error) {
      console.error(`Fehler beim Laden der Person mit ID ${id}:`, error);
      this.showSnackBar('Fehler beim Laden der Personendaten');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Navigiert zur Bearbeitungsseite
   */
  editPerson(): void {
    if (this.personId) {
      this.router.navigate(['/personen', this.personId, 'bearbeiten']);
    }
  }

  /**
   * Person löschen mit Bestätigungsdialog
   */
  deletePerson(): void {
    if (!this.person) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Person löschen',
        message: `Möchten Sie ${this.person.grunddaten.grad} ${this.person.grunddaten.vorname} ${this.person.grunddaten.nachname} wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
      },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && this.personId) {
        try {
          await this.personService.deletePerson(this.personId);
          this.showSnackBar('Person erfolgreich gelöscht');
          this.router.navigate(['/personen']);
        } catch (error) {
          console.error('Fehler beim Löschen der Person:', error);
          this.showSnackBar('Fehler beim Löschen der Person');
        }
      }
    });
  }

  /**
   * Erstellt ein PDF-Kontaktdatenblatt
   */
  generatePdf(): void {
    if (!this.person) return;

    try {
      this.pdfService.generateKontaktdatenblatt(this.person);
      this.showSnackBar('Kontaktdatenblatt wurde generiert');
    } catch (error) {
      console.error('Fehler bei der PDF-Generierung:', error);
      this.showSnackBar('Fehler bei der PDF-Generierung');
    }
  }

  /**
   * Zurück zur Personenliste navigieren
   */
  goBack(): void {
    this.router.navigate(['/personen']);
  }

  /**
   * Formatiert ein Datum für die Anzeige
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('de-CH');
  }

  formatFirestoreTimestamp(date: any): string {
    if (!date) return '-';
    return date.toDate().toLocaleDateString('de-CH');
  }

  /**
   * Formatiert den Status
   */
  formatStatus(status: string | undefined): string {
    if (!status) return '';

    const statusMap: Record<string, string> = {
      aktiv: 'Aktiv',
      inaktiv: 'Inaktiv',
      neu: 'Neu',
    };

    return statusMap[status] || status;
  }

  /**
   * Zeigt Snackbar-Meldung an
   */
  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
