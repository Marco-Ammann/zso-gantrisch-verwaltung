import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-password-reset-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Passwort zurücksetzen</h2>
    <div mat-dialog-content>
      <p>Bitte geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.</p>
      <form [formGroup]="resetForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>E-Mail</mat-label>
          <input 
            matInput 
            type="email" 
            formControlName="email" 
            placeholder="beispiel@email.ch"
            autocomplete="email">
          <mat-icon matPrefix>email</mat-icon>
          <mat-error *ngIf="resetForm.get('email')?.hasError('required')">
            E-Mail-Adresse ist erforderlich
          </mat-error>
          <mat-error *ngIf="resetForm.get('email')?.hasError('email')">
            Bitte geben Sie eine gültige E-Mail-Adresse ein
          </mat-error>
        </mat-form-field>
      </form>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="close()">Abbrechen</button>
      <button 
        mat-raised-button 
        color="primary" 
        [disabled]="resetForm.invalid"
        (click)="submit()">
        Zurücksetzen
      </button>
    </div>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
  `]
})
export class PasswordResetDialogComponent {
  private fb = inject(FormBuilder);
  
  resetForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor(private dialogRef: MatDialogRef<PasswordResetDialogComponent>) {}

  submit(): void {
    if (this.resetForm.valid) {
      this.dialogRef.close(this.resetForm.value.email);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
