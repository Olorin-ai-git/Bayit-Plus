/**
 * Firebase Authentication Types
 * 
 * Type definitions for consolidated Firebase authentication services.
 * Supports the Phase 4 deduplication implementation.
 * 
 * Author: Gil Klainert
 * Date: August 28, 2025
  */

import { Request } from 'express';
import { CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// ============================================================================
// CORE AUTH TYPES
// ============================================================================

/**
 * Enhanced request types with authentication context
  */
export interface AuthenticatedCallableRequest extends Omit<CallableRequest, 'auth'> {
  auth: {
    uid: string;
    token: admin.auth.DecodedIdToken;
    rawToken?: string; // Required by CallableRequest auth property
  };
}

export interface AuthenticatedExpressRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    token: admin.auth.DecodedIdToken;
  };
}

/**
 * Authentication validation options
  */
export interface AuthValidationOptions {
  requireEmailVerification?: boolean;
  allowedRoles?: string[];
  customClaims?: Record<string, any>;
  gracePeriodDays?: number;
  trackUsage?: boolean;
  customErrorMessage?: string;
}

/**
 * Authentication validation result
  */
export interface AuthValidationResult {
  uid: string;
  email?: string;
  token: admin.auth.DecodedIdToken;
  roles: string[];
  customClaims: Record<string, any>;
  isEmailVerified: boolean;
  gracePeriodEnd?: Date;
}

/**
 * Job ownership validation options
  */
export interface JobOwnershipValidationOptions {
  collectionPath: string;
  docIdField?: string;
  userIdField?: string;
  allowedRoles?: string[];
  logOwnershipChecks?: boolean;
}

// ============================================================================
// AUTHORIZATION TYPES
// ============================================================================

/**
 * User role definition
  */
export interface UserRole {
  readonly id: string;
  readonly name: string;
  readonly permissions: readonly string[];
  readonly hierarchy: number;
  readonly description: string;
  readonly isSystemRole?: boolean;
  readonly parentRoles?: readonly string[];
}

/**
 * Permission definition
  */
export interface Permission {
  readonly id: string;
  readonly resource: string;
  readonly action: string;
  readonly conditions?: readonly PermissionCondition[];
  readonly description?: string;
}

/**
 * Permission condition
  */
export interface PermissionCondition {
  readonly field: string;
  readonly operator: 'equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'exists';
  readonly value: any;
  readonly description?: string;
}

/**
 * Authorization context
  */
export interface AuthorizationContext {
  uid: string;
  roles: string[];
  customClaims: Record<string, any>;
  resourceId?: string;
  resourceData?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

/**
 * Role checking options
  */
export interface RoleCheckOptions {
  requireAll?: boolean;
  hierarchyLevel?: number;
  customMessage?: string;
  skipCache?: boolean;
  logAccess?: boolean;
}

/**
 * Permission check result
  */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  matchedRole?: string;
  matchedPermission?: string;
  conditions?: PermissionConditionResult[];
}

/**
 * Permission condition evaluation result
  */
export interface PermissionConditionResult {
  condition: PermissionCondition;
  satisfied: boolean;
  actualValue?: any;
  reason?: string;
}

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

/**
 * Basic auth middleware configuration
  */
export interface BasicAuthMiddlewareConfig {
  requireEmailVerification?: boolean;
  logRequests?: boolean;
  customErrorMessage?: string;
  rateLimitPerMinute?: number;
  skipPaths?: string[];
}

/**
 * Role middleware configuration
  */
export interface RoleMiddlewareConfig extends RoleCheckOptions {
  roles: string | string[];
  logAccess?: boolean;
  skipForRoles?: string[];
}

/**
 * Premium middleware configuration
  */
export interface PremiumMiddlewareConfig {
  requiredFeature?: string;
  gracePeriodDays?: number;
  customErrorMessage?: string;
  trackUsage?: boolean;
  allowGracePeriod?: boolean;
  rateLimitPerMinute?: number;
  requireActiveSubscription?: boolean;
  allowedTiers?: string[];
}

/**
 * Resource ownership middleware configuration
  */
export interface ResourceOwnershipConfig extends JobOwnershipValidationOptions {
  logOwnershipChecks?: boolean;
  allowSharedAccess?: boolean;
  sharedAccessRoles?: string[];
}

/**
 * Composite middleware configuration
  */
export interface CompositeMiddlewareConfig {
  middlewares: Array<(req: AuthenticatedExpressRequest, res: any, next: any) => void>;
  stopOnFirstFailure?: boolean;
  logCompositeResults?: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Authentication error codes
  */
export type AuthErrorCode = 
  | 'unauthenticated'
  | 'permission-denied' 
  | 'invalid-token'
  | 'token-expired'
  | 'email-not-verified'
  | 'insufficient-roles'
  | 'resource-not-found'
  | 'ownership-required'
  | 'rate-limit-exceeded'
  | 'subscription-required'
  | 'grace-period-expired'
  | 'feature-not-enabled'
  | 'internal-auth-error';

/**
 * Authentication error details
  */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, any>;
  uid?: string;
  timestamp: Date;
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

/**
 * Auth event types for auditing
  */
export type AuthEventType = 
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'token_refresh'
  | 'role_check'
  | 'permission_check'
  | 'access_granted'
  | 'access_denied'
  | 'ownership_check'
  | 'rate_limit_hit'
  | 'subscription_check'
  | 'grace_period_access';

/**
 * Auth event for auditing
  */
export interface AuthEvent {
  type: AuthEventType;
  uid?: string;
  email?: string;
  resource?: string;
  action?: string;
  result: 'success' | 'failure';
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

/**
 * User subscription status
  */
export interface UserSubscription {
  tier: 'free' | 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'grace_period' | 'trial';
  features: string[];
  limits: SubscriptionLimits;
  expiresAt?: Date;
  gracePeriodEnd?: Date;
  trialEnd?: Date;
  stripeSubscriptionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Subscription limits
  */
export interface SubscriptionLimits {
  monthlyUploads: number;
  cvGenerations: number;
  featuresPerCV: number;
  apiCallsPerMonth: number;
  storageGB: number;
  concurrentJobs: number;
  customFields?: Record<string, number>;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Cache configuration
  */
export interface CacheConfig {
  ttlMs: number;
  maxSize?: number;
  keyPrefix?: string;
  enableLogging?: boolean;
}

/**
 * Cache entry
  */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessAt: number;
}

// ============================================================================
// MIGRATION HELPER TYPES
// ============================================================================

/**
 * Migration mapping for old patterns
  */
export interface AuthMigrationMapping {
  oldPattern: string;
  newPattern: string;
  description: string;
  example: string;
}

/**
 * Migration result
  */
export interface MigrationResult {
  success: boolean;
  patternsReplaced: number;
  errors: string[];
  warnings: string[];
  files: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Rate limiting configuration
  */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  identifier: (req: AuthenticatedExpressRequest) => string;
  skipPaths?: string[];
  skipRoles?: string[];
}

/**
 * Security headers configuration
  */
export interface SecurityHeadersConfig {
  contentTypeOptions?: boolean;
  frameOptions?: string;
  xssProtection?: boolean;
  strictTransportSecurity?: string;
  contentSecurityPolicy?: string;
  referrerPolicy?: string;
  customHeaders?: Record<string, string>;
}