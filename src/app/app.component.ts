import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from './auth/services/auth.service';
import { IdleTimeoutService } from './core/services/idle-timeout.service';
import { ErrorHandlingService } from './core/services/error-handling.service';
import { CommonModule } from '@angular/common';
import { RouteDiagnosticsService } from './core/services/route-diagnostics.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div *ngIf="isCheckingAuth" class="global-loading">
      <div class="spinner"></div>
      <p>Authentifizierung wird überprüft...</p>
    </div>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .global-loading {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #f5f5f5;
      z-index: 1000;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 5px solid rgba(255, 127, 0, 0.3);
      border-radius: 50%;
      border-top-color: #FF7F00;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private idleTimeoutService = inject(IdleTimeoutService);
  private router = inject(Router);
  private errorHandler = inject(ErrorHandlingService);
  private routeDiagnostics = inject(RouteDiagnosticsService);
  
  title = 'ZSO Gantrisch Verwaltung';
  isCheckingAuth = true; // Add loading state
  
  private subscriptions: Subscription[] = [];
  private initialAuthCheckDone = false;
  
  async ngOnInit(): Promise<void> {
    try {
      // Enable route diagnostics in non-production environments
      if (!environment.production) {
        this.routeDiagnostics.enableRouteLogging();
        this.routeDiagnostics.logAvailableRoutes();
      }
      
      // Check if we are on the root path and redirect to dashboard if authenticated
      if (this.router.url === '/') {
        const isAuthenticated = this.authService.isAuthenticated();
        if (isAuthenticated) {
          console.log('User authenticated at root path, redirecting to dashboard');
          this.router.navigate(['/dashboard'])
            .then(() => console.log('Navigation to dashboard successful'))
            .catch(err => console.error('Navigation error:', err));
        }
      }
            
      // Subscribe to auth state changes to update the view accordingly
      const authSub = this.authService.currentUser$.subscribe(user => {
        // Initial auth check is complete
        if (!this.initialAuthCheckDone) {
          this.initialAuthCheckDone = true;
          setTimeout(() => {
            this.isCheckingAuth = false;
          }, 500); // Short delay to prevent UI flicker
        }
        
        // If the user is authenticated but at root or login, redirect to dashboard
        if (user && (this.router.url === '/' || this.router.url === '/login')) {
          console.log('User authenticated at login/root, redirecting to dashboard');
          this.router.navigate(['/dashboard'])
            .then(() => console.log('Navigation to dashboard successful'))
            .catch(err => console.error('Navigation error:', err));
        }
      });
      this.subscriptions.push(authSub);
    } catch (error) {
      this.errorHandler.handleError(error, 'App initialization');
      this.isCheckingAuth = false; // Ensure loading state is cleared even on error
    }

    // Log current role at app startup
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        console.log(`App initialized with user: ${user.displayName || user.email}, Role: ${user.role}`);
      } else {
        console.log('App initialized with no authenticated user');
      }
    });
    
    // Set up idle timeout when user is logged in
    const idleSub = this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        // Start idle timeout with 30 minutes of inactivity
        this.idleTimeoutService.startWatching(30);
      } else {
        // Stop idle timeout when user logs out
        this.idleTimeoutService.stopWatching();
      }
    });
    this.subscriptions.push(idleSub);
    
    // Reset idle timer and log role on route change
    const routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigationEnd = event as NavigationEnd;
        if (this.authService.isAuthenticated()) {
          // Log current role for diagnostics
          console.log(`Navigation to ${navigationEnd.url} - User role: ${this.authService.userRole()}`);
          
          // Reset activity timer
          this.idleTimeoutService.startWatching(30);
          
          // Update last active timestamp in user profile
          this.authService.updateLastActiveTime();
        }
      });
    this.subscriptions.push(routerSub);
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.idleTimeoutService.stopWatching();
  }
}