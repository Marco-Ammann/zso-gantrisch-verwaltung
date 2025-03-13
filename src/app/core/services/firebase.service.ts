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
    return this.runInZone(async () => {
      const collectionRef = this.getCollection(collectionName);
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
    });
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
    return this.runInZone(async () => {
      const docRef = this.getDocument(collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id, ...docSnap.data() } as T;
      } else {
        return null;
      }
    });
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
    return this.runInZone(async () => {
      const collectionRef = this.getCollection(collectionName);
      const q = query(collectionRef, where(field, operator, value));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
    });
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
    return this.runInZone(async () => {
      const collectionRef = this.getCollection(collectionName);
      const q = query(collectionRef, orderBy(orderByField, direction));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
    });
  }



  /**
   * Adds a new document to a specified collection in Firebase.
   * @param collectionName - The name of the collection where the document should be added
   * @param data - The data object to be stored in the document
   * @returns Promise<string> - The ID of the newly created document
   * @remarks This method automatically adds a server timestamp field 'erstelltAm' to the document
   */
  async add(collectionName: string, data: any): Promise<string> {
    return this.runInZone(async () => {
      const collectionRef = this.getCollection(collectionName);
      // Timestamp für Erstellung hinzufügen
      const docRef = await addDoc(collectionRef, {
        ...data,
        erstelltAm: serverTimestamp(),
      });
      return docRef.id;
    });
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
    return this.runInZone(async () => {
      const docRef = this.getDocument(collectionName, id);
      // Timestamp für Aktualisierung hinzufügen
      await updateDoc(docRef, {
        ...data,
        aktualisiertAm: serverTimestamp(),
      });
    });
  }



  /**
   * Deletes a document from a specified collection in Firebase.
   * @param collectionName - The name of the collection containing the document to delete
   * @param id - The unique identifier of the document to delete
   * @returns A Promise that resolves when the document is deleted
   * @throws {FirebaseError} If the delete operation fails
   */
  async delete(collectionName: string, id: string): Promise<void> {
    return this.runInZone(async () => {
      const docRef = this.getDocument(collectionName, id);
      return deleteDoc(docRef);
    });
  }



  /**
   * Uploads a file to Firebase Storage and returns the download URL.
   * @param path - The storage path where the file will be uploaded
   * @param file - The file to upload
   * @returns A Promise that resolves with the download URL of the uploaded file
   * @throws {FirebaseError} If the upload fails
   */
  async uploadFile(path: string, file: File): Promise<string> {
    const storageRef = ref(this.storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        () => {},
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  }

}
