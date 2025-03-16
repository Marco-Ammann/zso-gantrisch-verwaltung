import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { AuthService } from '../../../auth/services/auth.service';
import { SidenavService } from '../../services/sidenav.service';

interface NavItem {
  label: string;
  route?: string;
  icon: string;
  requiredRole?: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatSidenavModule,
    MatDividerModule,
    MatExpansionModule
  ],
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  private sidenavService = inject(SidenavService);
  
  @ViewChild('drawer') drawer!: MatSidenav;
  
  isHandset$: Observable<boolean> = this.breakpointObserver.observe([
    Breakpoints.Handset,
    Breakpoints.Tablet
  ]).pipe(
    map(result => result.matches),
    shareReplay()
  );
  
  // Navigation items with nested structure
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'dashboard'
    },
    {
      label: 'Personen',
      icon: 'people',
      children: [
        {
          label: 'Übersicht',
          route: '/personen',
          icon: 'list'
        },
        {
          label: 'Neue Person',
          route: '/personen/neu',
          icon: 'person_add',
          requiredRole: 'editor'
        },
        {
          label: 'Notfallkontakte',
          route: '/personen/notfallkontakte',
          icon: 'contacts'
        }
      ]
    },
    {
      label: 'Ausbildungen',
      icon: 'school',
      children: [
        {
          label: 'Übersicht',
          route: '/ausbildungen',
          icon: 'list'
        },
        {
          label: 'Neue Ausbildung',
          route: '/ausbildungen/neu',
          icon: 'add_circle',
          requiredRole: 'editor'
        },
        {
          label: 'Matrix',
          route: '/ausbildungen/matrix',
          icon: 'grid_view'
        }
      ]
    },
    {
      label: 'Berichte',
      route: '/berichte',
      icon: 'assessment',
      requiredRole: 'editor'
    },
    {
      label: 'Admin',
      route: '/admin',
      icon: 'admin_panel_settings',
      requiredRole: 'admin'
    }
  ];
  
  ngOnInit(): void {
    // Subscribe to toggle events from the sidenav service
    this.sidenavService.toggleSidenav$.subscribe(() => {
      if (this.drawer) {
        this.drawer.toggle();
      }
    });
    
    // Use the router events to close the sidenav when navigating
    this.router.events.subscribe(() => {
      this.isHandset$.subscribe(isHandset => {
        if (isHandset && this.drawer && this.drawer.opened) {
          this.drawer.close();
        }
      });
    });
  }
  
  canView(item: NavItem): boolean {
    if (!item.requiredRole) return true;
    
    if (item.requiredRole === 'editor') {
      return this.auth.canEdit();
    }
    
    if (item.requiredRole === 'admin') {
      return this.auth.canDelete();
    }
    
    return false;
  }
  
  // Helper method to close sidenav when clicking a navigation item
  closeDrawer() {
    this.isHandset$.subscribe(isHandset => {
      if (isHandset && this.drawer && this.drawer.opened) {
        this.drawer.close();
      }
    });
  }
}
