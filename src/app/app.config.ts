import { ApplicationConfig } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

// Firebase modules - without emulator connections
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideStorage, getStorage } from '@angular/fire/storage';

// This app config ensures that Firebase auth is properly initialized
export const appConfig: ApplicationConfig = {
  providers: [
    // Improve router configuration to reduce caching issues
    provideRouter(routes, withRouterConfig({
      paramsInheritanceStrategy: 'always',
      onSameUrlNavigation: 'reload', 
      canceledNavigationResolution: 'replace'
    })),
    provideAnimations(),
    
    // Initialize Firebase app with safer error handling
    provideFirebaseApp(() => {
      try {
        console.log('Initializing Firebase app...');
        const app = initializeApp(environment.firebase);
        console.log('Firebase app initialized successfully');
        return app;
      } catch (error) {
        console.error('Failed to initialize Firebase app:', error);
        // Re-throw to ensure Angular knows initialization failed
        throw error;
      }
    }),
    
    // Provide Firestore with error handling
    provideFirestore(() => {
      try {
        console.log('Initializing Firestore...');
        const firestore = getFirestore();
        console.log('Firestore initialized successfully');
        return firestore;
      } catch (error) {
        console.error('Failed to initialize Firestore:', error);
        throw error;
      }
    }),
    
    // Provide Auth without emulator setup
    provideAuth(() => {
      try {
        console.log('Initializing Auth...');
        const auth = getAuth();
        console.log('Auth initialized successfully');
        return auth;
      } catch (error) {
        console.error('Failed to initialize Auth:', error);
        throw error;
      }
    }),
    
    // Provide Storage without emulator setup
    provideStorage(() => {
      try {
        console.log('Initializing Storage...');
        const storage = getStorage();
        console.log('Storage initialized successfully');
        return storage;
      } catch (error) {
        console.error('Failed to initialize Storage:', error);
        throw error;
      }
    })
  ],
};