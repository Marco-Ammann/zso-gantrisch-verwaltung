// src/app/auth/services/auth-state.service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private auth = inject(Auth); // Hier nutzen wir Angular Fire's Auth-Injektion
  private authStateSubject = new BehaviorSubject<boolean | null>(null);
  public authState$ = this.authStateSubject.asObservable();

  constructor() {
    // Abonniere den Auth-Status direkt von Angular Fire
    authState(this.auth).subscribe(user => {
      console.log('Auth State geändert in AuthStateService:', user ? 'angemeldet' : 'nicht angemeldet');
      this.authStateSubject.next(!!user);
    });
  }

  get isAuthenticated(): Observable<boolean | null> {
    return this.authState$;
  }
}