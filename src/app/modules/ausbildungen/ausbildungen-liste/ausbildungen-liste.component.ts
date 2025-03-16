// src/app/modules/ausbildungen/ausbildungen-liste/ausbildungen-liste.component.ts
import { Component, OnInit, inject, signal, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';

import { AusbildungService } from '../../../core/services/ausbildung.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Ausbildung } from '../../../core/models/ausbildung.model';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { TeilnahmeService } from '../../../core/services/teilnahme.service';
import { PersonService } from '../../../core/services/person.service';
import { Ausbildungsteilnahme } from '../../../core/models/teilnahme.model';

@Component({
  selector: 'app-ausbildungen-liste',
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
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatProgressBarModule, // Add this import for mat-progress-bar
    LayoutModule,
  ],
  templateUrl: './ausbildungen-liste.component.html',
  styleUrls: ['./ausbildungen-liste.component.scss'],
})
export class AusbildungenListeComponent implements OnInit, OnDestroy {
  private ausbildungService = inject(AusbildungService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private teilnahmeService = inject(TeilnahmeService);
  private personService = inject(PersonService);
  private breakpointObserver = inject(BreakpointObserver);
  private destroy$ = new Subject<void>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Rechte basierend auf der Benutzerrolle
  canEdit = this.authService.canEdit;
  canDelete = this.authService.canDelete;

  // Suchfeld
  searchControl = new FormControl('');

  // Typ-Filter
  typFilter = new FormControl('alle');
  typOptions = [
    { value: 'alle', label: 'Alle Typen' },
    { value: 'WK', label: 'WK' },
    { value: 'LG', label: 'LG' },
    { value: 'KVK', label: 'KVK' },
    { value: 'Übung', label: 'Übung' },
    { value: 'Kurs', label: 'Kurs' },
  ];

  // Tabellenkonfiguration
  displayedColumns: string[] = [
    'typ',
    'titel',
    'jahr',
    'erforderlich',
    'aktionen',
  ];
  dataSource = new MatTableDataSource<Ausbildung>([]);

  // Ladeindikator
  isLoading = signal(true);

  // View mode control
  viewMode: 'table' | 'cards' = 'table';
  
  // Participants data cache
  ausbildungParticipants = new Map<string, Ausbildungsteilnahme[]>();

  ngOnInit(): void {
    // Ausbildungen laden
    this.loadAusbildungen();

    // Suchfeld abonnieren
    this.searchControl.valueChanges.subscribe((value) => {
      this.ausbildungService.setFilter(value || '');
      this.updateDataSource();
    });

    // Typ-Filter abonnieren
    this.typFilter.valueChanges.subscribe(() => {
      this.updateDataSource();
    });
    
    // Set view mode based on screen size
    this.setResponsiveViewMode();
    
    // Listen for screen size changes
    this.breakpointObserver
      .observe([
        Breakpoints.HandsetPortrait,
        Breakpoints.TabletPortrait,
        Breakpoints.Handset,
        Breakpoints.Tablet
      ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.setResponsiveViewMode();
      });
  }

  ngAfterViewInit() {
    // Set custom sorting logic
    this.dataSource.sortingDataAccessor = (item: Ausbildung, property: string) => {
      switch(property) {
        case 'typ':
          return item.typ || '';
        case 'titel':
          return item.titel || '';
        case 'jahr':
          return item.jahr || 0;
        case 'erforderlich':
          return item.erforderlich ? 'ja' : 'nein';
        default:
          return (item as any)[property] || '';
      }
    };

    if (this.sort && this.paginator) {
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sets the appropriate view mode based on screen size
   * Cards for mobile/tablet devices, table for larger screens
   */
  setResponsiveViewMode(): void {
    const isSmallScreen = this.breakpointObserver.isMatched([
      Breakpoints.HandsetPortrait,
      Breakpoints.TabletPortrait,
      Breakpoints.Handset,
      Breakpoints.Tablet
    ]);
    
    const newViewMode = isSmallScreen ? 'cards' : 'table';
    
    // Only change view mode if needed to prevent redundant data loading
    if (this.viewMode !== newViewMode) {
      this.viewMode = newViewMode;
      
      // Load participants if switching to card view
      if (newViewMode === 'cards') {
        this.loadParticipants();
      }
    }
  }

  /**
   * Lädt Ausbildungen vom Service und wendet Filter an
   */
  async loadAusbildungen(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.ausbildungService.loadAusbildungen();
      this.updateDataSource();
    } catch (error) {
      console.error('Fehler beim Laden der Ausbildungen:', error);
      this.showSnackBar('Fehler beim Laden der Ausbildungen');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Aktualisiert die Datenquelle basierend auf den Filtern
   */
  updateDataSource(): void {
    // Gefilterte Ausbildungen vom Service
    let filteredAusbildungen = this.ausbildungService.filteredAusbildungen();

    // Typ-Filter anwenden
    const typValue = this.typFilter.value;
    if (typValue && typValue !== 'alle') {
      filteredAusbildungen = filteredAusbildungen.filter(
        (ausbildung) => ausbildung.typ === typValue
      );
    }

    // Datenquelle aktualisieren
    this.dataSource.data = filteredAusbildungen;

    // Log zur Fehlerbehebung
    console.log('Datenquelle aktualisiert:', this.dataSource.data);
  }

  /**
   * Zur Detailseite einer Ausbildung navigieren
   */
  viewAusbildung(ausbildung: Ausbildung): void {
    console.log('Navigiere zu Ausbildung:', ausbildung.id);
    if (ausbildung && ausbildung.id) {
      this.router.navigate(['/ausbildungen', ausbildung.id]);
    } else {
      this.showSnackBar('Fehler: Ausbildung hat keine ID');
    }
  }

  /**
   * Zum Bearbeitungsformular einer Ausbildung navigieren
   */
  editAusbildung(ausbildung: Ausbildung, event: Event): void {
    event.stopPropagation();
    if (ausbildung && ausbildung.id) {
      this.router.navigate(['/ausbildungen', ausbildung.id, 'bearbeiten']);
    } else {
      this.showSnackBar('Fehler: Ausbildung hat keine ID');
    }
  }

  /**
   * Deletes an Ausbildung after confirmation.
   * Shows a dialog and processes the deletion if confirmed.
   *
   * @param ausbildung - The Ausbildung to delete
   * @param event - The triggering event
   */
  deleteAusbildung(ausbildung: Ausbildung, event: Event): void {
    event.stopPropagation();

    if (!this.isValidAusbildung(ausbildung)) {
      return;
    }

    const dialogRef = this.openConfirmationDialog(ausbildung);

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.performDeletion(ausbildung.id);
      }
    });
  }

  /**
   * Validates if an Ausbildung can be deleted
   */
  private isValidAusbildung(ausbildung: Ausbildung): boolean {
    if (!ausbildung?.id) {
      this.showSnackBar('Fehler: Ausbildung hat keine ID');
      return false;
    }
    return true;
  }

  /**
   * Opens the confirmation dialog
   */
  private openConfirmationDialog(ausbildung: Ausbildung) {
    return this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Ausbildung löschen',
        message: `Möchten Sie die Ausbildung "${ausbildung.titel}" wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
      },
    });
  }

  /**
   * Executes the deletion process
   */
  private async performDeletion(ausbildungId: string): Promise<void> {
    try {
      await this.ausbildungService.deleteAusbildung(ausbildungId);
      this.showSnackBar('Ausbildung erfolgreich gelöscht');
      this.loadAusbildungen();
    } catch (error) {
      console.error('Fehler beim Löschen der Ausbildung:', error);
      this.showSnackBar('Fehler beim Löschen der Ausbildung');
    }
  }

  /**
   * Navigates to the ausbildungen creation page.
   *
   * This method redirects the user to the route '/ausbildungen/neu',
   * which is responsible for displaying the form to create a new ausbildung.
   */
  createAusbildung(): void {
    this.router.navigate(['/ausbildungen/neu']);
  }

  /**
   * Navigates to the teilnahmen page for a specific ausbildung.
   * Prevents the default event behavior and event propagation.
   *
   * @param ausbildung - The ausbildung object to register participation for
   * @param event - The DOM event that triggered this method
   * @throws Shows a snackbar error message if the ausbildung has no ID
   */
  erfasseTeilnahme(ausbildung: Ausbildung, event: Event): void {
    event.stopPropagation();
    if (ausbildung && ausbildung.id) {
      this.router.navigate(['/ausbildungen/teilnahmen', ausbildung.id]);
    } else {
      this.showSnackBar('Fehler: Ausbildung hat keine ID');
    }
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

  /**
   * Switches between table and card views
   * @param mode The view mode to set ('table' or 'cards')
   */
  setViewMode(mode: 'table' | 'cards'): void {
    this.viewMode = mode;
    
    // Load participants when switching to card view
    if (mode === 'cards') {
      this.loadParticipants();
    }
  }
  
  /**
   * Loads participants for all visible ausbildungen
   */
  async loadParticipants(): Promise<void> {
    try {
      // Load data for each ausbildung
      for (const ausbildung of this.dataSource.data) {
        if (ausbildung.id) {
          // Fixed method name from getTeilnahmenByAusbildungId to getTeilnahmenByAusbildung
          const teilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(ausbildung.id);
          this.ausbildungParticipants.set(ausbildung.id, teilnahmen);
        }
      }
    } catch (error) {
      console.error('Error loading participants:', error);
      this.showSnackBar('Fehler beim Laden der Teilnehmer');
    }
  }
  
  /**
   * Gets participants count for an ausbildung
   */
  getParticipantCount(ausbildungId: string): number {
    return this.ausbildungParticipants.get(ausbildungId)?.length || 0;
  }
  
  /**
   * Gets completed participants count
   */
  getCompletedParticipantCount(ausbildungId: string): number {
    return this.ausbildungParticipants.get(ausbildungId)?.filter(t => 
      t.status === 'teilgenommen').length || 0;
  }

  /**
   * Formats a Firestore Timestamp or Date to display format
   * Handles both native Date objects and Firestore Timestamp objects
   * @param dateValue - The date value to format (Timestamp or Date)
   * @returns Formatted date string or placeholder if no date provided
   */
  formatDate(dateValue: any): string {
    if (!dateValue) return 'Kein Datum';
    
    // Handle Firestore Timestamp objects which have a toDate method
    if (dateValue && typeof dateValue.toDate === 'function') {
      return new Date(dateValue.toDate()).toLocaleDateString('de-CH');
    }
    
    // Handle JavaScript Date objects
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString('de-CH');
    }
    
    // For string dates or other formats, try to create a Date object
    try {
      return new Date(dateValue).toLocaleDateString('de-CH');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Ungültiges Datum';
    }
  }
}
