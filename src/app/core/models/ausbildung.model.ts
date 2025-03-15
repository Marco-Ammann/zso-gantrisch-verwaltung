export interface Ausbildung {
  id: string;
  titel: string;
  beschreibung?: string;
  typ: 'WK' | 'LG' | 'KVK' | 'Kurs' | 'Übung';
  jahr: number;
  startDatum: any; // Using "any" to handle both Firestore Timestamp and Date
  endDatum: any;   // Using "any" to handle both Firestore Timestamp and Date
  startZeit?: string; // Time in format "HH:MM"
  endZeit?: string;   // Time in format "HH:MM"
  datum?: any;     // Keep for backward compatibility
  erforderlich: boolean;
}