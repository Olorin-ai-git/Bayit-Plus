/**
 * Core Authentication Interfaces
 * 
 * Shared authentication interfaces that can be implemented by different modules
 * to ensure consistency and avoid circular dependencies.
 * 
 * Author: Gil Klainert
 * Date: 2025-08-29
  */

import type { UserSubscription, UserContext } from '../types/middleware';

// ============================================================================
// AUTHENTICATION SERVICE INTERFACES
// ============================================================================

/**
 * Base authentication service interface
 * To be implemented by the Auth module
  */
export interface IAuthService {
  /**
   * Authenticate a user with credentials
    */
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  
  /**
   * Validate an authentication token
    */
  validateToken(token: string): Promise<AuthValidationResult>;
  
  /**
   * Sign out a user
    */
  signOut(userId: string): Promise<void>;
  
  /**
   * Refresh an authentication token
    */
  refreshToken(refreshToken: string): Promise<AuthResult>;
}

/**
 * Permission service interface
 * To be implemented by the Auth module
  */
export interface IPermissionService {
  /**
   * Check if user has specific permission
    */
  hasPermission(userId: string, permission: string): Promise<boolean>;
  
  /**
   * Check if user has any of the specified roles
    */
  hasAnyRole(userId: string, roles: string[]): Promise<boolean>;
  
  /**
   * Get user's roles
    */
  getUserRoles(userId: string): Promise<string[]>;
  
  /**
   * Check premium feature access
    */
  hasPremiumFeature(userId: string, feature: string): Promise<boolean>;
}

/**
 * Session service interface
 * To be implemented by the Auth module
  */
export interface ISessionService {
  /**
   * Create a new session
    */
  createSession(userId: string, metadata?: Record<string, any>): Promise<SessionData>;
  
  /**
   * Validate an existing session
    */
  validateSession(sessionId: string): Promise<SessionValidationResult>;
  
  /**
   * Terminate a session
    */
  terminateSession(sessionId: string): Promise<void>;
  
  /**
   * Clean up expired sessions
    */
  cleanupExpiredSessions(): Promise<void>;
}

// ============================================================================
// SHARED AUTHENTICATION TYPES
// ============================================================================

/**
 * Authentication credentials
 * Used by multiple modules for auth operations
  */
export interface AuthCredentials {
  email?: string;
  password?: string;
  token?: string;
  provider?: 'google' | 'email' | 'anonymous';
  refreshToken?: string;
}

/**
 * Authentication result
 * Returned by auth operations across modules
  */
export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
  requiresMFA?: boolean;
}

/**
 * Authenticated user (shared across modules)
 * Basic user information available to all modules
  */
export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  roles?: string[];
  permissions?: string[];
  subscription?: UserSubscription;
  context?: UserContext;
  lastLoginAt?: number;
}

/**
 * Auth validation result
 * Used by middleware and other modules
  */
export interface AuthValidationResult {
  valid: boolean;
  user?: AuthenticatedUser;
  error?: string;
  reason?: 'expired' | 'invalid' | 'revoked' | 'malformed';
  expiresIn?: number;
}

/**
 * Session data (shared across modules)
 * Basic session information for other modules to use
  */
export interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, any>;
  isActive: boolean;
}

/**
 * Session validation result
 * Used by middleware and other modules
  */
export interface SessionValidationResult {
  valid: boolean;
  session?: SessionData;
  user?: AuthenticatedUser;
  error?: string;
  reason?: 'expired' | 'invalid' | 'terminated' | 'not-found';
}

// ============================================================================
// PERMISSION AND ROLE TYPES
// ============================================================================

/**
 * Permission definition (shared across modules)
 * Standard permission structure for RBAC
  */
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

/**
 * Role definition (shared across modules)
 * Standard role structure for RBAC
  */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inherits?: string[];
  premium?: boolean;
}

/**
 * Permission check result
 * Used by authorization middleware and other modules
  */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
  userPermissions?: string[];
  requiresPremium?: boolean;
}

// ============================================================================
// PREMIUM INTEGRATION TYPES
// ============================================================================

/**
 * Premium status (shared across modules)
 * Used by premium features throughout the platform
  */
export interface PremiumStatus {
  tier: 'free' | 'premium' | 'enterprise';
  isActive: boolean;
  features: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
  expiresAt?: number;
  gracePeriodEnd?: number;
}

/**
 * Feature access result
 * Used by premium-gated features across modules
  */
export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  requiredTier?: string;
  currentTier?: string;
  upgradeUrl?: string;
  trialAvailable?: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Authentication error codes (shared across modules)
 * Standardized error codes for auth-related failures
  */
export type AuthErrorCode = 
  | 'invalid-credentials'
  | 'user-not-found'
  | 'email-not-verified'
  | 'account-disabled'
  | 'token-expired'
  | 'token-invalid'
  | 'permission-denied'
  | 'premium-required'
  | 'rate-limited'
  | 'mfa-required'
  | 'session-expired'
  | 'network-error'
  | 'service-unavailable';

/**
 * Authentication error (shared across modules)
 * Standardized error structure for auth failures
  */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  retryAfter?: number;
  timestamp: number;
}