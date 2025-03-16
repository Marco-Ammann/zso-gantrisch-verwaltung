import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { initializeApp } from '@angular/fire/app';
import { getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { getStorage, connectStorageEmulator } from '@angular/fire/storage';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

// Firebase modules
import { provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore } from '@angular/fire/firestore';
import { provideAuth } from '@angular/fire/auth';
import { provideStorage } from '@angular/fire/storage';

// This app config ensures that Firebase auth is properly initialized
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    
    // Initialize Firebase app
    provideFirebaseApp(() => {
      const app = initializeApp(environment.firebase);
      return app;
    }),
    
    // Provide Firestore
    provideFirestore(() => {
      const firestore = getFirestore();
      if (environment.useEmulators && environment.emulators) {
        const firestoreHost = environment.emulators.firestore.split(':')[0];
        const firestorePort = parseInt(environment.emulators.firestore.split(':')[1]);
        connectFirestoreEmulator(firestore, firestoreHost, firestorePort);
      }
      return firestore;
    }),
    
    // Provide Auth with persistence setup
    provideAuth(() => {
      const auth = getAuth();
      
      if (environment.useEmulators && environment.emulators) {
        connectAuthEmulator(auth, environment.emulators.auth);
      }
      return auth;
    }),
    
    // Provide Storage
    provideStorage(() => {
      const storage = getStorage();
      if (environment.useEmulators && environment.emulators) {
        const storageHost = environment.emulators.storage.split(':')[0];
        const storagePort = parseInt(environment.emulators.storage.split(':')[1]);
        connectStorageEmulator(storage, storageHost, storagePort);
      }
      return storage;
    })
  ],
};