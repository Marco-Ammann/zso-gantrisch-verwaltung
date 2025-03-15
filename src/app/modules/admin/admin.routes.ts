import { Routes } from '@angular/router';
import { PermissionDiagnosticsComponent } from '../../admin/components/permission-diagnostics.component';
import { authGuard } from '../../auth/guards/auth.guard';

// Temporäre leere Route bis zur Implementierung der Komponenten
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Administration - ZSO Gantrisch'
  },
  {
    path: 'admin/diagnostics',
    component: PermissionDiagnosticsComponent,
    canActivate: [authGuard] // If you have one
  }
];