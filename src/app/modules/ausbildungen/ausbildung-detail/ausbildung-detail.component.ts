import { Component, OnInit, inject, signal, computed } from '@angular/core';
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

import { AusbildungService } from '../../../core/services/ausbildung.service';
import { TeilnahmeService } from '../../../core/services/teilnahme.service';
import { PersonService } from '../../../core/services/person.service';
import { PdfGeneratorService } from '../../../core/services/pdf-generator.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PdfProgressDialogComponent } from '../../../core/utils/pdf-progress-dialog.component';
import { CommonModule } from '@angular/common';
import { TeilnehmerSelectionDialogComponent } from '../teilnehmer-selection-dialog/teilnehmer-selection-dialog.component';

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
    MatPaginatorModule,
  ],
  templateUrl: './ausbildung-detail.component.html',
  styleUrls: ['./ausbildung-detail.component.scss'],
})
export class AusbildungDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ausbildungService = inject(AusbildungService);
  private teilnahmeService = inject(TeilnahmeService);
  private personService = inject(PersonService);
  private authService = inject(AuthService);
  private pdfService = inject(PdfGeneratorService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ausbildung = signal<any>(null);
  teilnahmen = signal<any[]>([]);
  personen = signal<any[]>([]);
  isLoading = signal(true);
  loadingTeilnahmen = signal(false);
  ausbildungId: string | null = null;

  displayedColumns: string[] = [
    'person',
    'datum',
    'status',
    'bemerkung',
    'aktionen',
  ];
  dataSource = computed(() => {
    return this.teilnahmen().map((teilnahme) => {
      const person = this.personen().find((p) => p.id === teilnahme.personId);
      return {
        ...teilnahme,
        personName: person
          ? `${person.grunddaten.grad} ${person.grunddaten.nachname} ${person.grunddaten.vorname}`
          : 'Unbekannt',
      };
    });
  });

  canEdit = this.authService.canEdit;
  canDelete = this.authService.canDelete;

  ngOnInit(): void {
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      if (id) {
        this.ausbildungId = id;
        await this.loadAusbildung(id);
        await this.loadTeilnahmen(id);
      } else {
        this.showSnackBar('Keine Ausbildungs-ID gefunden');
        this.router.navigate(['/ausbildungen']);
      }
    });
  }

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

  goBack(): void {
    this.router.navigate(['/ausbildungen']);
  }

  async loadTeilnahmen(ausbildungId: string): Promise<void> {
    this.loadingTeilnahmen.set(true);
    try {
      if (this.personen().length === 0) {
        await this.personService.loadPersonen();
        this.personen.set(this.personService.personen());
      }
      const teilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(
        ausbildungId
      );
      this.teilnahmen.set(teilnahmen);
    } catch (error) {
      console.error('Fehler beim Laden der Teilnahmen:', error);
      this.showSnackBar('Fehler beim Laden der Teilnahmen');
    } finally {
      this.loadingTeilnahmen.set(false);
    }
  }

  editAusbildung(): void {
    if (this.ausbildungId) {
      this.router.navigate(['/ausbildungen', this.ausbildungId, 'bearbeiten']);
    }
  }

  deleteAusbildung(): void {
    const current = this.ausbildung();
    if (!current) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Ausbildung löschen',
        message: `Möchten Sie die Ausbildung "${current.titel}" wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
      },
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

  erfasseTeilnahme(): void {
    if (this.ausbildungId) {
      this.router.navigate(['/ausbildungen/teilnahmen', this.ausbildungId]);
    }
  }

  deleteTeilnahme(teilnahme: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Teilnahme löschen',
        message: `Möchten Sie die Teilnahme von ${teilnahme.personName} wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && this.ausbildungId) {
        try {
          await this.teilnahmeService.deleteTeilnahme(teilnahme.id);
          this.showSnackBar('Teilnahme erfolgreich gelöscht');
          await this.loadTeilnahmen(this.ausbildungId);
        } catch (error) {
          console.error('Fehler beim Löschen der Teilnahme:', error);
          this.showSnackBar('Fehler beim Löschen der Teilnahme');
        }
      }
    });
  }

  async generatePdfsForAllParticipants(): Promise<void> {
    if (!this.ausbildungId) return;
    const dialogRef = this.dialog.open(PdfProgressDialogComponent, {
      disableClose: true,
      panelClass: 'pdf-progress-dialog',
    });
    try {
      await this.pdfService.generateKombiniertesKontaktdatenblattFuerKurs(
        this.ausbildungId,
        (progress: number, status: string) => {
          const instance =
            dialogRef.componentInstance as PdfProgressDialogComponent;
          instance.progress = progress;
          instance.status = status;
        }
      );
      this.showSnackBar('PDF erfolgreich erstellt');
    } catch (error) {
      console.error('Fehler beim Generieren der PDFs:', error);
      this.showSnackBar('Fehler beim Generieren der PDFs');
    } finally {
      dialogRef.close();
    }
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      teilgenommen: 'Teilgenommen',
      'nicht teilgenommen': 'Nicht teilgenommen',
      dispensiert: 'Dispensiert',
    };
    return map[status] || status;
  }

  formatDate(date: any): string {
    if (!date) return 'Nicht angegeben';
    
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
   * Format date and time for display
   */
  formatDateWithTime(date: any, time?: string): string {
    if (!date) return 'Nicht angegeben';
    
    const jsDate = typeof date.toDate === 'function' 
      ? date.toDate() 
      : new Date(date);
      
    const dateString = jsDate.toLocaleDateString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    if (time) {
      return `${dateString}, ${time} Uhr`;
    }
    
    return dateString;
  }

  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  /**
   * Opens the participant management dialog
   */
  openTeilnehmerDialog(): void {
    if (!this.ausbildungId) return;
    
    // Get active persons
    const aktivPersonen = this.personen().filter(p => p.zivilschutz?.status === 'aktiv');
    
    // Get existing participant IDs
    const existingParticipantIds = this.teilnahmen()
      .map(teilnahme => teilnahme.personId)
      .filter(id => !!id);
    
    // Open the dialog
    const dialogRef = this.dialog.open(TeilnehmerSelectionDialogComponent, {
      width: '800px',
      data: {
        availablePersons: aktivPersonen,
        preselectedPersonIds: existingParticipantIds,
        ausbildungId: this.ausbildungId
      }
    });
  
    // Handle dialog close - reload participants
    dialogRef.afterClosed().subscribe(result => {
      // If dialog was confirmed (not dismissed), reload participant data
      if (result === true) {
        this.loadTeilnahmen(this.ausbildungId!);
      }
    });
  }
}
