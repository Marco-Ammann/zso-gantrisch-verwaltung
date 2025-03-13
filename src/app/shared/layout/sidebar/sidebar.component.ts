import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../auth/services/auth.service';

// Material Imports
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

/**
 * Interface für Navigationseinträge
 */
interface NavItem {
  label: string;
  icon: string;
  route?: string;
  children?: NavItem[];
  requiredRoles?: string[];
  badge?: number | null;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  // Aktuell aktiver Pfad
  activePath = '';
  
  // Berechtigung zum Bearbeiten
  canEdit = this.authService.canEdit;
  
  // Navigation ist geöffnet/geschlossen
  isAdmin = this.authService.isAdmin;
  
  /**
   * Navigationseinträge
   * Struktur: Haupteinträge mit optionalen Untereinträgen
   */
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/',
      requiredRoles: ['admin', 'oberleutnant', 'leutnant', 'korporal', 'leserecht']
    },
    {
      label: 'Personen',
      icon: 'people',
      children: [
        {
          label: 'Übersicht',
          icon: 'list',
          route: '/personen',
          requiredRoles: ['admin', 'oberleutnant', 'leutnant', 'korporal', 'leserecht']
        },
        {
          label: 'Person hinzufügen',
          icon: 'person_add',
          route: '/personen/neu',
          requiredRoles: ['admin', 'oberleutnant', 'leutnant']
        },
        {
          label: 'Notfallkontakte',
          icon: 'contact_phone',
          route: '/personen/notfallkontakte',
          requiredRoles: ['admin', 'oberleutnant', 'leutnant', 'korporal', 'leserecht']
        }
      ]
    },
    {
      label: 'Ausbildungen',
      icon: 'school',
      children: [
        {
          label: 'Übersicht',
          icon: 'list',
          route: '/ausbildungen',
          requiredRoles: ['admin', 'oberleutnant', 'leutnant', 'korporal', 'leserecht']
        },
        {
          label: 'Ausbildungsmatrix',
          icon: 'grid_on',
          route: '/ausbildungen/matrix',
          requiredRoles: ['admin', 'oberleutnant', 'leutnant', 'korporal', 'leserecht']
        },
        {
          label: 'Ausbildung hinzufügen',
          icon: 'add_circle',
          route: '/ausbildungen/neu',
          requiredRoles: ['admin', 'oberleutnant', 'leutnant']
        }
      ]
    },
    {
      label: 'Berichte',
      icon: 'description',
      children: [
        {
          label: 'Kontaktdatenblätter',
          icon: 'contact_mail',
          route: '/berichte/kontaktdaten',
          requiredRoles: ['admin', 'oberleutnant', 'leutnant', 'korporal', 'leserecht']
        },
        {
          label: 'Ausbildungsnachweis',
          icon: 'fact_check',
          route: '/berichte/ausbildungsnachweis',
          requiredRoles: ['admin', 'oberleutnant', 'leutnant', 'korporal', 'leserecht']
        }
      ]
    },
    {
      label: 'Administration',
      icon: 'admin_panel_settings',
      children: [
        {
          label: 'Benutzer',
          icon: 'manage_accounts',
          route: '/admin/benutzer',
          requiredRoles: ['admin']
        },
        {
          label: 'Einstellungen',
          icon: 'settings',
          route: '/admin/einstellungen',
          requiredRoles: ['admin']
        }
      ],
      requiredRoles: ['admin']
    }
  ];
  
  constructor() {
    // Aktive Route beim Routing-Wechsel aktualisieren
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.activePath = event.url;
      }
    });
  }
  
  /**
   * Prüft, ob ein Menüeintrag für die aktuelle Benutzerrolle sichtbar sein soll
   * @param item Navigationseintrag
   * @returns true, wenn der Eintrag sichtbar sein soll
   */
  hasRequiredRole(item: NavItem): boolean {
    if (!item.requiredRoles || item.requiredRoles.length === 0) {
      return true;
    }
    
    return this.authService.hasRole(item.requiredRoles as any[]);
  }

  
  /**
   * Prüft, ob ein Untermenüeintrag für die aktuelle Benutzerrolle sichtbar sein soll
   * @param parentItem Übergeordneter Navigationseintrag
   * @returns true, wenn mindestens ein Untereintrag sichtbar sein soll
   */
  hasVisibleChildren(parentItem: NavItem): boolean {
    if (!parentItem.children || parentItem.children.length === 0) {
      return false;
    }
    
    return parentItem.children.some(child => this.hasRequiredRole(child));
  }

  
  /**
   * Prüft, ob ein Navigationseintrag aktiv ist
   * @param route Route des Eintrags
   * @returns true, wenn der Eintrag aktiv ist
   */
  isActive(route?: string): boolean {
    if (!route) return false;
    
    // Genauer Pfad-Vergleich oder Teilpfad für Unterseiten
    return this.activePath === route || 
           (route !== '/' && this.activePath.startsWith(route));
  }
  
  
  /**
   * Prüft, ob ein Menüeintrag erweitert sein soll
   * @param item Navigationseintrag
   * @returns true, wenn der Eintrag erweitert sein soll
   */
  isExpanded(item: NavItem): boolean {
    if (!item.children) return false;
    
    // Erweitern, wenn ein Kind aktiv ist
    return item.children.some(child => this.isActive(child.route));
  }
}