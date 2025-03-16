import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    OverlayModule
  ],
  template: `
    <div class="loading-container" [class.overlay]="overlay" [class.fullscreen]="fullscreen">
      <mat-spinner [diameter]="diameter"></mat-spinner>
      <p *ngIf="message" class="loading-message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      
      &.overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.7);
        z-index: 100;
      }
      
      &.fullscreen {
        position: fixed;
        z-index: 9999;
      }
    }
    
    .loading-message {
      margin-top: 16px;
      color: rgba(0, 0, 0, 0.6);
    }
  `]
})
export class LoadingIndicatorComponent {
  @Input() diameter = 40;
  @Input() message?: string;
  @Input() overlay = false;
  @Input() fullscreen = false;
}
