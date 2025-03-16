import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from './auth/services/auth.service';
import { IdleTimeoutService } from './core/services/idle-timeout.service';
import { ErrorHandlingService } from './core/services/error-handling.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private idleTimeoutService = inject(IdleTimeoutService);
  private router = inject(Router);
  private errorHandler = inject(ErrorHandlingService);
  
  title = 'ZSO Gantrisch Verwaltung';
  
  private subscriptions: Subscription[] = [];
  
  async ngOnInit(): Promise<void> {
    try {
      // Check if we are on the root path and redirect to dashboard if authenticated
      if (this.router.url === '/') {
        const isAuthenticated = this.authService.isAuthenticated();
        if (isAuthenticated) {
          this.router.navigate(['/dashboard']);
        }
      }
            
      // Subscribe to auth state changes to update the view accordingly
      this.authService.currentUser$.subscribe(user => {
        // If the user is authenticated but at root or login, redirect to dashboard
        if (user && (this.router.url === '/' || this.router.url === '/login')) {
          this.router.navigate(['/dashboard']);
        }
      });
    } catch (error) {
      this.errorHandler.handleError(error, 'App initialization');
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
    const authSub = this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        // Start idle timeout with 30 minutes of inactivity
        this.idleTimeoutService.startWatching(30);
      } else {
        // Stop idle timeout when user logs out
        this.idleTimeoutService.stopWatching();
      }
    });
    this.subscriptions.push(authSub);
    
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