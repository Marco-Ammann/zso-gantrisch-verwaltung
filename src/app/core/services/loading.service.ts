import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private _loading = new BehaviorSubject<boolean>(false);
  private _message = new BehaviorSubject<string>('');
  
  // Observables for components to subscribe to
  loading$ = this._loading.asObservable();
  message$ = this._message.asObservable();
  
  /**
   * Shows the global loading indicator with an optional message
   * @param message Optional message to display
   */
  show(message = 'Wird geladen...'): void {
    this._message.next(message);
    this._loading.next(true);
  }
  
  /**
   * Hides the global loading indicator
   */
  hide(): void {
    this._loading.next(false);
  }
}
