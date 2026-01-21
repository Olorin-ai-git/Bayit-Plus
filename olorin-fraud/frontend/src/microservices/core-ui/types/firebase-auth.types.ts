/**
 * Firebase Authentication Types
 * Type definitions for Firebase Auth with custom claims RBAC
 */

import type { User as FirebaseUser } from 'firebase/auth';
import type { UserRole } from '@shared/types/core/user.types';

/**
 * Custom claims stored in Firebase ID token
 * Set via backend using Firebase Admin SDK
 */
export interface FirebaseCustomClaims {
  role: UserRole;
  permissions?: string[];
}

/**
 * Authenticated user combining Firebase data with custom claims
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  photoURL: string | null;
  permissions: string[];
  emailVerified: boolean;
  lastLogin: Date;
  createdAt: Date;
  firebaseUser: FirebaseUser;
}

/**
 * Firebase auth state for context
 */
export interface FirebaseAuthState {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Extended auth context type with Firebase methods
 */
export interface FirebaseAuthContextType extends FirebaseAuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

/**
 * Backend response for token validation
 */
export interface TokenValidationResponse {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  emailVerified: boolean;
}

/**
 * Default role for new users
 */
export const DEFAULT_USER_ROLE: UserRole = 'viewer';
