import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

// Material Imports
import { MatSidenavModule } from '@angular/material/sidenav';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    MatSidenavModule
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  private breakpointObserver = inject(BreakpointObserver);
  private authService = inject(AuthService);
  
  // Zustandssignals
  sideNavOpened = signal<boolean>(true);
  isHandset = signal<boolean>(false);
  
  constructor() {
    // Auf Bildschirmgröße reagieren
    this.breakpointObserver.observe([
      Breakpoints.Handset,
      Breakpoints.TabletPortrait
    ]).subscribe(result => {
      // Auf mobilen Geräten Seitennavigation standardmäßig einklappen
      this.isHandset.set(result.matches);
      this.sideNavOpened.set(!result.matches);
    });
  }
  
  /**
   * Seitennavigation ein-/ausklappen
   */
  toggleSideNav(): void {
    this.sideNavOpened.update(opened => !opened);
  }
}