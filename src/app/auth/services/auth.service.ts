import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  authState,
  UserCredential,
  updateProfile,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  applyActionCode,
  verifyPasswordResetCode,
  updatePassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  inMemoryPersistence
} from '@angular/fire/auth';
import { toObservable } from '@angular/core/rxjs-interop';
import { User } from '../../core/models/user.model';
import { FirebaseService } from '../../core/services/firebase.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

/**
 * Service für die Authentifizierung und Benutzerverwaltung
 * Verwendet Signal-basierte Reaktivität
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  // Change from private to public for diagnostic component
  public auth: Auth = inject(Auth);
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Private Signals für den internen Zustand
  private _currentUser = signal<User | null>(null);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _authStateSubscription?: Subscription;

  // Öffentliche computed Signals für Komponenten
  public currentUser = computed(() => this._currentUser());
  public isAuthenticated = computed(() => !!this._currentUser());
  public isLoading = computed(() => this._isLoading());
  public error = computed(() => this._error());

  // Benutzerrolle als computed Signal
  public userRole = computed(() => this._currentUser()?.role || null);

  // Role-based permissions as computed
  public canEdit = computed(
    () => {
      const role = this.userRole();
      return role === 'admin' || role === 'oberleutnant' || role === 'leutnant';
    }
  );

  // Add the missing isAdmin computed property
  public isAdmin = computed(() => this.userRole() === 'admin');

  public canDelete = computed(() => this.userRole() === 'admin');
  public canManageUsers = computed(() => this.userRole() === 'admin');

  // Convert to Observable for components that require Observable
  public currentUser$ = toObservable(this.currentUser);
  public isAuthenticated$ = toObservable(this.isAuthenticated);
  public isLoading$ = toObservable(this.isLoading);
  public error$ = toObservable(this.error);

  constructor() {
    // Initialize the auth listener first
    this.initAuthListener();
    
    // Then try to set persistence, but don't block the auth flow if it fails
    this.setPersistenceToLocal()
      .then(() => console.log('Firebase persistence set to LOCAL'))
      .catch(err => console.error('Error setting persistence:', err));
  }

  ngOnDestroy() {
    if (this._authStateSubscription) {
      this._authStateSubscription.unsubscribe();
    }
  }

  /**
   * Set Firebase auth persistence to local storage
   * This ensures the user stays logged in across page reloads and browser restarts
   */
  private async setPersistenceToLocal(): Promise<void> {
    try {
      const auth = getAuth();
      
      // First try to handle compatibility mode
      try {
        // For environments that support the standard persistence
        await setPersistence(auth, browserLocalPersistence);
      } catch (e) {
        if (e instanceof TypeError && e.message.includes('constructor')) {
          // For environments with limitations, fall back to in-memory persistence
          console.warn('Firebase persistence not fully supported in this environment, using fallback');
          await setPersistence(auth, inMemoryPersistence);
        } else {
          throw e;
        }
      }
    } catch (error) {
      console.error('Error setting persistence:', error);
      // Don't rethrow - we can still function with default persistence
    }
  }

  /**
   * Initialisiert den Auth-State-Listener
   */
  private initAuthListener(): void {
    console.log('Auth Listener initialisiert');

    // Zusätzlich: Bei Startup prüfen, ob Benutzer im localStorage gespeichert ist
    const savedUserId = localStorage.getItem('user_id');
    if (savedUserId) {
      console.log('Benutzer-ID im localStorage gefunden, Benutzer gilt als angemeldet');
    }

    // No delay - this can cause the logout issue on reload
    // Instead, handle the auth state change immediately but carefully
    this._authStateSubscription = authState(this.auth).subscribe(async (firebaseUser) => {
      console.log(
        'Auth State geändert:',
        firebaseUser ? `Benutzer angemeldet (${firebaseUser.uid})` : 'Nicht angemeldet'
      );

      // If there's no Firebase user but we have a saved user ID, wait a moment 
      // before considering the user as logged out
      if (!firebaseUser && localStorage.getItem('user_id')) {
        console.log('Firebase user is null but saved user ID exists - waiting to see if auth initializes');
        
        // Give Firebase a chance to restore authentication
        setTimeout(async () => {
          // Check again if the user is still null after the timeout
          if (!this.auth.currentUser) {
            console.log('After waiting, user is still not authenticated');
            this._currentUser.set(null);
            
            // Only redirect if not on an auth-related page
            const currentUrl = this.router.url;
            if (!currentUrl.includes('/login') && 
                !currentUrl.includes('/register') && 
                !currentUrl.includes('/verify-email') &&
                !currentUrl.includes('/reset-password')) {
              this.router.navigate(['/login']);
            }
          } else {
            console.log('User authenticated after timeout');
          }
        }, 2000); // Wait 2 seconds for Firebase to initialize
        
        return; // Exit early to give Firebase a chance
      }

      if (firebaseUser) {
        try {
          // Benutzerdaten aus Firestore laden
          console.log('Versuche Benutzerdaten zu laden für UID:', firebaseUser.uid);
            
          // Log the token for debugging
          const token = await firebaseUser.getIdToken(true); // Force refresh token
          console.log('Auth token available:', !!token);
          
          const userDoc = await this.firebaseService.query<User>(
            'users',
            'uid',
            '==',
            firebaseUser.uid
          );

          if (userDoc && userDoc.length > 0) {
            const user = userDoc[0];
            console.log('Benutzerdaten geladen:', user);
            console.log('Benutzerrolle:', user.role);
            this._currentUser.set(user);
            localStorage.setItem('user_id', firebaseUser.uid);
          } else {
            // Create with retry logic if first attempt fails
            await this.createUserDocumentWithRetry(firebaseUser);
          }
        } catch (error) {
          console.error('Fehler beim Laden der Benutzerdaten:', error);
            
          // Try to create user document if query failed
          try {
            await this.createUserDocumentWithRetry(firebaseUser);
          } catch (createError) {
            console.error('Fehler beim Erstellen des Benutzerdokuments:', createError);
            this._error.set('Fehler beim Laden der Benutzerdaten. Bitte neu anmelden.');
            await this.logout();
          }
        }
      } else {
        // Benutzer ist nicht angemeldet
        console.log('Benutzer abgemeldet');
        this._currentUser.set(null);
        localStorage.removeItem('user_id');
        
        // Only redirect to login if we're not already on the login or related pages
        const currentUrl = this.router.url;
        if (!currentUrl.includes('/login') && 
            !currentUrl.includes('/register') && 
            !currentUrl.includes('/verify-email') &&
            !currentUrl.includes('/reset-password')) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  /**
   * Creates a user document with retry logic
   * @param firebaseUser The Firebase user object
   * @private
   */
  private async createUserDocumentWithRetry(firebaseUser: FirebaseUser, retries = 3): Promise<void> {
    try {
      console.log('Erstelle neues Benutzerdokument für:', firebaseUser.uid);
      
      // First check if the user document already exists to prevent duplicates
      const existingUsers = await this.firebaseService.query<User>(
        'users',
        'uid',
        '==',
        firebaseUser.uid
      );
      
      if (existingUsers && existingUsers.length > 0) {
        console.log('Benutzerdokument existiert bereits, verwende vorhandenes');
        this._currentUser.set(existingUsers[0]);
        localStorage.setItem('user_id', firebaseUser.uid);
        return;
      }
      
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        role: 'leserecht', // Standardrolle
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date() // Add createdAt field for consistency
      };

      // Use the specialized method for adding user documents
      await this.firebaseService.addUserDocument(newUser);
      console.log('Benutzerdokument erfolgreich erstellt');
      
      // Update local state
      this._currentUser.set(newUser);
      localStorage.setItem('user_id', firebaseUser.uid);
    } catch (error) {
      console.error(`Fehler beim Erstellen des Benutzerdokuments (Versuch ${4 - retries}/3):`, error);
      
      if (retries > 0) {
        console.log(`Wiederhole in 1 Sekunde...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.createUserDocumentWithRetry(firebaseUser, retries - 1);
      }
      
      throw error;
    }
  }

  /**
   * Handle Firebase errors with better logging and user feedback
   * @param error The Firebase error
   * @param operation The name of the operation that failed
   * @private
   */
  private handleAuthError(error: any, operation: string): void {
    console.error(`${operation} error:`, error);
    
    let message = 'Ein unbekannter Fehler ist aufgetreten';
    
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      message = 'Fehlende Berechtigungen. Sie haben nicht die nötigen Rechte für diese Aktion.';
    }
    
    this._error.set(message);
  }

  /**
   * Anmeldung mit E-Mail und Passwort
   * @param email E-Mail-Adresse
   * @param password Passwort
   * @returns Promise mit UserCredential
   */
  async login(email: string, password: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Ensure persistence is set to local
      await this.setPersistenceToLocal();

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      localStorage.setItem('user_id', userCredential.user.uid);

      if (!userCredential.user) {
        throw new Error('Authentication failed');
      }

      // Check email verification
      if (!userCredential.user.emailVerified) {
        console.log('User email not verified, redirecting to verification page');
        this._error.set('E-Mail-Adresse nicht bestätigt. Bitte überprüfen Sie Ihr E-Mail-Postfach.');
        
        // Redirect to verify email page before logout to preserve the auth context
        this.router.navigate(['/verify-email'], { 
          queryParams: { email: email }
        });
        
        // Logout after navigation
        await this.logout();
        return;
      }

      console.log('Login successful, email is verified');
      // User is authenticated, state service will handle the user state
    } catch (error: any) {
      console.error('Login error:', error);
      
      let message = 'Anmeldung fehlgeschlagen';
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Ungültige E-Mail-Adresse';
          break;
        case 'auth/user-disabled':
          message = 'Benutzer deaktiviert';
          break;
        case 'auth/user-not-found':
          message = 'Benutzer nicht gefunden';
          break;
        case 'auth/wrong-password':
          message = 'Falsches Passwort';
          break;
        case 'auth/too-many-requests':
          message = 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuchen Sie es später erneut.';
          break;
      }
      
      this._error.set(message);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Registrierung eines neuen Benutzers
   * @param email E-Mail-Adresse
   * @param password Passwort
   * @param displayName Anzeigename
   * @param role Rolle des Benutzers
   * @returns Promise mit UserCredential
   */
  async register(
    email: string,
    password: string,
    displayName: string = '',
    role: User['role'] = 'leserecht'
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      console.log('Starting user registration for email:', email);
      
      // Benutzer in Firebase Authentication erstellen
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      console.log('Firebase auth user created, uid:', firebaseUser.uid);

      // Anzeigename setzen - await here to ensure it completes
      if (displayName) {
        await updateProfile(firebaseUser, { displayName });
        console.log('User profile updated with displayName:', displayName);
      }

      // Check if user document already exists to prevent duplicates
      const existingUsers = await this.firebaseService.query<User>(
        'users',
        'uid',
        '==',
        firebaseUser.uid
      );
      
      let userId: string | undefined;
      
      if (existingUsers && existingUsers.length > 0) {
        console.log('User document already exists during registration, updating it');
        const existingUser = existingUsers[0];
        if (existingUser.id) {
          await this.firebaseService.update('users', existingUser.id, {
            displayName: displayName,
            role: role,
            emailVerified: false, // Ensure email verification status is updated
            registrationDate: new Date(),
            notificationSent: false // Flag for notification tracking
          });
          userId = existingUser.id;
        }
      } else {
        // Benutzerdaten in Firestore speichern
        const newUser: User = {
          uid: firebaseUser.uid,
          email: email,
          displayName: displayName,
          role: role,
          emailVerified: false,
          createdAt: new Date(),
          registrationDate: new Date(),
          notificationSent: false // Flag for notification tracking
        };

        console.log('Adding user document to Firestore');
        // Use the specialized method for adding user documents during registration
        userId = await this.firebaseService.addUserDocument(newUser);
        console.log('User document added to Firestore with ID:', userId);
      }

      // Send verification email
      await this.sendEmailVerification(firebaseUser);
      console.log('Verification email sent');
      
      // Create a notification document for admin
      if (userId) {
        await this.createAdminNotification(userId, email, displayName || 'N/A');
      }
      
      // Sign out the user immediately after registration
      // They need to verify their email first
      await this.logout();
      console.log('User logged out after registration');
      
      // Redirect to verify email page with their email prefilled
      this.router.navigate(['/verify-email'], { 
        queryParams: { email: email }
      });
      
      return;
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let message = 'Registrierung fehlgeschlagen';
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'E-Mail-Adresse bereits registriert';
          break;
        case 'auth/invalid-email':
          message = 'Ungültige E-Mail-Adresse';
          break;
        case 'auth/weak-password':
          message = 'Passwort zu schwach';
          break;
        case 'auth/operation-not-allowed':
          message = 'Registrierung nicht erlaubt';
          break;
      }
      
      this._error.set(message);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Create an admin notification document for a new user registration
   * @param userId The ID of the user document
   * @param email The email of the new user
   * @param displayName The display name of the new user
   */
  private async createAdminNotification(userId: string, email: string, displayName: string): Promise<void> {
    try {
      await this.firebaseService.add('admin_notifications', {
        type: 'new_user',
        userId: userId,
        email: email,
        displayName: displayName,
        createdAt: new Date(),
        processed: false,
        adminEmail: 'marco-ammann@outlook.com' // The admin email to notify
      });
      console.log('Admin notification created for new user registration');
    } catch (error) {
      console.error('Error creating admin notification:', error);
    }
  }

  /**
   * Benutzer abmelden und zum Login-Bildschirm zurückleiten
   * @returns Promise<void>
   */
  async logout(): Promise<void> {
    console.log('Starting logout process');
    try {
      // Clear all user-related data from local storage
      localStorage.removeItem('user_id');
      localStorage.removeItem('returnUrl'); 
      
      // Sign out from Firebase
      console.log('Signing out from Firebase');
      await signOut(this.auth);
      
      // Reset the current user in our service
      this._currentUser.set(null);
      
      // Show success message to user
      this.snackBar.open('Sie wurden erfolgreich abgemeldet', 'Schließen', {
        duration: 3000
      });
      
      console.log('Logout successful, redirecting to login page');
    } catch (error) {
      console.error('Error during logout:', error);
      this.snackBar.open('Fehler beim Abmelden. Bitte versuchen Sie es erneut.', 'OK', {
        duration: 5000
      });
    } finally {
      // Always try to redirect to login, even if there were errors
      this.router.navigate(['/login']);
    }
  }

  /**
   * Aktualisiert die Rolle eines Benutzers
   * @param uid Benutzer-ID
   * @param newRole Neue Rolle
   * @returns Promise<void>
   */
  async updateUserRole(uid: string, newRole: User['role']): Promise<void> {
    try {
      const users = await this.firebaseService.query<User>(
        'users',
        'uid',
        '==',
        uid
      );

      if (users && users.length > 0) {
        const user = users[0];
        if (user.id) {
          await this.firebaseService.update('users', user.id, { role: newRole });

          // Aktualisiere den aktuellen Benutzer, falls dieser betroffen ist
          const currentUser = this._currentUser();
          if (currentUser && currentUser.uid === uid) {
            this._currentUser.update((user) =>
              user ? { ...user, role: newRole } : null
            );
          }
        } else {
          console.error('Cannot update user role: User document has no id field');
        }
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Benutzerrolle:', error);
      throw error;
    }
  }

  /**
   * Debug method to log the current auth state
   */
  public logAuthState(): void {
    const user = this.currentUser();
    console.log('Current Auth State:', {
      authenticated: this.isAuthenticated(),
      user: user ? {
        uid: user.uid,
        email: user.email,
        role: user.role,
        displayName: user.displayName
      } : null,
      token: this.auth.currentUser ? 'available' : 'not available'
    });
  }

  /**
   * Setzt den Fehlerstatus zurück
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Send a verification email to the user
   */
  async sendEmailVerification(user: FirebaseUser): Promise<void> {
    this._error.set(null);
    
    try {
      await sendEmailVerification(user);
    } catch (error: any) {
      console.error('Email verification error:', error);
      this._error.set('Fehler beim Senden der Bestätigungs-E-Mail');
      throw error;
    }
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    this._error.set(null);
    
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let message = 'Fehler beim Zurücksetzen des Passworts';
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Ungültige E-Mail-Adresse';
          break;
        case 'auth/user-not-found':
          message = 'Benutzer nicht gefunden';
          break;
      }
      
      this._error.set(message);
      throw error;
    }
  }

  /**
   * Confirm a password reset
   */
  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    this._error.set(null);
    
    try {
      await confirmPasswordReset(this.auth, code, newPassword);
    } catch (error: any) {
      console.error('Password reset confirmation error:', error);
      this._error.set('Fehler beim Bestätigen des neuen Passworts');
      throw error;
    }
  }

  /**
   * Verify a password reset code
   */
  async verifyPasswordResetCode(code: string): Promise<string> {
    this._error.set(null);
    
    try {
      return await verifyPasswordResetCode(this.auth, code);
    } catch (error: any) {
      console.error('Password reset code verification error:', error);
      this._error.set('Ungültiger oder abgelaufener Code');
      throw error;
    }
  }

  /**
   * Apply an action code (email verification, password reset, etc.)
   */
  async applyActionCode(code: string): Promise<void> {
    this._error.set(null);
    
    try {
      await applyActionCode(this.auth, code);
    } catch (error: any) {
      console.error('Action code application error:', error);
      this._error.set('Ungültiger oder abgelaufener Code');
      throw error;
    }
  }

  /**
   * Update a user's password
   */
  async updatePassword(user: FirebaseUser, newPassword: string): Promise<void> {
    this._error.set(null);
    
    try {
      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error('Password update error:', error);
      this._error.set('Fehler bei der Aktualisierung des Passworts');
      throw error;
    }
  }

  /**
   * Resend verification email to a user
   * This attempts to sign in the user first to get their credentials,
   * then sends a verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    this._error.set(null);
    
    try {
      // Try to find the user
      const methods = await fetchSignInMethodsForEmail(this.auth, email);
      
      if (methods && methods.length > 0) {
        // User exists, but we need to have a user object to send the verification email
        // We'll use a temporary login without password to access the API
        
        // First, send a password reset email which will also verify the email exists
        await sendPasswordResetEmail(this.auth, email);
        
        this.snackBar.open(
          'Wir haben Ihnen eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts gesendet. ' + 
          'Nachdem Sie Ihr Passwort zurückgesetzt haben, können Sie sich anmelden.',
          'Schließen',
          { duration: 8000 }
        );
      } else {
        this._error.set('Die E-Mail-Adresse ist nicht registriert.');
      }
    } catch (error: any) {
      console.error('Resend verification email error:', error);
      this._error.set('Fehler beim Senden der Bestätigungs-E-Mail.');
      throw error;
    }
  }

  /**
   * Update the user's last activity timestamp
   * This helps track when users are active
   */
  async updateLastActiveTime(): Promise<void> {
    try {
      const currentUser = this._currentUser();
      if (currentUser && currentUser.id) {
        await this.firebaseService.update('users', currentUser.id, { 
          lastLogin: new Date(),
          lastActive: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating user activity time:', error);
    }
  }
}
