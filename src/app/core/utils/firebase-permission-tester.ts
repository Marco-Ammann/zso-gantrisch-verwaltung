import { Injectable } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../../auth/services/auth.service';

/**
 * Utility service for testing Firebase permissions
 * Add this to your components for troubleshooting permissions
 */
@Injectable({
  providedIn: 'root'
})
export class FirebasePermissionTester {
  constructor(
    private firebase: FirebaseService,
    private auth: AuthService
  ) {}

  async testPermissions(): Promise<{[key: string]: boolean}> {
    const results: {[key: string]: boolean} = {};
    
    // Log the current auth state first
    this.auth.logAuthState();
    
    // Get auth status from Firebase
    const authStatus = await this.firebase.getCurrentAuthStatus();
    console.log('Current Firebase Auth Status:', authStatus);
    
    // Test read permissions
    try {
      const users = await this.firebase.getAll('users');
      results['read_users'] = users.length > 0;
    } catch (e) {
      console.error('Failed to read users:', e);
      results['read_users'] = false;
    }
    
    try {
      const ausbildungen = await this.firebase.getAll('ausbildungen');
      results['read_ausbildungen'] = ausbildungen.length >= 0;
    } catch (e) {
      console.error('Failed to read ausbildungen:', e);
      results['read_ausbildungen'] = false;
    }
    
    // Test write permissions - only if we're authenticated
    if (authStatus.authenticated) {
      // Test write to a test document
      try {
        const id = await this.firebase.add('test_permissions', {
          testData: 'Permission test',
          timestamp: new Date()
        });
        results['write_test'] = true;
        
        // Clean up
        try {
          await this.firebase.delete('test_permissions', id);
        } catch (e) {
          console.error('Failed to clean up test document:', e);
        }
      } catch (e) {
        console.error('Failed to write test document:', e);
        results['write_test'] = false;
      }
    }
    
    console.log('Permission test results:', results);
    return results;
  }
}
