import { Component } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pdf-progress-dialog',
  template: `
    <div class="progress-dialog-container">
      <div class="header">
        <mat-icon class="pdf-icon">picture_as_pdf</mat-icon>
        <h2>PDF wird generiert</h2>
      </div>
      
      <div class="progress-section">
        <mat-progress-bar mode="determinate" [value]="progress" color="primary"></mat-progress-bar>
        <div class="progress-info">
          <span class="percentage">{{progress}}%</span>
          <span class="status">{{ status }}</span>
        </div>
      </div>
      
      <div class="message" *ngIf="progress < 100">
        Bitte haben Sie etwas Geduld, während wir Ihr PDF erstellen...
      </div>
      
      <div class="completion-message" *ngIf="progress === 100">
        <mat-icon class="success-icon">check_circle</mat-icon>
        <span>PDF wurde erfolgreich generiert!</span>
      </div>
    </div>
  `,
  styles: [`
    .progress-dialog-container {
      padding: 24px;
      min-width: 350px;
      max-width: 500px;
      text-align: center;
      font-family: Roboto, "Helvetica Neue", sans-serif;
      overflow-x: hidden; /* Prevent horizontal scrolling */
      box-sizing: border-box; /* Include padding in width calculation */
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }
    
    .pdf-icon {
      font-size: 28px;
      height: 28px;
      width: 28px;
      margin-right: 10px;
      color: #2e5288;
      flex-shrink: 0; /* Prevent icon from shrinking */
    }
    
    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
      color: #2e5288;
      white-space: nowrap; /* Keep title on one line */
    }
    
    .progress-section {
      margin-bottom: 16px;
      width: 100%; /* Ensure full width */
    }
    
    .progress-info {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 14px;
      width: 100%; /* Ensure full width */
    }
    
    .percentage {
      font-weight: bold;
      color: #2e5288;
      flex-shrink: 0; /* Prevent percentage from shrinking */
      margin-right: 10px;
    }
    
    .status {
      color: #555;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap; /* Prevent text wrapping */
      flex-grow: 1; /* Allow status to take remaining space */
      text-align: right;
    }
    
    .message {
      margin-top: 24px;
      color: #666;
      font-style: italic;
      width: 100%; /* Ensure full width */
    }
    
    .completion-message {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 20px;
      color: #4caf50;
      font-weight: 500;
      width: 100%; /* Ensure full width */
    }
    
    .success-icon {
      color: #4caf50;
      margin-right: 8px;
      flex-shrink: 0; /* Prevent icon from shrinking */
    }
    
    mat-progress-bar {
      height: 8px;
      border-radius: 4px;
      width: 100%; /* Ensure full width */
    }
    
    ::ng-deep .mat-progress-bar-fill::after {
      background-color: #2e5288;
    }
  `],
  standalone: true,
  imports: [MatProgressBarModule, CommonModule, MatIconModule]
})
export class PdfProgressDialogComponent {
  progress: number = 0;
  status: string = 'Initialisierung...';
  
  /**
   * Updates the progress display
   * @param value Progress percentage (0-100)
   * @param status Current status message
   */
  updateProgress(value: number, status: string): void {
    this.progress = Math.round(value);
    this.status = status;
  }
}
