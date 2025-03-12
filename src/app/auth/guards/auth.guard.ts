import { Injectable, inject } from '@angular/core';
import { 
  CanActivateFn, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../../core/models';

/**
 * Angular 19+ style Guard-Funktion für den Routenschutz
 * Prüft, ob der Benutzer authentifiziert ist und die entsprechenden Rechte hat
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // Prüfen, ob der Benutzer eingeloggt ist
  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  // Prüfen, ob eine Rollenanforderung definiert ist
  const requiredRoles = route.data['roles'] as User['role'][] | undefined;
  
  if (requiredRoles && requiredRoles.length > 0) {
    // Prüfen, ob der Benutzer eine der erforderlichen Rollen hat
    const hasRequiredRole = authService.hasRole(requiredRoles);
    
    if (!hasRequiredRole) {
      // Bei fehlenden Berechtigungen zur Startseite umleiten
      router.navigate(['/']);
      return false;
    }
  }
  
  return true;
};

/**
 * Guard für Benutzer, die NICHT eingeloggt sind (z.B. für Login-Seite)
 */
export const publicGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // Wenn der Benutzer bereits eingeloggt ist, zur Startseite umleiten
  if (authService.isAuthenticated()) {
    router.navigate(['/']);
    return false;
  }
  
  return true;
};