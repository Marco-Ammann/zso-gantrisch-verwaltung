import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { PhoneSelectionDialogComponent } from '../phone-selection-dialog/phone-selection-dialog.component';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phones?: { type: string; number: string }[];
  email?: string;
  notes?: string;
}

export interface EmergencyContactsDialogData {
  personName: string;
  contacts: EmergencyContact[];
}

@Component({
  selector: 'app-emergency-contacts-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>Notfallkontakte für {{ data.personName }}</h2>
    <div mat-dialog-content>
      <div *ngIf="data.contacts.length === 0" class="no-contacts">
        <mat-icon>warning</mat-icon>
        <p>Keine Notfallkontakte hinterlegt</p>
      </div>

      <mat-card *ngFor="let contact of data.contacts" class="contact-card">
        <mat-card-header>
          <mat-card-title>{{ contact.name }}</mat-card-title>
          <mat-card-subtitle>{{ contact.relationship }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="contact.phones && contact.phones.length > 0" class="contact-section">
            <h3>Telefonnummern</h3>
            <div *ngFor="let phone of contact.phones" class="phone-item">
              <span>{{ phone.type === 'mobile' ? 'Mobiltelefon' : 
                     phone.type === 'home' ? 'Festnetz' : 
                     phone.type === 'work' ? 'Geschäftlich' : 'Andere' }}: {{ phone.number }}</span>
              <button mat-icon-button color="primary" matTooltip="Anrufen" (click)="call(contact, phone)">
                <mat-icon>call</mat-icon>
              </button>
            </div>
          </div>
          
          <div *ngIf="contact.email" class="contact-section">
            <h3>E-Mail</h3>
            <div class="email-item">
              <span>{{ contact.email }}</span>
              <button mat-icon-button color="primary" matTooltip="E-Mail schreiben" (click)="sendEmail(contact)">
                <mat-icon>email</mat-icon>
              </button>
            </div>
          </div>
          
          <div *ngIf="contact.notes" class="contact-section">
            <h3>Bemerkungen</h3>
            <p>{{ contact.notes }}</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="close()">Schließen</button>
    </div>
  `,
  styles: [`
    .no-contacts {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #666;
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }
    }
    
    .contact-card {
      margin-bottom: 16px;
    }
    
    .contact-section {
      margin-bottom: 16px;
      
      h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 500;
        color: #666;
      }
    }
    
    .phone-item, .email-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }
  `]
})
export class EmergencyContactsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<EmergencyContactsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmergencyContactsDialogData,
    private dialog: MatDialog
  ) {}

  call(contact: EmergencyContact, phone?: any): void {
    if (contact.phones && contact.phones.length > 0) {
      if (!phone && contact.phones.length > 1) {
        // Show phone selection dialog if multiple numbers
        this.dialog.open(PhoneSelectionDialogComponent, {
          width: '350px',
          data: {
            phones: contact.phones,
            personName: contact.name
          }
        });
      } else {
        // Use the provided phone or the first one
        const phoneToUse = phone || contact.phones[0];
        window.open(`tel:${phoneToUse.number.replace(/\s+/g, '')}`);
      }
    }
  }

  sendEmail(contact: EmergencyContact): void {
    if (contact.email) {
      window.open(`mailto:${contact.email}`);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
