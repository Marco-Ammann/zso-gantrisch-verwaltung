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

export const appConfig: ApplicationConfig = {
  providers: [
    // Router-Konfiguration mit View-Übergängen
    provideRouter(routes, withViewTransitions()),
    
    // Animationen aktivieren
    provideAnimations(),
    
    
    // Firebase-Konfiguration - direkt in die Provider-Liste einfügen
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    // Service Worker für PWA
    provideServiceWorker('ngsw-worker.js', {
      enabled: !environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ]
};