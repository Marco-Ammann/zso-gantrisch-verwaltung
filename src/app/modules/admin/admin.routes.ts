import { Routes } from '@angular/router';

// Temporäre leere Route bis zur Implementierung der Komponenten
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Administration - ZSO Gantrisch'
  }
];