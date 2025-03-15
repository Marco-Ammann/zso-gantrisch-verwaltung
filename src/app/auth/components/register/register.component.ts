import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  FormBuilder, 
  FormGroup, 
  ReactiveFormsModule, 
  Validators 
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  
  // Form
  registerForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });
  
  // State
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  registrationSuccess = signal(false);
  
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
   * Register a new account
   */
  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }
    
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    const { email, password } = this.registerForm.value;
    
    try {
      await this.authService.register(email, password);
      
      // Registration successful
      this.registrationSuccess.set(true);
      
      this.snackBar.open(
        'Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail-Adresse für den Bestätigungslink.',
        'Schließen',
        {
          duration: 8000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        }
      );
      
    } catch (error) {
      // Registration failed
      this.errorMessage.set(this.authService.error() || 'Registrierung fehlgeschlagen');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Go back to login page
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }
  
  /**
   * Checks if a field is invalid
   */
  isFieldInvalid(controlName: string): boolean {
    const control = this.registerForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
  
  /**
   * Gets the error message for a field
   */
  getErrorMessage(controlName: string): string {
    const control = this.registerForm.get(controlName);
    
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Dieses Feld ist erforderlich';
    }
    
    if (controlName === 'email' && control.hasError('email')) {
      return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
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
   * Mark all form fields as touched to show validation errors
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
