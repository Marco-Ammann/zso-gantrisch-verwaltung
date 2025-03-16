import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { User } from '../../../core/models';

// Material Imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  // Inputs und Outputs für Kommunikation mit Elternkomponente
  @Input() sideNavOpened = true;
  @Output() toggleSideNav = new EventEmitter<void>();
  
  // Computed-Werte aus dem AuthService
  currentUser = this.authService.currentUser;
  userRole = this.authService.userRole;
  
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
  
  /**
   * Zum Profil navigieren
   */
  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }
  
  /**
   * Zum Dashboard navigieren
   */
  navigateToDashboard(): void {
    console.log('Attempting to navigate to dashboard');
    this.router.navigate(['/dashboard'])
      .then(success => {
        console.log('Navigation result:', success ? 'successful' : 'failed');
      })
      .catch(err => {
        console.error('Navigation error:', err);
      });
  }
  
  /**
   * Seitennavigation umschalten
   */
  onToggleSideNav(): void {
    this.toggleSideNav.emit();
  }
  
  /**
   * Rollenname für die Anzeige formatieren
   * @returns Formatierter Rollenname
   */
  getRoleName(): string {
    const role = this.userRole();
    
    if (!role) return '';
    
    // Fix the Record type to handle undefined role
    const roleNames: Record<string, string> = {
      'admin': 'Administrator',
      'editor': 'Editor',
      'user': 'Benutzer',
      // Add any other roles your app uses
    };
    
    // Then use safely with nullish coalescing operator
    const roleName = roleNames[role ?? ''] || 'Benutzer';
    
    return roleName;
  }
}