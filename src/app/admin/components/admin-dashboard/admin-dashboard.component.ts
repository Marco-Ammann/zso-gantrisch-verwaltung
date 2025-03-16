import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <div class="admin-dashboard-container">
      <h1>Administration</h1>
      <p class="page-description">Verwaltungsbereich für Administratoren</p>
      
      <div class="admin-cards">
        <mat-card class="admin-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>people</mat-icon>
            <mat-card-title>Benutzerverwaltung</mat-card-title>
            <mat-card-subtitle>Benutzer und Berechtigungen verwalten</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Hier können Sie Benutzer anlegen, bearbeiten und deren Rollen ändern.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" routerLink="/admin/users">
              <mat-icon>group</mat-icon>
              Zur Benutzerverwaltung
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="admin-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>settings</mat-icon>
            <mat-card-title>Systemeinstellungen</mat-card-title>
            <mat-card-subtitle>Konfiguration des Systems</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Hier können Sie grundlegende Einstellungen des Systems konfigurieren.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" routerLink="/admin/settings">
              <mat-icon>settings</mat-icon>
              Zu den Einstellungen
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="admin-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>security</mat-icon>
            <mat-card-title>Diagnose</mat-card-title>
            <mat-card-subtitle>System- und Berechtigungsdiagnose</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Überprüfen Sie Berechtigungen und Systemfunktionen.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" routerLink="/admin/diagnostics">
              <mat-icon>bug_report</mat-icon>
              Zur Diagnose
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-description {
      color: #666;
      margin-bottom: 20px;
    }
    
    .admin-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    
    .admin-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      
      mat-card-content {
        flex-grow: 1;
      }
    }
    
    /* Responsive Adjustments */
    @media (max-width: 768px) {
      .admin-cards {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminDashboardComponent {
  private router = inject(Router);
  
  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
