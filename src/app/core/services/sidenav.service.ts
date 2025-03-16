import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Service to control sidenav behavior across components
 */
@Injectable({
  providedIn: 'root'
})
export class SidenavService {
  // Observable source for toggle events
  private toggleSource = new Subject<void>();
  
  // Observable that components can subscribe to
  toggleSidenav$ = this.toggleSource.asObservable();
  
  /**
   * Emits an event to toggle the sidenav
   */
  toggle(): void {
    this.toggleSource.next();
  }
}
