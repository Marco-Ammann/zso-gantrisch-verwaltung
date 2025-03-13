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
  
  // Signal für alle Teilnahmen
  private _teilnahmen = signal<Ausbildungsteilnahme[]>([]);
  
  // Öffentliches computed Signal zur Verwendung in Komponenten
  public teilnahmen = computed(() => this._teilnahmen());
  
  // Umwandlung des Signals in ein Observable für Komponenten, die Observables benötigen
  public teilnahmen$ = toObservable(this.teilnahmen);
  
  constructor() {
    // Initialisierung: Laden aller Teilnahmen
    this.loadTeilnahmen();
  }
  
  /**
   * Lädt alle Teilnahmen aus Firestore
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
   * Lädt Teilnahmen für eine bestimmte Person
   * @param personId ID der Person
   * @returns Teilnahmen der Person
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
   * Lädt Teilnahmen für eine bestimmte Ausbildung
   * @param ausbildungId ID der Ausbildung
   * @returns Teilnahmen für die Ausbildung
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
   * Erstellt eine neue Teilnahme
   * @param teilnahme Teilnahmedaten
   * @returns ID der erstellten Teilnahme
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
   * Aktualisiert eine bestehende Teilnahme
   * @param id Teilnahme-ID
   * @param teilnahme Aktualisierte Teilnahmedaten
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
   * Löscht eine Teilnahme
   * @param id Teilnahme-ID
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