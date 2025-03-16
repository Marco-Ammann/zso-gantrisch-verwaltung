import { Injectable, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationError, NavigationCancel, Event } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RouteDiagnosticsService {
  private router = inject(Router);
  private isEnabled = false;

  constructor() {}

  /**
   * Enable detailed route transition logging
   */
  enableRouteLogging(): void {
    if (this.isEnabled) return;

    this.isEnabled = true;
    console.log('🔍 Route diagnostics enabled');

    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        console.log(`🚀 Navigation started to: ${event.url}`);
      }

      if (event instanceof NavigationEnd) {
        console.log(`✅ Navigation succeeded to: ${event.url}`);
      }

      if (event instanceof NavigationCancel) {
        console.log(`⚠️ Navigation cancelled to: ${event.url}`, event.reason);
      }

      if (event instanceof NavigationError) {
        console.error(`❌ Navigation failed to: ${event.url}`, event.error);
      }
    });
  }

  /**
   * Logs all available routes from the router configuration
   */
  logAvailableRoutes(): void {
    const routes = this.getRoutePaths(this.router.config);
    console.log('📋 Available routes in application:');
    routes.forEach(route => console.log(`- ${route}`));
  }

  /**
   * Extract route paths from router config
   * @param routes Router configuration
   * @param parentPath Parent path (for nested routes)
   * @returns Array of route paths
   */
  private getRoutePaths(routes: any[], parentPath: string = ''): string[] {
    let paths: string[] = [];
    
    if (!routes) return paths;

    routes.forEach(route => {
      const path = parentPath + '/' + (route.path || '');
      
      if (route.path) {
        paths.push(path);
      }
      
      if (route.children) {
        paths = paths.concat(this.getRoutePaths(route.children, path));
      }
    });

    return paths;
  }
}
