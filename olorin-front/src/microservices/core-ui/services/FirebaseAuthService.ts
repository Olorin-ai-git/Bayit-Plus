/**
 * Firebase Authentication Service
 * Handles Google Sign-In and Firebase token management with backend validation
 */

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  Unsubscribe,
} from 'firebase/auth';
import { auth, googleProvider } from '../../../firebase';
import { getConfig } from '@shared/config/env.config';
import type { UserRole } from '@shared/types/core/user.types';
import type {
  AuthenticatedUser,
  FirebaseCustomClaims,
  TokenValidationResponse,
  DEFAULT_USER_ROLE,
} from '../types/firebase-auth.types';

const config = getConfig();

class FirebaseAuthServiceClass {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = config.api.baseUrl;
  }

  /**
   * Sign in with Google popup
   */
  async signInWithGoogle(): Promise<AuthenticatedUser> {
    if (!auth || !googleProvider) {
      throw new Error('Firebase Auth not initialized');
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Validate token with backend to get/set custom claims
    const validationResponse = await this.validateTokenWithBackend(user);

    return this.mapToAuthenticatedUser(user, validationResponse);
  }

  /**
   * Sign out from Firebase
   */
  async signOut(): Promise<void> {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    await firebaseSignOut(auth);
  }

  /**
   * Get current Firebase ID token
   */
  async getIdToken(forceRefresh = false): Promise<string | null> {
    if (!auth?.currentUser) {
      return null;
    }

    return auth.currentUser.getIdToken(forceRefresh);
  }

  /**
   * Get custom claims from current user's token
   */
  async getCustomClaims(): Promise<FirebaseCustomClaims | null> {
    if (!auth?.currentUser) {
      return null;
    }

    const tokenResult = await auth.currentUser.getIdTokenResult();
    return {
      role: (tokenResult.claims.role as UserRole) || 'viewer',
      permissions: (tokenResult.claims.permissions as string[]) || [],
    };
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(
    callback: (user: AuthenticatedUser | null) => void
  ): Unsubscribe {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      try {
        const validationResponse = await this.validateTokenWithBackend(firebaseUser);
        const authenticatedUser = this.mapToAuthenticatedUser(firebaseUser, validationResponse);
        callback(authenticatedUser);
      } catch (error) {
        console.error('Failed to validate user token:', error);
        callback(null);
      }
    });
  }

  /**
   * Validate Firebase token with backend and get user role
   */
  private async validateTokenWithBackend(
    user: FirebaseUser
  ): Promise<TokenValidationResponse> {
    const idToken = await user.getIdToken();

    const response = await fetch(`${this.apiBaseUrl}/api/auth/firebase/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ id_token: idToken }),
    });

    if (!response.ok) {
      throw new Error(`Token validation failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Map Firebase user and validation response to AuthenticatedUser
   */
  private mapToAuthenticatedUser(
    firebaseUser: FirebaseUser,
    validation: TokenValidationResponse
  ): AuthenticatedUser {
    return {
      id: firebaseUser.uid,
      email: validation.email || firebaseUser.email || '',
      name: validation.name || firebaseUser.displayName || '',
      role: validation.role || 'viewer',
      photoURL: firebaseUser.photoURL,
      permissions: validation.permissions || [],
      emailVerified: firebaseUser.emailVerified,
      lastLogin: new Date(),
      createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
      firebaseUser,
    };
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): FirebaseUser | null {
    return auth?.currentUser || null;
  }
}

export const FirebaseAuthService = new FirebaseAuthServiceClass();
