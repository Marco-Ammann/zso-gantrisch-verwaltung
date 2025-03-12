import { Routes } from '@angular/router';

// Temporäre leere Route bis zur Implementierung der Komponenten
export const AUSBILDUNGEN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Ausbildungen - ZSO Gantrisch'
  }
];