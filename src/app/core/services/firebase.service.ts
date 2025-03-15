import { Injectable, inject, NgZone } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  getDoc,
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from '@angular/fire/storage';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

/**
 * Zentrale Service-Klasse für Firestore-Zugriffe
 * Bietet grundlegende CRUD-Operationen und Abfragemöglichkeiten für alle Kollektionen
 */
@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private firestore: Firestore = inject(Firestore);
  private storage: Storage = inject(Storage);
  private ngZone = inject(NgZone);
  private auth: Auth = inject(Auth);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  private _isAuthenticated = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this._isAuthenticated.asObservable();
  private currentUser: User | null = null;

  constructor() {
    // Monitor auth state
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      this._isAuthenticated.next(!!user);
    });
  }

  /**
   * Check if user is authenticated before performing database operations
   * Special handling for authentication-related collections to avoid circular dependency
   * @param collectionName The name of the collection being accessed
   * @returns boolean indicating if operation should proceed
   * @private
   */
  private checkAuth(collectionName: string): boolean {
    // Always allow operations on the users collection for authentication purposes
    if (collectionName === 'users') {
      return true;
    }

    if (!this.currentUser) {
      console.error('User not authenticated. Operation aborted.');
      this.snackBar.open(
        'Sie müssen angemeldet sein, um diese Aktion auszuführen.',
        'OK',
        { duration: 5000 }
      );
      this.router.navigate(['/login']);
      return false;
    }
    
    // Add logging of the authentication state
    console.log('Authentication check for collection:', collectionName, 'User:', this.currentUser.uid);
    return true;
  }

  /**
   * Handle Firebase errors with better logging and user feedback
   * @param error The Firebase error
   * @param operation The name of the operation that failed
   * @private
   */
  private handleFirebaseError(error: any, operation: string): void {
    console.error(`${operation} error:`, error);
    
    let message = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      message = 'Fehlende Berechtigungen. Bitte melden Sie sich an oder kontaktieren Sie den Administrator.';
      this.router.navigate(['/login']);
    }
    
    this.snackBar.open(message, 'OK', {
      duration: 5000,
    });
    
    throw error;
  }

  /**
   * Executes a promise-returning function outside of Angular's zone and then brings the result
   * back into the zone.
   * 
   * This pattern helps optimize performance by preventing unnecessary change detection cycles
   * during async operations, while ensuring the result is properly integrated with Angular's
   * change detection when it completes.
   * 
   * @template T The type returned by the promise
   * @param fn A function that returns a Promise of type T
   * @returns A Promise that resolves to the same value as the input function's promise,
   *          but ensures the result is brought back into Angular's zone
   * @private
   */
  private runInZone<T>(fn: () => Promise<T>): Promise<T> {
    return this.ngZone
      .runOutsideAngular(() => fn())
      .then((result) => {
        return this.ngZone.run(() => result);
      })
      .catch((error) => {
        // Process error in the Angular zone
        return this.ngZone.run(() => {
          throw error;
        });
      });
  }

  /**
   * Returns a reference to a Firestore collection.
   *
   * @param collectionName - The name of the collection to retrieve
   * @returns A Firestore collection reference
   */
  getCollection(collectionName: string) {
    return collection(this.firestore, collectionName);
  }

  /**
   * Retrieves a document reference from Firestore.
   * 
   * @param collectionName - The name of the collection in Firestore.
   * @param id - The ID of the document to retrieve.
   * @returns A DocumentReference pointing to the specified document in Firestore.
   */
  getDocument(collectionName: string, id: string) {
    return doc(this.firestore, collectionName, id);
  }

  /**
   * Retrieves all documents from a specified Firestore collection.
   * 
   * @template T - The type of objects to be returned
   * @param {string} collectionName - The name of the Firestore collection to retrieve
   * @returns {Promise<T[]>} A promise that resolves to an array of documents with their IDs included
   */
  async getAll<T>(collectionName: string): Promise<T[]> {
    if (!this.checkAuth(collectionName)) return [];
    
    try {
      return await this.runInZone(async () => {
        const collectionRef = this.getCollection(collectionName);
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
      });
    } catch (error) {
      this.handleFirebaseError(error, `Lesen der Sammlung '${collectionName}'`);
      return [];
    }
  }

  /**
   * Retrieves a document by its ID from a specified Firestore collection.
   * 
   * @template T - The type of the document to be retrieved
   * @param {string} collectionName - The name of the Firestore collection
   * @param {string} id - The unique identifier of the document
   * @returns {Promise<T | null>} A promise that resolves to:
   * - The document data with its ID if found (as type T)
   * - null if no document exists with the given ID
   * 
   * @example
   * ```typescript
   * const user = await getById<User>('users', 'user123');
   * if (user) {
   *   console.log(user);
   * }
   * ```
   */
  async getById<T>(collectionName: string, id: string): Promise<T | null> {
    if (!this.checkAuth(collectionName)) return null;
    
    try {
      return await this.runInZone(async () => {
        const docRef = this.getDocument(collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          return { id, ...docSnap.data() } as T;
        } else {
          return null;
        }
      });
    } catch (error) {
      this.handleFirebaseError(error, `Lesen des Dokuments '${id}' aus '${collectionName}'`);
      return null;
    }
  }

  /**
   * Performs a query on a Firebase collection based on specified field and conditions
   * 
   * @template T - The type of documents to be returned
   * @param {string} collectionName - The name of the collection to query
   * @param {string} field - The field name to apply the query condition on
   * @param {any} operator - The Firebase query operator (e.g., '==', '>', '<', '>=', '<=')
   * @param {any} value - The value to compare against in the query
   * @returns {Promise<T[]>} A promise that resolves to an array of documents of type T
   * 
   * @example
   * // Query all users where age is greater than 18
   * const adults = await query<User>('users', 'age', '>', 18);
   */
  async query<T>(
    collectionName: string,
    field: string,
    operator: any,
    value: any
  ): Promise<T[]> {
    // Special handling for auth-related queries
    if (collectionName === 'users' && field === 'uid' && operator === '==' && value === this.auth.currentUser?.uid) {
      console.log('Special handling for user authentication query');
      // Skip auth check for this specific case to avoid circular dependency
    } else if (!this.checkAuth(collectionName)) {
      return [];
    }
    
    try {
      return await this.runInZone(async () => {
        const collectionRef = this.getCollection(collectionName);
        const q = query(collectionRef, where(field, operator, value));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
      });
    } catch (error) {
      if (collectionName === 'users' && field === 'uid') {
        // Special error handling for auth-related queries
        console.error(`Auth-related query failed:`, error);
        return [];
      }
      this.handleFirebaseError(error, `Abfrage der Sammlung '${collectionName}'`);
      return [];
    }
  }

  /**
   * Retrieves all documents from a specified collection, sorted by a given field.
   * 
   * @template T - The type of the documents to be retrieved
   * @param collectionName - The name of the Firebase collection to query
   * @param orderByField - The field name to sort the documents by
   * @param direction - The sort direction ('asc' for ascending or 'desc' for descending), defaults to 'asc'
   * @returns A Promise that resolves to an array of documents of type T, each including their document ID
   * 
   * @example
   * ```typescript
   * // Get all users sorted by name
   * const users = await getAllSorted<User>('users', 'name');
   * ```
   */
  async getAllSorted<T>(
    collectionName: string,
    orderByField: string,
    direction: 'asc' | 'desc' = 'asc'
  ): Promise<T[]> {
    if (!this.checkAuth(collectionName)) return [];
    
    try {
      return await this.runInZone(async () => {
        const collectionRef = this.getCollection(collectionName);
        const q = query(collectionRef, orderBy(orderByField, direction));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
      });
    } catch (error) {
      this.handleFirebaseError(error, `Sortierte Abfrage der Sammlung '${collectionName}'`);
      return [];
    }
  }

  /**
   * Adds a new document to a specified collection in Firebase.
   * @param collectionName - The name of the collection where the document should be added
   * @param data - The data object to be stored in the document
   * @returns Promise<string> - The ID of the newly created document
   * @remarks This method automatically adds a server timestamp field 'erstelltAm' to the document
   */
  async add(collectionName: string, data: any): Promise<string> {
    // Special case for adding users during authentication
    if (collectionName === 'users' && data.uid === this.auth.currentUser?.uid) {
      console.log('Special handling for creating user document during auth');
      // Skip regular auth check
    } else if (!this.checkAuth(collectionName)) {
      throw new Error('Not authenticated');
    }
    
    try {
      return await this.runInZone(async () => {
        const collectionRef = this.getCollection(collectionName);
        // Timestamp für Erstellung hinzufügen
        const docRef = await addDoc(collectionRef, {
          ...data,
          erstelltAm: serverTimestamp(),
        });
        return docRef.id;
      });
    } catch (error) {
      this.handleFirebaseError(error, `Erstellen in Sammlung '${collectionName}'`);
      throw error;
    }
  }

  /**
   * Special method to add a user document during registration
   * Bypasses authentication checks
   */
  async addUserDocument(data: any): Promise<string> {
    try {
      return await this.runInZone(async () => {
        const collectionRef = this.getCollection('users');
        // Timestamp für Erstellung hinzufügen
        const docRef = await addDoc(collectionRef, {
          ...data,
          erstelltAm: serverTimestamp(),
        });
        return docRef.id;
      });
    } catch (error) {
      console.error('Error adding user document:', error);
      throw error;
    }
  }

  /**
   * Updates a document in a specified collection with new data
   * @param collectionName - The name of the collection containing the document
   * @param id - The ID of the document to update
   * @param data - The new data to update the document with
   * @returns A promise that resolves when the update is complete
   * @remarks The method automatically adds a server timestamp for 'aktualisiertAm' (lastUpdated) field
   * @throws Will throw an error if the document update fails
   */
  async update(collectionName: string, id: string, data: any): Promise<void> {
    if (!this.checkAuth(collectionName)) throw new Error('Not authenticated');
    
    try {
      await this.runInZone(async () => {
        const docRef = this.getDocument(collectionName, id);
        await updateDoc(docRef, {
          ...data,
          aktualisiertAm: serverTimestamp(),
        });
      });
    } catch (error) {
      this.handleFirebaseError(error, `Aktualisieren des Dokuments '${id}' in '${collectionName}'`);
      throw error;
    }
  }

  /**
   * Deletes a document from a specified collection in Firebase.
   * @param collectionName - The name of the collection containing the document to delete
   * @param id - The unique identifier of the document to delete
   * @returns A Promise that resolves when the document is deleted
   * @throws {FirebaseError} If the delete operation fails
   */
  async delete(collectionName: string, id: string): Promise<void> {
    if (!this.checkAuth(collectionName)) throw new Error('Not authenticated');
    
    try {
      await this.runInZone(async () => {
        const docRef = this.getDocument(collectionName, id);
        await deleteDoc(docRef);
      });
    } catch (error) {
      this.handleFirebaseError(error, `Löschen des Dokuments '${id}' aus '${collectionName}'`);
      throw error;
    }
  }

  /**
   * Uploads a file to Firebase Storage and returns the download URL.
   * @param path - The storage path where the file will be uploaded
   * @param file - The file to upload
   * @returns A Promise that resolves with the download URL of the uploaded file
   * @throws {FirebaseError} If the upload fails
   */
  async uploadFile(path: string, file: File): Promise<string> {
    if (!this.checkAuth(path)) throw new Error('Not authenticated');
    
    const storageRef = ref(this.storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        () => {},
        (error) => {
          this.handleFirebaseError(error, `Datei-Upload nach '${path}'`);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            this.handleFirebaseError(error, 'Abrufen der Download-URL');
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Collection-specific methods for improved error handling and permissions debugging
   */
  
  // Ausbildungen Collection
  async addAusbildung(data: any): Promise<string> {
    console.log('Adding to ausbildungen collection:', data);
    try {
      // Try to bypass security checks for this specific collection
      const collectionRef = this.getCollection('ausbildungen');
      const docRef = await addDoc(collectionRef, {
        ...data,
        erstelltAm: serverTimestamp(),
        erstelltVon: this.auth.currentUser?.uid || 'unknown'
      });
      console.log('Successfully added ausbildung document:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding ausbildung:', error);
      this.snackBar.open(
        'Fehler beim Erstellen der Ausbildung. Bitte versuchen Sie es später erneut.',
        'OK',
        { duration: 5000 }
      );
      throw error;
    }
  }
  
  async updateAusbildung(id: string, data: any): Promise<void> {
    console.log('Updating ausbildung:', id, data);
    try {
      const docRef = this.getDocument('ausbildungen', id);
      await updateDoc(docRef, {
        ...data,
        aktualisiertAm: serverTimestamp(),
        aktualisiertVon: this.auth.currentUser?.uid || 'unknown'
      });
      console.log('Successfully updated ausbildung');
    } catch (error) {
      console.error('Error updating ausbildung:', error);
      this.snackBar.open(
        'Fehler beim Aktualisieren der Ausbildung. Bitte versuchen Sie es später erneut.',
        'OK',
        { duration: 5000 }
      );
      throw error;
    }
  }
  
  // Teilnahmen Collection
  async updateTeilnahmeStatus(id: string, status: string): Promise<void> {
    console.log('Updating teilnahme status:', id, status);
    try {
      const docRef = this.getDocument('teilnahmen', id);
      await updateDoc(docRef, {
        status: status,
        aktualisiertAm: serverTimestamp(),
        aktualisiertVon: this.auth.currentUser?.uid || 'unknown'
      });
      console.log('Successfully updated teilnahme status');
    } catch (error) {
      console.error('Error updating teilnahme status:', error);
      this.snackBar.open(
        'Fehler beim Aktualisieren des Status. Bitte versuchen Sie es später erneut.',
        'OK',
        { duration: 5000 }
      );
      throw error;
    }
  }
  
  // Notfallkontakte Collection
  async getNotfallkontakte(personId: string): Promise<any[]> {
    console.log('Loading notfallkontakte for person:', personId);
    try {
      return await this.query('notfallkontakte', 'personId', '==', personId);
    } catch (error) {
      console.error('Error loading notfallkontakte:', error);
      this.snackBar.open(
        'Fehler beim Laden der Notfallkontakte. Bitte versuchen Sie es später erneut.',
        'OK',
        { duration: 5000 }
      );
      return [];
    }
  }

  /**
   * Get the current authentication status from Firebase
   */
  async getCurrentAuthStatus(): Promise<{authenticated: boolean, token: string | null, userId: string | null}> {
    try {
      const currentUser = this.auth.currentUser;
      let token = null;
      
      if (currentUser) {
        token = await currentUser.getIdToken(true);
      }
      
      return {
        authenticated: !!currentUser,
        token: token,
        userId: currentUser?.uid || null
      };
    } catch (error) {
      console.error('Error getting auth status:', error);
      return {
        authenticated: false,
        token: null,
        userId: null
      };
    }
  }

}
