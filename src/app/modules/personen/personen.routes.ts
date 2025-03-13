// src/app/modules/personen/personen.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../auth/guards/auth.guard';

export const PERSONEN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./personen-liste/personen-liste.component')
      .then(m => m.PersonenListeComponent),
    title: 'Personen - ZSO Gantrisch',
    canActivate: [authGuard]
  },
  {
    path: 'neu',
    loadComponent: () => import('./person-form/person-form.component')
      .then(m => m.PersonFormComponent),
    title: 'Neue Person - ZSO Gantrisch',
    canActivate: [authGuard],
    data: { roles: ['admin', 'oberleutnant', 'leutnant'] }
  },
  {
    path: 'notfallkontakte',
    loadComponent: () => import('./notfallkontakte/notfallkontakte.component')
      .then(m => m.NotfallkontakteComponent),
    title: 'Notfallkontakte - ZSO Gantrisch',
    canActivate: [authGuard]
  },
  {
    path: ':id',
    loadComponent: () => import('./person-detail/person-detail.component')
      .then(m => m.PersonDetailComponent),
    title: 'Person Details - ZSO Gantrisch',
    canActivate: [authGuard]
  },
  {
    path: ':id/bearbeiten',
    loadComponent: () => import('./person-form/person-form.component')
      .then(m => m.PersonFormComponent),
    title: 'Person bearbeiten - ZSO Gantrisch',
    canActivate: [authGuard],
    data: { roles: ['admin', 'oberleutnant', 'leutnant'] }
  }
];