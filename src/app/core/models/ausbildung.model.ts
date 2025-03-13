// src/app/core/models/ausbildung.model.ts
export interface Ausbildung {
  id: string;
  titel: string;
  beschreibung?: string;
  typ: 'WK' | 'LG' | 'KVK' | 'Übung' | 'Kurs';
  
  // Erweiterte Datumsinformationen
  startDatum: Date;
  endDatum?: Date;
  
  // Optionale Einrückzeiten
  einrueckZeitKader?: {
    start: Date;
    ende: Date;
  };
  einrueckZeitSoldaten?: {
    start: Date;
    ende: Date;
  };
  
  // Bestehende Felder
  jahr: number;
  erforderlich: boolean;
}