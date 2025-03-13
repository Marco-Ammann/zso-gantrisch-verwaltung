export interface Ausbildung {
    id: string;
    titel: string;
    beschreibung?: string;
    jahr: number;
    datum: Date;
    typ: 'WK' | 'LG' | 'KVK' | 'Übung' | 'Kurs';
    erforderlich: boolean;
  }