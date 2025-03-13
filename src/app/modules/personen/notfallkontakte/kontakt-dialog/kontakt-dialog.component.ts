// src/app/modules/personen/notfallkontakte/kontakt-dialog/kontakt-dialog.component.ts
import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  FormBuilder, 
  FormGroup, 
  Validators, 
  ReactiveFormsModule 
} from '@angular/forms';
import { 
  MAT_DIALOG_DATA, 
  MatDialogRef, 
  MatDialogModule 
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';

import { Notfallkontakt } from '../../../../core/models/notfallkontakt.model';
import { Person } from '../../../../core/models/person.model';

export interface KontaktDialogData {
  kontakt: Notfallkontakt | null;
  person: Person | null;
  personOptions: Person[];
}

@Component({
  selector: 'app-kontakt-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatRadioModule,
    MatDividerModule
  ],
  templateUrl: './kontakt-dialog.component.html',
  styleUrls: ['./kontakt-dialog.component.scss']
})
export class KontaktDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  // Dialog-Konfiguration
  isEditMode: boolean;
  dialogTitle: string;
  
  // Formular
  kontaktForm: FormGroup;
  
  constructor(
    public dialogRef: MatDialogRef<KontaktDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: KontaktDialogData
  ) {
    this.isEditMode = !!data.kontakt;
    this.dialogTitle = this.isEditMode ? 'Notfallkontakt bearbeiten' : 'Neuer Notfallkontakt';
    
    // Formular initialisieren
    this.kontaktForm = this.createForm();
  }
  
  ngOnInit(): void {
    // Wenn im Bearbeitungsmodus, Formular mit Daten füllen
    if (this.isEditMode && this.data.kontakt) {
      this.kontaktForm.patchValue(this.data.kontakt);
    }
    
    // Wenn eine Person ausgewählt ist, setze personId
    if (!this.isEditMode && this.data.person) {
      this.kontaktForm.get('personId')?.setValue(this.data.person.id);
      this.kontaktForm.get('personId')?.disable();
    }
  }
  
  /**
   * Erstellt das Formular
   */
  private createForm(): FormGroup {
    return this.fb.group({
      id: [''],
      personId: ['', [Validators.required]],
      name: ['', [Validators.required]],
      beziehung: ['', [Validators.required]],
      telefonnummer: ['', [Validators.required]],
      prioritaet: [1, [Validators.required, Validators.min(1), Validators.max(2)]]
    });
  }
  
  /**
   * Speichert den Notfallkontakt
   */
  save(): void {
    if (this.kontaktForm.invalid) {
      return;
    }
    
    // Wenn personId disabled ist (bei direkter Erstellung für eine Person),
    // muss der Wert manuell zum finalen Objekt hinzugefügt werden
    const formValue = this.kontaktForm.getRawValue();
    
    this.dialogRef.close(formValue);
  }
  
  /**
   * Schließt den Dialog ohne zu speichern
   */
  cancel(): void {
    this.dialogRef.close(null);
  }
  
  /**
   * Prüft, ob ein Feld einen Fehler hat
   */
  hasError(controlName: string, errorCode: string): boolean {
    const control = this.kontaktForm.get(controlName);
    return !!control && control.hasError(errorCode) && (control.dirty || control.touched);
  }
}