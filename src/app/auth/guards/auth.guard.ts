import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, catchError, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

/**
 * Enhanced Auth Guard for protecting routes that require authentication AND email verification
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('Auth guard checking authentication status...');

  return authService.currentUser$.pipe(
    take(1),
    tap(user => console.log('Auth guard check - Current user:', user ? `${user.email} (${user.role})` : 'Not authenticated')),
    map(user => {
      // Save the intended destination for after login
      const returnUrl = router.routerState.snapshot.url;
      if (returnUrl && 
          returnUrl !== '/login' && 
          returnUrl !== '/register' &&
          !returnUrl.includes('/verify-email') &&
          !returnUrl.includes('/reset-password')) {
        localStorage.setItem('returnUrl', returnUrl);
        console.log('Auth guard: Saving return URL:', returnUrl);
      }
      
      // If user is not authenticated, redirect to login
      if (!user) {
        console.log('Auth guard: User not authenticated, redirecting to login');
        return router.createUrlTree(['/login']);
      }
      
      // If user is authenticated but email is not verified, redirect to verification page
      if (user && !user.emailVerified) {
        console.log('Auth guard: Email not verified, redirecting to verify-email');
        return router.createUrlTree(['/verify-email'], {
          queryParams: { email: user.email }
        });
      }
      
      // User is authenticated and email is verified
      console.log('Auth guard: User authenticated and verified, access granted');
      return true;
    }),
    catchError(error => {
      console.error('Error in auth guard:', error);
      return of(router.createUrlTree(['/login']));
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

  console.log('Public guard checking authentication status...');

  return authService.isAuthenticated$.pipe(
    take(1),
    tap(isAuth => console.log('Public guard check - Is authenticated:', isAuth)),
    map(isAuth => {
      // If not authenticated, allow access to public routes
      if (!isAuth) {
        console.log('Public guard: User not authenticated, access granted');
        return true;
      }
      
      // If authenticated, check if email is verified
      const user = authService.currentUser();
      if (user && !user.emailVerified) {
        console.log('Public guard: User authenticated but email not verified');
        return router.createUrlTree(['/verify-email'], {
          queryParams: { email: user.email }
        });
      }
      
      // If authenticated and email verified, redirect to dashboard explicitly
      console.log('Public guard: User authenticated and verified, redirecting to dashboard');
      return router.createUrlTree(['/dashboard']);
    }),
    catchError(error => {
      console.error('Error in public guard:', error);
      return of(true);
    })
  );
};

/**
 * Enhanced Role Guard for protecting routes based on user role
 * Now also verifies email before checking role
 * 
 * @param allowedRoles Array of roles that can access the route
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (): Observable<boolean | UrlTree> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.currentUser$.pipe(
      take(1),
      map(user => {
        console.log('Role guard check - User:', user?.displayName, 'Role:', user?.role, 'Required roles:', allowedRoles);
        
        // Save the intended destination for after login
        const returnUrl = router.routerState.snapshot.url;
        if (returnUrl && 
            returnUrl !== '/login' && 
            returnUrl !== '/register' &&
            !returnUrl.includes('/verify-email') &&
            !returnUrl.includes('/reset-password')) {
          localStorage.setItem('returnUrl', returnUrl);
        }
        
        // If user is not authenticated, redirect to login
        if (!user) {
          console.log('Role guard: User not authenticated, redirecting to login');
          return router.createUrlTree(['/login']);
        }
        
        // If user is authenticated but email not verified
        if (!user.emailVerified) {
          console.log('Role guard: Email not verified, redirecting to verify-email');
          return router.createUrlTree(['/verify-email'], {
            queryParams: { email: user.email }
          });
        }
        
        // If user has required role, grant access
        if (user.role && allowedRoles.includes(user.role)) {
          console.log('Role guard: User has required role, access granted');
          return true;
        }
        
        // If authenticated but wrong role, redirect to unauthorized page
        console.log('Role guard: User does not have required role, access denied');
        return router.createUrlTree(['/unauthorized'], {
          queryParams: { 
            requiredRole: allowedRoles.join(','), 
            currentRole: user.role
          }
        });
      }),
      catchError(error => {
        console.error('Error in role guard:', error);
        return of(router.createUrlTree(['/login']));
      })
    );
  };
};