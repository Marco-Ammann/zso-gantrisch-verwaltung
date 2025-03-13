// src/app/modules/personen/person-form/person-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  FormBuilder, 
  FormGroup, 
  FormArray, 
  Validators, 
  ReactiveFormsModule 
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

import { PersonService } from '../../../core/services/person.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Person } from '../../../core/models/person.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CUSTOM_DATE_FORMATS, CustomDateAdapter } from '../../../core/utils/custom-date-adapter';

@Component({
  selector: 'app-person-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './person-form.component.html',
  styleUrls: ['./person-form.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { showError: true }
    },
    // DateAdapter Provider hinzufügen
    { provide: MAT_DATE_LOCALE, useValue: 'de-CH' }, 
    { provide: DateAdapter, useClass: CustomDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }
  ]
})
export class PersonFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private personService = inject(PersonService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  
  // Formulargruppen
  personForm: FormGroup;
  
  // Modus (neu oder bearbeiten)
  isEditMode = false;
  personId: string | null = null;
  
  // Zustandsvariablen
  isLoading = false;
  isSaving = false;
  
  // Dropdown-Optionen
  gradOptions = [
    'Zivilschützer', 'Gefreiter', 'Korporal', 'Wachtmeister', 
    'Feldweibel', 'Fourier', 'Adjutant Unteroffizier', 'Leutnant', 
    'Oberleutnant', 'Hauptmann'
  ];
  
  statusOptions = [
    { value: 'aktiv', label: 'Aktiv' },
    { value: 'inaktiv', label: 'Inaktiv' },
    { value: 'neu', label: 'Neu' }
  ];
  
  blutgruppenOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];
  
  constructor() {
    // Formular initialisieren
    this.personForm = this.createPersonForm();
  }
  
  ngOnInit(): void {
    // Prüfen, ob wir im Bearbeitungsmodus sind
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.personId = id;
        this.loadPerson(id);
      }
    });
  }
  
  /**
   * Erstellt die Formularstruktur
   */
  private createPersonForm(): FormGroup {
    return this.fb.group({
      grunddaten: this.fb.group({
      vorname: ['', [Validators.required]],
      nachname: ['', [Validators.required]],
      grad: ['Zivilschützer', [Validators.required]],
      funktion: ['', [Validators.required]],
      geburtsdatum: [null, [Validators.required]]
      }),
      
      kontaktdaten: this.fb.group({
      strasse: ['', [Validators.required]],
      plz: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      ort: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telefonMobil: ['', [Validators.required]],
      telefonFestnetz: [''],
      telefonGeschaeftlich: ['']
      }),
      
      zivilschutz: this.fb.group({
      grundausbildung: ['', [Validators.required]],
      einteilung: this.fb.group({
        zug: [null, [Validators.required, Validators.min(1)]],
        gruppe: ['']
      }),
      zusatzausbildungen: this.fb.array([]),
      status: ['aktiv', [Validators.required]]
      }),
      
      persoenliches: this.fb.group({
      sprachkenntnisse: this.fb.array([]),
      blutgruppe: [''],
      allergien: this.fb.array([]),
      essgewohnheiten: this.fb.array([]),
      besonderheiten: this.fb.array([]),
      }),
      
      berufliches: this.fb.group({
      ausgeubterBeruf: [''],
      erlernterBeruf: [''],
      arbeitgeber: [''],
      führerausweisKategorie: this.fb.array([]),
      zivileSpezialausbildung: ['']
      })
    });
  }
  
  /**
   * Lädt eine bestehende Person zum Bearbeiten
   */
  async loadPerson(id: string): Promise<void> {
    this.isLoading = true;
    
    try {
      const person = await this.personService.getPersonById(id);
      
      if (person) {
        // Formular mit den Daten der Person befüllen
        this.patchPersonForm(person);
      } else {
        this.showSnackBar('Person nicht gefunden');
        this.router.navigate(['/personen']);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Person:', error);
      this.showSnackBar('Fehler beim Laden der Person');
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Formular mit bestehenden Daten befüllen
   */
  private patchPersonForm(person: Person): void {
    // Grunddaten und einfache Felder patchen
    this.personForm.patchValue({
      grunddaten: person.grunddaten,
      kontaktdaten: person.kontaktdaten,
      zivilschutz: {
        grundausbildung: person.zivilschutz.grundausbildung,
        einteilung: person.zivilschutz.einteilung,
        status: person.zivilschutz.status
      },
      persoenliches: {
        blutgruppe: person.persoenliches.blutgruppe || ''
      },
      berufliches: {
        ausgeubterBeruf: person.berufliches.ausgeubterBeruf || '',
        erlernterBeruf: person.berufliches.erlernterBeruf || '',
        arbeitgeber: person.berufliches.arbeitgeber || '',
        zivileSpezialausbildung: person.berufliches.zivileSpezialausbildung || ''
      }
    });
    
    // Geburtsdatum konvertieren, falls vorhanden
    // Geburtsdatum korrekt konvertieren
    if (person.grunddaten.geburtsdatum) {
      let dateValue: Date | null = null;
      
      if (typeof person.grunddaten.geburtsdatum === 'string') {
        // Wenn das Datum als String kommt (z.B. aus Firebase)
        dateValue = this.formatDateForForm(person.grunddaten.geburtsdatum);
      } else if (person.grunddaten.geburtsdatum instanceof Date) {
        dateValue = person.grunddaten.geburtsdatum;
      }
      
      this.personForm.get('grunddaten.geburtsdatum')?.setValue(dateValue);
    }
    
    // Arrays befüllen
    this.patchFormArray('zivilschutz.zusatzausbildungen', person.zivilschutz.zusatzausbildungen);
    this.patchFormArray('persoenliches.sprachkenntnisse', person.persoenliches.sprachkenntnisse);
    this.patchFormArray('persoenliches.allergien', person.persoenliches.allergien);
    this.patchFormArray('persoenliches.essgewohnheiten', person.persoenliches.essgewohnheiten);
    this.patchFormArray('persoenliches.besonderheiten', person.persoenliches.besonderheiten);
    this.patchFormArray('berufliches.führerausweisKategorie', person.berufliches.fuehrerausweisKategorie);
  }
  
  /**
   * Befüllt ein FormArray mit vorhandenen Werten
   */
  private patchFormArray(path: string, values: string[] | undefined): void {
    if (!values || values.length === 0) return;
    
    const formArray = this.getFormArray(path);
    formArray.clear(); // Bestehende Einträge löschen
    
    values.forEach(value => {
      formArray.push(this.fb.control(value));
    });
  }
  
  /**
   * Formular speichern
   */
  async savePerson(): Promise<void> {
    if (this.personForm.invalid) {
      this.markFormGroupTouched(this.personForm);
      this.showSnackBar('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }
    
    this.isSaving = true;
    
    try {
      const formValue = this.personForm.value;
      
      // Metadaten hinzufügen
      const currentUser = this.authService.currentUser();
      const now = new Date();
      
      const personData: Omit<Person, 'id'> = {
        ...formValue,
        metadaten: {
          letzteAktualisierung: now,
          aktualisiert_von: currentUser?.displayName || 'System'
        }
      };
      
      if (this.isEditMode && this.personId) {
        // Bestehende Person aktualisieren
        await this.personService.updatePerson(this.personId, personData);
        this.showSnackBar('Person erfolgreich aktualisiert');
        this.router.navigate(['/personen', this.personId]);
      } else {
        // Neue Person erstellen
        const newId = await this.personService.createPerson(personData);
        this.showSnackBar('Person erfolgreich erstellt');
        this.router.navigate(['/personen', newId]);
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Person:', error);
      this.showSnackBar('Fehler beim Speichern der Person');
    } finally {
      this.isSaving = false;
    }
  }
  
  /**
   * Abbrechen und zurück navigieren
   */
  cancel(): void {
    if (this.isEditMode && this.personId) {
      this.router.navigate(['/personen', this.personId]);
    } else {
      this.router.navigate(['/personen']);
    }
  }
  
  // ===== Hilfsmethoden für FormArrays =====
  
  /**
   * Gibt ein FormArray zurück
   */
  getFormArray(path: string): FormArray {
    return this.personForm.get(path) as FormArray;
  }
  
  /**
   * Fügt ein Element zu einem FormArray hinzu
   */
  addArrayItem(path: string, value: string = ''): void {
    const array = this.getFormArray(path);
    array.push(this.fb.control(value));
  }
  
  /**
   * Entfernt ein Element aus einem FormArray
   */
  removeArrayItem(path: string, index: number): void {
    const array = this.getFormArray(path);
    array.removeAt(index);
  }
  
  /**
   * Formular-Feld-Fehler prüfen
   */
  hasError(path: string, errorCode: string): boolean {
    const control = this.personForm.get(path);
    return !!control && control.hasError(errorCode) && (control.dirty || control.touched);
  }
  
  /**
   * Rekursiv alle Formularkontrollen als "touched" markieren
   * um Validierungsfehler anzuzeigen
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
   * Zeigt eine Snackbar-Nachricht an
   */
  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }


    /**
   * Korrekte Datumsformatierung zur Anzeige
   */
    formatDateForDisplay(date: Date | null): string {
      if (!date) return '';
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    }


      /**
   * Formatiert ein Datum für das Formular (zur Anzeige)
   */
  private formatDateForForm(dateStr: string | Date | undefined): Date | null {
    if (!dateStr) return null;
    
    try {
      // Wenn bereits ein Date-Objekt
      if (dateStr instanceof Date) {
        return dateStr;
      }
      
      // Bei String-Format: Konvertieren
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-basierter Monat
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
      
      // Datum-String versuchen zu parsen
      return new Date(dateStr);
    } catch (error) {
      console.error('Fehler bei der Datumskonvertierung:', error);
      return null;
    }
  }
}