import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../../auth/services/auth.service';
import { SidenavService } from '../../services/sidenav.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  public auth = inject(AuthService); // Changed to public for template access
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  private sidenavService = inject(SidenavService);
  private notificationService = inject(NotificationService);
  
  isHandset = signal(false);
  notificationCount = signal(0);
  userInitials = signal('');
  userRole = signal('');
  
  ngOnInit(): void {
    // Check if device is handset or tablet
    this.breakpointObserver.observe([
      Breakpoints.Handset,
      Breakpoints.Tablet
    ]).subscribe(result => {
      this.isHandset.set(result.matches);
    });
    
    // Get user information
    const user = this.auth.currentUser();
    if (user) {
      const nameParts = user.displayName?.split(' ') || [];
      if (nameParts.length > 1) {
        this.userInitials.set(nameParts[0][0] + nameParts[1][0]);
      } else if (nameParts.length > 0) {
        this.userInitials.set(nameParts[0][0]);
      } else {
        this.userInitials.set('U');
      }
      
      // Set user role
      if (this.auth.canDelete()) {
        this.userRole.set('Administrator');
      } else if (this.auth.canEdit()) {
        this.userRole.set('Bearbeiter');
      } else {
        this.userRole.set('Benutzer');
      }
    }
    
    // Subscribe to notifications
    this.notificationService.notificationCount$.subscribe(count => {
      this.notificationCount.set(count);
    });
  }
  
  toggleSidenav(): void {
    this.sidenavService.toggle();
  }
  
  logout(): void {
    // Fix: Use logout() instead of signOut()
    this.auth.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
  
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
  
  goToNotifications(): void {
    this.notificationService.markAllAsRead();
    this.router.navigate(['/notifications']);
  }
  
  goToHelp(): void {
    window.open('https://gantrisch.ch/hilfe', '_blank');
  }
}
