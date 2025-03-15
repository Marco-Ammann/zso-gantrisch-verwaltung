import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule, 
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  
  // State
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  resetSuccess = signal(false);
  hasActionCode = signal(false);
  userEmail = signal<string>('');
  
  // Form for new password
  resetForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });
  
  // Password visibility
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  
  // Action code from URL
  private actionCode: string | null = null;
  
  ngOnInit(): void {
    this.route.queryParams.subscribe(async params => {
      const oobCode = params['oobCode'];
      const mode = params['mode'];
      
      if (oobCode && mode === 'resetPassword') {
        this.actionCode = oobCode;
        this.hasActionCode.set(true);
        await this.verifyActionCode(oobCode);
      }
    });
  }
  
  /**
   * Verify the action code for password reset
   */
  private async verifyActionCode(code: string): Promise<void> {
    this.isLoading.set(true);
    
    try {
      const email = await this.authService.verifyPasswordResetCode(code);
      this.userEmail.set(email);
    } catch (error) {
      this.errorMessage.set('Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Submit new password
   */
  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid || !this.actionCode) {
      this.markFormGroupTouched(this.resetForm);
      return;
    }
    
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    try {
      const { password } = this.resetForm.value;
      await this.authService.confirmPasswordReset(this.actionCode, password);
      this.resetSuccess.set(true);
      
      this.snackBar.open(
        'Passwort erfolgreich zurückgesetzt',
        'Schließen',
        { duration: 5000 }
      );
    } catch (error) {
      this.errorMessage.set(this.authService.error() || 'Fehler beim Zurücksetzen des Passworts');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }
  
  /**
   * Validate that passwords match
   */
  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password?.value !== confirmPassword?.value) {
      confirmPassword?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }
  
  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword.update(value => !value);
  }
  
  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.update(value => !value);
  }
  
  /**
   * Check if a field is invalid
   */
  isFieldInvalid(controlName: string): boolean {
    const control = this.resetForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
  
  /**
   * Get error message for a field
   */
  getErrorMessage(controlName: string): string {
    const control = this.resetForm.get(controlName);
    
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Dieses Feld ist erforderlich';
    }
    
    if (controlName === 'password' && control.hasError('minlength')) {
      return 'Das Passwort muss mindestens 8 Zeichen lang sein';
    }
    
    if (controlName === 'confirmPassword' && control.hasError('passwordMismatch')) {
      return 'Die Passwörter stimmen nicht überein';
    }
    
    return '';
  }
  
  /**
   * Mark all form controls as touched to trigger validation
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
