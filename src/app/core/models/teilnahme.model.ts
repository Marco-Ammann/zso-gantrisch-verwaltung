export interface Ausbildungsteilnahme {
    id: string;
    personId: string;
    ausbildungId: string;
    datum: Date;
    status: 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert';
    bemerkung?: string;
  }
  