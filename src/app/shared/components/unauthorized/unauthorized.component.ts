import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="unauthorized-container">
      <mat-card class="error-card">
        <mat-card-content>
          <div class="error-icon">
            <mat-icon>security</mat-icon>
          </div>
          <h1 class="error-title">Nicht autorisiert</h1>
          <p class="error-message">
            Sie haben nicht die erforderlichen Berechtigungen, um auf diese Seite zuzugreifen.
          </p>
          <div class="action-buttons">
            <button mat-raised-button color="primary" (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Zurück
            </button>
            <button mat-raised-button color="accent" routerLink="/dashboard">
              <mat-icon>dashboard</mat-icon>
              Dashboard
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 24px;
    }
    
    .error-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    
    .error-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      margin: 0 auto 16px;
      background-color: #ffebee;
      border-radius: 50%;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .error-icon mat-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #f44336;
    }
    
    .error-title {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 16px;
    }
    
    .error-message {
      font-size: 16px;
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 24px;
    }
    
    .action-buttons {
      display: flex;
      justify-content: center;
      gap: 16px;
    }
    
    @media (max-width: 599px) {
      .action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class UnauthorizedComponent implements OnInit {
  private router = inject(Router);
  
  ngOnInit(): void {
    // Component initialization logic if needed
  }
  
  goBack(): void {
    window.history.back();
  }
}
