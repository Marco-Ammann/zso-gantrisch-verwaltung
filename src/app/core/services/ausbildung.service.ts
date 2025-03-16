// src/app/core/services/ausbildung.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { Ausbildung } from '../models/ausbildung.model';
import { FirebaseService } from './firebase.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { TeilnahmeService } from './teilnahme.service';

@Injectable({
  providedIn: 'root',
})
export class AusbildungService {
  private firebaseService = inject(FirebaseService);
  private teilnahmeService = inject(TeilnahmeService); // Add missing dependency
  private collectionName = 'ausbildungen';

  // Signal für alle Ausbildungen
  private _ausbildungen = signal<Ausbildung[]>([]);

  // Öffentliches computed Signal zur Verwendung in Komponenten
  public ausbildungen = computed(() => this._ausbildungen());

  // Umwandlung des Signals in ein Observable für Komponenten, die Observables benötigen
  public ausbildungen$ = toObservable(this.ausbildungen);

  // Signal für die aktuell ausgewählte Ausbildung
  private _selectedAusbildung = signal<Ausbildung | null>(null);
  public selectedAusbildung = computed(() => this._selectedAusbildung());

  // Filterzustände
  private _filter = signal<string>('');
  public filter = computed(() => this._filter());

  // Gefilterte Ausbildungen basierend auf dem Filter-Signal
  public filteredAusbildungen = computed(() => {
    const filterText = this._filter().toLowerCase();
    if (!filterText) return this._ausbildungen();

    return this._ausbildungen().filter(
      (ausbildung) =>
        ausbildung.titel.toLowerCase().includes(filterText) ||
        ausbildung.typ.toLowerCase().includes(filterText) ||
        ausbildung.beschreibung?.toLowerCase().includes(filterText) ||
        ausbildung.jahr.toString().includes(filterText)
    );
  });

  constructor() {
    // Initialisierung: Laden aller Ausbildungen
    this.loadAusbildungen();
  }

  /**
   * Lädt alle Ausbildungen aus Firestore
   */
  async loadAusbildungen(): Promise<void> {
    try {
      const ausbildungen = await this.firebaseService.getAllSorted<Ausbildung>(
        this.collectionName,
        'jahr',
        'desc'
      );
      this._ausbildungen.set(ausbildungen);
    } catch (error) {
      console.error('Fehler beim Laden der Ausbildungen:', error);
      throw error;
    }
  }

  /**
   * Holt eine Ausbildung anhand ihrer ID
   * @param id Ausbildungs-ID
   */
  async getAusbildungById(id: string): Promise<Ausbildung | null> {
    try {
      const ausbildung = await this.firebaseService.getById<Ausbildung>(
        this.collectionName,
        id
      );
      if (ausbildung) {
        this._selectedAusbildung.set(ausbildung);
      }
      return ausbildung;
    } catch (error) {
      console.error(`Fehler beim Laden der Ausbildung mit ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Erstellt eine neue Ausbildung
   * @param ausbildung Ausbildungsdaten
   * @returns ID der erstellten Ausbildung
   */
  async createAusbildung(ausbildung: Omit<Ausbildung, 'id'>): Promise<string> {
    try {
      const id = await this.firebaseService.add(
        this.collectionName,
        ausbildung
      );
      console.log('Ausbildung erfolgreich erstellt mit ID:', id);

      // Sofortige Aktualisierung des lokalen Zustands
      const newAusbildung: Ausbildung = { ...ausbildung, id };
      this._ausbildungen.update((ausbildungen) => [
        ...ausbildungen,
        newAusbildung,
      ]);

      return id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Ausbildung:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine bestehende Ausbildung
   * @param id Ausbildungs-ID
   * @param ausbildung Aktualisierte Ausbildungsdaten
   */
  async updateAusbildung(
    id: string,
    ausbildung: Partial<Ausbildung>
  ): Promise<void> {
    try {
      await this.firebaseService.update(this.collectionName, id, ausbildung);

      // Aktualisiere den lokalen Zustand
      this._ausbildungen.update((ausbildungen) =>
        ausbildungen.map((a) => (a.id === id ? { ...a, ...ausbildung } : a))
      );

      // Wenn die aktuelle ausgewählte Ausbildung aktualisiert wurde, aktualisiere auch diese
      const selectedAusbildung = this._selectedAusbildung();
      if (selectedAusbildung && selectedAusbildung.id === id) {
        this._selectedAusbildung.update((current) =>
          current ? { ...current, ...ausbildung } : null
        );
      }
    } catch (error) {
      console.error(
        `Fehler beim Aktualisieren der Ausbildung mit ID ${id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Löscht eine Ausbildung
   * @param id Ausbildungs-ID
   */
  async deleteAusbildung(id: string): Promise<void> {
    try {
      await this.firebaseService.delete(this.collectionName, id);

      // Aktualisiere den lokalen Zustand
      this._ausbildungen.update((ausbildungen) =>
        ausbildungen.filter((ausbildung) => ausbildung.id !== id)
      );

      // Wenn die aktuell ausgewählte Ausbildung gelöscht wurde, setze diese zurück
      const selectedAusbildung = this._selectedAusbildung();
      if (selectedAusbildung && selectedAusbildung.id === id) {
        this._selectedAusbildung.set(null);
      }
    } catch (error) {
      console.error(`Fehler beim Löschen der Ausbildung mit ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Sucht nach Ausbildungen basierend auf einem Filtertext
   * @param filterText Text für die Filterung
   */
  setFilter(filterText: string): void {
    this._filter.set(filterText);
  }

  /**
   * Wählt eine Ausbildung aus (z.B. für Detailansicht)
   * @param ausbildung Ausgewählte Ausbildung
   */
  selectAusbildung(ausbildung: Ausbildung | null): void {
    this._selectedAusbildung.set(ausbildung);
  }

  /**
   * Filtert Ausbildungen nach Typ
   * @param typ Ausbildungstyp
   * @returns Gefilterte Ausbildungen
   */
  getAusbildungenByTyp(typ: Ausbildung['typ']): Ausbildung[] {
    return this._ausbildungen().filter((ausbildung) => ausbildung.typ === typ);
  }

  /**
   * Filtert Ausbildungen nach Jahr
   * @param jahr Jahr
   * @returns Gefilterte Ausbildungen
   */
  getAusbildungenByJahr(jahr: number): Ausbildung[] {
    return this._ausbildungen().filter(
      (ausbildung) => ausbildung.jahr === jahr
    );
  }

  /**
   * Gets the number of unique participants for an ausbildung
   * Ensures people who participate on multiple days are only counted once
   */
  async getUniqueParticipantCount(ausbildungId: string): Promise<number> {
    const teilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(ausbildungId);
    
    // Use a Set to track unique personIds
    const uniquePersonIds = new Set<string>();
    
    teilnahmen.forEach(teilnahme => {
      if (teilnahme.personId) {
        uniquePersonIds.add(teilnahme.personId);
      }
    });
    
    return uniquePersonIds.size;
  }
}
