// src/app/modules/personen/personen-liste/personen-liste.component.ts
import { Component, OnInit, inject, signal, computed, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
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
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';

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
    LayoutModule,
  ],
  templateUrl: './personen-liste.component.html',
  styleUrls: ['./personen-liste.component.scss'],
})
export class PersonenListeComponent implements OnInit, AfterViewInit, OnDestroy {
  private personService = inject(PersonService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);
  private destroy$ = new Subject<void>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

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

  // View mode control
  viewMode: 'table' | 'cards' = 'table';

  ngOnInit(): void {
    // Personen laden
    this.loadPersonen();

    // Suchfeld abonnieren
    this.searchControl.valueChanges.subscribe((value) => {
      this.personService.setFilter(value || '');
      this.applyFilter();
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

  // Add this lifecycle hook to properly connect sort and paginator
  ngAfterViewInit(): void {
    // Configure the custom sorting logic before connecting to MatSort
    this.configureTableSorting();
    
    // Explicitly set a delay value for setTimeout
    setTimeout(() => {
      if (this.sort) {
        this.dataSource.sort = this.sort;
      }
      
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      
      // Re-apply filter after sort/paginator are connected
      if (this.dataSource.data.length > 0) {
        this.applyFilter();
      }
    }, 100); // Use a small delay
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

    this.viewMode = isSmallScreen ? 'cards' : 'table';
  }
  
  /**
   * Manually switches between table and card views
   * @param mode The view mode to set ('table' or 'cards')
   */
  setViewMode(mode: 'table' | 'cards'): void {
    this.viewMode = mode;
  }

  /**
   * Lädt Personen vom Service und wendet Filter an
   */
  async loadPersonen(): Promise<void> {
    try {
      await this.personService.loadPersonen();
      
      // Using the personen property instead of a non-existent getPersonen() method
      // The error message indicates personen is the correct property to use
      console.log('PersonService loaded:', this.personService.personen().length); // Debug log
      
      // Assign data to dataSource before applying filter
      this.dataSource.data = this.personService.personen();
      
      // Now apply the filter
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
    // Set up filter predicate first
    this.dataSource.filterPredicate = (data: Person, filter: string) => {
      // Debug log to see what items are being filtered
      console.log('Filtering person:', data.grunddaten.nachname, 'with status:', data.zivilschutz.status);
      
      const searchStr = [
        data.grunddaten.grad,
        data.grunddaten.nachname,
        data.grunddaten.vorname,
        data.grunddaten.funktion,
        data.kontaktdaten.ort,
        data.kontaktdaten.email,
        data.zivilschutz.einteilung.zug?.toString() || ''
      ].filter(Boolean).join(' ').toLowerCase();
      
      const matchesSearch = !filter || searchStr.includes(filter);
      const matchesStatus = this.selectedStatus() === 'alle' || data.zivilschutz.status === this.selectedStatus();
      
      return matchesSearch && matchesStatus;
    };
    
    const filterValue = this.searchControl.value || '';
    // Apply filter only once
    this.dataSource.filter = filterValue.trim().toLowerCase();
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    
    // Debug log after filtering
    console.log('Filtered data count:', this.dataSource.filteredData.length);
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

  /**
   * Configures custom sorting logic for nested properties
   */
  private configureTableSorting(): void {
    // Custom sort logic for nested properties
    this.dataSource.sortingDataAccessor = (item: Person, property: string) => {
      switch (property) {
        case 'grad':
          return item.grunddaten.grad || '';
        case 'name':
          return item.grunddaten.nachname + ' ' + item.grunddaten.vorname || '';
        case 'funktion':
          return item.grunddaten.funktion || '';
        case 'zug':
          return item.zivilschutz.einteilung.zug || 0;
        case 'status':
          return item.zivilschutz.status || '';
        default:
          // For non-nested properties
          return (item as any)[property] || '';
      }
    };
  }
}
