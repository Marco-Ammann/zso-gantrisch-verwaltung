import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { FirebaseService } from '../../core/services/firebase.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-firebase-rules-tester',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatProgressSpinnerModule,
    MatDividerModule,
    MatIconModule
  ],
  template: `
    <mat-card class="rules-tester-card">
      <mat-card-header>
        <mat-card-title>Firebase Rules Tester</mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <div class="auth-status">
          <h3>Authentication Status:</h3>
          <p>
            <mat-icon [color]="isAuthenticated ? 'primary' : 'warn'">
              {{ isAuthenticated ? 'check_circle' : 'error' }}
            </mat-icon>
            {{ isAuthenticated ? 'Authenticated' : 'Not Authenticated' }}
          </p>
          <p *ngIf="isAuthenticated">UID: {{ uid }}</p>
        </div>
        
        <mat-divider></mat-divider>
        
        <div class="test-results">
          <h3>Test Results:</h3>
          
          <div *ngFor="let test of tests" class="test-item">
            <div class="test-header">
              <span class="test-name">{{ test.name }}</span>
              <span *ngIf="test.running" class="test-running">
                <mat-spinner diameter="20"></mat-spinner>
              </span>
              <mat-icon *ngIf="test.success === true" class="test-success">check_circle</mat-icon>
              <mat-icon *ngIf="test.success === false" class="test-failure">cancel</mat-icon>
            </div>
            <p *ngIf="test.message" class="test-message" [class.error]="test.success === false">
              {{ test.message }}
            </p>
          </div>
        </div>
      </mat-card-content>
      
      <mat-card-actions>
        <button mat-raised-button color="primary" (click)="runTests()" [disabled]="isRunning">
          {{ isRunning ? 'Running Tests...' : 'Run Tests' }}
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .rules-tester-card {
      max-width: 600px;
      margin: 20px auto;
    }
    
    .auth-status, .test-results {
      margin-bottom: 20px;
    }
    
    .test-item {
      margin-bottom: 10px;
      padding: 10px;
      border-left: 3px solid #ccc;
    }
    
    .test-header {
      display: flex;
      align-items: center;
    }
    
    .test-name {
      font-weight: bold;
      flex-grow: 1;
    }
    
    .test-running, .test-success, .test-failure {
      margin-left: 10px;
    }
    
    .test-success {
      color: green;
    }
    
    .test-failure {
      color: red;
    }
    
    .test-message {
      margin-top: 5px;
      font-size: 0.9em;
      color: #666;
    }
    
    .error {
      color: red;
    }
  `]
})
export class FirebaseRulesTesterComponent implements OnInit {
  private firebaseService = inject(FirebaseService);
  private auth = inject(Auth);
  
  isAuthenticated = false;
  uid = '';
  isRunning = false;
  
  tests = [
    { name: 'Read users collection', running: false, success: null, message: '' },
    { name: 'Read personen collection', running: false, success: null, message: '' },
    { name: 'Read ausbildungen collection', running: false, success: null, message: '' },
    { name: 'Write to users collection', running: false, success: null, message: '' }
  ];
  
  ngOnInit() {
    this.isAuthenticated = !!this.auth.currentUser;
    this.uid = this.auth.currentUser?.uid || '';
  }
  
  async runTests() {
    this.isRunning = true;
    
    // Reset all tests
    this.tests.forEach(test => {
      test.running = false;
      test.success = null;
      test.message = '';
    });
    
    // Test 1: Read users collection
    await this.runTest(0, async () => {
      const users = await this.firebaseService.getAll('users');
      return { success: users.length > 0, message: `Retrieved ${users.length} users` };
    });
    
    // Test 2: Read personen collection
    await this.runTest(1, async () => {
      const personen = await this.firebaseService.getAll('personen');
      return { success: true, message: `Retrieved ${personen.length} persons` };
    });
    
    // Test 3: Read ausbildungen collection
    await this.runTest(2, async () => {
      const ausbildungen = await this.firebaseService.getAll('ausbildungen');
      return { success: true, message: `Retrieved ${ausbildungen.length} training sessions` };
    });
    
    // Test 4: Write to users collection
    await this.runTest(3, async () => {
      if (!this.auth.currentUser) {
        return { success: false, message: 'Not authenticated' };
      }
      
      try {
        // Just try to update the user's last login timestamp
        const users = await this.firebaseService.query('users', 'uid', '==', this.auth.currentUser.uid);
        if (users.length > 0) {
          const user = users[0];
          await this.firebaseService.update('users', user.id, { lastLogin: new Date() });
          return { success: true, message: 'Updated user document' };
        } else {
          return { success: false, message: 'User document not found' };
        }
      } catch (error) {
        return { success: false, message: error.message || 'Error updating user document' };
      }
    });
    
    this.isRunning = false;
  }
  
  async runTest(index: number, testFn: () => Promise<{success: boolean, message: string}>) {
    this.tests[index].running = true;
    
    try {
      const result = await testFn();
      this.tests[index].success = result.success;
      this.tests[index].message = result.message;
    } catch (error) {
      this.tests[index].success = false;
      this.tests[index].message = error.message || 'Test failed';
    } finally {
      this.tests[index].running = false;
    }
  }
}
