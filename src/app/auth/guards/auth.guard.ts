import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

/**
 * Auth Guard for protecting routes that require authentication
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuth => {
      // If authenticated, allow access
      if (isAuth) {
        return true;
      }
      
      // If not authenticated, redirect to login with returnUrl
      const returnUrl = router.routerState.snapshot.url;
      return router.createUrlTree(['/login'], { 
        queryParams: { returnUrl }
      });
    })
  );
};

/**
 * Public Guard for routes that should only be accessible when not authenticated
 * (like login page, which shouldn't be shown to already authenticated users)
 */
export const publicGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuth => {
      // If not authenticated, allow access to public routes
      if (!isAuth) {
        return true;
      }
      
      // If authenticated, redirect to home
      return router.createUrlTree(['/']);
    })
  );
};

/**
 * Role Guard for protecting routes based on user role
 * @param allowedRoles Array of roles that can access the route
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (): Observable<boolean | UrlTree> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.currentUser$.pipe(
      take(1),
      map(user => {
        // If user exists and has a role matching allowed roles, grant access
        if (user && user.role && allowedRoles.includes(user.role)) {
          return true;
        }
        
        // If authenticated but wrong role, redirect to home
        if (authService.isAuthenticated()) {
          return router.createUrlTree(['/']);
        }
        
        // If not authenticated, redirect to login
        return router.createUrlTree(['/login']);
      })
    );
  };
};