import { Injectable, inject, Renderer2, RendererFactory2 } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { Person } from '../models/person.model';
import { NotfallkontaktService } from './notfallkontakt.service';
import { TeilnahmeService } from './teilnahme.service';
import { PersonService } from './person.service';
import { AusbildungService } from './ausbildung.service';

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {
  private notfallkontaktService = inject(NotfallkontaktService);
  private teilnahmeService = inject(TeilnahmeService);
  private personService = inject(PersonService);
  private ausbildungService = inject(AusbildungService);
  private renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Erzeugt EIN PDF für eine einzelne Person und lädt es herunter.
   */
  async generateKontaktdatenblatt(person: Person): Promise<void> {
    const pdfElement = await this.buildPdfElementForPerson(person);
    document.body.appendChild(pdfElement);

    try {
      const canvas = await html2canvas(pdfElement, { 
        scale: 2, 
        useCORS: true,
        height: 1400 // Further increased height
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const ratio = canvas.width / canvas.height;
      const imgHeight = pdfWidth / ratio;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      pdf.save(`Kontaktdatenblatt_${person.grunddaten.nachname}_${person.grunddaten.vorname}.pdf`);
    } finally {
      document.body.removeChild(pdfElement);
    }
  }

  /**
   * Erzeugt einzelne PDFs für jeden Teilnehmer eines Kurses.
   */
  async generateKontaktdatenblaetterFuerKurs(ausbildungId: string): Promise<void> {
    try {
      const ausbildung = await this.ausbildungService.getAusbildungById(ausbildungId);
      if (!ausbildung) {
        console.error('Ausbildung nicht gefunden');
        return;
      }
      const teilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(ausbildungId);
      if (teilnahmen.length === 0) {
        console.warn('Keine Teilnehmer für diese Ausbildung gefunden');
        return;
      }
      for (const t of teilnahmen) {
        const person = await this.personService.getPersonById(t.personId);
        if (person) {
          await this.generateKontaktdatenblatt(person);
        }
      }
    } catch (error) {
      console.error('Fehler beim Generieren einzelner PDFs:', error);
      throw error;
    }
  }

  /**
   * Erzeugt ein kombiniertes PDF mit allen Teilnehmern eines Kurses.
   * progressCallback wird nach jedem Teilnehmer aufgerufen.
   */
  async generateKombiniertesKontaktdatenblattFuerKurs(
    ausbildungId: string,
    progressCallback?: (progress: number, status: string) => void
  ): Promise<void> {
    try {
      const ausbildung = await this.ausbildungService.getAusbildungById(ausbildungId);
      if (!ausbildung) {
        console.error('Ausbildung nicht gefunden');
        return;
      }
      const teilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(ausbildungId);
      if (teilnahmen.length === 0) {
        console.warn('Keine Teilnehmer für diese Ausbildung gefunden');
        return;
      }
      const personen: Person[] = [];
      for (const t of teilnahmen) {
        const person = await this.personService.getPersonById(t.personId);
        if (person) {
          personen.push(person);
        }
      }
      if (personen.length === 0) {
        console.warn('Keine Personen gefunden');
        return;
      }
      const pdf = new jsPDF('p', 'mm', 'a4');
      const total = personen.length;
      for (let i = 0; i < total; i++) {
        const person = personen[i];
        if (i > 0) {
          pdf.addPage();
        }
        // Zwischenstatus-Update
        if (progressCallback) {
          progressCallback(Math.round(((i + 0.5) / total) * 100), `Erzeuge PDF für ${person.grunddaten.nachname}`);
        }
        const pdfElement = await this.buildPdfElementForPerson(person);
        document.body.appendChild(pdfElement);
        try {
          const canvas = await html2canvas(pdfElement, { 
            scale: 2, 
            useCORS: true,
            height: 1400 // Increased to match the other function
          });
          const imgData = canvas.toDataURL('image/png');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const ratio = canvas.width / canvas.height;
          const imgHeight = pdfWidth / ratio;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        } finally {
          document.body.removeChild(pdfElement);
        }
        if (progressCallback) {
          progressCallback(Math.round(((i + 1) / total) * 100), `Fertig mit ${person.grunddaten.nachname}`);
        }
      }
      pdf.save(`Kontaktdatenblaetter_${ausbildung.titel}_${ausbildung.jahr}.pdf`);
    } catch (error) {
      console.error('Fehler beim Generieren des kombinierten PDFs:', error);
      throw error;
    }
  }

  /**
   * Baut das HTML-Element für eine Person mit flexiblen Layout, zwei Spalten und mehreren Blöcken.
   */
  private async buildPdfElementForPerson(person: Person): Promise<HTMLElement> {
    const container = this.createBaseContainer();
    this.buildHeader(container);
    this.buildAddressBlock(container, person);
    this.buildTwoColumnSection(container, person);
    await this.buildNotfallkontakteSection(container, person);
    this.buildBeruflicheInfos(container, person);
    this.buildPersoenlicheInfos(container, person);
    this.buildFooter(container);
    return container;
  }

  private createBaseContainer(): HTMLElement {
    const div = this.renderer.createElement('div');
    // Position off-screen for rendering
    this.renderer.setStyle(div, 'position', 'absolute');
    this.renderer.setStyle(div, 'left', '-9999px');
    this.renderer.setStyle(div, 'top', '0');
    
    this.renderer.setStyle(div, 'padding', '10mm'); // Further increased padding
    this.renderer.setStyle(div, 'background', 'white');
    this.renderer.setStyle(div, 'font-family', 'Roboto, sans-serif');
    this.renderer.setStyle(div, 'font-size', '14px'); // Further increased font size
    this.renderer.setStyle(div, 'color', '#000');
    this.renderer.setStyle(div, 'width', '210mm'); // Set A4 width
    this.renderer.setStyle(div, 'min-height', '297mm'); // A4 height for footer positioning
    this.renderer.setStyle(div, 'position', 'relative'); // For footer positioning
    return div;
  }

  private buildHeader(parent: HTMLElement): void {
    const header = this.renderer.createElement('div');
    this.renderer.setStyle(header, 'display', 'flex');
    this.renderer.setStyle(header, 'justify-content', 'space-between');
    this.renderer.setStyle(header, 'align-items', 'center');
    this.renderer.setStyle(header, 'margin-bottom', '8mm'); // Increased margin
    this.renderer.setStyle(header, 'border-bottom', '1px solid #ddd');
    this.renderer.setStyle(header, 'padding-bottom', '3mm'); // Increased padding

    // Left side with logo
    const logoContainer = this.renderer.createElement('div');
    this.renderer.setStyle(logoContainer, 'flex', '0 0 50%');
    
    // Fix logo sizing - slightly larger than before
    const logo = this.renderer.createElement('img');
    this.renderer.setAttribute(logo, 'src', 'assets/logo_lang.png');
    this.renderer.setStyle(logo, 'width', '70mm'); // Increased width
    this.renderer.setStyle(logo, 'height', 'auto'); // Auto height to maintain aspect ratio
    this.renderer.setStyle(logo, 'max-width', '100%');
    this.renderer.appendChild(logoContainer, logo);
    this.renderer.appendChild(header, logoContainer);

    // Right side with title
    const titleContainer = this.renderer.createElement('div');
    this.renderer.setStyle(titleContainer, 'flex', '0 0 40%');
    this.renderer.setStyle(titleContainer, 'text-align', 'right');

    const title = this.renderer.createElement('h1');
    this.renderer.setStyle(title, 'margin', '0');
    this.renderer.setStyle(title, 'font-size', '22px'); // Increased font size
    this.renderer.setStyle(title, 'color', '#2e5288');
    this.renderer.appendChild(title, this.renderer.createText('Kontaktdatenblatt'));
    this.renderer.appendChild(titleContainer, title);
    this.renderer.appendChild(header, titleContainer);

    this.renderer.appendChild(parent, header);
  }

  private buildAddressBlock(parent: HTMLElement, person: Person): void {
    const block = this.renderer.createElement('div');
    this.renderer.setStyle(block, 'margin-bottom', '6mm');
    this.renderer.setStyle(block,'margin-top', '6mm');


    const anredeP = this.renderer.createElement('p');
    this.renderer.appendChild(anredeP, this.renderer.createText('Herr'));
    this.renderer.appendChild(block, anredeP);
    this.renderer.setStyle(anredeP, 'margin', '0 0 3px 0'); // Increased spacing

    const nameP = this.renderer.createElement('p');
    this.renderer.appendChild(nameP, this.renderer.createText(`${person.grunddaten.nachname} ${person.grunddaten.vorname}`));
    this.renderer.appendChild(block, nameP);
    this.renderer.setStyle(nameP, 'font-weight', 'bold');
    this.renderer.setStyle(nameP, 'font-size', '16px'); // Increased font size
    this.renderer.setStyle(nameP, 'margin', '0 0 3px 0'); // Increased spacing

    const strasseP = this.renderer.createElement('p');
    this.renderer.appendChild(strasseP, this.renderer.createText(person.kontaktdaten.strasse || ''));
    this.renderer.appendChild(block, strasseP);
    this.renderer.setStyle(strasseP, 'font-size', '16px'); // Increased font size
    this.renderer.setStyle(strasseP, 'margin', '0 0 3px 0'); // Increased spacing

    const ortP = this.renderer.createElement('p');
    this.renderer.appendChild(ortP, this.renderer.createText(`${person.kontaktdaten.plz} ${person.kontaktdaten.ort}`));
    this.renderer.appendChild(block, ortP);
    this.renderer.setStyle(ortP, 'margin', '0 0 3px 0'); // Increased spacing
    this.renderer.setStyle(ortP, 'font-size', '16px'); // Increased font size
    this.renderer.appendChild(parent, block);
  }

  private buildTwoColumnSection(parent: HTMLElement, person: Person): void {
    const row = this.renderer.createElement('div');
    this.renderer.setStyle(row, 'display', 'flex');
    this.renderer.setStyle(row, 'gap', '8mm'); // Increased gap
    this.renderer.setStyle(row, 'margin-bottom', '7mm'); // Increased margin

    // Linke Spalte: Kontaktdaten
    const left = this.renderer.createElement('div');
    this.renderer.setStyle(left, 'flex', '1');
    const leftTitle = this.renderer.createElement('h2');
    this.renderer.setStyle(leftTitle, 'margin-bottom', '6px'); // Increased margin
    this.renderer.setStyle(leftTitle, 'font-size', '16px'); // Increased font size
    this.renderer.setStyle(leftTitle, 'color', '#2e5288');
    this.renderer.appendChild(leftTitle, this.renderer.createText('Kontaktdaten'));
    this.renderer.appendChild(left, leftTitle);
    const leftTable = this.createTableElement();
    this.addRow(leftTable, 'Geburtsdatum', this.formatDate(person.grunddaten.geburtsdatum));
    this.addRow(leftTable, 'E-Mail', person.kontaktdaten.email || '-');
    this.addRow(leftTable, 'Telefon Festnetz', person.kontaktdaten.telefonFestnetz || '-');
    this.addRow(leftTable, 'Telefon Mobil', person.kontaktdaten.telefonMobil || '-');
    this.addRow(leftTable, 'Telefon Geschäftlich', person.kontaktdaten.telefonGeschaeftlich || '-');
    this.renderer.appendChild(left, leftTable);
    this.renderer.appendChild(row, left);

    // Rechte Spalte: Zivilschutz
    const right = this.renderer.createElement('div');
    this.renderer.setStyle(right, 'flex', '1');
    const rightTitle = this.renderer.createElement('h2');
    this.renderer.setStyle(rightTitle, 'margin-bottom', '6px'); // Increased margin
    this.renderer.setStyle(rightTitle, 'font-size', '16px'); // Increased font size
    this.renderer.setStyle(rightTitle, 'color', '#2e5288');
    this.renderer.appendChild(rightTitle, this.renderer.createText('Zivilschutz'));
    this.renderer.appendChild(right, rightTitle);
    const rightTable = this.createTableElement();
    this.addRow(rightTable, 'Grad', person.grunddaten.grad || '-');
    this.addRow(rightTable, 'Funktion', person.grunddaten.funktion || '-');
    this.addRow(rightTable, 'Grundausbildung (Jahr)', person.zivilschutz.grundausbildung || '-');
    const einteilung = `Zug ${person.zivilschutz.einteilung.zug}${
      person.zivilschutz.einteilung.gruppe ? ', Gruppe ' + person.zivilschutz.einteilung.gruppe : ''
    }`;
    this.addRow(rightTable, 'Einteilung', einteilung);
    const zusatz = person.zivilschutz.zusatzausbildungen?.length
      ? person.zivilschutz.zusatzausbildungen.join(', ')
      : '-';
    this.addRow(rightTable, 'Zusatzausbildungen', zusatz);
    this.renderer.appendChild(right, rightTable);
    this.renderer.appendChild(row, right);

    this.renderer.appendChild(parent, row);
  }

  private async buildNotfallkontakteSection(parent: HTMLElement, person: Person): Promise<void> {
    const section = this.createSection('Notfallkontakte');
    const table = this.createTableElement();

    try {
      const kontakte = await this.notfallkontaktService.getKontakteForPerson(person.id);
      if (kontakte && kontakte.length > 0) {
        kontakte.sort((a, b) => a.prioritaet - b.prioritaet);
        kontakte.forEach((kontakt, idx) => {
          this.addRow(table, `${idx + 1}. Kontakt`, '');
          this.addRow(table, 'Notfallnummer', kontakt.telefonnummer || '-');
          this.addRow(table, 'Name des Kontakts', kontakt.name || '-');
          this.addRow(table, 'Bezug zu Kontakt', kontakt.beziehung || '-');
        });
      } else {
        this.addRow(table, '1. Kontakt', '');
        this.addRow(table, 'Notfallnummer', '-');
        this.addRow(table, 'Name des Kontakts', '-');
        this.addRow(table, 'Bezug zu Kontakt', '-');

        this.addRow(table, '2. Kontakt', '');
        this.addRow(table, 'Notfallnummer', '-');
        this.addRow(table, 'Name des Kontakts', '-');
        this.addRow(table, 'Bezug zu Kontakt', '-');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Notfallkontakte:', error);
      this.addRow(table, 'Fehler beim Laden der Notfallkontakte', '');
    }

    this.renderer.appendChild(section, table);
    this.renderer.appendChild(parent, section);
  }

  private buildBeruflicheInfos(parent: HTMLElement, person: Person): void {
    const section = this.createSection('Berufliche Informationen');
    const table = this.createTableElement();
    this.addRow(table, 'Ausgeübter Beruf', person.berufliches.ausgeubterBeruf || '-');
    this.addRow(table, 'Erlernter Beruf', person.berufliches.erlernterBeruf || '-');
    this.addRow(table, 'Arbeitgeber', person.berufliches.arbeitgeber || '-');
    this.addRow(table, 'Zivile Spezialausbildung', person.berufliches.zivileSpezialausbildung || '-');
    const fuehrerausweis = person.berufliches.fuehrerausweisKategorie?.length
      ? person.berufliches.fuehrerausweisKategorie.join(', ')
      : '-';
    this.addRow(table, 'Führerausweis-Kategorie(n)', fuehrerausweis);
    this.renderer.appendChild(section, table);
    this.renderer.appendChild(parent, section);
  }

  private buildPersoenlicheInfos(parent: HTMLElement, person: Person): void {
    const section = this.createSection('Persönliche Informationen');
    const table = this.createTableElement();
    const sprachen = person.persoenliches.sprachkenntnisse?.length
      ? person.persoenliches.sprachkenntnisse.join(', ')
      : '-';
    this.addRow(table, 'Sprachkenntnisse', sprachen);
    const allergien = person.persoenliches.allergien?.length
      ? person.persoenliches.allergien.join(', ')
      : '-';
    this.addRow(table, 'Allergien', allergien, true);
    const ess = person.persoenliches.essgewohnheiten?.length
      ? person.persoenliches.essgewohnheiten.join(', ')
      : '-';
    this.addRow(table, 'Essgewohnheiten', ess, true);
    this.addRow(table, 'Blutgruppe', person.persoenliches.blutgruppe || '-', true);

    this.renderer.appendChild(section, table);
    this.renderer.appendChild(parent, section);
  }

  private buildMetadatenSection(parent: HTMLElement, person: Person): void {
    if (!person.metadaten) return;
    const section = this.createSection('Metadaten');
    const table = this.createTableElement();
    this.addRow(table, 'Letzte Aktualisierung', this.formatDate(person.metadaten.letzteAktualisierung));
    this.addRow(table, 'Aktualisiert von', person.metadaten.aktualisiert_von || '-');
    this.renderer.appendChild(section, table);
    this.renderer.appendChild(parent, section);
  }
  private buildFooter(parent: HTMLElement): void {
    const footer = this.renderer.createElement('div');
    this.renderer.setStyle(footer, 'display', 'flex');
    this.renderer.setStyle(footer, 'justify-content', 'space-between');
    
    // Position footer at bottom
    this.renderer.setStyle(footer, 'position', 'absolute');
    this.renderer.setStyle(footer, 'bottom', '10mm');
    this.renderer.setStyle(footer, 'left', '10mm');
    this.renderer.setStyle(footer, 'right', '10mm');
    
    // Further footer styling
    const ortDatum = this.renderer.createElement('div');
    this.renderer.setStyle(ortDatum, 'width', '45%');
    this.renderer.setStyle(ortDatum, 'border-top', '1px solid #333');
    this.renderer.setStyle(ortDatum, 'padding-top', '8px'); // Increased padding
    this.renderer.setStyle(ortDatum, 'font-style', 'italic');
    this.renderer.setStyle(ortDatum, 'color', '#555');
    this.renderer.setStyle(ortDatum, 'font-size', '14px'); // Increased font size
    this.renderer.appendChild(ortDatum, this.renderer.createText('Ort / Datum'));
    this.renderer.appendChild(footer, ortDatum);

    const unterschrift = this.renderer.createElement('div');
    this.renderer.setStyle(unterschrift, 'width', '45%');
    this.renderer.setStyle(unterschrift, 'border-top', '1px solid #333');
    this.renderer.setStyle(unterschrift, 'padding-top', '8px'); // Increased padding
    this.renderer.setStyle(unterschrift, 'font-style', 'italic');
    this.renderer.setStyle(unterschrift, 'color', '#555');
    this.renderer.setStyle(unterschrift, 'font-size', '14px'); // Increased font size
    this.renderer.appendChild(unterschrift, this.renderer.createText('Unterschrift'));
    this.renderer.appendChild(footer, unterschrift);

    this.renderer.appendChild(parent, footer);
  }

  private createSection(titleText: string): HTMLElement {
    const section = this.renderer.createElement('div');
    this.renderer.setStyle(section, 'margin-bottom', '7mm'); // Increased margin
    
    const h2 = this.renderer.createElement('h2');
    this.renderer.setStyle(h2, 'font-size', '16px'); // Increased font size
    this.renderer.setStyle(h2, 'margin', '0 0 5px 0'); // Increased margin
    this.renderer.setStyle(h2, 'color', '#2e5288');
    this.renderer.setStyle(h2, 'border-bottom', '1px solid #ccc');
    this.renderer.setStyle(h2, 'padding-bottom', '1px'); // Minimal padding
    this.renderer.appendChild(h2, this.renderer.createText(titleText));
    this.renderer.appendChild(section, h2);
    return section;
  }

  private createTableElement(): HTMLElement {
    const table = this.renderer.createElement('table');
    this.renderer.setStyle(table, 'width', '100%');
    this.renderer.setStyle(table, 'border-collapse', 'collapse');
    this.renderer.setStyle(table, 'box-shadow', '0 1px 3px rgba(0,0,0,0.1)');
    return table;
  }

  private addRow(table: HTMLElement, label: string, value: string, isRed = false): void {
    const row = this.renderer.createElement('tr');
    this.renderer.setStyle(row, 'background-color', '#f8f9fa');
    
    const labelCell = this.renderer.createElement('td');
    this.renderer.setStyle(labelCell, 'border', '1px solid #ddd');
    this.renderer.setStyle(labelCell, 'padding', '5px 7px'); // Increased padding
    this.renderer.setStyle(labelCell, 'font-weight', 'bold');
    this.renderer.setStyle(labelCell, 'width', '30%');
    this.renderer.setStyle(labelCell, 'white-space', 'nowrap');
    this.renderer.setStyle(labelCell, 'background-color', '#e9ecef');
    this.renderer.appendChild(labelCell, this.renderer.createText(label));

    const valueCell = this.renderer.createElement('td');
    this.renderer.setStyle(valueCell, 'border', '1px solid #ddd');
    this.renderer.setStyle(valueCell, 'padding', '5px 7px'); // Increased padding
    this.renderer.setStyle(valueCell, 'width', '70%');
    if (isRed) {
      this.renderer.setStyle(valueCell, 'color', '#d9230f');
      this.renderer.setStyle(valueCell, 'font-weight', '500');
    }
    this.renderer.appendChild(valueCell, this.renderer.createText(value));

    this.renderer.appendChild(row, labelCell);
    this.renderer.appendChild(row, valueCell);
    this.renderer.appendChild(table, row);
  }

  private formatDate(date: any): string {
    if (!date) return '-';
    try {
      if (typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('de-CH');
      }
      return new Date(date).toLocaleDateString('de-CH');
    } catch {
      return '-';
    }
  }
}
