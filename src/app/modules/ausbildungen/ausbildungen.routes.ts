// src/app/modules/ausbildungen/ausbildungen.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../auth/guards/auth.guard';

export const AUSBILDUNGEN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ausbildungen-liste/ausbildungen-liste.component')
      .then(m => m.AusbildungenListeComponent),
    title: 'Ausbildungen - ZSO Gantrisch',
    canActivate: [authGuard]
  },
  {
    path: 'neu',
    loadComponent: () => import('./ausbildung-form/ausbildung-form.component')
      .then(m => m.AusbildungFormComponent),
    title: 'Neue Ausbildung - ZSO Gantrisch',
    canActivate: [authGuard],
    data: { roles: ['admin', 'oberleutnant', 'leutnant'] }
  },
  {
    path: ':id',
    loadComponent: () => import('./ausbildung-detail/ausbildung-detail.component')
      .then(m => m.AusbildungDetailComponent),
    title: 'Ausbildung Details - ZSO Gantrisch',
    canActivate: [authGuard]
  },
  {
    path: ':id/bearbeiten',
    loadComponent: () => import('./ausbildung-form/ausbildung-form.component')
      .then(m => m.AusbildungFormComponent),
    title: 'Ausbildung bearbeiten - ZSO Gantrisch',
    canActivate: [authGuard],
    data: { roles: ['admin', 'oberleutnant', 'leutnant'] }
  },
  {
    path: 'teilnahmen/:ausbildungId',
    loadComponent: () => import('./teilnahme-erfassung/teilnahme-erfassung.component')
      .then(m => m.TeilnahmeErfassungComponent),
    title: 'Teilnahmen erfassen - ZSO Gantrisch',
    canActivate: [authGuard],
    data: { roles: ['admin', 'oberleutnant', 'leutnant'] }
  },
  {
    path: 'matrix',
    loadComponent: () => import('./ausbildungsmatrix/ausbildungsmatrix.component')
      .then(m => m.AusbildungsmatrixComponent),
    title: 'Ausbildungsmatrix - ZSO Gantrisch',
    canActivate: [authGuard]
  }
];