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
  getDoc
} from '@angular/fire/firestore';
import { 
  Storage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from '@angular/fire/storage';

/**
 * Zentrale Service-Klasse für Firestore-Zugriffe
 * Bietet grundlegende CRUD-Operationen und Abfragemöglichkeiten für alle Kollektionen
 */
@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private firestore: Firestore = inject(Firestore);
  private storage: Storage = inject(Storage);
  private ngZone = inject(NgZone);

    // Hilfsmethode für zonenkonforme API-Aufrufe
    private runInZone<T>(fn: () => Promise<T>): Promise<T> {
      return this.ngZone.runOutsideAngular(() => fn()).then(result => {
        return this.ngZone.run(() => result);
      });
    }



  /**
   * Gibt eine Referenz auf eine Kollektion zurück
   * @param collectionName Name der Kollektion
   * @returns Kollektion-Referenz
   */
  getCollection(collectionName: string) {
    return collection(this.firestore, collectionName);
  }

  /**
   * Gibt eine Referenz auf ein Dokument zurück
   * @param collectionName Name der Kollektion
   * @param id ID des Dokuments
   * @returns Dokument-Referenz
   */
  getDocument(collectionName: string, id: string) {
    return doc(this.firestore, collectionName, id);
  }

  /**
   * Liest alle Dokumente einer Kollektion
   * @param collectionName Name der Kollektion
   * @returns Promise mit Array aller Dokumente
   */
  // Passt alle Methoden an, z.B.:
  async getAll<T>(collectionName: string): Promise<T[]> {
    return this.runInZone(async () => {
      const collectionRef = this.getCollection(collectionName);
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    });
  }

  /**
   * Liest ein einzelnes Dokument nach ID
   * @param collectionName Name der Kollektion
   * @param id ID des Dokuments
   * @returns Promise mit Dokumentdaten
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
   * Führt eine Abfrage auf einer Kollektion aus
   * @param collectionName Name der Kollektion
   * @param field Feld für die Abfrage
   * @param operator Vergleichsoperator (==, >, <, etc.)
   * @param value Wert für den Vergleich
   * @returns Promise mit Array der passenden Dokumente
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
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    });
  }

  /**
   * Führt eine sortierte Abfrage auf einer Kollektion aus
   * @param collectionName Name der Kollektion
   * @param orderByField Feld für die Sortierung
   * @param direction Sortierrichtung ('asc' oder 'desc')
   * @returns Promise mit Array aller Dokumente, sortiert
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
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    });
  }

  /**
   * Erstellt ein neues Dokument
   * @param collectionName Name der Kollektion
   * @param data Daten für das neue Dokument
   * @returns Promise mit der ID des neuen Dokuments
   */
  async add(collectionName: string, data: any): Promise<string> {
    const collectionRef = this.getCollection(collectionName);
    // Timestamp für Erstellung hinzufügen
    const docRef = await addDoc(collectionRef, {
      ...data,
      erstelltAm: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Aktualisiert ein vorhandenes Dokument
   * @param collectionName Name der Kollektion
   * @param id ID des Dokuments
   * @param data Aktualisierte Daten
   * @returns Promise
   */
  async update(collectionName: string, id: string, data: any): Promise<void> {
    const docRef = this.getDocument(collectionName, id);
    // Timestamp für Aktualisierung hinzufügen
    return updateDoc(docRef, {
      ...data,
      aktualisiertAm: serverTimestamp()
    });
  }

  /**
   * Löscht ein Dokument
   * @param collectionName Name der Kollektion
   * @param id ID des zu löschenden Dokuments
   * @returns Promise
   */
  async delete(collectionName: string, id: string): Promise<void> {
    const docRef = this.getDocument(collectionName, id);
    return deleteDoc(docRef);
  }

  /**
   * Lädt eine Datei in Firebase Storage hoch
   * @param path Pfad im Storage
   * @param file Datei zum Hochladen
   * @returns Promise mit der Download-URL
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