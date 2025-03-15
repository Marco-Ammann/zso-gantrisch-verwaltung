import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface LoadingDialogData {
  message: string;
}

@Component({
  selector: 'app-loading-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="loading-dialog">
      <mat-spinner diameter="40"></mat-spinner>
      <p>{{ data.message || 'Wird geladen...' }}</p>
    </div>
  `,
  styles: [`
    .loading-dialog {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      
      p {
        margin-top: 16px;
        text-align: center;
      }
    }
  `]
})
export class LoadingDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<LoadingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LoadingDialogData
  ) {}
}
