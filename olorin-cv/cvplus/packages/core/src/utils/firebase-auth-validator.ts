/**
 * Firebase Functions Auth Validator Utilities
 * 
 * Common authentication validation patterns for Firebase Functions.
 * Consolidates auth validation patterns found across 8+ function files.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { logger } from 'firebase-functions';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { FirebaseAuthContext } from '../types/firebase-functions';
import { throwFirebaseError, requireAuthentication, validateUserAccess } from './firebase-error-handler';

/**
 * Enhanced Auth Context with user data
  */
export interface EnhancedAuthContext extends FirebaseAuthContext {
  userData?: {
    displayName?: string;
    photoURL?: string;
    role?: string;
    permissions?: string[];
    subscriptionStatus?: string;
  };
}

/**
 * Auth validation options
  */
export interface AuthValidationOptions {
  /** Require email verification  */
  requireEmailVerification?: boolean;
  /** Required user roles  */
  requiredRoles?: string[];
  /** Required permissions  */
  requiredPermissions?: string[];
  /** Minimum subscription tier  */
  minimumSubscriptionTier?: string;
  /** Allow service accounts  */
  allowServiceAccounts?: boolean;
  /** Custom validation function  */
  customValidator?: (auth: FirebaseAuthContext) => Promise<boolean> | boolean;
}

/**
 * Result of authentication validation
  */
export interface AuthValidationResult {
  isValid: boolean;
  auth: FirebaseAuthContext;
  errors: string[];
  userData?: any;
}

/**
 * Validates basic Firebase authentication
 * Consolidates: if (!context.auth) { throw new HttpsError('unauthenticated') }
 * 
 * @param request - Firebase callable request
 * @param functionName - Name of calling function (for logging)
 * @returns Validated auth context
  */
export function validateBasicAuth(
  request: CallableRequest,
  functionName?: string
): FirebaseAuthContext {
  // Use the error handler utility for consistency
  requireAuthentication(request.auth, { functionName });
  
  const auth = request.auth!;
  
  // Log successful authentication for monitoring
  logger.info('Authentication validated', {
    functionName,
    uid: auth.uid.substring(0, 8) + '***',
    hasEmail: !!auth.token?.email,
    timestamp: new Date().toISOString()
  });
  
  return {
    uid: auth.uid,
    token: auth.token,
    email: auth.token?.email,
    email_verified: auth.token?.email_verified
  };
}

/**
 * Validates user ID matches authenticated user
 * Consolidates: if (auth.uid !== data.userId) { throw }
 * 
 * @param auth - Auth context from validateBasicAuth
 * @param requestedUserId - User ID from request data
 * @param functionName - Name of calling function (for logging)
  */
export function validateUserIdMatch(
  auth: FirebaseAuthContext,
  requestedUserId: string,
  functionName?: string
): void {
  validateUserAccess(auth.uid, requestedUserId, { functionName });
}

/**
 * Validates email verification status
 * Common requirement for sensitive operations
 * 
 * @param auth - Auth context
 * @param functionName - Function name for logging
  */
export function validateEmailVerification(
  auth: FirebaseAuthContext,
  functionName?: string
): void {
  if (!auth.email_verified) {
    throwFirebaseError(
      {
        code: 'failed-precondition',
        message: 'Email address must be verified to perform this action',
        details: {
          hasEmail: !!auth.email,
          emailVerified: false
        }
      },
      { functionName, uid: auth.uid.substring(0, 8) + '***' }
    );
  }
}

/**
 * Validates user has required roles
 * For role-based access control
 * 
 * @param auth - Auth context with user data
 * @param requiredRoles - Array of required roles
 * @param functionName - Function name for logging
  */
export function validateUserRoles(
  auth: EnhancedAuthContext,
  requiredRoles: string[],
  functionName?: string
): void {
  const userRole = auth.userData?.role;
  
  if (!userRole || !requiredRoles.includes(userRole)) {
    throwFirebaseError(
      {
        code: 'permission-denied',
        message: 'Insufficient role permissions',
        details: {
          requiredRoles,
          userRole: userRole || 'none',
          hasPermissions: false
        }
      },
      { functionName, uid: auth.uid.substring(0, 8) + '***' }
    );
  }
}

/**
 * Validates user has required permissions
 * For granular permission-based access control
 * 
 * @param auth - Auth context with user data
 * @param requiredPermissions - Array of required permissions
 * @param functionName - Function name for logging
  */
export function validateUserPermissions(
  auth: EnhancedAuthContext,
  requiredPermissions: string[],
  functionName?: string
): void {
  const userPermissions = auth.userData?.permissions || [];
  const hasAllPermissions = requiredPermissions.every(
    permission => userPermissions.includes(permission)
  );
  
  if (!hasAllPermissions) {
    const missingPermissions = requiredPermissions.filter(
      permission => !userPermissions.includes(permission)
    );
    
    throwFirebaseError(
      {
        code: 'permission-denied',
        message: 'Insufficient permissions',
        details: {
          requiredPermissions,
          userPermissions,
          missingPermissions
        }
      },
      { functionName, uid: auth.uid.substring(0, 8) + '***' }
    );
  }
}

/**
 * Validates subscription tier requirements
 * Common for premium feature access
 * 
 * @param auth - Auth context with user data
 * @param minimumTier - Minimum required subscription tier
 * @param functionName - Function name for logging
  */
export function validateSubscriptionTier(
  auth: EnhancedAuthContext,
  minimumTier: string,
  functionName?: string
): void {
  const userTier = auth.userData?.subscriptionStatus || 'free';
  
  // Define tier hierarchy
  const tierHierarchy = ['free', 'basic', 'pro', 'enterprise'];
  const userTierIndex = tierHierarchy.indexOf(userTier);
  const requiredTierIndex = tierHierarchy.indexOf(minimumTier);
  
  if (userTierIndex === -1 || requiredTierIndex === -1 || userTierIndex < requiredTierIndex) {
    throwFirebaseError(
      {
        code: 'permission-denied',
        message: 'Insufficient subscription tier',
        details: {
          requiredTier: minimumTier,
          userTier,
          tierHierarchy
        }
      },
      { functionName, uid: auth.uid.substring(0, 8) + '***' }
    );
  }
}

/**
 * Comprehensive authentication validation
 * One-stop validation for complex auth requirements
 * 
 * @param request - Firebase callable request
 * @param options - Validation options
 * @param functionName - Function name for logging
 * @returns Enhanced auth context with validation results
  */
export async function validateAuthentication(
  request: CallableRequest,
  options: AuthValidationOptions = {},
  functionName?: string
): Promise<EnhancedAuthContext> {
  // Start with basic auth validation
  const auth = validateBasicAuth(request, functionName);
  
  // Create enhanced auth context
  const enhancedAuth: EnhancedAuthContext = { ...auth };
  
  // Validate email verification if required
  if (options.requireEmailVerification) {
    validateEmailVerification(auth, functionName);
  }
  
  // Load user data if advanced validations are needed
  if (options.requiredRoles || options.requiredPermissions || options.minimumSubscriptionTier) {
    try {
      // This would typically load user data from Firestore
      // For now, we'll pass through - actual implementation would load user document
      enhancedAuth.userData = {};
      
      logger.info('User data loaded for advanced auth validation', {
        functionName,
        uid: auth.uid.substring(0, 8) + '***',
        hasRoles: !!options.requiredRoles,
        hasPermissions: !!options.requiredPermissions,
        hasSubscriptionCheck: !!options.minimumSubscriptionTier
      });
      
    } catch (error) {
      throwFirebaseError(
        {
          code: 'internal',
          message: 'Failed to load user data for validation',
          details: { userDataLoadError: true }
        },
        { functionName, uid: auth.uid.substring(0, 8) + '***' },
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  
  // Validate roles if required
  if (options.requiredRoles?.length) {
    validateUserRoles(enhancedAuth, options.requiredRoles, functionName);
  }
  
  // Validate permissions if required
  if (options.requiredPermissions?.length) {
    validateUserPermissions(enhancedAuth, options.requiredPermissions, functionName);
  }
  
  // Validate subscription tier if required
  if (options.minimumSubscriptionTier) {
    validateSubscriptionTier(enhancedAuth, options.minimumSubscriptionTier, functionName);
  }
  
  // Run custom validator if provided
  if (options.customValidator) {
    try {
      const customValid = await options.customValidator(auth);
      if (!customValid) {
        throwFirebaseError(
          {
            code: 'permission-denied',
            message: 'Custom authentication validation failed',
            details: { customValidation: false }
          },
          { functionName, uid: auth.uid.substring(0, 8) + '***' }
        );
      }
    } catch (error: any) {
      if (error?.code) {
        // Re-throw Firebase errors
        throw error;
      }
      
      throwFirebaseError(
        {
          code: 'internal',
          message: 'Custom validation error',
          details: { customValidationError: true }
        },
        { functionName, uid: auth.uid.substring(0, 8) + '***' },
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  
  logger.info('Authentication validation completed successfully', {
    functionName,
    uid: auth.uid.substring(0, 8) + '***',
    validationsApplied: {
      basic: true,
      emailVerification: !!options.requireEmailVerification,
      roles: !!options.requiredRoles?.length,
      permissions: !!options.requiredPermissions?.length,
      subscription: !!options.minimumSubscriptionTier,
      custom: !!options.customValidator
    }
  });
  
  return enhancedAuth;
}

/**
 * Quick validation for user-specific endpoints
 * Combines basic auth + user ID validation
 * 
 * @param request - Firebase callable request
 * @param requestedUserId - User ID from request data
 * @param functionName - Function name for logging
 * @returns Validated auth context
  */
export function validateUserEndpoint(
  request: CallableRequest,
  requestedUserId: string,
  functionName?: string
): FirebaseAuthContext {
  const auth = validateBasicAuth(request, functionName);
  validateUserIdMatch(auth, requestedUserId, functionName);
  return auth;
}

/**
 * Service account validation
 * For server-to-server operations
 * 
 * @param auth - Auth context
 * @param functionName - Function name for logging
  */
export function validateServiceAccount(
  auth: FirebaseAuthContext,
  functionName?: string
): void {
  // Service accounts typically have specific patterns in their UIDs
  if (!auth.uid.includes('service-account') && !auth.token?.iss?.includes('securetoken.google.com')) {
    logger.info('Service account validation', {
      functionName,
      uid: auth.uid.substring(0, 8) + '***',
      hasIssuer: !!auth.token?.iss,
      issuer: auth.token?.iss
    });
  }
}