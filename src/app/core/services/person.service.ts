import { Injectable, inject, signal, computed } from '@angular/core';
import { Person } from '../models/person.model';
import { FirebaseService } from './firebase.service';
import { toObservable } from '@angular/core/rxjs-interop';

/**
 * Service für die Verwaltung von Personendaten
 * Verwendet Signal-basierte Reaktivität
 */
@Injectable({
  providedIn: 'root'
})
export class PersonService {
  private firebaseService = inject(FirebaseService);
  private collectionName = 'personen';
  
  // Signal für alle Personen
  private _personen = signal<Person[]>([]);
  
  // Öffentliches computed Signal zur Verwendung in Komponenten
  public personen = computed(() => this._personen());
  
  // Umwandlung des Signals in ein Observable für Komponenten, die Observables benötigen
  public personen$ = toObservable(this.personen);
  
  // Signal für die aktuell ausgewählte Person
  private _selectedPerson = signal<Person | null>(null);
  public selectedPerson = computed(() => this._selectedPerson());
  
  // Filterzustände
  private _filter = signal<string>('');
  public filter = computed(() => this._filter());
  
  // Gefilterte Personen basierend auf dem Filter-Signal
  public filteredPersonen = computed(() => {
    const filterText = this._filter().toLowerCase();
    if (!filterText) return this._personen();
    
    return this._personen().filter(person => 
      person.grunddaten.vorname.toLowerCase().includes(filterText) ||
      person.grunddaten.nachname.toLowerCase().includes(filterText) ||
      person.grunddaten.grad.toLowerCase().includes(filterText) ||
      person.kontaktdaten.ort.toLowerCase().includes(filterText)
    );
  });
  
  constructor() {
    // Initialisierung: Laden aller Personen
    this.loadPersonen();
  }
  
  /**
   * Lädt alle Personen aus Firestore
   */
  async loadPersonen(): Promise<void> {
    try {
      const personen = await this.firebaseService.getAllSorted<Person>(
        this.collectionName, 
        'grunddaten.nachname'
      );
      this._personen.set(personen);
    } catch (error) {
      console.error('Fehler beim Laden der Personen:', error);
      throw error;
    }
  }
  
  /**
   * Holt eine Person anhand ihrer ID
   * @param id Person-ID
   */
  async getPersonById(id: string): Promise<Person | null> {
    try {
      const person = await this.firebaseService.getById<Person>(this.collectionName, id);
      if (person) {
        this._selectedPerson.set(person);
      }
      return person;
    } catch (error) {
      console.error(`Fehler beim Laden der Person mit ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Erstellt eine neue Person
   * @param person Personendaten
   * @returns ID der erstellten Person
   */
  async createPerson(person: Omit<Person, 'id'>): Promise<string> {
    try {
      // Metadaten aktualisieren
      const now = new Date();
      person.metadaten = {
        ...person.metadaten,
        letzteAktualisierung: now
      };
      
      const id = await this.firebaseService.add(this.collectionName, person);
      console.log('Person erfolgreich erstellt mit ID:', id);
      
      // Sofortige Aktualisierung des lokalen Zustands
      const newPerson: Person = { ...person, id };
      this._personen.update(personen => [...personen, newPerson]);
      
      return id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Person:', error);
      throw error;
    }
  }
  
  /**
   * Aktualisiert eine bestehende Person
   * @param id Person-ID
   * @param person Aktualisierte Personendaten
   */
  async updatePerson(id: string, person: Partial<Person>): Promise<void> {
    try {
      // Metadaten aktualisieren
      const now = new Date();
      if (!person.metadaten) {
        person.metadaten = {} as Person['metadaten'];
      }
      person.metadaten.letzteAktualisierung = now;
      
      await this.firebaseService.update(this.collectionName, id, person);
      
      // Aktualisiere den lokalen Zustand
      await this.loadPersonen();
      
      // Wenn die aktuelle ausgewählte Person aktualisiert wurde, aktualisiere auch diese
      const selectedPerson = this._selectedPerson();
      if (selectedPerson && selectedPerson.id === id) {
        await this.getPersonById(id);
      }
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der Person mit ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Löscht eine Person
   * @param id Person-ID
   */
  async deletePerson(id: string): Promise<void> {
    try {
      await this.firebaseService.delete(this.collectionName, id);
      
      // Aktualisiere den lokalen Zustand
      this._personen.update(personen => personen.filter(person => person.id !== id));
      
      // Wenn die aktuell ausgewählte Person gelöscht wurde, setze diese zurück
      const selectedPerson = this._selectedPerson();
      if (selectedPerson && selectedPerson.id === id) {
        this._selectedPerson.set(null);
      }
    } catch (error) {
      console.error(`Fehler beim Löschen der Person mit ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Sucht nach Personen basierend auf einem Filtertext
   * @param filterText Text für die Filterung
   */
  setFilter(filterText: string): void {
    this._filter.set(filterText);
  }
  
  /**
   * Wählt eine Person aus (z.B. für Detailansicht)
   * @param person Ausgewählte Person
   */
  selectPerson(person: Person | null): void {
    this._selectedPerson.set(person);
  }
  
  /**
   * Gibt Personen nach Status gefiltert zurück
   * @param status Status (aktiv, inaktiv, neu)
   * @returns Gefilterte Personen
   */
  getPersonenByStatus(status: 'aktiv' | 'inaktiv' | 'neu'): Person[] {
    return this._personen().filter(person => person.zivilschutz.status === status);
  }
  
  /**
   * Zählt die Personen nach Status
   * @returns Objekt mit Anzahl pro Status
   */
  getPersonCountByStatus(): { aktiv: number, inaktiv: number, neu: number } {
    const result = { aktiv: 0, inaktiv: 0, neu: 0 };
    
    this._personen().forEach(person => {
      const status = person.zivilschutz.status;
      if (status in result) {
        result[status]++;
      }
    });
    
    return result;
  }
}