/**
 * User Types
 * 
 * Type definitions for user data and profile information.
  */

// NOTE: Using type placeholder for FirebaseUser - firebase/auth is client-side only
// import type { User as FirebaseUser } from 'firebase/auth';
type FirebaseUser = any;

export interface BaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  providerId: string;
  createdAt: number;
  lastLoginAt: number;
  disabled?: boolean;
}

export interface UserProfile extends BaseUser {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  timezone?: string;
  locale?: string;
  preferences: UserPreferences;
  metadata: UserMetadata;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'contacts';
    analyticsOptOut: boolean;
  };
}

export interface UserMetadata {
  lastActiveAt: number;
  loginCount: number;
  signUpSource?: string;
  referralCode?: string;
  experimentGroups?: string[];
  customFields?: Record<string, any>;
}

export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  tokenType: 'Bearer';
  scope: string[];
  grantedAt: number;
}

export interface AuthenticatedUser extends BaseUser {
  firebaseUser: FirebaseUser;
  profile?: UserProfile;
  hasCalendarPermissions: boolean;
  calendarTokens?: GoogleCalendarTokens;
}

export interface UserSession {
  uid: string;
  sessionId: string;
  startTime: number;
  lastActivity: number;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
  location?: {
    ip: string;
    country?: string;
    city?: string;
  };
}

export interface UserCreate {
  email: string;
  password?: string;
  displayName?: string;
  provider: 'google' | 'email';
  metadata?: Partial<UserMetadata>;
}

export interface UserUpdate {
  displayName?: string;
  photoURL?: string;
  preferences?: Partial<UserPreferences>;
  metadata?: Partial<UserMetadata>;
}

export interface UserQuery {
  uid?: string;
  email?: string;
  provider?: string;
  verified?: boolean;
  disabled?: boolean;
  createdAfter?: number;
  createdBefore?: number;
  lastLoginAfter?: number;
  lastLoginBefore?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'lastLoginAt' | 'email';
  orderDirection?: 'asc' | 'desc';
}

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

// Primary User type for cross-module compatibility
// This is the main User interface that other modules should extend
export type User = UserProfile;