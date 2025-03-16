import { Routes } from '@angular/router';
import { authGuard, publicGuard, roleGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  // Auth routes - accessible when not authenticated
  {
    path: '',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/components/login/login.component').then(m => m.LoginComponent),
        canActivate: [publicGuard],
        title: 'Login - ZSO Gantrisch'
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/components/register/register.component').then(m => m.RegisterComponent),
        canActivate: [publicGuard],
        title: 'Registrieren - ZSO Gantrisch'
      },
      {
        path: 'verify-email',
        loadComponent: () => import('./auth/components/verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
        title: 'E-Mail verifizieren - ZSO Gantrisch'
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./auth/components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
        title: 'Passwort zurücksetzen - ZSO Gantrisch'
      },
    ]
  },
  
  // Unauthorized page
  {
    path: 'unauthorized',
    loadComponent: () => import('./shared/components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent),
    title: 'Zugriff verweigert - ZSO Gantrisch'
  },
  
  // All protected routes below - require authentication and email verification
  {
    path: '',
    canActivate: [authGuard],
    children: [
      // Home/dashboard
      {
        path: '',
        loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Dashboard - ZSO Gantrisch'
      },
      
      // Profile page
      {
        path: 'profile',
        loadComponent: () => import('./modules/profile/profile.component').then(m => m.ProfileComponent),
        title: 'Mein Profil - ZSO Gantrisch'
      },
      
      // Personen module - with lazy loading
      {
        path: 'personen',
        loadChildren: () => import('./modules/personen/personen.routes').then(r => r.PERSONEN_ROUTES),
        title: 'Personen - ZSO Gantrisch'
      },
      
      // Ausbildungen module - with lazy loading
      {
        path: 'ausbildungen',
        loadChildren: () => import('./modules/ausbildungen/ausbildungen.routes').then(r => r.AUSBILDUNGEN_ROUTES),
        title: 'Ausbildungen - ZSO Gantrisch'
      },


      // Admin routes - require admin role
      {
        path: 'admin',
        loadChildren: () => import('./admin/admin.routes').then(r => r.ADMIN_ROUTES),
        canActivate: [roleGuard(['admin'])],
        title: 'Administration - ZSO Gantrisch'
      }
    ]
  },
  
  // Fallback route - redirect to home
  { path: '**', redirectTo: '' }
];