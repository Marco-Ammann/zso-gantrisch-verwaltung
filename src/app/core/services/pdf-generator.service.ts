import { Injectable } from '@angular/core';
import { Person } from '../models/person.model';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Service zur Generierung von PDF-Dokumenten
 */
@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {
  
  constructor() { }
  
  /**
   * Generiert ein Kontaktdatenblatt als PDF für eine Person
   * @param person Personendaten
   * @returns Promise<void>
   */
  async generateKontaktdatenblatt(person: Person): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    // Titel und Kopfdaten
    doc.setFontSize(20);
    doc.text('Kontaktdatenblatt', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`${person.grunddaten.grad} ${person.grunddaten.vorname} ${person.grunddaten.nachname}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Funktion: ${person.grunddaten.funktion}`, pageWidth / 2, 40, { align: 'center' });
    
    // Linie zeichnen
    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);
    
    // Abschnitt: Persönliche Daten
    let yPos = 55;
    doc.setFontSize(14);
    doc.text('Persönliche Daten', margin, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Geburtsdatum: ${this.formatDate(person.grunddaten.geburtsdatum)}`, margin, yPos);
    yPos += 7;
    
    // Abschnitt: Kontaktdaten
    yPos += 5;
    doc.setFontSize(14);
    doc.text('Kontaktdaten', margin, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Adresse: ${person.kontaktdaten.strasse}, ${person.kontaktdaten.plz} ${person.kontaktdaten.ort}`, margin, yPos);
    yPos += 7;
    doc.text(`E-Mail: ${person.kontaktdaten.email}`, margin, yPos);
    yPos += 7;
    doc.text(`Telefon Mobil: ${person.kontaktdaten.telefonMobil}`, margin, yPos);
    yPos += 7;
    
    if (person.kontaktdaten.telefonFestnetz) {
      doc.text(`Telefon Festnetz: ${person.kontaktdaten.telefonFestnetz}`, margin, yPos);
      yPos += 7;
    }
    
    if (person.kontaktdaten.telefonGeschaeftlich) {
      doc.text(`Telefon Geschäftlich: ${person.kontaktdaten.telefonGeschaeftlich}`, margin, yPos);
      yPos += 7;
    }
    
    // Abschnitt: Zivilschutz
    yPos += 5;
    doc.setFontSize(14);
    doc.text('Zivilschutz', margin, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Grundausbildung: ${person.zivilschutz.grundausbildung}`, margin, yPos);
    yPos += 7;
    doc.text(`Einteilung: Zug ${person.zivilschutz.einteilung.zug}${person.zivilschutz.einteilung.gruppe ? ', Gruppe ' + person.zivilschutz.einteilung.gruppe : ''}`, margin, yPos);
    yPos += 7;
    doc.text(`Status: ${person.zivilschutz.status}`, margin, yPos);
    yPos += 7;
    
    if (person.zivilschutz.zusatzausbildungen && person.zivilschutz.zusatzausbildungen.length > 0) {
      doc.text('Zusatzausbildungen:', margin, yPos);
      yPos += 7;
      
      person.zivilschutz.zusatzausbildungen.forEach(ausbildung => {
        doc.text(`- ${ausbildung}`, margin + 5, yPos);
        yPos += 5;
      });
    }
    
    // Abschnitt: Persönliches (optional)
    if (this.hasPersonalInfo(person)) {
      yPos += 5;
      doc.setFontSize(14);
      doc.text('Persönliches', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      
      if (person.persoenliches.blutgruppe) {
        doc.text(`Blutgruppe: ${person.persoenliches.blutgruppe}`, margin, yPos);
        yPos += 7;
      }
      
      if (person.persoenliches.allergien && person.persoenliches.allergien.length > 0) {
        doc.text('Allergien:', margin, yPos);
        yPos += 7;
        
        person.persoenliches.allergien.forEach(allergie => {
          doc.text(`- ${allergie}`, margin + 5, yPos);
          yPos += 5;
        });
      }
      
      if (person.persoenliches.essgewohnheiten && person.persoenliches.essgewohnheiten.length > 0) {
        doc.text('Essgewohnheiten:', margin, yPos);
        yPos += 7;
        
        person.persoenliches.essgewohnheiten.forEach(essgewohnheit => {
          doc.text(`- ${essgewohnheit}`, margin + 5, yPos);
          yPos += 5;
        });
      }
    }
    
    // Abschnitt: Berufliches (optional)
    if (this.hasProfessionalInfo(person)) {
      yPos += 5;
      doc.setFontSize(14);
      doc.text('Berufliches', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      
      if (person.berufliches.ausgeubterBeruf) {
        doc.text(`Ausgeübter Beruf: ${person.berufliches.ausgeubterBeruf}`, margin, yPos);
        yPos += 7;
      }
      
      if (person.berufliches.erlernterBeruf) {
        doc.text(`Erlernter Beruf: ${person.berufliches.erlernterBeruf}`, margin, yPos);
        yPos += 7;
      }
      
      if (person.berufliches.arbeitgeber) {
        doc.text(`Arbeitgeber: ${person.berufliches.arbeitgeber}`, margin, yPos);
        yPos += 7;
      }
      
      if (person.berufliches.führerausweisKategorie && person.berufliches.führerausweisKategorie.length > 0) {
        doc.text(`Führerausweis-Kategorien: ${person.berufliches.führerausweisKategorie.join(', ')}`, margin, yPos);
        yPos += 7;
      }
    }
    
    // Fußzeile
    const footerYPos = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-CH')}`, margin, footerYPos);
    doc.text('ZSO Gantrisch Verwaltungssystem', pageWidth - margin, footerYPos, { align: 'right' });
    
    // PDF speichern oder öffnen
    doc.save(`Kontaktdatenblatt_${person.grunddaten.nachname}_${person.grunddaten.vorname}.pdf`);
  }
  
  /**
   * Generiert ein PDF aus einem HTML-Element
   * @param element HTML-Element
   * @param filename Dateiname
   * @returns Promise<void>
   */
  async generatePdfFromHtml(element: HTMLElement, filename: string): Promise<void> {
    // Element in Canvas umwandeln
    const canvas = await html2canvas(element, {
      scale: 2, // Höhere Auflösung
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Bildgröße berechnen, um es in A4 einzupassen
    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  }
  
  /**
   * Generiert eine Personalliste als PDF
   * @param personen Array von Personen
   * @returns Promise<void>
   */
  async generatePersonalliste(personen: Person[]): Promise<void> {
    const doc = new jsPDF('l', 'mm', 'a4'); // Querformat
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    
    // Titel
    doc.setFontSize(16);
    doc.text('Personalliste ZSO Gantrisch', pageWidth / 2, 15, { align: 'center' });
    
    // Tabellenkopf
    const headers = ['Grad', 'Name', 'Funktion', 'Telefon', 'E-Mail', 'Zug', 'Status'];
    const colWidths = [15, 40, 30, 25, 50, 10, 20]; // Spaltenbreiten in mm
    
    // Startpositionen
    let yPos = 25;
    let startX = margin;
    
    // Schriftgrößen
    const headerFontSize = 10;
    const contentFontSize = 9;
    const rowHeight = 7;
    
    // Tabellenkopf zeichnen
    doc.setFontSize(headerFontSize);
    doc.setFont('helvetica', 'bold');
    
    headers.forEach((header, i) => {
      doc.text(header, startX, yPos);
      startX += colWidths[i];
    });
    
    yPos += 5;
    
    // Linie unter dem Tabellenkopf
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    yPos += 5;
    
    // Tabellendaten
    doc.setFontSize(contentFontSize);
    doc.setFont('helvetica', 'normal');
    
    personen.forEach((person, index) => {
      // Neue Seite, wenn nötig
      if (yPos > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPos = 25;
        
        // Tabellenkopf auf der neuen Seite wiederholen
        startX = margin;
        doc.setFontSize(headerFontSize);
        doc.setFont('helvetica', 'bold');
        
        headers.forEach((header, i) => {
          doc.text(header, startX, yPos);
          startX += colWidths[i];
        });
        
        yPos += 5;
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        
        yPos += 5;
        doc.setFontSize(contentFontSize);
        doc.setFont('helvetica', 'normal');
      }
      
      // Zeilenhintergrund für abwechselnde Zeilen
      if (index % 2 === 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos - 5, pageWidth - (2 * margin), rowHeight, 'F');
      }
      
      // Daten schreiben
      startX = margin;
      
      doc.text(person.grunddaten.grad, startX, yPos);
      startX += colWidths[0];
      
      doc.text(`${person.grunddaten.nachname} ${person.grunddaten.vorname}`, startX, yPos);
      startX += colWidths[1];
      
      doc.text(person.grunddaten.funktion, startX, yPos);
      startX += colWidths[2];
      
      doc.text(person.kontaktdaten.telefonMobil, startX, yPos);
      startX += colWidths[3];
      
      doc.text(person.kontaktdaten.email, startX, yPos);
      startX += colWidths[4];
      
      doc.text(person.zivilschutz.einteilung.zug.toString(), startX, yPos);
      startX += colWidths[5];
      
      doc.text(person.zivilschutz.status, startX, yPos);
      
      yPos += rowHeight;
    });
    
    // Fußzeile
    const footerYPos = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-CH')}`, margin, footerYPos);
    doc.text(`Anzahl Personen: ${personen.length}`, pageWidth - margin, footerYPos, { align: 'right' });
    
    // PDF speichern
    doc.save('Personalliste_ZSO_Gantrisch.pdf');
  }
  
  /**
   * Formatiert ein Datum für die Anzeige
   * @param date Datum
   * @returns Formatiertes Datum als String
   */
  private formatDate(date: Date | string): string {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleDateString('de-CH');
  }
  
  /**
   * Prüft, ob persönliche Informationen vorhanden sind
   * @param person Person
   * @returns true, wenn persönliche Informationen vorhanden sind
   */
  private hasPersonalInfo(person: Person): boolean {
    const p = person.persoenliches;
    
    return !!(p.blutgruppe || 
      (p.allergien && p.allergien.length > 0) || 
      (p.essgewohnheiten && p.essgewohnheiten.length > 0) ||
      (p.sprachkenntnisse && p.sprachkenntnisse.length > 0) ||
      (p.besonderheiten && p.besonderheiten.length > 0));
  }
  
  /**
   * Prüft, ob berufliche Informationen vorhanden sind
   * @param person Person
   * @returns true, wenn berufliche Informationen vorhanden sind
   */
  private hasProfessionalInfo(person: Person): boolean {
    const b = person.berufliches;
    
    return !!(b.ausgeubterBeruf || 
      b.erlernterBeruf || 
      b.arbeitgeber ||
      (b.führerausweisKategorie && b.führerausweisKategorie.length > 0) ||
      b.zivileSpezialausbildung);
  }
}