export interface Ausbildung {
  id: string;
  titel: string;
  beschreibung?: string;
  jahr: number;
  datum: Date | any;  startDatum?: Date;
  endDatum?: Date;
  einrueckZeitKader?: {
      start?: Date;
      ende?: Date;
  };
  einrueckZeitSoldaten?: {
      start?: Date;
      ende?: Date;
  };
  typ: 'WK' | 'LG' | 'KVK' | 'Übung' | 'Kurs';
  erforderlich: boolean;
}