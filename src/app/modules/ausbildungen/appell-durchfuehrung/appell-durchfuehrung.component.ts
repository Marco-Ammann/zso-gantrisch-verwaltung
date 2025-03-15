import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { SelectionModel } from '@angular/cdk/collections';
import { signal, computed } from '@angular/core';

import { AusbildungService } from '../../../core/services/ausbildung.service';
import { PersonService } from '../../../core/services/person.service';
import { TeilnahmeService } from '../../../core/services/teilnahme.service';
import { NotfallkontaktService } from '../../../core/services/notfallkontakt.service';
import { Ausbildung } from '../../../core/models/ausbildung.model';
import { Person, NotfallKontakt } from '../../../core/models/person.model';
import { Ausbildungsteilnahme } from '../../../core/models/teilnahme.model';
import { PhoneSelectionDialogComponent } from '../../../shared/ui/phone-selection-dialog/phone-selection-dialog.component';
import { EmergencyContactsDialogComponent } from '../../../shared/ui/emergency-contacts-dialog/emergency-contacts-dialog.component';
import { LoadingDialogComponent } from '../../../shared/ui/loading-dialog/loading-dialog.component';

interface TeilnehmerWithInfo extends Person {
  teilnahmeInfo?: Record<string, Ausbildungsteilnahme>;
  isNew?: boolean;
}

interface DayTab {
  date: Date;
  formattedDate: string;
  shortDate: string;
  dateString: string; // for data lookup (YYYY-MM-DD)
  startTime?: string; // Add start time
  endTime?: string;   // Add end time
}

interface AttendanceStatistics {
  total: number;
  present: number;
  excused: number;
  absent: number;
  unprocessed: number;
}

@Component({
  selector: 'app-appell-durchfuehrung',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule,
    MatTabsModule
  ],
  templateUrl: './appell-durchfuehrung.component.html',
  styleUrls: ['./appell-durchfuehrung.component.scss']
})
export class AppellDurchfuehrungComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private ausbildungService = inject(AusbildungService);
  private personService = inject(PersonService);
  private teilnahmeService = inject(TeilnahmeService);
  private notfallkontaktService = inject(NotfallkontaktService);
  private snackBar = inject(MatSnackBar);

  // Signals
  ausbildung = signal<Ausbildung | null>(null);
  personen = signal<Person[]>([]);
  teilnahmen = signal<Ausbildungsteilnahme[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  selectedTeilnehmer = signal<TeilnehmerWithInfo[]>([]);
  selectedDay = signal<string | null>(null);
  
  // Date tabs representing each day of the training
  dateTabs = signal<DayTab[]>([]);
  
  // Computed properties
  availableDays = computed(() => this.dateTabs());
  statistics = computed(() => this.calculateStatistics());
  
  // Training ID
  ausbildungId: string | null = null;
  
  // Table configuration
  displayedColumns: string[] = ['grad', 'name', 'einteilung', 'status', 'bemerkung', 'aktionen'];
  dataSource = signal(new MatTableDataSource<TeilnehmerWithInfo>([]));
  
  // Form controls
  searchControl = new FormControl('');
  statusFilterControl = new FormControl('alle');
  
  // Status options
  statusOptions = [
    { value: 'teilgenommen', label: 'Anwesend' },
    { value: 'nicht teilgenommen', label: 'Abwesend' },
    { value: 'dispensiert', label: 'Entschuldigt' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.ausbildungId = id;
        this.loadData(id);
      } else {
        this.showSnackBar('Keine Ausbildungs-ID gefunden');
        this.router.navigate(['/ausbildungen']);
      }
    });

    // Set up search and filter functionality
    this.searchControl.valueChanges.subscribe(() => {
      this.updateDataSource();
    });

    this.statusFilterControl.valueChanges.subscribe(() => {
      this.updateDataSource();
    });
  }

  /**
   * Loads all required data
   */
  async loadData(ausbildungId: string): Promise<void> {
    this.isLoading.set(true);
    
    try {
      // Load training data
      const ausbildung = await this.ausbildungService.getAusbildungById(ausbildungId);
      this.ausbildung.set(ausbildung);
      
      if (!ausbildung) {
        this.showSnackBar('Ausbildung nicht gefunden');
        this.router.navigate(['/ausbildungen']);
        return;
      }
      
      // Generate tabs for each day in the training range
      this.generateDateTabs(ausbildung);
      
      // Load participants
      await this.loadTeilnehmerData();
      
      // Select the first day by default
      if (this.dateTabs().length > 0) {
        this.selectedDay.set(this.dateTabs()[0].dateString);
      }
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      this.showSnackBar('Fehler beim Laden der Daten');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Generate tabs for each day in the training period
   */
  private generateDateTabs(ausbildung: Ausbildung): void {
    const tabs: DayTab[] = [];
    
    // If we have startDatum and endDatum, use those, otherwise fallback to datum
    let startDate: Date;
    let endDate: Date;
    
    if (ausbildung.startDatum && ausbildung.endDatum) {
      startDate = this.toJSDate(ausbildung.startDatum);
      endDate = this.toJSDate(ausbildung.endDatum);
    } else if (ausbildung.datum) {
      startDate = this.toJSDate(ausbildung.datum);
      endDate = this.toJSDate(ausbildung.datum);
    } else {
      // No dates specified, use today as fallback
      startDate = new Date();
      endDate = new Date();
    }
    
    // Generate a tab for each day in the range
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const date = new Date(currentDate);
      const dateString = this.formatDateForDataLookup(date);
      const weekday = date.toLocaleDateString('de-CH', { weekday: 'short' });
      const dayNum = date.getDate();
      
      tabs.push({
        date: date,
        formattedDate: this.formatDate(date),
        shortDate: `${weekday}. ${dayNum}.`,
        dateString: dateString,
        startTime: ausbildung.startZeit || '08:00', // Add time information
        endTime: ausbildung.endZeit || '17:00'     // Add time information
      });
      
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    this.dateTabs.set(tabs);
  }

  /**
   * Convert to JavaScript Date
   */
  private toJSDate(date: any): Date {
    return typeof date.toDate === 'function' 
      ? date.toDate() 
      : new Date(date);
  }

  /**
   * Format date for data lookup (YYYY-MM-DD)
   */
  private formatDateForDataLookup(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Load participants and attendance data
   */
  async loadTeilnehmerData(): Promise<void> {
    if (!this.ausbildungId) return;
    
    try {
      // Load all active persons
      await this.personService.loadPersonen();
      const aktivPersonen = this.personService.personen().filter(p => p.zivilschutz?.status === 'aktiv');
      this.personen.set(aktivPersonen);
      
      // Load existing attendance records for this training
      const teilnahmen = await this.teilnahmeService.getTeilnahmenByAusbildung(this.ausbildungId);
      this.teilnahmen.set(teilnahmen);
      
      // Organize attendance records by person and date
      const teilnahmenByPerson: Record<string, Record<string, Ausbildungsteilnahme>> = {};
      
      for (const teilnahme of teilnahmen) {
        const personId = teilnahme.personId;
        const date = this.formatDateForDataLookup(this.toJSDate(teilnahme.datum));
        
        if (!teilnahmenByPerson[personId]) {
          teilnahmenByPerson[personId] = {};
        }
        
        teilnahmenByPerson[personId][date] = teilnahme;
      }
      
      // Create initial selected teilnehmer with attendance info
      const initialTeilnehmer: TeilnehmerWithInfo[] = [];
      
      for (const personId in teilnahmenByPerson) {
        const person = aktivPersonen.find(p => p.id === personId);
        if (person) {
          initialTeilnehmer.push({
            ...person,
            teilnahmeInfo: teilnahmenByPerson[personId],
            isNew: false
          });
        }
      }
      
      // Set the selected teilnehmer and update data source
      this.selectedTeilnehmer.set(initialTeilnehmer);
      this.updateDataSource();
    } catch (error) {
      console.error('Fehler beim Laden der Teilnehmerdaten:', error);
      this.showSnackBar('Fehler beim Laden der Teilnehmerdaten');
    }
  }

  /**
   * Update the data source based on filters and selected day
   */
  updateDataSource(): void {
    // Apply filters to the selected participants
    let filteredPersons = this.filteredTeilnehmer();
    
    // Update the data source
    this.dataSource().data = filteredPersons;
  }

  /**
   * Filter participants based on search term and status
   */
  filteredTeilnehmer(): TeilnehmerWithInfo[] {
    // Start with all selected participants
    let filteredPersons = [...this.selectedTeilnehmer()];
    
    // Apply search filter
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filteredPersons = filteredPersons.filter(p => 
        p.grunddaten?.nachname?.toLowerCase().includes(searchTerm) ||
        p.grunddaten?.vorname?.toLowerCase().includes(searchTerm) ||
        p.grunddaten?.grad?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply status filter if not "alle"
    const statusFilter = this.statusFilterControl.value;
    const currentDay = this.selectedDay();
    
    if (statusFilter && statusFilter !== 'alle' && currentDay) {
      filteredPersons = filteredPersons.filter(p => {
        const teilnahmeInfo = p.teilnahmeInfo ? p.teilnahmeInfo[currentDay] : undefined;
        
        if (!teilnahmeInfo && statusFilter === 'unbearbeitet') {
          return true;
        } else if (!teilnahmeInfo) {
          return false;
        }
        
        if (statusFilter === 'anwesend') {
          return teilnahmeInfo.status === 'teilgenommen';
        } else if (statusFilter === 'entschuldigt') {
          return teilnahmeInfo.status === 'dispensiert';
        } else if (statusFilter === 'abwesend') {
          return teilnahmeInfo.status === 'nicht teilgenommen';
        }
        
        return false;
      });
    }
    
    return filteredPersons;
  }

  /**
   * Get status for a participant on the current day
   */
  getStatus(person: TeilnehmerWithInfo): string | undefined {
    const currentDay = this.selectedDay();
    if (!currentDay || !person.teilnahmeInfo || !person.teilnahmeInfo[currentDay]) {
      return undefined;
    }
    return person.teilnahmeInfo[currentDay].status;
  }

  /**
   * Get remarks for a participant on the current day
   */
  getBemerkung(person: TeilnehmerWithInfo): string {
    const currentDay = this.selectedDay();
    if (!currentDay || !person.teilnahmeInfo || !person.teilnahmeInfo[currentDay]) {
      return '';
    }
    return person.teilnahmeInfo[currentDay].bemerkung || '';
  }

  /**
   * Handle tab selection
   */
  onTabChange(event: any): void {
    const selectedDay = this.dateTabs()[event.index].dateString;
    this.selectedDay.set(selectedDay);
    this.updateDataSource();
  }

  /**
   * Update status for a participant on the current day
   */
  async updateStatus(person: TeilnehmerWithInfo, newStatus: string): Promise<void> {
    if (!this.ausbildungId || !this.selectedDay()) return;
    
    try {
      const currentDay = this.selectedDay()!;
      const currentDate = this.dateTabs().find(tab => tab.dateString === currentDay)?.date;
      
      if (!currentDate) return;
      
      // Check if we already have an attendance record for this day
      if (person.teilnahmeInfo && person.teilnahmeInfo[currentDay]) {
        // Update existing attendance
        await this.teilnahmeService.updateTeilnahme(person.teilnahmeInfo[currentDay].id, {
          status: newStatus as 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert',
          bemerkung: person.teilnahmeInfo[currentDay].bemerkung || ''
        });
        
        // Update local data
        person.teilnahmeInfo[currentDay].status = newStatus as 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert';
      } else {
        // Create new attendance record
        const newId = await this.teilnahmeService.createTeilnahme({
          personId: person.id,
          ausbildungId: this.ausbildungId,
          datum: currentDate,
          status: newStatus as 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert',
          bemerkung: ''
        });
        
        // Create or update the teilnahmeInfo object
        if (!person.teilnahmeInfo) {
          person.teilnahmeInfo = {};
        }
        
        // Add the new attendance record
        person.teilnahmeInfo[currentDay] = {
          id: newId,
          personId: person.id,
          ausbildungId: this.ausbildungId,
          datum: currentDate,
          status: newStatus as 'teilgenommen' | 'nicht teilgenommen' | 'dispensiert',
          bemerkung: ''
        };
      }
      
      // Update the UI
      this.updateDataSource();
      this.showSnackBar(`Status für ${person.grunddaten?.nachname} aktualisiert`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      this.showSnackBar('Fehler beim Aktualisieren des Status');
    }
  }

  /**
   * Update remarks for a participant on the current day
   */
  async updateBemerkung(person: TeilnehmerWithInfo, event: Event): Promise<void> {
    if (!this.ausbildungId || !this.selectedDay()) return;
    
    const input = event.target as HTMLInputElement;
    const bemerkung = input.value;
    const currentDay = this.selectedDay()!;
    const currentDate = this.dateTabs().find(tab => tab.dateString === currentDay)?.date;
    
    if (!currentDate) return;
    
    try {
      // Check if we have an attendance record for this day
      if (person.teilnahmeInfo && person.teilnahmeInfo[currentDay]) {
        // Update existing attendance
        await this.teilnahmeService.updateTeilnahme(person.teilnahmeInfo[currentDay].id, {
          bemerkung
        });
        
        // Update local data
        person.teilnahmeInfo[currentDay].bemerkung = bemerkung;
        
        this.showSnackBar(`Bemerkung für ${person.grunddaten?.nachname} aktualisiert`);
      } else {
        // Create new attendance record with remark and a default status
        const newId = await this.teilnahmeService.createTeilnahme({
          personId: person.id,
          ausbildungId: this.ausbildungId,
          datum: currentDate,
          bemerkung,
          status: 'nicht teilgenommen' // Add required status field
        });
        
        // Create or update the teilnahmeInfo object
        if (!person.teilnahmeInfo) {
          person.teilnahmeInfo = {};
        }
        
        // Add the new attendance record with status
        person.teilnahmeInfo[currentDay] = {
          id: newId,
          personId: person.id,
          ausbildungId: this.ausbildungId,
          datum: currentDate,
          bemerkung,
          status: 'nicht teilgenommen' // Add required status field
        };
        
        this.showSnackBar(`Bemerkung für ${person.grunddaten?.nachname} hinzugefügt`);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Bemerkung:', error);
      this.showSnackBar('Fehler beim Aktualisieren der Bemerkung');
    }
  }

  /**
   * Reset filters
   */
  resetFilters(): void {
    this.searchControl.setValue('');
    this.statusFilterControl.setValue('alle');
  }

  /**
   * Navigate back to training details
   */
  goBack(): void {
    if (this.ausbildungId) {
      this.router.navigate(['/ausbildungen', this.ausbildungId]);
    } else {
      this.router.navigate(['/ausbildungen']);
    }
  }

  /**
   * Show notification
   */
  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  /**
   * Format date for display
   */
  formatDate(date: any): string {
    if (!date) return '';
    
    const jsDate = typeof date.toDate === 'function' 
      ? date.toDate() 
      : new Date(date);
      
    return jsDate.toLocaleDateString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Format date with time for display
   */
  formatDateWithTime(date: any, time?: string): string {
    if (!date) return '';
    
    const jsDate = typeof date.toDate === 'function' 
      ? date.toDate() 
      : new Date(date);
      
    const dateString = jsDate.toLocaleDateString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    if (time) {
      return `${dateString}, ${time} Uhr`;
    }
    
    return dateString;
  }

  /**
   * Get CSS class based on status
   */
  getStatusClass(person: TeilnehmerWithInfo): string {
    const currentDay = this.selectedDay();
    if (!currentDay || !person.teilnahmeInfo || !person.teilnahmeInfo[currentDay]) {
      return '';
    }
    
    const status = person.teilnahmeInfo[currentDay].status;
    switch (status) {
      case 'teilgenommen': return 'status-anwesend';
      case 'dispensiert': return 'status-entschuldigt';
      case 'nicht teilgenommen': return 'status-abwesend';
      default: return '';
    }
  }

  /**
   * Get status label for display
   */
  getStatusLabel(person: TeilnehmerWithInfo): string {
    const currentDay = this.selectedDay();
    if (!currentDay || !person.teilnahmeInfo || !person.teilnahmeInfo[currentDay]) {
      return 'Unbearbeitet';
    }
    
    const status = person.teilnahmeInfo[currentDay].status;
    switch (status) {
      case 'teilgenommen': return 'Anwesend';
      case 'dispensiert': return 'Entschuldigt';
      case 'nicht teilgenommen': return 'Abwesend';
      default: return 'Unbearbeitet';
    }
  }

  /**
   * Save changes and navigate back
   */
  async saveAndExit(): Promise<void> {
    if (!this.ausbildungId) return;
    
    this.isSaving.set(true);
    
    try {
      this.showSnackBar('Änderungen wurden gespeichert');
      this.router.navigate(['/ausbildungen', this.ausbildungId]);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      this.showSnackBar('Fehler beim Speichern');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * View person details
   */
  viewPersonDetails(person: Person): void {
    this.router.navigate(['/personen', person.id]);
  }

  /**
   * Open context menu
   */
  openMenu(event: MouseEvent, trigger: MatMenuTrigger): void {
    event.preventDefault();
    event.stopPropagation();
    trigger.openMenu();
  }

  /**
   * Send email to participant
   */
  sendEmail(person: TeilnehmerWithInfo): void {
    if (person.kontaktdaten?.email) {
      window.open(`mailto:${person.kontaktdaten.email}`);
    } else {
      this.showSnackBar('Keine E-Mail-Adresse hinterlegt');
    }
  }

  /**
   * Call a person, show dialog to choose phone number if multiple exist
   */
  call(person: TeilnehmerWithInfo): void {
    const phones = [];
    
    // Collect all phone numbers with correct property names
    if (person.kontaktdaten?.telefonMobil) {
      phones.push({ type: 'mobile', number: person.kontaktdaten.telefonMobil });
    }
    
    if (person.kontaktdaten?.telefonFestnetz) {
      phones.push({ type: 'home', number: person.kontaktdaten.telefonFestnetz });
    }
    
    if (person.kontaktdaten?.telefonGeschaeftlich) {
      phones.push({ type: 'work', number: person.kontaktdaten.telefonGeschaeftlich });
    }
    
    const personName = `${person.grunddaten?.grad || ''} ${person.grunddaten?.nachname} ${person.grunddaten?.vorname}`.trim();
    
    if (phones.length === 0) {
      this.showSnackBar('Keine Telefonnummer vorhanden');
      return;
    }
    
    if (phones.length === 1) {
      // If only one phone number, call directly
      window.open(`tel:${phones[0].number.replace(/\s+/g, '')}`);
    } else {
      // If multiple phone numbers, show dialog to choose
      const dialogRef = this.dialog.open(PhoneSelectionDialogComponent, {
        width: '350px',
        data: { phones, personName }
      });
    }
  }

  /**
   * Show emergency contacts for a person
   */
  async showEmergencyContacts(person: TeilnehmerWithInfo): Promise<void> {
    const personName = `${person.grunddaten?.grad || ''} ${person.grunddaten?.nachname} ${person.grunddaten?.vorname}`.trim();
    
    try {
      // Show loading dialog
      const loadingDialogRef = this.dialog.open(LoadingDialogComponent, {
        width: '300px',
        disableClose: true,
        data: { message: 'Notfallkontakte werden geladen...' }
      });
      
      // Load emergency contacts from service
      const emergencyContacts = await this.notfallkontaktService.getNotfallkontakteByPerson(person.id);
      
      // Close loading dialog
      loadingDialogRef.close();
      
      // Show emergency contacts dialog
      this.dialog.open(EmergencyContactsDialogComponent, {
        width: '500px',
        data: { 
          personName,
          contacts: emergencyContacts
        }
      });
    } catch (error) {
      console.error('Fehler beim Laden der Notfallkontakte:', error);
      this.showSnackBar('Fehler beim Laden der Notfallkontakte');
    }
  }

  /**
   * Calculate statistics for current day
   */
  private calculateStatistics(): AttendanceStatistics {
    const total = this.selectedTeilnehmer().length;
    const currentDay = this.selectedDay();
    let present = 0;
    let excused = 0;
    let absent = 0;
    
    if (currentDay) {
      for (const person of this.selectedTeilnehmer()) {
        if (person.teilnahmeInfo && person.teilnahmeInfo[currentDay]) {
          const status = person.teilnahmeInfo[currentDay].status;
          if (status === 'teilgenommen') present++;
          else if (status === 'dispensiert') excused++;
          else if (status === 'nicht teilgenommen') absent++;
        }
      }
    }
    
    const unprocessed = total - (present + excused + absent);
    
    return { total, present, excused, absent, unprocessed };
  }
}
