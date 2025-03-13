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
import { NotfallkontaktService } from '../../../core/services/notfallkontakt.service';
import { Notfallkontakt } from '../../../core/models/notfallkontakt.model';
import { KontaktDialogComponent } from '../notfallkontakte/kontakt-dialog/kontakt-dialog.component';

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
  private notfallkontaktService = inject(NotfallkontaktService);

  // Benutzerberechtigungen
  canEdit = this.authService.canEdit;
  canDelete = this.authService.canDelete;

  // Person-ID aus der Route
  personId: string | null = null;

  // Aktuelle Person
  person: Person | null = null;

  // Ladeindikator
  isLoading = false;

  // Notfallkontakte
  notfallkontakte: Notfallkontakt[] = [];
  loadingKontakte = false;
  

  constructor() {}


  /**
   * Initializes the component by setting up route parameter subscription.
   * If a person ID is present in the route parameters:
   * - Stores the ID
   * - Loads the person details
   * - Loads emergency contacts
   * If no ID is found, logs an error and disables loading state.
   * @implements OnInit
   */
  ngOnInit(): void {
    this.isLoading = true;

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      console.log('Person-ID aus Route:', id);

      if (id) {
        this.personId = id;
        this.loadPerson(id);
        this.loadNotfallkontakte(id);
      } else {
        console.error('Keine Person-ID in den Routenparametern gefunden');
        this.isLoading = false;
      }
    });
  }


  /**
   * Asynchronously loads a person by their ID.
   * @param id - The unique identifier of the person to load
   * @returns Promise that resolves when the person is loaded
   * @throws Will throw an error if the person cannot be loaded from the service
   * @description
   * This method attempts to load a person using the person service.
   * If successful, it updates the component's person property.
   * If the person is not found or an error occurs, it displays an error message via snackbar.
   * The loading state is always reset after the operation completes.
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
   * Loads emergency contacts for a specific person asynchronously.
   * Sets loading state during the operation and handles potential errors.
   *
   * @param personId - The unique identifier of the person to load contacts for
   * @returns Promise that resolves when the loading operation is complete
   * @throws Error if the loading operation fails
   */
  async loadNotfallkontakte(personId: string): Promise<void> {
    this.loadingKontakte = true;
    try {
      this.notfallkontakte =
        await this.notfallkontaktService.getKontakteForPerson(personId);
    } catch (error) {
      console.error('Fehler beim Laden der Notfallkontakte:', error);
      this.showSnackBar('Fehler beim Laden der Notfallkontakte');
    } finally {
      this.loadingKontakte = false;
    }
  }


  /**
   * Opens a dialog to create or edit an emergency contact.
   *
   * @param kontakt - Optional emergency contact object. If provided, the dialog will be in edit mode,
   *                 if null, the dialog will be in create mode.
   * @throws Error when saving the emergency contact fails
   * @remarks
   * The dialog allows users to:
   * - Create a new emergency contact when kontakt is null
   * - Edit an existing emergency contact when kontakt is provided
   * After successful creation/update:
   * - Shows a success message
   * - Reloads the emergency contacts list
   */
  openKontaktDialog(kontakt: Notfallkontakt | null = null): void {
    if (!this.person) return;

    const dialogRef = this.dialog.open(KontaktDialogComponent, {
      width: '500px',
      data: {
        kontakt: kontakt,
        person: this.person,
        personOptions: [this.person],
      },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          if (kontakt) {
            // Bestehenden Kontakt aktualisieren
            await this.notfallkontaktService.updateKontakt(kontakt.id, result);
            this.showSnackBar('Notfallkontakt erfolgreich aktualisiert');
          } else {
            // Neuen Kontakt erstellen
            await this.notfallkontaktService.createKontakt(result);
            this.showSnackBar('Notfallkontakt erfolgreich erstellt');
          }

          // Daten neu laden
          this.loadNotfallkontakte(this.personId!);
        } catch (error) {
          console.error('Fehler beim Speichern des Notfallkontakts:', error);
          this.showSnackBar('Fehler beim Speichern des Notfallkontakts');
        }
      }
    });
  }


  /**
   * Deletes an emergency contact after user confirmation.
   * Opens a confirmation dialog and if confirmed, removes the contact from the database.
   * Shows success/error messages via snackbar and refreshes the contact list.
   *
   * @param kontakt - The emergency contact to be deleted
   * @throws Error if deletion fails
   */
  deleteKontakt(kontakt: Notfallkontakt): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Notfallkontakt löschen',
        message: `Möchten Sie den Notfallkontakt "${kontakt.name}" wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
      },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.notfallkontaktService.deleteKontakt(kontakt.id);
          this.showSnackBar('Notfallkontakt erfolgreich gelöscht');
          this.loadNotfallkontakte(this.personId!);
        } catch (error) {
          console.error('Fehler beim Löschen des Notfallkontakts:', error);
          this.showSnackBar('Fehler beim Löschen des Notfallkontakts');
        }
      }
    });
  }


  /**
   * Navigates to the edit view for the current person.
   * If a person ID is available, redirects to the edit route using the format '/personen/{id}/bearbeiten'.
   */
  editPerson(): void {
    if (this.personId) {
      this.router.navigate(['/personen', this.personId, 'bearbeiten']);
    }
  }


  /**
   * Deletes the current person after confirmation from the user.
   * Opens a confirmation dialog and if confirmed, calls the person service to delete the person.
   * After successful deletion, shows a success message and navigates back to the persons list.
   * If deletion fails, shows an error message.
   *
   * @remarks
   * The method does nothing if no person is currently loaded.
   *
   * @returns void
   * @throws {Error} When the deletion operation fails
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
   * Generates a PDF contact data sheet for the current person.
   * Uses the PDF service to create the document and displays a confirmation message.
   * If the person object is not available, the method returns without action.
   * In case of an error during PDF generation, logs the error and shows an error message.
   *
   * @throws {Error} When PDF generation fails
   * @returns {void}
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
   * Navigates back to the persons overview page.
   * Uses the Angular Router to redirect to the '/personen' route.
   */
  goBack(): void {
    this.router.navigate(['/personen']);
  }


  /**
   * Formats a date into a Swiss German date string (dd.mm.yyyy).
   * Handles multiple date input formats including Firestore Timestamps.
   *
   * @param date - The date to format. Can be a Date object, string, Firestore Timestamp, or null/undefined
   * @returns A formatted date string in 'dd.mm.yyyy' format, or '-' if the date is invalid or null
   *
   * @example
   * // Returns "31.12.2023"
   * formatDate(new Date(2023, 11, 31))
   *
   * @example
   * // Returns "-"
   * formatDate(null)
   */
  formatDate(date: Date | string | any): string {
    if (!date) return '-';

    try {
      // Firestore Timestamp
      if (date && typeof date.toDate === 'function') {
        return this.formatFirestoreTimestamp(date);
      }

      // Date-Objekt oder Datumsstring
      const parsedDate = new Date(date);

      // Prüfe, ob das Datum gültig ist
      if (isNaN(parsedDate.getTime())) {
        return '-';
      }

      return parsedDate.toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Fehler bei der Datumsformatierung:', error);
      return '-';
    }
  }


  /**
   * Formats a Firestore timestamp into a localized date string.
   * @param timestamp - The Firestore timestamp object to format
   * @returns A formatted date string in Swiss German locale (dd.mm.yyyy) or '-' if the timestamp is invalid
   */
  formatFirestoreTimestamp(timestamp: any): string {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return '-';
    }

    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Fehler bei Firestore Timestamp:', error);
      return '-';
    }
  }


  /**
   * Formats a person's status string by mapping status codes to their display values.
   * @param status - The status code to be formatted
   * @returns The formatted status string. Returns an empty string if status is undefined,
   * the mapped value if the status exists in the statusMap, or the original status if no mapping exists.
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
   * Displays a temporary notification message using Material Snackbar
   *
   * @param message - The text message to be displayed in the snackbar
   * @private
   * @returns void
   */
  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
