import { ApplicationConfig } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';

// Neue Importe für den DateAdapter
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { provideNativeDateAdapter } from '@angular/material/core';
// ODER wenn du den CustomDateAdapter verwenden willst:
// import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
// import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from './core/utils/custom-date-adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    // Router-Konfiguration mit View-Übergängen
    provideRouter(routes, withViewTransitions()),
    
    // Animationen aktivieren
    provideAnimations(),
    
    // Firebase-Konfiguration
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    
    // Service Worker für PWA
    provideServiceWorker('ngsw-worker.js', {
      enabled: !environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    }),

    // Hinzufügen des NativeDateAdapter
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'de-CH' },

    // ODER für den CustomDateAdapter:
    // { provide: DateAdapter, useClass: CustomDateAdapter, deps: [MAT_DATE_LOCALE] },
    // { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS },
    // { provide: MAT_DATE_LOCALE, useValue: 'de-CH' }
  ]
};