import { Injectable, inject, signal, computed } from '@angular/core';
import { Person } from '../models/person.model';
import { FirebaseService } from './firebase.service';
import { toObservable } from '@angular/core/rxjs-interop';

/**
 * Service für die Verwaltung von Personendaten
 * Verwendet Signal-basierte Reaktivität
 */
@Injectable({
  providedIn: 'root',
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


  /**
   * A computed property that filters a list of persons based on a search text.
   * The filter is applied case-insensitively on the following person properties:
   * - First name (vorname)
   * - Last name (nachname)
   * - Degree/Rank (grad)
   * - City/Location (ort)
   *
   * @returns An array of filtered Person objects. If no filter text is set, returns the complete list.
   */
  public filteredPersonen = computed(() => {
    const filterText = this._filter().toLowerCase();
    if (!filterText) return this._personen();

    return this._personen().filter(
      (person) =>
        person.grunddaten.vorname.toLowerCase().includes(filterText) ||
        person.grunddaten.nachname.toLowerCase().includes(filterText) ||
        person.grunddaten.grad.toLowerCase().includes(filterText) ||
        person.kontaktdaten.ort.toLowerCase().includes(filterText)
    );
  });


  constructor() {
    this.loadPersonen();
  }


  /**
   * Loads and sets all persons from the Firebase database sorted by last name.
   * Updates the internal BehaviorSubject with the retrieved persons.
   *
   * @throws {Error} If loading the persons from Firebase fails
   * @returns {Promise<void>} A promise that resolves when persons are loaded
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
   * Retrieves a person by their ID from Firebase and updates the selected person state
   * @param id - The unique identifier of the person to retrieve
   * @returns Promise that resolves to the Person object if found, null otherwise
   * @throws Will console.error if there's an error during the Firebase operation
   */
  async getPersonById(id: string): Promise<Person | null> {
    try {
      const person = await this.firebaseService.getById<Person>(
        this.collectionName,
        id
      );
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
   * Creates a new person in the system.
   *
   * @param person - The person object to create, excluding the 'id' field
   * @returns Promise containing the newly created person's ID as a string
   * @throws Error if the person creation fails
   *
   * @remarks
   * This method:
   * - Updates the metadata with current timestamp
   * - Stores the person in Firebase
   * - Updates the local state with the new person
   *
   * @example
   * ```typescript
   * const newPerson = {
   *   name: "John Doe",
   *   metadaten: {}
   * };
   * const id = await createPerson(newPerson);
   * ```
   */
  async createPerson(person: Omit<Person, 'id'>): Promise<string> {
    try {
      const now = new Date();
      person.metadaten = {
        ...person.metadaten,
        letzteAktualisierung: now,
      };

      const id = await this.firebaseService.add(this.collectionName, person);
      console.log('Person erfolgreich erstellt mit ID:', id);

      const newPerson: Person = { ...person, id };
      this._personen.update((personen) => [...personen, newPerson]);

      return id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Person:', error);
      throw error;
    }
  }


  /**
   * Updates a person's data in the database and refreshes local state.
   *
   * @param id - The unique identifier of the person to update
   * @param person - Partial person object containing the fields to update
   * @returns Promise that resolves when the update is complete
   * @throws Error if the update operation fails
   *
   * @remarks
   * This method:
   * - Updates the metadata with the current timestamp
   * - Persists changes to Firebase
   * - Reloads the local person list
   * - Updates the selected person if it matches the updated ID
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
      console.error(
        `Fehler beim Aktualisieren der Person mit ID ${id}:`,
        error
      );
      throw error;
    }
  }


  /**
   * Deletes a person from both Firebase and local state management.
   *
   * @param id - The unique identifier of the person to be deleted
   * @throws {Error} If the deletion operation in Firebase fails
   * @returns Promise<void> A promise that resolves when the deletion is complete
   *
   * @remarks
   * This method performs the following operations:
   * - Deletes the person from Firebase
   * - Updates the local state by removing the person from the persons signal
   * - If the deleted person was currently selected, resets the selected person to null
   */
  async deletePerson(id: string): Promise<void> {
    try {
      await this.firebaseService.delete(this.collectionName, id);

      // Aktualisiere den lokalen Zustand
      this._personen.update((personen) =>
        personen.filter((person) => person.id !== id)
      );

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
   * Sets the filter text for filtering persons
   * @param filterText - The text to filter persons with
   */
  setFilter(filterText: string): void {
    this._filter.set(filterText);
  }


  /**
   * Sets the selected person in the application state.
   * @param person - The person to be selected, or null to clear the selection
   * @remarks This method updates the internal BehaviorSubject storing the currently selected person
   */
  selectPerson(person: Person | null): void {
    this._selectedPerson.set(person);
  }


  /**
   * Retrieves a list of persons filtered by their civil protection status.
   * @param status - The civil protection status to filter by. Can be 'aktiv', 'inaktiv', or 'neu'.
   * @returns An array of Person objects matching the specified status.
   */
  getPersonenByStatus(status: 'aktiv' | 'inaktiv' | 'neu'): Person[] {
    return this._personen().filter(
      (person) => person.zivilschutz.status === status
    );
  }
  

  /**
   * Calculates the count of persons grouped by their civil protection status.
   *
   * @returns An object containing the count for each status:
   *          - aktiv: Number of active persons
   *          - inaktiv: Number of inactive persons
   *          - neu: Number of new persons
   */
  getPersonCountByStatus(): { aktiv: number; inaktiv: number; neu: number } {
    const result = { aktiv: 0, inaktiv: 0, neu: 0 };

    this._personen().forEach((person) => {
      const status = person.zivilschutz.status;
      if (status in result) {
        result[status]++;
      }
    });
    return result;
  }
}
