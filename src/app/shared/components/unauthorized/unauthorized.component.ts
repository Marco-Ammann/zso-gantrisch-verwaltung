import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  template: `
    <div class="unauthorized-container">
      <mat-card class="unauthorized-card">
        <mat-card-header>
          <mat-icon mat-card-avatar color="warn">lock</mat-icon>
          <mat-card-title>Zugriff verweigert</mat-card-title>
          <mat-card-subtitle>Sie haben keine Berechtigung für diese Seite</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="error-icon">
            <mat-icon>security</mat-icon>
          </div>
          
          <div class="error-details">
            <p>Ihre aktuelle Rolle <strong>{{ userRole }}</strong> verfügt nicht über die erforderlichen Berechtigungen.</p>
            
            <p *ngIf="requiredRoles.length > 0">
              Für diese Seite sind folgende Rollen berechtigt: 
              <strong>{{ requiredRoles.join(', ') }}</strong>
            </p>
            
            <p>Bitte wenden Sie sich an einen Administrator, wenn Sie der Meinung sind, dass Sie Zugriff haben sollten.</p>
          </div>
        </mat-card-content>
        
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon> Zurück
          </button>
          
          <button mat-raised-button color="accent" routerLink="/">
            <mat-icon>home</mat-icon> Zur Startseite
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 20px;
    }
    
    .unauthorized-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    
    .error-icon {
      margin: 30px 0;
    }
    
    .error-icon mat-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #f44336;
    }
    
    .error-details {
      text-align: left;
      padding: 0 16px;
      margin-bottom: 20px;
    }
    
    mat-card-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 16px;
    }
    
    @media (max-width: 600px) {
      mat-card-actions {
        flex-direction: column;
      }
      
      button {
        width: 100%;
      }
    }
  `]
})
export class UnauthorizedComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  
  userRole = this.authService.userRole() || 'Unbekannt';
  requiredRoles: string[] = [];
  
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['requiredRole']) {
        this.requiredRoles = params['requiredRole'].split(',');
      }
    });
  }
  
  goBack(): void {
    window.history.back();
  }
}
