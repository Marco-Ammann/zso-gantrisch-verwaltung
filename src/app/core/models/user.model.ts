/**
 * User model representing an authenticated user
 */
export interface User {
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
   * Whether the user's email is verified
   */
  emailVerified?: boolean;
  
  /**
   * When the user was created
   */
  createdAt?: any;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}