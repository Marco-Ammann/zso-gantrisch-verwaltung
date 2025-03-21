import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { checkActionCode } from '@angular/fire/auth'; // Import missing function

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  
  // State
  isLoading = signal(false);
  isVerified = signal(false);
  verificationInProgress = signal(false);
  errorMessage = signal<string | null>(null);
  email = signal<string>('');
  
  ngOnInit(): void {
    console.log('VerifyEmailComponent initialized');
    
    // Check if there's a code in the URL (coming from email link) or an email parameter
    this.route.queryParams.subscribe(params => {
      const oobCode = params['oobCode'];
      const mode = params['mode'];
      const emailParam = params['email'];
      
      if (emailParam) {
        console.log('Email parameter found:', emailParam);
        this.email.set(emailParam);
      }
      
      if (oobCode && mode === 'verifyEmail') {
        console.log('Verification code found, verifying email');
        this.verificationInProgress.set(true);
        this.verifyEmail(oobCode);
      } else {
        console.log('No verification code found or not in verify mode');
        this.verificationInProgress.set(false);
      }
    });
  }
  
  /**
   * Verify email with the provided code
   */
  async verifyEmail(code: string): Promise<void> {
    this.isLoading.set(true);
    
    try {
      console.log('Applying action code for email verification');
      
      // First try to get email from code before applying it (for better logging)
      try {
        const actionInfo = await checkActionCode(this.authService.auth, code);
        console.log('Action code info:', actionInfo);
        if (actionInfo.data.email) {
          this.email.set(actionInfo.data.email);
          console.log('Email extracted from action code:', actionInfo.data.email);
        }
      } catch (e) {
        console.error('Error checking action code:', e);
      }
      
      // Apply the action code
      await this.authService.applyActionCode(code);
      
      this.isVerified.set(true);
      this.snackBar.open(
        'E-Mail-Adresse erfolgreich verifiziert',
        'Schließen',
        { duration: 5000 }
      );
      
    } catch (error) {
      console.error('Error verifying email:', error);
      this.errorMessage.set('Der Bestätigungslink ist ungültig oder abgelaufen.');
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
   * Resend verification email
   */
  async resendVerification(): Promise<void> {
    if (!this.email()) {
      this.errorMessage.set('Bitte geben Sie Ihre E-Mail-Adresse ein.');
      return;
    }
    
    this.isLoading.set(true);
    
    try {
      console.log('Resending verification email to:', this.email());
      await this.authService.resendVerificationEmail(this.email());
      this.snackBar.open(
        'Bestätigungs-E-Mail wurde erneut gesendet.',
        'Schließen',
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Error resending verification email:', error);
      this.errorMessage.set(this.authService.error() || 'Fehler beim Senden der Bestätigungs-E-Mail.');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Handle email input change
   */
  onEmailChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.email.set(input.value);
  }
}
