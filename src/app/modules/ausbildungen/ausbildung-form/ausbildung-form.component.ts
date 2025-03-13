// src/app/modules/ausbildungen/ausbildung-form/ausbildung-form.component.ts
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
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/utils/custom-date-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';



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
    MatSnackBarModule,
    MatDatepickerModule,

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
    { value: 'Sitzung', label: 'Sitzung' }
  ];

  constructor() {
    // Formular initialisieren
    this.ausbildungForm = this.createAusbildungForm();
  }

  ngOnInit(): void {
    // Prüfen, ob wir im Bearbeitungsmodus sind
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.ausbildungId = id;
        this.loadAusbildung(id);
      }
    });
  }

  /**
   * Erstellt die Formularstruktur
   */
  private createAusbildungForm(): FormGroup {
    return this.fb.group({
      titel: ['', [Validators.required]],
      beschreibung: [''],
      typ: ['WK', [Validators.required]],
      jahr: [new Date().getFullYear(), [Validators.required, Validators.min(2000), Validators.max(2100)]],
      datum: [new Date(), [Validators.required]],
      erforderlich: [true, [Validators.required]]
    });
  }

  /**
   * Benutzerdefinierter Validator für Datumsprüfungen
   */
  private datumValidator(group: FormGroup) {
    const startDatum = group.get('startDatum')?.value;
    const endDatum = group.get('endDatum')?.value;
    const kaderStart = group.get('einrueckZeitKader.start')?.value;
    const kaderEnde = group.get('einrueckZeitKader.ende')?.value;
    const soldatenStart = group.get('einrueckZeitSoldaten.start')?.value;
    const soldatenEnde = group.get('einrueckZeitSoldaten.ende')?.value;

    // Prüfen, dass Enddatum nach Startdatum liegt
    if (startDatum && endDatum && startDatum > endDatum) {
      return { 'datumReihenfolge': true };
    }

    // Prüfen, dass Kader-Einrückzeiten korrekt sind
    if (kaderStart && kaderEnde && kaderStart > kaderEnde) {
      return { 'kaderDatumReihenfolge': true };
    }

    // Prüfen, dass Soldaten-Einrückzeiten korrekt sind
    if (soldatenStart && soldatenEnde && soldatenStart > soldatenEnde) {
      return { 'soldatenDatumReihenfolge': true };
    }

    return null;
  }

  /**
   * Lädt eine bestehende Ausbildung zum Bearbeiten
   */
  async loadAusbildung(id: string): Promise<void> {
    this.isLoading = true;

    try {
      const ausbildung = await this.ausbildungService.getAusbildungById(id);

      if (ausbildung) {
        // Formular mit den Daten der Ausbildung befüllen
        this.ausbildungForm.patchValue({
          titel: ausbildung.titel,
          beschreibung: ausbildung.beschreibung || '',
          typ: ausbildung.typ,
          startDatum: ausbildung.startDatum || null,
          endDatum: ausbildung.endDatum || null,
          einrueckZeitKader: {
            start: ausbildung.einrueckZeitKader?.start || null,
            ende: ausbildung.einrueckZeitKader?.ende || null
          },
          einrueckZeitSoldaten: {
            start: ausbildung.einrueckZeitSoldaten?.start || null,
            ende: ausbildung.einrueckZeitSoldaten?.ende || null
          },
          jahr: ausbildung.jahr,
          erforderlich: ausbildung.erforderlich
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

      // Stelle sicher, dass nur gültige Daten gespeichert werden
      const ausbildungData: Ausbildung = {
        titel: formValue.titel,
        beschreibung: formValue.beschreibung,
        typ: formValue.typ,
        startDatum: formValue.startDatum,
        endDatum: formValue.endDatum,
        einrueckZeitKader: formValue.einrueckZeitKader.start ? formValue.einrueckZeitKader : undefined,
        einrueckZeitSoldaten: formValue.einrueckZeitSoldaten.start ? formValue.einrueckZeitSoldaten : undefined,
        jahr: formValue.startDatum ? new Date(formValue.startDatum).getFullYear() : formValue.jahr,
        erforderlich: formValue.erforderlich
      } as Ausbildung;

      if (this.isEditMode && this.ausbildungId) {
        // Bestehende Ausbildung aktualisieren
        await this.ausbildungService.updateAusbildung(this.ausbildungId, ausbildungData);
        this.showSnackBar('Ausbildung erfolgreich aktualisiert');
        this.router.navigate(['/ausbildungen', this.ausbildungId]);
      } else {
        // Neue Ausbildung erstellen
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