import { Injectable, inject } from '@angular/core';
import { 
  CanActivateFn, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../../core/models';
import { AuthStateService } from '../services/auth-state.service';
import { filter, map, take } from 'rxjs';

/**
 * Angular 19+ style Guard-Funktion für den Routenschutz
 * Prüft, ob der Benutzer authentifiziert ist und die entsprechenden Rechte hat
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const authStateService = inject(AuthStateService);
  const authService = inject(AuthService); // An dieser Stelle injizieren, nicht in der map-Funktion
  
  return authStateService.isAuthenticated.pipe(
    filter(authState => authState !== null), // Warte, bis der Zustand bekannt ist
    take(1),
    map(isAuthenticated => {
      if (!isAuthenticated) {
        console.log('Nicht authentifiziert, Umleitung zur Login-Seite');
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
      
      // Prüfe Rollenanforderung
      const requiredRoles = route.data['roles'] as User['role'][] | undefined;
      
      if (requiredRoles && requiredRoles.length > 0) {
        const hasRequiredRole = authService.hasRole(requiredRoles);
        if (!hasRequiredRole) {
          router.navigate(['/']);
          return false;
        }
      }
      
      return true;
    })
  );
};

/**
 * Guard für Benutzer, die NICHT eingeloggt sind (z.B. für Login-Seite)
 */
export const publicGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const authStateService = inject(AuthStateService);
  
  return authStateService.isAuthenticated.pipe(
    filter(authState => authState !== null),
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};