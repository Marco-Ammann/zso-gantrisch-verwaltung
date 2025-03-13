// src/app/modules/ausbildungen/ausbildung-form/ausbildung-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AusbildungService } from '../../../core/services/ausbildung.service';
import { Ausbildung } from '../../../core/models/ausbildung.model';

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
    MatProgressSpinnerModule,
    MatSnackBarModule
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
    { value: 'WK', label: 'WK' },
    { value: 'LG', label: 'LG' },
    { value: 'KVK', label: 'KVK' },
    { value: 'Übung', label: 'Übung' },
    { value: 'Kurs', label: 'Kurs' }
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
      erforderlich: [true, [Validators.required]]
    });
  }

  /**
   * Lädt eine bestehende Ausbildung zum Bearbeiten
   */
  async loadAusbildung(id: string): Promise<void> {
    this.isLoading = true;

    try {
      const ausbildung = await this.ausbildungService.getAusbildungById(id);

      if (ausbildung) {
        this.ausbildungForm.patchValue({
          titel: ausbildung.titel,
          beschreibung: ausbildung.beschreibung || '',
          typ: ausbildung.typ,
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
      this.showSnackBar('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    this.isSaving = true;

    try {
      const formValue = this.ausbildungForm.value;

      if (this.isEditMode && this.ausbildungId) {
        // Bestehende Ausbildung aktualisieren
        await this.ausbildungService.updateAusbildung(this.ausbildungId, formValue);
        this.showSnackBar('Ausbildung erfolgreich aktualisiert');
        this.router.navigate(['/ausbildungen', this.ausbildungId]);
      } else {
        // Neue Ausbildung erstellen
        const newId = await this.ausbildungService.createAusbildung(formValue);
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
   * Formular-Feld-Fehler prüfen
   */
  hasError(controlName: string, errorCode: string): boolean {
    const control = this.ausbildungForm.get(controlName);
    return !!control && control.hasError(errorCode) && (control.dirty || control.touched);
  }

  /**
   * Markiert alle Formularfelder als berührt, um Validierungen anzuzeigen
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