import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../auth/services/auth.service';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  
  userProfile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  isEditMode = signal(false);
  
  profileForm: FormGroup = this.fb.group({
    displayName: ['', [Validators.required]],
    email: [{value: '', disabled: true}],
    phoneNumber: [''],
    photoURL: [''],
  });
  
  ngOnInit() {
    this.loadUserProfile();
  }
  
  /**
   * Loads the current user profile data
   */
  async loadUserProfile() {
    this.isLoading.set(true);
    
    try {
      const currentUser = this.authService.currentUser();
      
      if (currentUser) {
        const userProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || '',
          // Fix: Initialize with empty string since User doesn't have phoneNumber
          phoneNumber: '',
          photoURL: currentUser.photoURL || '',
          // Fix: Ensure role is string | undefined, not null
          role: currentUser.role || undefined
        };
        
        this.userProfile.set(userProfile);
        this.updateForm(userProfile);
      } else {
        this.showMessage('Fehler: Benutzer nicht angemeldet');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.showMessage('Fehler beim Laden des Benutzerprofils');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Updates the form with user profile data
   */
  updateForm(profile: UserProfile) {
    this.profileForm.patchValue({
      displayName: profile.displayName,
      email: profile.email,
      phoneNumber: profile.phoneNumber || '',
      photoURL: profile.photoURL || '',
    });
  }
  
  /**
   * Toggles between view mode and edit mode
   */
  toggleEditMode() {
    if (this.isEditMode()) {
      // If we're exiting edit mode, reset the form
      this.updateForm(this.userProfile()!);
    }
    
    this.isEditMode.update(current => !current);
  }
  
  /**
   * Saves user profile changes
   */
  async saveProfile() {
    if (this.profileForm.invalid) {
      return;
    }
    
    this.isSaving.set(true);
    
    try {
      const formData = this.profileForm.value;
      
      // Fix: Make sure updateProfile exists in AuthService
      await this.authService.updateProfile({
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        photoURL: formData.photoURL,
      });
      
      // Refresh user data
      await this.loadUserProfile();
      this.isEditMode.set(false);
      this.showMessage('Profil erfolgreich aktualisiert');
    } catch (error) {
      console.error('Error updating profile:', error);
      this.showMessage('Fehler beim Aktualisieren des Profils');
    } finally {
      this.isSaving.set(false);
    }
  }
  
  /**
   * Shows a snackbar message
   */
  private showMessage(message: string) {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
  
  /**
   * Returns the user's role in a readable format
   */
  getUserRoleLabel(): string {
    const role = this.userProfile()?.role;
    
    if (role === 'admin') return 'Administrator';
    if (role === 'editor') return 'Bearbeiter';
    return 'Benutzer';
  }
  
  /**
   * Opens a dialog to change the password
   */
  async requestPasswordReset() {
    const email = this.userProfile()?.email;
    if (!email) {
      this.showMessage('Keine E-Mail-Adresse gefunden');
      return;
    }
    
    try {
      await this.authService.sendPasswordResetEmail(email);
      this.showMessage('Password-Reset E-Mail wurde gesendet');
    } catch (error) {
      console.error('Error sending password reset:', error);
      this.showMessage('Fehler beim Senden der Password-Reset E-Mail');
    }
  }
}
