/**
 * Basic Firebase User interface
 */
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  role?: string;
  lastActive?: Date;
  id?: string; // Document ID in Firestore
  createdAt?: Date; // Creation timestamp
  registrationDate?: Date; // Registration date
  notificationSent?: boolean; // Flag for notifications
}

/**
 * Extended user profile interface
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string; // Adding the missing phoneNumber property
  role?: string;
  lastActive?: Date;
}

/**
 * Profile update data interface
 */
export interface ProfileUpdateData {
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
}