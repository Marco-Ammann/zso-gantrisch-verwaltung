// src/app/core/services/teilnahme.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { Ausbildungsteilnahme } from '../models/teilnahme.model';
import { FirebaseService } from './firebase.service';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class TeilnahmeService {
  private firebaseService = inject(FirebaseService);
  private collectionName = 'teilnahmen';
  

  /**
   * Private signal containing an array of training participations (Ausbildungsteilnahme).
   * Tracks participations in educational/training activities.
   * @private
   * @type {WritableSignal<Ausbildungsteilnahme[]>}
   */
  private _teilnahmen = signal<Ausbildungsteilnahme[]>([]);  
  
  /**
   * Computed signal that returns all teilnahmen (participations) from the store.
   * This property provides read-only access to the participations data.
   * @returns A Signal containing an array of Teilnahme objects
   */
  public teilnahmen = computed(() => this._teilnahmen());

  /**
   * Observable stream of all Teilnahmen (participations).
   * Emits whenever the underlying signal {@link teilnahmen} changes.
   * @readonly
   * @type {Observable<Teilnahme[]>}
   */
  public teilnahmen$ = toObservable(this.teilnahmen);
  

  constructor() {
    this.loadTeilnahmen();
  }
  

  /**
   * Loads all Ausbildungsteilnahme (training participation) records from Firebase.
   * Updates the internal BehaviorSubject with the loaded data.
   * 
   * @throws Will throw and log an error if the Firebase query fails
   * @returns Promise that resolves when data is loaded and state is updated
   */
  async loadTeilnahmen(): Promise<void> {
    try {
      const teilnahmen = await this.firebaseService.getAll<Ausbildungsteilnahme>(this.collectionName);
      this._teilnahmen.set(teilnahmen);
    } catch (error) {
      console.error('Fehler beim Laden der Teilnahmen:', error);
      throw error;
    }
  }
  

  /**
   * Retrieves all training participations for a specific person from Firebase.
   * 
   * @param personId - The unique identifier of the person
   * @returns A Promise resolving to an array of Ausbildungsteilnahme (training participation) objects
   * @throws Will handle and log any Firebase query errors, returning an empty array in case of failure
   */
  async getTeilnahmenByPerson(personId: string): Promise<Ausbildungsteilnahme[]> {
    try {
      return await this.firebaseService.query<Ausbildungsteilnahme>(
        this.collectionName,
        'personId',
        '==',
        personId
      );
    } catch (error) {
      console.error(`Fehler beim Laden der Teilnahmen für Person ${personId}:`, error);
      return [];
    }
  }
  

  /**
   * Retrieves all participation entries for a specific training/education.
   * @param ausbildungId - The unique identifier of the training/education
   * @returns Promise containing an array of training participations. Returns empty array if operation fails.
   * @throws {Error} Error while querying the database (caught internally)
   */
  async getTeilnahmenByAusbildung(ausbildungId: string): Promise<Ausbildungsteilnahme[]> {
    try {
      return await this.firebaseService.query<Ausbildungsteilnahme>(
        this.collectionName,
        'ausbildungId',
        '==',
        ausbildungId
      );
    } catch (error) {
      console.error(`Fehler beim Laden der Teilnahmen für Ausbildung ${ausbildungId}:`, error);
      return [];
    }
  }
  

  /**
   * Creates a new participation record (Ausbildungsteilnahme) in the database.
   * Also updates the local state by adding the new participation to the existing collection.
   * 
   * @param teilnahme - The participation data without an ID to be created
   * @returns A Promise that resolves to the ID of the newly created participation record
   * @throws Will throw and log an error if the creation fails
   */
  async createTeilnahme(teilnahme: Omit<Ausbildungsteilnahme, 'id'>): Promise<string> {
    try {
      const id = await this.firebaseService.add(this.collectionName, teilnahme);
      
      // Sofortige Aktualisierung des lokalen Zustands
      const newTeilnahme: Ausbildungsteilnahme = { ...teilnahme, id };
      this._teilnahmen.update(teilnahmen => [...teilnahmen, newTeilnahme]);
      
      return id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Teilnahme:', error);
      throw error;
    }
  }
  

  /**
   * Updates a participation record both in Firebase and in the local state.
   * 
   * @param id - The unique identifier of the participation record to update
   * @param teilnahme - Partial object containing the fields to be updated
   * @throws Will throw an error if the Firebase update operation fails
   * @returns Promise that resolves when both remote and local updates are complete
   */
  async updateTeilnahme(id: string, teilnahme: Partial<Ausbildungsteilnahme>): Promise<void> {
    try {
      await this.firebaseService.update(this.collectionName, id, teilnahme);
      
      // Aktualisiere den lokalen Zustand
      this._teilnahmen.update(teilnahmen => 
        teilnahmen.map(t => t.id === id ? { ...t, ...teilnahme } : t)
      );
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der Teilnahme mit ID ${id}:`, error);
      throw error;
    }
  }
  

  /**
   * Deletes a Teilnahme (participation) by its ID.
   *
   * This method attempts to delete a Teilnahme from the Firebase service using the provided ID.
   * If the deletion is successful, it updates the local state by removing the deleted Teilnahme.
   * If an error occurs during the deletion process, it logs the error and rethrows it.
   *
   * @param {string} id - The ID of the Teilnahme to be deleted.
   * @returns {Promise<void>} A promise that resolves when the Teilnahme is successfully deleted.
   * @throws Will throw an error if the deletion process fails.
   */
  async deleteTeilnahme(id: string): Promise<void> {
    try {
      await this.firebaseService.delete(this.collectionName, id);
      
      // Aktualisiere den lokalen Zustand
      this._teilnahmen.update(teilnahmen => teilnahmen.filter(teilnahme => teilnahme.id !== id));
    } catch (error) {
      console.error(`Fehler beim Löschen der Teilnahme mit ID ${id}:`, error);
      throw error;
    }
  }
}