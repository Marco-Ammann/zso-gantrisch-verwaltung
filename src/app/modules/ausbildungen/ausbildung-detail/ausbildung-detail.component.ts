// src/app/modules/ausbildungen/ausbildung-detail/ausbildung-detail.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';

import { AusbildungService, TeilnahmeService, PersonService } from '../../../core/services';
import { AuthService } from '../../../auth/services/auth.service';
import { Ausbildung } from '../../../core/models/ausbildung.model';
import { Ausbildungsteilnahme } from '../../../core/models/teilnahme.model';
import { Person } from '../../../core/models/person.model';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-ausbildung-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatPaginatorModule
  ],
  templateUrl: './ausbildung-detail.component.html',
  styleUrls: ['./ausbildung-detail.component.scss']
})
export class AusbildungDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ausbildungService = inject(AusbildungService);
  private teilnahmeService = inject(TeilnahmeService);
  private personService = inject(PersonService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Benutzerberechtigungen
  canEdit = this.authService.canEdit;
  canDelete = this.authService.canDelete;

  // Zustände
  ausbildung = signal<Ausbildung | null>(null);
  teilnahmen = signal<Ausbildungsteilnahme[]>([]);
  personen = signal<Person[]>([]);
  isLoading = signal(true);
  loadingTeilnahmen = signal(false);

  // ID der Ausbildung
  ausbildungId: string | null = null;

  // Tabellenkonfiguration für Teilnahmen
  displayedColumns: string[] = ['person', 'datum', 'status', 'bemerkung', 'aktionen'];
  dataSource: any[] = [];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.ausbildungId = id;
        this.loadAusbildung(id);
        this.loadTeilnahmen(id);
      } else {
        this.showSnackBar('Keine Ausbildungs-ID gefunden');
        this.router.navigate(['/ausbildungen']);
      }
    });
  }

  /**
   * Lädt die Ausbildungsdetails
   */
  async loadAusbildung(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const ausbildung = await this.ausbildungService.getAusbildungById(id);
      this.ausbildung.set(ausbildung);
      
      if (!ausbildung) {
        this.showSnackBar('Ausbildung nicht gefunden');
        this.router.navigate(['/ausbildungen']);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ausbildung:', error);
      this.showSnackBar('Fehler beim Laden der Ausbildungsdetails');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Lädt die Teilnahmen für diese Ausbildung
   */
  async loadTeilnahmen(ausbildungId: string): Promise<void> {
    this.loadingTeilnahmen.set(true);
    try {
      // Personen laden
      if (this.personen().length === 0) {
        await this.personService.loadPersonen();
        this.personen.set(this.personService.personen());
      }

      // Teilnahmen für diese Ausbildung laden
      const teilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(ausbildungId);
      this.teilnahmen.set(teilnahmen);
      
      // Datenquelle für die Tabelle vorbereiten
      this.updateDataSource();
    } catch (error) {
      console.error('Fehler beim Laden der Teilnahmen:', error);
      this.showSnackBar('Fehler beim Laden der Teilnahmen');
    } finally {
      this.loadingTeilnahmen.set(false);
    }
  }

  /**
   * Bereitet die Datenquelle für die Teilnahmen-Tabelle vor
   */
  private updateDataSource(): void {
    this.dataSource = this.teilnahmen().map(teilnahme => {
      const person = this.personen().find(p => p.id === teilnahme.personId);
      return {
        ...teilnahme,
        personName: person ? `${person.grunddaten.grad} ${person.grunddaten.nachname} ${person.grunddaten.vorname}` : 'Unbekannt'
      };
    });
  }

  /**
   * Navigiert zur Bearbeitungsseite
   */
  editAusbildung(): void {
    if (this.ausbildungId) {
      this.router.navigate(['/ausbildungen', this.ausbildungId, 'bearbeiten']);
    }
  }

  /**
   * Löscht die Ausbildung mit Bestätigungsdialog
   */
  deleteAusbildung(): void {
    const currentAusbildung = this.ausbildung();
    if (!currentAusbildung) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Ausbildung löschen',
        message: `Möchten Sie die Ausbildung "${currentAusbildung.titel}" wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && this.ausbildungId) {
        try {
          await this.ausbildungService.deleteAusbildung(this.ausbildungId);
          this.showSnackBar('Ausbildung erfolgreich gelöscht');
          this.router.navigate(['/ausbildungen']);
        } catch (error) {
          console.error('Fehler beim Löschen der Ausbildung:', error);
          this.showSnackBar('Fehler beim Löschen der Ausbildung');
        }
      }
    });
  }

  /**
   * Zur Teilnahmeerfassung navigieren
   */
  erfasseTeilnahme(): void {
    if (this.ausbildungId) {
      this.router.navigate(['/ausbildungen/teilnahmen', this.ausbildungId]);
    }
  }

  /**
   * Teilnahme löschen mit Bestätigungsdialog
   */
  deleteTeilnahme(teilnahme: Ausbildungsteilnahme & { personName: string }): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Teilnahme löschen',
        message: `Möchten Sie die Teilnahme von ${teilnahme.personName} wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.teilnahmeService.deleteTeilnahme(teilnahme.id);
          this.showSnackBar('Teilnahme erfolgreich gelöscht');
          
          // Daten aktualisieren
          if (this.ausbildungId) {
            this.loadTeilnahmen(this.ausbildungId);
          }
        } catch (error) {
          console.error('Fehler beim Löschen der Teilnahme:', error);
          this.showSnackBar('Fehler beim Löschen der Teilnahme');
        }
      }
    });
  }

  /**
   * Zurück zur Ausbildungsübersicht
   */
  goBack(): void {
    this.router.navigate(['/ausbildungen']);
  }

  /**
   * Statustext formatieren
   */
  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'teilgenommen': 'Teilgenommen',
      'nicht teilgenommen': 'Nicht teilgenommen',
      'dispensiert': 'Dispensiert'
    };
    
    return statusMap[status] || status;
  }

  /**
   * Datum formatieren
   */
  formatDate(date: any): string {
    if (!date) return '-';
    
    try {
      // Wenn date ein Firestore Timestamp ist
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('de-CH');
      }
      // Wenn date ein Date-Objekt oder ein String ist
      return new Date(date).toLocaleDateString('de-CH');
    } catch (error) {
      console.error('Fehler bei der Datumsformatierung:', error);
      return '-';
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