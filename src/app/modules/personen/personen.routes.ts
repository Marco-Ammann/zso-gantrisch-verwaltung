import { Routes } from '@angular/router';

// Temporäre leere Route bis zur Implementierung der Komponenten
export const PERSONEN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Personen - ZSO Gantrisch'
  }
];