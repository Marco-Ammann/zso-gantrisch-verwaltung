// src/app/core/services/notfallkontakt.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { Notfallkontakt } from '../models/notfallkontakt.model';
import { PersonService } from './person.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class NotfallkontaktService {
  private firebaseService = inject(FirebaseService);
  private personService = inject(PersonService);
  private firestore = inject(Firestore);
  
  private collectionName = 'notfallkontakte';
  
  // Signal für Notfallkontakte
  private _notfallkontakte = signal<Notfallkontakt[]>([]);
  
  // Öffentliches computed Signal
  public notfallkontakte = computed(() => this._notfallkontakte());
  
  // Observable für Komponenten, die Observables benötigen
  public notfallkontakte$ = toObservable(this.notfallkontakte);
  
  // Signal für den aktuell ausgewählten Kontakt
  private _selectedKontakt = signal<Notfallkontakt | null>(null);
  public selectedKontakt = computed(() => this._selectedKontakt());
  
  // Lade-Status Signal
  private _isLoading = signal<boolean>(false);
  public isLoading = computed(() => this._isLoading());
  
  constructor() {
    // Initialisierung: Alle Notfallkontakte laden
    this.loadNotfallkontakte();
  }
  
  /**
   * Lädt alle Notfallkontakte aus Firestore
   */
  async loadNotfallkontakte(): Promise<void> {
    try {
      this._isLoading.set(true);
      const kontakte = await this.firebaseService.getAll<Notfallkontakt>(this.collectionName);
      this._notfallkontakte.set(kontakte);
      this._isLoading.set(false);
    } catch (error) {
      console.error('Fehler beim Laden der Notfallkontakte:', error);
      this._isLoading.set(false);
      this._notfallkontakte.set([]); // Leeres Array setzen, damit UI nicht hängt
      throw error;
    }
  }
  
  /**
   * Lädt Notfallkontakte für eine bestimmte Person
   */
  async getKontakteForPerson(personId: string): Promise<Notfallkontakt[]> {
    try {
      return await this.firebaseService.query<Notfallkontakt>(
        this.collectionName,
        'personId',
        '==',
        personId
      );
    } catch (error) {
      console.error(`Fehler beim Laden der Notfallkontakte für Person ${personId}:`, error);
      return [];
    }
  }
  
  /**
   * Lädt einen einzelnen Notfallkontakt anhand seiner ID
   */
  async getKontaktById(id: string): Promise<Notfallkontakt | null> {
    try {
      const kontakt = await this.firebaseService.getById<Notfallkontakt>(this.collectionName, id);
      if (kontakt) {
        this._selectedKontakt.set(kontakt);
      }
      return kontakt;
    } catch (error) {
      console.error(`Fehler beim Laden des Notfallkontakts mit ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Erstellt einen neuen Notfallkontakt
   */
  async createKontakt(kontakt: Omit<Notfallkontakt, 'id'>): Promise<string> {
    try {
      const id = await this.firebaseService.add(this.collectionName, kontakt);
      
      // Aktualisiere den lokalen Zustand sofort
      const newKontakt: Notfallkontakt = { ...kontakt, id };
      this._notfallkontakte.update(kontakte => [...kontakte, newKontakt]);
      
      return id;
    } catch (error) {
      console.error('Fehler beim Erstellen des Notfallkontakts:', error);
      throw error;
    }
  }
  
  /**
   * Aktualisiert einen bestehenden Notfallkontakt
   */
  async updateKontakt(id: string, kontakt: Partial<Notfallkontakt>): Promise<void> {
    try {
      await this.firebaseService.update(this.collectionName, id, kontakt);
      
      // Aktualisiere den lokalen Zustand sofort
      this._notfallkontakte.update(kontakte => 
        kontakte.map(k => k.id === id ? { ...k, ...kontakt } : k)
      );
      
      // Wenn der aktuell ausgewählte Kontakt aktualisiert wurde, aktualisiere auch diesen
      const selectedKontakt = this._selectedKontakt();
      if (selectedKontakt && selectedKontakt.id === id) {
        this._selectedKontakt.update(current => 
          current ? { ...current, ...kontakt } : null
        );
      }
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Notfallkontakts mit ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Löscht einen Notfallkontakt
   */
  async deleteKontakt(id: string): Promise<void> {
    try {
      await this.firebaseService.delete(this.collectionName, id);
      
      // Aktualisiere den lokalen Zustand
      this._notfallkontakte.update(kontakte => kontakte.filter(kontakt => kontakt.id !== id));
      
      // Wenn der aktuell ausgewählte Kontakt gelöscht wurde, setze diesen zurück
      const selectedKontakt = this._selectedKontakt();
      if (selectedKontakt && selectedKontakt.id === id) {
        this._selectedKontakt.set(null);
      }
    } catch (error) {
      console.error(`Fehler beim Löschen des Notfallkontakts mit ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Wählt einen Notfallkontakt aus
   */
  selectKontakt(kontakt: Notfallkontakt | null): void {
    this._selectedKontakt.set(kontakt);
  }

  /**
   * Loads emergency contacts for a specific person
   * @param personId ID of the person
   * @returns Array of emergency contacts
   */
  async getNotfallkontakteByPerson(personId: string): Promise<Notfallkontakt[]> {
    try {
      const personDocRef = doc(this.firestore, 'personen', personId);
      const personSnapshot = await getDoc(personDocRef);
      
      if (personSnapshot.exists()) {
        const personData = personSnapshot.data();
        return personData['notfallkontakte'] || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
      throw error;
    }
  }
}