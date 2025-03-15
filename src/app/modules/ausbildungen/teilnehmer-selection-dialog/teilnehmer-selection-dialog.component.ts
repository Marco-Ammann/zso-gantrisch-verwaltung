import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule, MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { Person } from '../../../core/models/person.model';
import { TeilnahmeService } from '../../../core/services/teilnahme.service';

export interface TeilnehmerSelectionDialogData {
  availablePersons: Person[];
  preselectedPersonIds: string[];
  ausbildungId?: string;
}

@Component({
  selector: 'app-teilnehmer-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './teilnehmer-selection-dialog.component.html',
  styleUrls: ['./teilnehmer-selection-dialog.component.scss']
})
export class TeilnehmerSelectionDialogComponent implements OnInit {
  private teilnahmeService = inject(TeilnahmeService);
  private snackBar = inject(MatSnackBar);
  
  displayedColumns: string[] = ['select', 'grad', 'name', 'zug', 'funktion'];
  dataSource: Person[] = [];
  filteredPersons: Person[] = [];
  selection = new SelectionModel<Person>(true, []);
  searchControl = new FormControl('');
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<TeilnehmerSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TeilnehmerSelectionDialogData
  ) {}

  ngOnInit(): void {
    this.dataSource = [...this.data.availablePersons];
    this.filteredPersons = [...this.dataSource];
    
    // Pre-select participants based on the provided IDs
    if (this.data.preselectedPersonIds && this.data.preselectedPersonIds.length > 0) {
      this.dataSource.forEach(person => {
        if (this.data.preselectedPersonIds.includes(person.id)) {
          this.selection.select(person);
        }
      });
    }

    // Set up search filter
    this.searchControl.valueChanges.subscribe(value => {
      this.applyFilter(value || '');
    });
  }

  applyFilter(filterValue: string): void {
    filterValue = filterValue.trim().toLowerCase();
    
    if (!filterValue) {
      this.filteredPersons = [...this.dataSource];
      return;
    }
    
    this.filteredPersons = this.dataSource.filter(person => 
      person.grunddaten.nachname.toLowerCase().includes(filterValue) ||
      person.grunddaten.vorname.toLowerCase().includes(filterValue) ||
      person.grunddaten.grad.toLowerCase().includes(filterValue) ||
      person.grunddaten.funktion.toLowerCase().includes(filterValue) ||
      `Zug ${person.zivilschutz.einteilung.zug}`.toLowerCase().includes(filterValue)
    );
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredPersons.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clears selection. */
  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.filteredPersons.forEach(row => this.selection.select(row));
    }
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: Person): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} ${row.grunddaten.nachname}`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onConfirm(): Promise<void> {
    // If we have an ausbildungId, directly update participants
    if (this.data.ausbildungId) {
      this.isSaving = true;
      try {
        // Get existing participant IDs
        const existingParticipantIds = this.data.preselectedPersonIds || [];
        
        // Get newly selected IDs
        const selectedIds = this.selection.selected.map(person => person.id);
        
        // Calculate additions and removals
        const toAdd = selectedIds.filter(id => !existingParticipantIds.includes(id));
        const toRemove = existingParticipantIds.filter(id => !selectedIds.includes(id));
        
        // Add new participants
        for (const personId of toAdd) {
          await this.teilnahmeService.createTeilnahme({
            personId,
            ausbildungId: this.data.ausbildungId,
            datum: new Date(),
            status: 'teilgenommen', // Add required status field
            bemerkung: '' // Add empty bemerkung for consistency
          });
        }
        
        // Remove participants no longer selected
        for (const personId of toRemove) {
          const teilnahmen = await this.teilnahmeService.getTeilnahmenByPerson(personId);
          const ausbildungTeilnahme = teilnahmen.find(t => t.ausbildungId === this.data.ausbildungId);
          
          if (ausbildungTeilnahme) {
            await this.teilnahmeService.deleteTeilnahme(ausbildungTeilnahme.id);
          }
        }
        
        this.showSnackBar(`${toAdd.length} Teilnehmer hinzugefügt, ${toRemove.length} entfernt`);
        
        // Close the dialog and indicate updates were made
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Teilnehmer:', error);
        this.showSnackBar('Fehler beim Aktualisieren der Teilnehmer');
      } finally {
        this.isSaving = false;
      }
    } else {
      // Legacy behavior: return selected persons
      this.dialogRef.close(this.selection.selected);
    }
  }

  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  sortData(sort: Sort): void {
    if (!sort.active || sort.direction === '') {
      return;
    }

    this.filteredPersons = this.filteredPersons.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'grad': return this.compare(a.grunddaten.grad, b.grunddaten.grad, isAsc);
        case 'name': return this.compare(
          `${a.grunddaten.nachname} ${a.grunddaten.vorname}`, 
          `${b.grunddaten.nachname} ${b.grunddaten.vorname}`, 
          isAsc
        );
        case 'zug': return this.compare(a.zivilschutz.einteilung.zug, b.zivilschutz.einteilung.zug, isAsc);
        case 'funktion': return this.compare(a.grunddaten.funktion, b.grunddaten.funktion, isAsc);
        default: return 0;
      }
    });
  }

  private compare(a: number | string, b: number | string, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
}
