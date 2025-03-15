import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout.component';
import { LoginComponent } from './auth/components/login/login.component';
import { RegisterComponent } from './auth/components/register/register.component';
import { authGuard, publicGuard, roleGuard } from './auth/guards/auth.guard';
import { TeilnahmeErfassungComponent } from './modules/ausbildungen/teilnahme-erfassung/teilnahme-erfassung.component';
import { AppellDurchfuehrungComponent } from './modules/ausbildungen/appell-durchfuehrung/appell-durchfuehrung.component';
import { ResetPasswordComponent } from './auth/components/reset-password/reset-password.component';
import { VerifyEmailComponent } from './auth/components/verify-email/verify-email.component';

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
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [publicGuard],
    title: 'Registrieren - ZSO Gantrisch'
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    canActivate: [publicGuard],
    title: 'Passwort zurücksetzen - ZSO Gantrisch'
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent,
    canActivate: [publicGuard],
    title: 'E-Mail verifizieren - ZSO Gantrisch'
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
      
      // Participant management for a training
      {
        path: 'ausbildungen/:id/teilnehmer',
        component: TeilnahmeErfassungComponent,
        canActivate: [authGuard]
      },
      
      // Attendance tracking (Appell) for a training
      {
        path: 'ausbildungen/:id/appell',
        component: AppellDurchfuehrungComponent,
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