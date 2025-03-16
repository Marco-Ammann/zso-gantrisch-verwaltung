import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map, Observable, of, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../../core/services/loading.service';

/**
 * Function-based guards for Angular 16+ router
 */
export function authGuard() {
  const authService = inject(AuthService);
  const router = inject(Router);
  const loadingService = inject(LoadingService);

  loadingService.show('Authentifizierung wird überprüft...');

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    loadingService.hide();
    return false;
  }

  loadingService.hide();
  return true;
}

export function publicGuard() {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }
  
  return true;
}

// Update the roleGuard function to accept string or array
export function roleGuard(requiredRole: 'admin' | 'editor' | string[]): () => boolean {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const loadingService = inject(LoadingService);

    // Show loading indicator
    loadingService.show(`Berechtigungen werden überprüft...`);

    // Get current role
    const userRole = authService.userRole();
    
    // Handle different parameter types
    let hasAccess = false;
    
    if (Array.isArray(requiredRole)) {
      // If array of roles was passed, check if user has any of them
      hasAccess = !!userRole && requiredRole.includes(userRole);
    } else if (requiredRole === 'admin') {
      // For admin role, only admin has access
      hasAccess = userRole === 'admin';
    } else if (requiredRole === 'editor') {
      // For editor role, both admin and editor have access
      hasAccess = userRole === 'admin' || userRole === 'editor';
    }

    // Hide loading and redirect if no access
    if (!hasAccess) {
      router.navigate(['/unauthorized']);
      loadingService.hide();
      return false;
    }

    loadingService.hide();
    return true;
  };
}

/**
 * Legacy class-based Auth guard for routes that require authentication
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingService = inject(LoadingService);

  canActivate(): Observable<boolean> {
    this.loadingService.show('Authentifizierung wird überprüft...');
    
    return of(this.authService.isAuthenticated()).pipe(
      tap(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/login']);
        }
        this.loadingService.hide();
      })
    );
  }
}

/**
 * Legacy class-based Editor guard for routes that require editor permissions
 */
@Injectable({
  providedIn: 'root'
})
export class EditorGuard {
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingService = inject(LoadingService);

  canActivate(): Observable<boolean> {
    this.loadingService.show('Berechtigungen werden überprüft...');
    
    // Fix: Use the signal value directly instead of userRole$
    return of(this.authService.userRole()).pipe(
      map(role => role === 'admin' || role === 'editor'),
      tap(hasAccess => {
        if (!hasAccess) {
          this.router.navigate(['/unauthorized']);
        }
        this.loadingService.hide();
      })
    );
  }
}

/**
 * Legacy class-based Admin guard for routes that require admin permissions
 */
@Injectable({
  providedIn: 'root'
})
export class AdminGuard {
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingService = inject(LoadingService);

  canActivate(): Observable<boolean> {
    this.loadingService.show('Admin-Berechtigungen werden überprüft...');
    
    // Fix: Use the signal value directly instead of userRole$
    return of(this.authService.userRole()).pipe(
      map(role => role === 'admin'),
      tap(isAdmin => {
        if (!isAdmin) {
          this.router.navigate(['/unauthorized']);
        }
        this.loadingService.hide();
      })
    );
  }
}