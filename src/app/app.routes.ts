import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout.component';
import { LoginComponent } from './auth/components/login/login.component';
import { authGuard, publicGuard } from './auth/guards/auth.guard';

/**
 * Hauptrouten der Anwendung
 */
export const routes: Routes = [
  // Auth-Routen
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard],
    title: 'Login - ZSO Gantrisch'
  },
  
  // Geschützte Routen innerhalb des Hauptlayouts
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // Dashboard (Startseite)
      {
        path: '',
        loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [authGuard],
        title: 'Dashboard - ZSO Gantrisch'
      },
      
      // Personen-Routen (Lazy Loading)
      {
        path: 'personen',
        loadChildren: () => import('./modules/personen/personen.routes').then(m => m.PERSONEN_ROUTES),
        canActivate: [authGuard]
      },
      
      // Ausbildungen-Routen (Lazy Loading)
      {
        path: 'ausbildungen',
        loadChildren: () => import('./modules/ausbildungen/ausbildungen.routes').then(m => m.AUSBILDUNGEN_ROUTES),
        canActivate: [authGuard]
      },
      
      // Berichte-Routen (Lazy Loading)
      {
        path: 'berichte',
        loadChildren: () => import('./modules/berichte/berichte.routes').then(m => m.BERICHTE_ROUTES),
        canActivate: [authGuard]
      },
      
      // Admin-Routen (Lazy Loading)
      {
        path: 'admin',
        loadChildren: () => import('./modules/admin/admin.routes').then(m => m.ADMIN_ROUTES),
        canActivate: [authGuard],
        data: { roles: ['admin'] }
      },
      
      // Profil-Route
      {
        path: 'profile',
        loadComponent: () => import('./modules/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [authGuard],
        title: 'Mein Profil - ZSO Gantrisch'
      }
    ]
  },
  
  // Wildcard-Route (404)
  {
    path: '**',
    redirectTo: ''
  }
];