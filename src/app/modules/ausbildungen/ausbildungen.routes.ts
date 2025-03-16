// src/app/modules/ausbildungen/ausbildungen.routes.ts
import { Routes } from '@angular/router';
import { AusbildungenComponent } from './ausbildungen.component';
import { AuthGuard, EditorGuard, AdminGuard, authGuard, roleGuard } from '../../auth/guards/auth.guard';
import { AusbildungenListeComponent } from './ausbildungen-liste/ausbildungen-liste.component';
import { AusbildungFormComponent } from './ausbildung-form/ausbildung-form.component';
import { AusbildungsmatrixComponent } from './ausbildungsmatrix/ausbildungsmatrix.component';
import { TeilnahmeErfassungComponent } from './teilnahme-erfassung/teilnahme-erfassung.component';
import { AppellDurchfuehrungComponent } from './appell-durchfuehrung/appell-durchfuehrung.component';
import { AusbildungDetailComponent } from './ausbildung-detail/ausbildung-detail.component';

export const AUSBILDUNGEN_ROUTES: Routes = [
  {
    path: '',
    component: AusbildungenComponent,
    children: [
      {
        path: '',
        component: AusbildungenListeComponent,
        canActivate: [AuthGuard]  // Using class-based guard
      },
      {
        path: 'neu',
        component: AusbildungFormComponent,
        canActivate: [EditorGuard]  // Using class-based guard
      },
      {
        path: 'matrix',
        component: AusbildungsmatrixComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'teilnahmen/:id',
        component: TeilnahmeErfassungComponent,
        canActivate: [AuthGuard]
      },
      {
        path: ':id/bearbeiten',
        component: AusbildungFormComponent,
        canActivate: [EditorGuard]
      },
      {
        path: ':id/appell',
        component: AppellDurchfuehrungComponent,
        canActivate: [AuthGuard]
      },
      {
        path: ':id',
        component: AusbildungDetailComponent,
        canActivate: [AuthGuard]
      }
    ]
  }
];
