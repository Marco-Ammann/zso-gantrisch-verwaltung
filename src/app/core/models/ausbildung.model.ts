export interface Ausbildung {
    id: string;
    titel: string;
    beschreibung?: string;
    jahr: number;
    typ: 'WK' | 'LG' | 'KVK' | 'Übung' | 'Kurs';
    erforderlich: boolean;
  }