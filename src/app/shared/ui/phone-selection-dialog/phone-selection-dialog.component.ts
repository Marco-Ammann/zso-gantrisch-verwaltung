import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

export interface PhoneSelectionDialogData {
  phones: { 
    type: string; 
    number: string;
  }[];
  personName: string;
}

@Component({
  selector: 'app-phone-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.personName }} anrufen</h2>
    <div mat-dialog-content>
      <mat-nav-list>
        <a mat-list-item *ngFor="let phone of data.phones" [href]="'tel:' + formatPhoneNumber(phone.number)" (click)="selectPhone(phone)">
          <mat-icon mat-list-icon *ngIf="phone.type === 'mobile'">smartphone</mat-icon>
          <mat-icon mat-list-icon *ngIf="phone.type === 'home'">home</mat-icon>
          <mat-icon mat-list-icon *ngIf="phone.type === 'work'">business</mat-icon>
          <mat-icon mat-list-icon *ngIf="phone.type === 'other'">phone</mat-icon>
          <div mat-line>{{ phone.type === 'mobile' ? 'Mobiltelefon' : 
                          phone.type === 'home' ? 'Festnetz' : 
                          phone.type === 'work' ? 'Geschäftlich' : 'Andere' }}</div>
          <div mat-line>{{ phone.number }}</div>
        </a>
      </mat-nav-list>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="close()">Abbrechen</button>
    </div>
  `,
  styles: [`
    .mat-mdc-dialog-title {
      margin-bottom: 0;
    }
  `]
})
export class PhoneSelectionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<PhoneSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PhoneSelectionDialogData
  ) {}

  formatPhoneNumber(phone: string): string {
    // Remove spaces, dashes, etc.
    return phone.replace(/\s+/g, '');
  }

  selectPhone(phone: any): void {
    this.dialogRef.close(phone);
  }

  close(): void {
    this.dialogRef.close();
  }
}
