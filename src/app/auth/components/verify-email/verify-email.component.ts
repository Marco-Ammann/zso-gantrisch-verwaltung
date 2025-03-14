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
  errorMessage = signal<string | null>(null);
  email = signal<string>('');
  
  ngOnInit(): void {
    // Check if there's a code in the URL (coming from email link)
    this.route.queryParams.subscribe(params => {
      const oobCode = params['oobCode'];
      const mode = params['mode'];
      
      if (oobCode && mode === 'verifyEmail') {
        this.verifyEmail(oobCode);
      }
    });
  }
  
  /**
   * Verify email with the provided code
   */
  async verifyEmail(code: string): Promise<void> {
    this.isLoading.set(true);
    
    try {
      await this.authService.applyActionCode(code);
      this.isVerified.set(true);
      this.snackBar.open(
        'E-Mail-Adresse erfolgreich verifiziert',
        'Schließen',
        { duration: 5000 }
      );
    } catch (error) {
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
      await this.authService.resendVerificationEmail(this.email());
      this.snackBar.open(
        'Bestätigungs-E-Mail wurde erneut gesendet.',
        'Schließen',
        { duration: 5000 }
      );
    } catch (error) {
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
