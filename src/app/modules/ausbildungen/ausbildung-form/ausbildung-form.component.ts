import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  FormBuilder, 
  FormGroup, 
  Validators, 
  ReactiveFormsModule 
} from '@angular/forms';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { 
  MatNativeDateModule, 
  DateAdapter, 
  MAT_DATE_FORMATS, 
  MAT_DATE_LOCALE 
} from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AusbildungService } from '../../../core/services/ausbildung.service';
import { Ausbildung } from '../../../core/models/ausbildung.model';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/utils/custom-date-adapter';

interface TypeOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-ausbildung-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'de-CH' },
    { provide: DateAdapter, useClass: CustomDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }
  ],
  templateUrl: './ausbildung-form.component.html',
  styleUrls: ['./ausbildung-form.component.scss']
})
export class AusbildungFormComponent implements OnInit {
  // Injected services
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ausbildungService = inject(AusbildungService);
  private snackBar = inject(MatSnackBar);

  // Form
  ausbildungForm: FormGroup = this.createAusbildungForm();

  // Mode (new or edit)
  isEditMode = false;
  ausbildungId: string | null = null;

  // State variables
  isLoading = false;
  isSaving = false;

  // Options for training type
  typOptions: TypeOption[] = [
    { value: 'WK', label: 'Wiederholungskurs' },
    { value: 'LG', label: 'Lehrgang' },
    { value: 'KVK', label: 'Kadervorbereitung' },
    { value: 'Übung', label: 'Übung' },
    { value: 'Kurs', label: 'Kurs' }
  ];

  ngOnInit(): void {
    this.isLoading = true;

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.ausbildungId = id;
        this.loadAusbildung(id);
      } else {
        this.isLoading = false;
      }
    });
  }

  /**
   * Creates the form structure with default values
   */
  private createAusbildungForm(): FormGroup {
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    return this.fb.group({
      titel: ['', [Validators.required]],
      beschreibung: [''],
      typ: ['WK', [Validators.required]],
      jahr: [currentYear, [Validators.required, Validators.min(2000), Validators.max(2100)]],
      // Date fields
      startDatum: [today, [Validators.required]],
      endDatum: [today, [Validators.required]],
      // Time fields
      startZeit: ['08:00', [Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      endZeit: ['17:00', [Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      // Keep datum for backward compatibility
      datum: [today, [Validators.required]],
      erforderlich: [false]
    }, { validators: this.dateRangeValidator });
  }

  /**
   * Validates that end date is after or equal to start date
   */
  private dateRangeValidator(form: FormGroup): { [key: string]: boolean } | null {
    const startDate = form.get('startDatum')?.value;
    const endDate = form.get('endDatum')?.value;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        form.get('endDatum')?.setErrors({ invalidRange: true });
        return { invalidRange: true };
      }
    }
    
    return null;
  }

  /**
   * Loads an existing training for editing
   */
  async loadAusbildung(id: string): Promise<void> {
    try {
      const ausbildung = await this.ausbildungService.getAusbildungById(id);

      if (!ausbildung) {
        this.showSnackBar('Ausbildung nicht gefunden');
        this.router.navigate(['/ausbildungen']);
        return;
      }

      let datumValue = this.parseDateValue(ausbildung.datum);
      let startDatumValue = ausbildung.startDatum ? this.parseDateValue(ausbildung.startDatum) : datumValue;
      let endDatumValue = ausbildung.endDatum ? this.parseDateValue(ausbildung.endDatum) : datumValue;
      
      this.ausbildungForm.patchValue({
        titel: ausbildung.titel,
        beschreibung: ausbildung.beschreibung || '',
        typ: ausbildung.typ,
        jahr: ausbildung.jahr,
        datum: datumValue,
        startDatum: startDatumValue,
        endDatum: endDatumValue,
        startZeit: ausbildung.startZeit || '08:00',
        endZeit: ausbildung.endZeit || '17:00',
        erforderlich: ausbildung.erforderlich ?? false
      });
    } catch (error) {
      console.error('Fehler beim Laden der Ausbildung:', error);
      this.showSnackBar('Fehler beim Laden der Ausbildungsdaten');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Parses a date value from different possible formats
   */
  private parseDateValue(dateInput: any): Date {
    if (!dateInput) return new Date();
    
    // Firestore Timestamp
    if (typeof dateInput.toDate === 'function') {
      return dateInput.toDate();
    }
    
    // Date object
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    // String or number
    if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      const parsedDate = new Date(dateInput);
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    
    return new Date();
  }

  /**
   * Saves the current training form data
   */
  async saveAusbildung(): Promise<void> {
    if (this.ausbildungForm.invalid) {
      this.markFormGroupTouched(this.ausbildungForm);
      this.showSnackBar('Bitte überprüfen Sie die Eingaben');
      return;
    }
    
    this.isSaving = true;
    
    try {
      const formValue = this.ausbildungForm.value;
      const ausbildungData = {
        titel: formValue.titel,
        beschreibung: formValue.beschreibung,
        typ: formValue.typ,
        datum: formValue.startDatum, // Use startDate for backward compatibility
        startDatum: formValue.startDatum,
        endDatum: formValue.endDatum,
        startZeit: formValue.startZeit,
        endZeit: formValue.endZeit,
        jahr: formValue.jahr,
        erforderlich: formValue.erforderlich
      };
      
      if (this.isEditMode && this.ausbildungId) {
        await this.ausbildungService.updateAusbildung(this.ausbildungId, ausbildungData);
        this.showSnackBar('Ausbildung erfolgreich aktualisiert');
        this.router.navigate(['/ausbildungen', this.ausbildungId]);
      } else {
        const newId = await this.ausbildungService.createAusbildung(ausbildungData);
        this.showSnackBar('Ausbildung erfolgreich erstellt');
        this.router.navigate(['/ausbildungen', newId]);
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Ausbildung:', error);
      this.showSnackBar('Fehler beim Speichern der Ausbildung');
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Checks if a form field has a specific error
   */
  hasError(controlName: string, errorCode: string): boolean {
    const control = this.ausbildungForm.get(controlName);
    return !!control && control.hasError(errorCode) && (control.dirty || control.touched);
  }

  /**
   * Marks all form fields as touched to trigger validation
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Cancels editing and navigates back
   */
  cancel(): void {
    if (this.isEditMode && this.ausbildungId) {
      this.router.navigate(['/ausbildungen', this.ausbildungId]);
    } else {
      this.router.navigate(['/ausbildungen']);
    }
  }

  /**
   * Shows a snackbar notification
   */
  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
