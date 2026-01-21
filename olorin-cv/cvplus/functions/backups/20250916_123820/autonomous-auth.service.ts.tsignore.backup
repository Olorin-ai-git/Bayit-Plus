// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Autonomous Authentication Service
 * Replaces @cvplus/auth/services for autonomous operation
 */
import { 
  Auth, 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { 
  User, 
  AuthCredentials, 
  AuthResult, 
  FirebaseConfig,
  ParentAPI 
} from '../types/autonomous-cv.types';
import { AuthenticationError, retry, delay } from '../utils/autonomous-utils';

export interface AuthService {
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  createAccount(credentials: AuthCredentials & { name?: string }): Promise<AuthResult>;
  validateSession(): Promise<boolean>;
  refreshToken(): Promise<string>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}

export interface AuthConfiguration {
  firebase: FirebaseConfig;
  parentAuth?: ParentAPI;
  _enableFallback?: boolean;
}

export class AutonomousAuthService implements AuthService {
  private firebaseApp: FirebaseApp;
  private firebaseAuth: Auth;
  private parentAuth?: ParentAPI;
  private _enableFallback: boolean;
  private currentUser: User | null = null;

  constructor(config: AuthConfiguration) {
    // Initialize Firebase app
    this.firebaseApp = initializeApp(config.firebase);
    this.firebaseAuth = getAuth(this.firebaseApp);
    this.parentAuth = config.parentAuth;
    this._enableFallback = config._enableFallback ?? true;

    // Set up auth state listener
    this.setupAuthStateListener();
  }

  private setupAuthStateListener(): void {
    onAuthStateChanged(this.firebaseAuth, (firebaseUser) => {
      this.currentUser = firebaseUser ? this.convertFirebaseUser(firebaseUser) : null;
    });
  }

  private convertFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || undefined,
      picture: firebaseUser.photoURL || undefined,
      hasCalendarPermissions: false // Will be determined by other services
    };
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // Step 1: Try parent authentication first if available
      if (this.parentAuth) {
        try {
          const parentAuthState = await this.parentAuth.getAuthState();
          if (parentAuthState.authenticated && parentAuthState.user) {
            // Parent is already authenticated, use that session
            this.currentUser = parentAuthState.user;
            return {
              success: true,
              user: parentAuthState.user,
              token: await this.getValidToken()
            };
          }
        } catch (error) {
          console.warn('Parent authentication check failed, falling back to autonomous auth:', error);
        }
      }

      // Step 2: Autonomous authentication with Firebase
      const result = await retry(async () => {
        return await signInWithEmailAndPassword(
          this.firebaseAuth,
          credentials.email,
          credentials.password
        );
      }, 3, 1000);

      const user = this.convertFirebaseUser(result.user);
      const token = await getIdToken(result.user);

      return {
        success: true,
        user,
        token
      };

    } catch (error) {
      const errorMessage = this.getAuthErrorMessage(error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async createAccount(credentials: AuthCredentials & { name?: string }): Promise<AuthResult> {
    try {
      const result = await retry(async () => {
        return await createUserWithEmailAndPassword(
          this.firebaseAuth,
          credentials.email,
          credentials.password
        );
      }, 3, 1000);

      // Update profile if name is provided
      if (credentials.name) {
        try {
          const { updateProfile } = await import('firebase/auth');
          await updateProfile(result.user, {
            displayName: credentials.name
          });
        } catch (profileError) {
          console.warn('Failed to update user profile:', profileError);
        }
      }

      const user = this.convertFirebaseUser(result.user);
      const token = await getIdToken(result.user);

      return {
        success: true,
        user,
        token
      };

    } catch (error) {
      const errorMessage = this.getAuthErrorMessage(error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      if (!user) return false;

      // Try to get a fresh token
      const token = await this.getValidToken();
      return !!token;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    const firebaseUser = this.firebaseAuth.currentUser;
    if (!firebaseUser) {
      throw new AuthenticationError('No authenticated user found', 'NO_USER');
    }

    try {
      return await getIdToken(firebaseUser, true); // Force refresh
    } catch (error) {
      throw new AuthenticationError('Failed to refresh authentication token', 'TOKEN_REFRESH_FAILED');
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.firebaseAuth);
      this.currentUser = null;
    } catch (error) {
      throw new AuthenticationError('Failed to sign out', 'LOGOUT_FAILED');
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.firebaseAuth, (firebaseUser) => {
      const user = firebaseUser ? this.convertFirebaseUser(firebaseUser) : null;
      this.currentUser = user;
      callback(user);
    });
  }

  private async getValidToken(): Promise<string> {
    const firebaseUser = this.firebaseAuth.currentUser;
    if (!firebaseUser) {
      throw new AuthenticationError('No authenticated user', 'NO_USER');
    }

    try {
      return await getIdToken(firebaseUser);
    } catch (error) {
      throw new AuthenticationError('Failed to get authentication token', 'TOKEN_ERROR');
    }
  }

  private getAuthErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || 'Authentication failed';

    // Map Firebase auth error codes to user-friendly messages
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email address already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/operation-not-allowed':
        return 'This authentication method is not enabled.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      default:
        return errorMessage;
    }
  }

  // Helper methods for Firebase Functions integration
  static async requireGoogleAuth(request: any): Promise<User> {
    if (!request.auth) {
      throw new AuthenticationError('Authentication required', 'UNAUTHENTICATED');
    }

    const { uid, email, name, picture } = request.auth;
    
    if (!uid || !email) {
      throw new AuthenticationError('Invalid authentication data', 'INVALID_AUTH');
    }

    return {
      uid,
      email,
      name,
      picture,
      hasCalendarPermissions: false
    };
  }

  static async updateUserLastLogin(
    uid: string, 
    email?: string, 
    name?: string, 
    picture?: string
  ): Promise<void> {
    try {
      // This would typically update user metadata in Firestore
      // For autonomous operation, we'll implement a simple in-memory cache
      const userData = {
        uid,
        email,
        name,
        picture,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      };
      
      // In a full implementation, this would persist to Firestore
      console.log('User login updated:', { uid, email, lastLoginAt: userData.lastLoginAt });
      
      // Store in localStorage for development (not suitable for production)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`user_${uid}_lastLogin`, JSON.stringify(userData));
      }
    } catch (error) {
      console.warn('Failed to update user last login:', error);
      // Don't throw error as this is not critical for authentication
    }
  }
}

// Factory function for easy instantiation
export function createAuthService(config: AuthConfiguration): AuthService {
  return new AutonomousAuthService(config);
}

// Default configuration helper
export function createDefaultAuthConfig(firebaseConfig: FirebaseConfig): AuthConfiguration {
  return {
    firebase: firebaseConfig,
    _enableFallback: true
  };
}