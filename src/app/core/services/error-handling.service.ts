import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Handle Firebase and other errors in a user-friendly way
   * @param error The error to handle
   * @param context Optional context information about where the error occurred
   */
  handleError(error: any, context?: string): void {
    console.error(`Error ${context ? 'in ' + context : ''}:`, error);
    
    let message = 'Ein unerwarteter Fehler ist aufgetreten.';
    
    // Firebase auth errors
    if (error.code && error.code.startsWith('auth/')) {
      switch (error.code) {
        case 'auth/invalid-credential':
          message = 'Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.';
          break;
        case 'auth/user-not-found':
          message = 'Benutzer nicht gefunden. Bitte überprüfen Sie Ihre E-Mail.';
          break;
        case 'auth/wrong-password':
          message = 'Falsches Passwort. Bitte versuchen Sie es erneut.';
          break;
        case 'auth/email-already-in-use':
          message = 'Diese E-Mail-Adresse wird bereits verwendet.';
          break;
        case 'auth/weak-password':
          message = 'Das Passwort ist zu schwach. Bitte wählen Sie ein stärkeres Passwort.';
          break;
        case 'auth/too-many-requests':
          message = 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuchen Sie es später erneut.';
          break;
        default:
          message = `Authentifizierungsfehler: ${error.message || error.code}`;
          break;
      }
    }
    // IndexedDB errors
    else if (error.name === 'InvalidStateError' || 
             (error.message && error.message.includes('IndexedDB'))) {
      message = 'Zugriff auf den lokalen Speicher fehlgeschlagen. Bitte überprüfen Sie Ihre Browser-Einstellungen.';
    }
    
    this.snackBar.open(message, 'OK', {
      duration: 5000,
      panelClass: 'error-snackbar'
    });
  }
}
