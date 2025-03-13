export interface Person {
    id: string;
    grunddaten: {
      vorname: string;
      nachname: string;
      grad: string;
      funktion: string;
      geburtsdatum: Date;
    };

    kontaktdaten: {
      strasse: string;
      plz: string;
      ort: string;
      email: string;
      telefonFestnetz?: string;
      telefonMobil: string;
      telefonGeschaeftlich?: string;
    };

    zivilschutz: {
      grundausbildung: string;  // Jahr
      einteilung: {
        zug: number;
        gruppe?: string;
      };
      zusatzausbildungen?: string[];
      status: 'aktiv' | 'inaktiv' | 'neu';
    };

    persoenliches: {
      sprachkenntnisse?: string[];
      blutgruppe?: string;
      allergien?: string[];
      essgewohnheiten?: string[];
      besonderheiten?: string[];
    };

    berufliches: {
      ausgeubterBeruf?: string;
      erlernterBeruf?: string;
      arbeitgeber?: string;
      fuehrerausweisKategorie?: string[];
      zivileSpezialausbildung?: string;
    };
    
    metadaten: {
      letzteAktualisierung: Date;
      aktualisiert_von: string;
      [key: string]: any; // Für zukünftige Erweiterungen
    };
  }