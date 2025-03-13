import { Injectable, inject, signal, computed } from '@angular/core';
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
} from '@angular/fire/auth';
import { toObservable } from '@angular/core/rxjs-interop';
import { User } from '../../core/models/user.model';
import { FirebaseService } from '../../core/services/firebase.service';
import { Router } from '@angular/router';

/**
 * Service für die Authentifizierung und Benutzerverwaltung
 * Verwendet Signal-basierte Reaktivität
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);

  // Private Signals für den internen Zustand
  private _currentUser = signal<User | null>(null);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Öffentliche computed Signals für Komponenten
  public currentUser = computed(() => this._currentUser());
  public isAuthenticated = computed(() => !!this._currentUser());
  public isLoading = computed(() => this._isLoading());
  public error = computed(() => this._error());

  // Benutzerrolle als computed Signal
  public userRole = computed(() => this._currentUser()?.role || null);

  // Zugriffsberechtigungen basierend auf der Rolle
  public canEdit = computed(() => {
    const role = this.userRole();
    return role === 'admin' || role === 'oberleutnant' || role === 'leutnant';
  });

  public canDelete = computed(() => {
    const role = this.userRole();
    return role === 'admin' || role === 'oberleutnant';
  });

  public isAdmin = computed(() => this.userRole() === 'admin');

  // Umwandlung des Signals in ein Observable für Komponenten, die Observables benötigen
  public currentUser$ = toObservable(this.currentUser);
  public isAuthenticated$ = toObservable(this.isAuthenticated);

  constructor() {
    // Konfiguriere den Auth-Service
    try {
      const auth = this.auth;
      // Hier können wir auf das Auth-Objekt zugreifen, das von Angular Fire bereitgestellt wird
      console.log('Auth Service initialisiert');

      // Authentifizierungsstatus überwachen
      this.initAuthListener();
    } catch (error) {
      console.error('Fehler bei der Auth-Service-Initialisierung:', error);
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
      console.log(
        'Benutzer-ID im localStorage gefunden, Benutzer gilt als angemeldet'
      );
    }

    // Verzögerung einbauen, um sicherzustellen, dass Firebase vollständig initialisiert ist
    setTimeout(() => {
      authState(this.auth).subscribe(async (firebaseUser) => {
        console.log(
          'Auth State geändert:',
          firebaseUser ? 'Benutzer angemeldet' : 'Nicht angemeldet'
        );

        if (firebaseUser) {
          // Benutzerdaten aus Firestore laden
          try {
            const userDoc = await this.firebaseService.query<User>(
              'users',
              'uid',
              '==',
              firebaseUser.uid
            );

            if (userDoc && userDoc.length > 0) {
              console.log('Benutzerdaten geladen:', userDoc[0]);
              this._currentUser.set(userDoc[0]);
            } else {
              // Wenn kein Benutzerdokument gefunden wurde, erstelle eines mit Standardrolle
              const newUser: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || '',
                role: 'leserecht', // Standardrolle
              };

              await this.firebaseService.add('users', newUser);
              this._currentUser.set(newUser);
            }
          } catch (error) {
            console.error('Fehler beim Laden der Benutzerdaten:', error);
            this._error.set('Fehler beim Laden der Benutzerdaten');
          }
        } else {
          // Benutzer ist nicht angemeldet
          console.log('Benutzer abgemeldet');
          this._currentUser.set(null);
        }
      });
    }, 500); // 500ms Verzögerung
  }

  /**
   * Anmeldung mit E-Mail und Passwort
   * @param email E-Mail-Adresse
   * @param password Passwort
   * @returns Promise mit UserCredential
   */
  async login(email: string, password: string): Promise<UserCredential> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Hier nutzen wir direkt den Browser Local Persistence beim Anmelden
      const auth = getAuth();
      await setPersistence(auth, browserLocalPersistence);

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      localStorage.setItem('user_id', userCredential.user.uid);
      return userCredential;
    } catch (error: any) {
      let errorMessage = 'Anmeldung fehlgeschlagen';

      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        errorMessage = 'E-Mail oder Passwort ungültig';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage =
          'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.';
      }

      this._error.set(errorMessage);
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
    displayName: string,
    role: User['role'] = 'leserecht'
  ): Promise<UserCredential> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Benutzer in Firebase Authentication erstellen
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Anzeigename setzen
      await updateProfile(firebaseUser, { displayName });

      // Benutzerdaten in Firestore speichern
      const newUser: User = {
        uid: firebaseUser.uid,
        email: email,
        displayName: displayName,
        role: role,
      };

      await this.firebaseService.add('users', newUser);

      return userCredential;
    } catch (error: any) {
      let errorMessage = 'Registrierung fehlgeschlagen';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Diese E-Mail-Adresse wird bereits verwendet';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Ungültige E-Mail-Adresse';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Das Passwort ist zu schwach';
      }

      this._error.set(errorMessage);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Benutzer abmelden
   * @returns Promise<void>
   */
  async logout(): Promise<void> {
    try {
      localStorage.removeItem('user_id');
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
      throw error;
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
      const users = await this.firebaseService.query<User & { id: string }>(
        'users',
        'uid',
        '==',
        uid
      );

      if (users && users.length > 0) {
        const user = users[0];
        await this.firebaseService.update('users', user.id, { role: newRole });

        // Aktualisiere den aktuellen Benutzer, falls dieser betroffen ist
        const currentUser = this._currentUser();
        if (currentUser && currentUser.uid === uid) {
          this._currentUser.update((user) =>
            user ? { ...user, role: newRole } : null
          );
        }
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Benutzerrolle:', error);
      throw error;
    }
  }

  /**
   * Prüft, ob der aktuelle Benutzer eine bestimmte Rolle hat
   * @param roles Array von zulässigen Rollen
   * @returns boolean
   */
  hasRole(roles: User['role'][]): boolean {
    const currentRole = this.userRole();
    return currentRole ? roles.includes(currentRole) : false;
  }

  /**
   * Setzt den Fehlerstatus zurück
   */
  clearError(): void {
    this._error.set(null);
  }
}
