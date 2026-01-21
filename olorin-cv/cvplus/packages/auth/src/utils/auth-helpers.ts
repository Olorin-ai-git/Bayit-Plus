/**
 * Authentication Helper Utilities
 * 
 * Common utility functions to support consolidated authentication patterns.
 * Eliminates repeated helper code across Firebase Functions.
 * Integrates with Core utilities where possible.
 * 
 * Author: Gil Klainert
 * Date: August 28, 2025
  */

// Import Core utilities when available
let coreRequireGoogleAuth: any = null;
let coreUpdateUserLastLogin: any = null;
let coreGetGoogleAccessToken: any = null;
let CoreAuthenticatedUser: any = null;

try {
  const coreUtils = require('@cvplus/core');
  coreRequireGoogleAuth = coreUtils.requireGoogleAuth;
  coreUpdateUserLastLogin = coreUtils.updateUserLastLogin;
  coreGetGoogleAccessToken = coreUtils.getGoogleAccessToken;
  CoreAuthenticatedUser = coreUtils.AuthenticatedUser;
} catch (error) {
  // Core utilities not available, will use local implementations
}
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Extract Bearer token from Authorization header
 * 
 * Consolidates the pattern:
 * ```
 * const token = req.headers.authorization?.replace('Bearer ', '');
 * ```
  */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.replace('Bearer ', '').trim();
}

/**
 * Validate Firebase ID token
 * 
 * Consolidates token validation patterns found across middleware
  */
export async function validateIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Additional validation
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp <= currentTime) {
      throw new Error('Token expired');
    }
    
    return decodedToken;
  } catch (error) {
    logger.error('Token validation failed', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw new HttpsError('unauthenticated', 'Invalid authentication token');
  }
}

/**
 * Check if user has any of the specified roles
 * 
 * Consolidates role checking patterns:
 * ```
 * const hasRole = userRoles.some(role => allowedRoles.includes(role));
 * ```
  */
export function hasAnyRole(userRoles: string[], allowedRoles: string[]): boolean {
  return allowedRoles.some(role => userRoles.includes(role));
}

/**
 * Check if user has all of the specified roles
  */
export function hasAllRoles(userRoles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.every(role => userRoles.includes(role));
}

/**
 * Get user roles from token or Firestore
 * 
 * Consolidates user role fetching patterns
  */
export async function getUserRoles(uid: string, token?: admin.auth.DecodedIdToken): Promise<string[]> {
  // Try to get roles from token custom claims first
  if (token?.roles && Array.isArray(token.roles)) {
    return token.roles;
  }
  
  // Fallback to Firestore
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(uid)
      .get();
    
    const userData = userDoc.data();
    return userData?.roles || ['user'];
  } catch (error) {
    logger.error('Failed to fetch user roles', {
      uid,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return ['user']; // Default fallback
  }
}

/**
 * Create standardized auth error
 * 
 * Consolidates error creation patterns across middleware
  */
export function createAuthError(code: string, message: string, details?: Record<string, any>): HttpsError {
  const errorCode = code as 'unauthenticated' | 'permission-denied' | 'internal';
  
  if (details) {
    logger.error('Auth error created', {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  return new HttpsError(errorCode, message);
}

/**
 * Check if email is verified
 * 
 * Consolidates email verification patterns
  */
export function isEmailVerified(token: admin.auth.DecodedIdToken): boolean {
  return token.email_verified === true;
}

/**
 * Get user's display information
 * 
 * Safely extract display info from token
  */
export function getUserDisplayInfo(token: admin.auth.DecodedIdToken): {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
} {
  return {
    uid: token.uid,
    email: token.email,
    name: token.name,
    picture: token.picture
  };
}

/**
 * Check if user owns resource
 * 
 * Consolidates ownership checking patterns from multiple functions
  */
export async function checkResourceOwnership(
  userId: string,
  resourceId: string,
  collection: string,
  ownerField: string = 'userId'
): Promise<boolean> {
  try {
    const doc = await admin.firestore()
      .collection(collection)
      .doc(resourceId)
      .get();
    
    if (!doc.exists) {
      return false;
    }
    
    const data = doc.data();
    return data?.[ownerField] === userId;
  } catch (error) {
    logger.error('Resource ownership check failed', {
      userId,
      resourceId,
      collection,
      ownerField,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Rate limiting helper
 * 
 * Basic rate limiting implementation for auth endpoints
  */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request should be rate limited
    */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      return true;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return false;
  }

  /**
   * Clear rate limiting data for identifier
    */
  clearLimiter(identifier: string): void {
    this.requests.delete(identifier);
  }
}

/**
 * Audit logging helper
 * 
 * Standardized audit logging for auth events
  */
export function logAuthEvent(event: {
  type: 'login' | 'logout' | 'access_granted' | 'access_denied' | 'role_check' | 'permission_check';
  uid?: string;
  email?: string;
  resource?: string;
  action?: string;
  result: 'success' | 'failure';
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}): void {
  logger.info('Auth event', {
    ...event,
    timestamp: new Date().toISOString()
  });
}

/**
 * Security headers helper
 * 
 * Add standard security headers to responses
  */
export function addSecurityHeaders(res: any): void {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
}

/**
 * Clean sensitive data from logs
 * 
 * Remove sensitive information before logging
  */
export function sanitizeForLogging(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// ============================================================================
// CORE INTEGRATION UTILITIES
// ============================================================================

/**
 * Wrapper for Core's requireGoogleAuth utility when available
 * Provides backward compatibility and Auth-specific error handling
  */
export async function requireAuthentication(request: any): Promise<any> {
  if (coreRequireGoogleAuth) {
    try {
      return await coreRequireGoogleAuth(request);
    } catch (error) {
      logger.error('Core authentication failed', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
  }
  
  // Fallback implementation when Core is not available
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  
  return {
    uid: request.auth.uid,
    email: request.auth.token?.email,
    emailVerified: request.auth.token?.email_verified || false
  };
}

/**
 * Wrapper for Core's updateUserLastLogin utility when available
 * Provides Auth-specific logging and error handling with fallback
  */
export async function updateLastLogin(
  uid: string, 
  email: string, 
  name?: string, 
  picture?: string
): Promise<void> {
  if (coreUpdateUserLastLogin) {
    try {
      await coreUpdateUserLastLogin(uid, email, name, picture);
      logger.info('User last login updated via Core', {
        uid,
        email,
        timestamp: new Date().toISOString()
      });
      return;
    } catch (error) {
      logger.error('Core update last login failed, using fallback', {
        uid,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Fallback implementation
  try {
    await admin.firestore()
      .collection('users')
      .doc(uid)
      .set({
        email,
        name: name || null,
        picture: picture || null,
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
    logger.info('User last login updated via fallback', {
      uid,
      email,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update last login', {
      uid,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    // Don't throw here - login tracking failure shouldn't block auth
  }
}

/**
 * Wrapper for Core's getGoogleAccessToken utility when available
 * Provides Auth-specific error handling with fallback
  */
export async function getAccessToken(uid: string): Promise<string | null> {
  if (coreGetGoogleAccessToken) {
    try {
      return await coreGetGoogleAccessToken(uid);
    } catch (error) {
      logger.error('Core get access token failed, using fallback', {
        uid,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Fallback implementation
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(uid)
      .get();
    
    const userData = userDoc.data();
    return userData?.googleTokens?.accessToken || null;
  } catch (error) {
    logger.error('Failed to get access token', {
      uid,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

// Default export with all utilities
export default {
  extractBearerToken,
  validateIdToken,
  hasAnyRole,
  hasAllRoles,
  getUserRoles,
  createAuthError,
  isEmailVerified,
  getUserDisplayInfo,
  checkResourceOwnership,
  RateLimiter,
  logAuthEvent,
  addSecurityHeaders,
  sanitizeForLogging,
  // Core integration utilities
  requireAuthentication,
  updateLastLogin,
  getAccessToken
};