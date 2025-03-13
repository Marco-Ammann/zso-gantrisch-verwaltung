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
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AusbildungService } from '../../../core/services/ausbildung.service';
import { Ausbildung } from '../../../core/models/ausbildung.model';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/utils/custom-date-adapter';

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
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ausbildungService = inject(AusbildungService);
  private snackBar = inject(MatSnackBar);

  // Formular
  ausbildungForm: FormGroup;

  // Modus (neu oder bearbeiten)
  isEditMode = false;
  ausbildungId: string | null = null;

  // Zustandsvariablen
  isLoading = false;
  isSaving = false;

  // Optionen für Ausbildungstyp
  typOptions = [
    { value: 'WK', label: 'Wiederholungskurs' },
    { value: 'LG', label: 'Lehrgang' },
    { value: 'KVK', label: 'Kadervorbereitung' },
    { value: 'Übung', label: 'Übung' },
    { value: 'Kurs', label: 'Kurs' }
  ];

  constructor() {
    // Formular initialisieren
    this.ausbildungForm = this.createAusbildungForm();
  }

  ngOnInit(): void {
    // isLoading direkt setzen, nicht in einem setTimeout (verhindert ExpressionChangedAfterItHasBeenCheckedError)
    this.isLoading = true;

    // Prüfen, ob wir im Bearbeitungsmodus sind
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.ausbildungId = id;
        this.loadAusbildung(id);
      } else {
        // Wenn keine ID vorhanden ist, isLoading zurücksetzen
        this.isLoading = false;
      }
    });
  }

  /**
   * Erstellt die Formularstruktur
   */
  private createAusbildungForm(): FormGroup {
    const currentYear = new Date().getFullYear();
    return this.fb.group({
      titel: ['', [Validators.required]],
      beschreibung: [''],
      typ: ['WK', [Validators.required]],
      jahr: [currentYear, [Validators.required, Validators.min(2000), Validators.max(2100)]],
      datum: [new Date(), [Validators.required]],
      erforderlich: [false] // Standard: Nicht erforderlich
    });
  }

  /**
   * Lädt eine bestehende Ausbildung zum Bearbeiten
   */
  async loadAusbildung(id: string): Promise<void> {
    try {
      const ausbildung = await this.ausbildungService.getAusbildungById(id);

      if (ausbildung) {
        // Datum korrekt konvertieren, wenn es ein Firestore Timestamp ist
        let datumValue: Date | null = null;
        
        if (ausbildung.datum) {
          // Wenn es ein Firestore Timestamp ist
          if (typeof ausbildung.datum.toDate === 'function') {
            datumValue = ausbildung.datum.toDate();
          } 
          // Wenn es ein Date-Objekt ist
          else if (ausbildung.datum instanceof Date) {
            datumValue = ausbildung.datum;
          }
          // Wenn es ein String oder Number ist
          else if (typeof ausbildung.datum === 'string' || typeof ausbildung.datum === 'number') {
            datumValue = new Date(ausbildung.datum);
          }
        }

        // Wenn kein gültiges Datum extrahiert werden konnte, aktuelles Datum verwenden
        if (!datumValue || isNaN(datumValue.getTime())) {
          datumValue = new Date();
        }

        // Form patchen mit konvertiertem Datum
        this.ausbildungForm.patchValue({
          titel: ausbildung.titel,
          beschreibung: ausbildung.beschreibung || '',
          typ: ausbildung.typ,
          jahr: ausbildung.jahr,
          datum: datumValue,
          erforderlich: ausbildung.erforderlich !== undefined ? ausbildung.erforderlich : false
        });
      } else {
        this.showSnackBar('Ausbildung nicht gefunden');
        this.router.navigate(['/ausbildungen']);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ausbildung:', error);
      this.showSnackBar('Fehler beim Laden der Ausbildungsdaten');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Speichert die Ausbildung
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
  
      if (this.isEditMode && this.ausbildungId) {
        // Bestehende Ausbildung aktualisieren
        const ausbildungData: Partial<Ausbildung> = {
          titel: formValue.titel,
          beschreibung: formValue.beschreibung,
          typ: formValue.typ,
          datum: formValue.datum,
          jahr: formValue.jahr,
          erforderlich: formValue.erforderlich
        };
        
        await this.ausbildungService.updateAusbildung(this.ausbildungId, ausbildungData);
        this.showSnackBar('Ausbildung erfolgreich aktualisiert');
        this.router.navigate(['/ausbildungen', this.ausbildungId]);
      } else {
        // Neue Ausbildung erstellen - OHNE ID-Feld
        const ausbildungData = {
          titel: formValue.titel,
          beschreibung: formValue.beschreibung,
          typ: formValue.typ,
          datum: formValue.datum,
          jahr: formValue.jahr,
          erforderlich: formValue.erforderlich
        };
        
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
   * Prüft, ob ein Formularfeld einen Fehler hat
   */
  hasError(controlName: string, errorCode: string): boolean {
    const control = this.ausbildungForm.get(controlName);
    return !!control && control.hasError(errorCode) && (control.dirty || control.touched);
  }

  /**
   * Markiert alle Formularfelder als berührt
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
   * Abbrechen und zurück navigieren
   */
  cancel(): void {
    if (this.isEditMode && this.ausbildungId) {
      this.router.navigate(['/ausbildungen', this.ausbildungId]);
    } else {
      this.router.navigate(['/ausbildungen']);
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