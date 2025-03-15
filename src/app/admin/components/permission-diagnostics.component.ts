import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar'; // Add SnackBar import
import { FirebasePermissionTester } from '../../core/utils/firebase-permission-tester';
import { AuthService } from '../../auth/services/auth.service';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-permission-diagnostics',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Firebase Permission Diagnostics</mat-card-title>
        <mat-card-subtitle>
          Use this tool to diagnose permission issues with Firebase
        </mat-card-subtitle>
      </mat-card-header>
      
      <mat-card-content>
        <h3>Authentication Status</h3>
        <p>
          <mat-icon [color]="isAuthenticated ? 'primary' : 'warn'">{{ isAuthenticated ? 'check_circle' : 'error' }}</mat-icon>
          {{ isAuthenticated ? 'Authenticated' : 'Not Authenticated' }}
        </p>
        
        <div *ngIf="isAuthenticated">
          <p><strong>User:</strong> {{ currentUser?.displayName || 'No name' }} ({{ currentUser?.email }})</p>
          <p><strong>Role:</strong> {{ currentUser?.role }}</p>
          <p><strong>ID:</strong> {{ currentUser?.uid }}</p>
        </div>
        
        <mat-divider class="my-3"></mat-divider>
        
        <h3>Permission Test Results</h3>
        <div *ngIf="loading">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Testing permissions...</p>
        </div>
        
        <div *ngIf="!loading && testResults">
          <div *ngFor="let result of getTestResultsArray()" class="permission-result">
            <mat-icon [color]="result.success ? 'primary' : 'warn'">
              {{ result.success ? 'check_circle' : 'error' }}
            </mat-icon>
            {{ result.name }}: {{ result.success ? 'Success' : 'Failed' }}
          </div>
        </div>
        
        <mat-divider class="my-3"></mat-divider>
        
        <h3>Actions</h3>
        <button mat-raised-button color="primary" (click)="runTests()" [disabled]="loading">
          {{ loading ? 'Testing...' : 'Run Permission Tests' }}
        </button>
        
        <button mat-button color="accent" (click)="refreshToken()" class="ml-3">
          Refresh Auth Token
        </button>
        
        <button mat-button color="warn" (click)="logout()" class="ml-3">
          Logout
        </button>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .permission-result {
      margin: 0.5rem 0;
      display: flex;
      align-items: center;
    }
    .permission-result mat-icon {
      margin-right: 0.5rem;
    }
    .my-3 {
      margin-top: 1rem;
      margin-bottom: 1rem;
    }
    .ml-3 {
      margin-left: 1rem;
    }
  `]
})
export class PermissionDiagnosticsComponent implements OnInit {
  isAuthenticated = false;
  currentUser: any = null;
  loading = false;
  testResults: {[key: string]: boolean} | null = null;
  
  constructor(
    private permissionTester: FirebasePermissionTester,
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private snackBar: MatSnackBar // Add SnackBar injection
  ) {}
  
  ngOnInit() {
    // Get authentication status
    this.isAuthenticated = this.authService.isAuthenticated();
    this.currentUser = this.authService.currentUser();
  }
  
  async runTests() {
    this.loading = true;
    this.testResults = null;
    
    try {
      this.testResults = await this.permissionTester.testPermissions();
    } catch (error) {
      console.error('Error running permission tests:', error);
    } finally {
      this.loading = false;
    }
  }
  
  getTestResultsArray() {
    if (!this.testResults) return [];
    
    return Object.keys(this.testResults).map(key => ({
      name: key.replace('_', ' '),
      success: this.testResults![key]
    }));
  }
  
  async refreshToken() {
    try {
      // Use the Firebase Service since auth is private in AuthService
      const authStatus = await this.firebaseService.getCurrentAuthStatus();
      
      if (authStatus.authenticated) {
        // Get a fresh token
        await this.firebaseService.getCurrentAuthStatus();
        this.snackBar.open('Auth token refreshed!', 'OK', { duration: 3000 });
      } else {
        this.snackBar.open('No authenticated user to refresh token', 'OK', { duration: 3000 });
      }
    } catch (error: any) {
      console.error('Error refreshing token:', error);
      this.snackBar.open('Failed to refresh token', 'OK', { duration: 3000 });
    }
  }
  
  async logout() {
    await this.authService.logout();
    this.isAuthenticated = false;
    this.currentUser = null;
    this.testResults = null;
  }
}
