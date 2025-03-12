import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  FormBuilder, 
  FormGroup, 
  Validators, 
  ReactiveFormsModule 
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
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
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  
  // Formulardefinition
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  
  // Zustandssignals
  hidePassword = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  
  /**
   * Initialisiert die Komponente und prüft, ob ein Redirect-URL vorhanden ist
   */
  ngOnInit(): void {
    // Prüfen, ob ein redirect nach dem Login erfolgen soll
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        localStorage.setItem('returnUrl', params['returnUrl']);
      }
    });
  }
  
  /**
   * Login-Funktion
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }
    
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    const { email, password } = this.loginForm.value;
    
    try {
      await this.authService.login(email, password);
      
      // Erfolgsmeldung anzeigen
      this.snackBar.open('Anmeldung erfolgreich', 'Schließen', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      
      // Nach erfolgreicher Anmeldung weiterleiten
      const returnUrl = localStorage.getItem('returnUrl') || '/';
      console.log('Redirecting to:', returnUrl);
      localStorage.removeItem('returnUrl');
      console.log('Redirecting to:', returnUrl);
      this.router.navigateByUrl(returnUrl);
    } catch (error) {
      // Fehlermeldung anzeigen
      this.errorMessage.set(this.authService.error() || 'Anmeldung fehlgeschlagen');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Hilfsfunktion zur Validierung der Formularfelder
   * @param controlName Name des Formularfeldes
   * @returns true, wenn das Feld ungültig und berührt wurde
   */
  isFieldInvalid(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
  
  /**
   * Hilfsfunktion zur Anzeige von Fehlermeldungen
   * @param controlName Name des Formularfeldes
   * @returns Fehlermeldung oder leerer String
   */
  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Dieses Feld ist erforderlich';
    }
    
    if (controlName === 'email' && control.hasError('email')) {
      return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
    
    if (controlName === 'password' && control.hasError('minlength')) {
      return 'Das Passwort muss mindestens 6 Zeichen lang sein';
    }
    
    return '';
  }
  
  /**
   * Wechselt die Sichtbarkeit des Passworts
   */
  togglePasswordVisibility(): void {
    this.hidePassword.update(value => !value);
  }
}