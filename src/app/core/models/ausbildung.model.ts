export interface Ausbildung {
  id: string;
  titel: string;
  beschreibung?: string;
  jahr: number;
  datum: Date | any;  // Flexible Definition für Firestore-Timestamp
  typ: 'WK' | 'LG' | 'KVK' | 'Übung' | 'Kurs';
  erforderlich: boolean;
}