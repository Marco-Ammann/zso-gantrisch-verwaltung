import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';

// Material-Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="profile-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Mein Profil</mat-card-title>
          <mat-card-subtitle>Benutzereinstellungen</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <p>Benutzername: {{ currentUser()?.displayName }}</p>
          <p>E-Mail: {{ currentUser()?.email }}</p>
          <p>Rolle: {{ getRoleName() }}</p>
        </mat-card-content>
        
        <mat-card-actions>
          <button mat-button color="primary">
            <mat-icon>edit</mat-icon> Profil bearbeiten
          </button>
          <button mat-button color="warn" (click)="logout()">
            <mat-icon>exit_to_app</mat-icon> Abmelden
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
    }
    
    mat-card {
      margin-bottom: 20px;
    }
    
    mat-card-actions {
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class ProfileComponent {
  private authService = inject(AuthService);
  
  // Benutzer aus dem AuthService
  currentUser = this.authService.currentUser;
  
  /**
   * Rollenname formatieren
   */
  getRoleName(): string {
    const role = this.authService.userRole();
    
    if (!role) return '';
    
    const roleNames: Record<string, string> = {
      'admin': 'Administrator',
      'oberleutnant': 'Oberleutnant',
      'leutnant': 'Leutnant',
      'korporal': 'Korporal',
      'leserecht': 'Leserecht'
    };
    
    return roleNames[role] || role;
  }
  
  /**
   * Benutzer abmelden
   */
  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
    }
  }
}