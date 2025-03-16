import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Observable, Subscription, timer } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { AuthService } from '../../auth/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class IdleTimeoutService {
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  
  private readonly DEFAULT_IDLE_TIME = 30 * 60 * 1000; // 30 minutes
  private readonly WARNING_TIME = 60 * 1000; // Show warning 1 minute before logout
  
  private idleTimeMillis = this.DEFAULT_IDLE_TIME;
  private idleSubscription?: Subscription;
  private warnSubscription?: Subscription;
  private userActivity?: Observable<any>;
  private isIdle = new BehaviorSubject<boolean>(false);

  public isIdle$ = this.isIdle.asObservable();
  
  /**
   * Start tracking user activity and setup idle timeout
   * @param idleTimeMinutes Time in minutes before the user is considered idle
   */
  startWatching(idleTimeMinutes?: number): void {
    if (idleTimeMinutes) {
      this.idleTimeMillis = idleTimeMinutes * 60 * 1000;
    }
    
    // Track user activity events
    this.userActivity = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keypress'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll'),
      fromEvent(window, 'resize')
    ).pipe(debounceTime(300)); // Debounce to prevent too many events
    
    this.resetTimer();
    console.log(`Idle timeout service started - will logout after ${this.idleTimeMillis / 60000} minutes of inactivity`);
  }
  
  /**
   * Stop tracking user activity
   */
  stopWatching(): void {
    if (this.idleSubscription) {
      this.idleSubscription.unsubscribe();
    }
    if (this.warnSubscription) {
      this.warnSubscription.unsubscribe();
    }
    this.isIdle.next(false);
  }
  
  /**
   * Reset the idle timer when user activity is detected
   */
  private resetTimer(): void {
    if (this.userActivity) {
      if (this.idleSubscription) {
        this.idleSubscription.unsubscribe();
      }
      if (this.warnSubscription) {
        this.warnSubscription.unsubscribe();
      }
      
      this.isIdle.next(false);
      
      // Set warning timer
      this.warnSubscription = this.userActivity.pipe(
        switchMap(() => timer(this.idleTimeMillis - this.WARNING_TIME))
      ).subscribe(() => {
        this.showWarning();
      });
      
      // Set logout timer
      this.idleSubscription = this.userActivity.pipe(
        switchMap(() => timer(this.idleTimeMillis))
      ).subscribe(() => {
        this.logout();
      });
    }
  }
  
  /**
   * Show a warning that the user will be logged out soon
   */
  private showWarning(): void {
    this.snackBar.open(
      'Aufgrund von Inaktivität werden Sie in 1 Minute automatisch abgemeldet.',
      'Aktiv bleiben',
      {
        duration: this.WARNING_TIME,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      }
    ).onAction().subscribe(() => {
      this.resetTimer();
    });
  }
  
  /**
   * Log the user out due to inactivity
   */
  private logout(): void {
    this.isIdle.next(true);
    this.snackBar.open(
      'Sie wurden aufgrund von Inaktivität automatisch abgemeldet.',
      'OK',
      {
        duration: 5000
      }
    );
    this.authService.logout();
  }
}
