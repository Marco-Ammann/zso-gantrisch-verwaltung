/**
 * User model representing an authenticated user
 */
export interface User {
  /**
   * Document ID in Firestore (optional as it may not be set during creation)
   */
  id?: string;

  /**
   * Unique identifier from Firebase Authentication
   */
  uid: string;
  
  /**
   * User's email address
   */
  email: string;
  
  /**
   * Display name (optional)
   */
  displayName?: string;
  
  /**
   * User role for authorization
   */
  role: 'admin' | 'oberleutnant' | 'leutnant' | 'korporal' | 'leserecht';
  
  /**
   * Optional profile picture URL
   */
  photoURL?: string;
  
  /**
   * Last login timestamp
   */
  lastLogin?: any;
  
  /**
   * Last activity timestamp
   */
  lastActive?: any;
  
  /**
   * Whether the user's email is verified
   */
  emailVerified?: boolean;
  
  /**
   * When the user was created
   */
  createdAt?: any;
  
  /**
   * When the user registered (might be different from createdAt in some cases)
   */
  registrationDate?: any;
  
  /**
   * Indicates if an admin notification was sent for this user
   */
  notificationSent?: boolean;
  
  /**
   * Whether email verification reminder was sent
   */
  verificationReminderSent?: boolean;
  
  /**
   * When email verification reminder was sent
   */
  verificationReminderSentAt?: any;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}