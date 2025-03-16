import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  link?: string;
}

/**
 * Service to manage application notifications
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notifications.asObservable();
  
  private _unreadCount = new BehaviorSubject<number>(0);
  notificationCount$ = this._unreadCount.asObservable();
  
  constructor(private snackBar: MatSnackBar) {
    this.loadInitialData();
  }
  
  /**
   * Loads initial notification data
   * In a real app, this would pull from storage or API
   */
  private loadInitialData(): void {
    // Add sample notifications for demonstration
    const initialNotifications: AppNotification[] = [
      {
        id: '1',
        title: 'Neue Ausbildung erstellt',
        message: 'WK 2023 wurde erfolgreich erstellt.',
        type: 'info',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        read: false
      },
      {
        id: '2',
        title: 'Neue Ausbildungsteilnahmen',
        message: '5 neue Teilnahmen wurden erfasst.',
        type: 'success',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        read: false
      }
    ];
    
    this.notifications.next(initialNotifications);
    this.updateUnreadCount();
  }
  
  /**
   * Adds a new notification
   */
  addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: AppNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    const currentNotifications = this.notifications.value;
    this.notifications.next([newNotification, ...currentNotifications]);
    this.updateUnreadCount();
    
    // Show snackbar for new notification
    this.snackBar.open(notification.title, 'Ansehen', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    }).onAction().subscribe(() => {
      // Navigate to notification details or relevant page
      if (notification.link) {
        window.location.href = notification.link;
      }
    });
  }
  
  /**
   * Marks a specific notification as read
   */
  markAsRead(id: string): void {
    const currentNotifications = this.notifications.value;
    const updatedNotifications = currentNotifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    );
    
    this.notifications.next(updatedNotifications);
    this.updateUnreadCount();
  }
  
  /**
   * Marks all notifications as read
   */
  markAllAsRead(): void {
    const currentNotifications = this.notifications.value;
    const updatedNotifications = currentNotifications.map(notification => ({ 
      ...notification, 
      read: true 
    }));
    
    this.notifications.next(updatedNotifications);
    this.updateUnreadCount();
  }
  
  /**
   * Updates the unread notification count
   */
  private updateUnreadCount(): void {
    const unreadCount = this.notifications.value.filter(n => !n.read).length;
    this._unreadCount.next(unreadCount);
  }
  
  /**
   * Removes a notification
   */
  removeNotification(id: string): void {
    const currentNotifications = this.notifications.value;
    const updatedNotifications = currentNotifications.filter(
      notification => notification.id !== id
    );
    
    this.notifications.next(updatedNotifications);
    this.updateUnreadCount();
  }
  
  /**
   * Clears all notifications
   */
  clearAll(): void {
    this.notifications.next([]);
    this.updateUnreadCount();
  }
}
