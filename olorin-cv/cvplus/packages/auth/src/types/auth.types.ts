/**
 * Authentication Types
 *
 * Core authentication type definitions and interfaces.
  */

// NOTE: Using type placeholder for FirebaseUser - firebase/auth is client-side only
// import type { User as FirebaseUser } from 'firebase/auth';
type FirebaseUser = any;

import type { AuthenticatedUser, UserProfile } from './user.types';
import type { AuthSession, SessionState } from './session.types';
import type { StandardPermissions } from './permissions.types';

// Premium functionality removed - handled by @cvplus/premium module (Layer 2)

export interface AuthState {
  // Core authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // User information
  user: AuthenticatedUser | null;
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  
  // Session management
  session: SessionState;

  // Permissions (premium handled by @cvplus/premium)
  permissions: StandardPermissions;
  
  // Error handling
  error: AuthError | null;
  
  // Metadata
  lastUpdated: number;
  initializationTime?: number;
}

// Auth error types are imported from error.types.ts to avoid duplication
import type { AuthError, AuthErrorCode } from './error.types';

export interface AuthCredentials {
  email: string;
  password?: string;
  provider: AuthProvider;
  additionalData?: Record<string, any>;
}

export type AuthProvider = 'google' | 'email' | 'anonymous';

export interface AuthConfig {
  // Firebase configuration
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    messagingSenderId?: string;
    appId?: string;
  };
  
  // Provider configurations
  google: {
    clientId?: string;
    scopes: string[];
    hostedDomain?: string;
  };

  // Provider settings
  providers?: {
    google?: {
      enabled: boolean;
      requireDomain?: string;
      customParameters?: Record<string, string>;
      hostedDomain?: string;
    };
    email?: {
      enabled: boolean;
      requireVerification: boolean;
    };
    anonymous?: {
      enabled: boolean;
    };
  };
  
  // Session configuration
  session: {
    timeout: number;
    refreshThreshold: number;
    enableCrossTabSync: boolean;
    persistSession: boolean;
    storageType?: 'localStorage' | 'sessionStorage' | 'memory';
    idleTimeout?: number;
    syncInterval?: number;
  };
  
  // Security configuration
  security: {
    requireEmailVerification: boolean;
    enforcePasswordPolicy: boolean;
    enableRateLimit: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  
  // Feature flags
  features: {
    enableAnonymousAuth: boolean;
    enableGoogleAuth: boolean;
    enableEmailAuth: boolean;
    enableCalendarIntegration: boolean;
    enablePremiumFeatures: boolean;
  };
  
  // UI configuration
  ui: {
    showRememberMe: boolean;
    showForgotPassword: boolean;
    showSignUp: boolean;
    customBranding?: {
      logo?: string;
      primaryColor?: string;
      backgroundColor?: string;
    };
  };
}

export interface AuthMethods {
  // Core authentication
  signIn: (credentials: AuthCredentials) => Promise<AuthenticatedUser>;
  signUp: (credentials: AuthCredentials) => Promise<AuthenticatedUser>;
  signOut: () => Promise<void>;
  
  // Google OAuth
  signInWithGoogle: () => Promise<AuthenticatedUser>;
  
  // Session management
  refreshSession: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  
  // Calendar integration
  requestCalendarPermissions: () => Promise<void>;
  hasCalendarPermissions: () => boolean;
  
  // Profile management
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  getProfile: () => Promise<UserProfile | null>;
  
  // Premium status
  refreshPremiumStatus: () => Promise<void>;
  checkFeatureAccess: (feature: string) => boolean;
  
  // Error handling
  clearError: () => void;
  getLastError: () => AuthError | null;
}

export interface AuthEvents {
  // Authentication events
  onSignIn: (user: AuthenticatedUser) => void;
  onSignOut: () => void;
  onAuthStateChanged: (user: AuthenticatedUser | null) => void;
  
  // Session events
  onSessionExpired: () => void;
  onSessionRefreshed: () => void;
  
  // Error events
  onAuthError: (error: AuthError) => void;
  
  // Premium events removed - moved to @cvplus/premium module
  
  // Profile events
  onProfileUpdated: (profile: UserProfile) => void;
}

export interface AuthTokenInfo {
  token: string;
  expiresAt: number;
  issuedAt: number;
  scopes: string[];
  claims: Record<string, any>;
}

export interface AuthValidationResult {
  isValid: boolean;
  user: AuthenticatedUser | null;
  error: AuthError | null;
  tokenInfo?: AuthTokenInfo;
}

export interface AuthMetrics {
  totalUsers: number;
  activeUsers: number;
  signInRate: number;
  signOutRate: number;
  errorRate: number;
  averageSessionDuration: number;
  topErrors: Array<{
    code: AuthErrorCode;
    count: number;
    rate: number;
  }>;
}

// Hook types for React integration
export interface UseAuthResult extends AuthState, AuthMethods {
  // Computed properties
  hasPermission: (permission: keyof StandardPermissions) => boolean;
  isFeatureEnabled: (feature: string) => boolean;
  needsUpgrade: boolean;
  isAdmin: boolean;
}

export interface UseSessionResult {
  session: AuthSession | null;
  isActive: boolean;
  timeRemaining: number;
  extend: () => Promise<void>;
  refresh: () => Promise<void>;
  end: () => Promise<void>;
}

// UsePremiumResult interface removed - moved to @cvplus/premium module