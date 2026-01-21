/**
 * Firebase Authentication Middleware
 * 
 * Migrated from /functions/src/middleware/authGuard.ts (540 lines)
 * Provides comprehensive authentication middleware for Firebase Functions
 * with enhanced security features, rate limiting, and admin access control.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Auth Module
 * @migrated 2025-08-28 - Security-critical migration from root repository
  */

import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
// Note: Admin types removed to avoid dependency on @cvplus/admin package
// These types can be re-imported when @cvplus/admin package is available

export interface AuthenticatedRequest extends Omit<CallableRequest, 'auth'> {
  auth: {
    uid: string;
    token: admin.auth.DecodedIdToken;
    rawToken?: string; // Required by CallableRequest auth property
  };
}

/**
 * Core authentication middleware - migrated from root authGuard.ts
 * Provides comprehensive Firebase authentication validation
  */
export const requireAuth = async (request: CallableRequest): Promise<AuthenticatedRequest> => {
  // Check if auth context exists
  if (!request.auth) {
    logger.error('Authentication failed: No auth context', {
      hasRawRequest: !!request.rawRequest,
      origin: request.rawRequest?.headers?.origin,
      userAgent: request.rawRequest?.headers?.['user-agent']
    });
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { uid, token } = request.auth;
  
  // Verify the token is valid and not expired
  if (!uid || !token) {
    logger.error('Authentication failed: Invalid token', { 
      uid: !!uid, 
      token: !!token,
      hasEmail: !!token?.email 
    });
    throw new HttpsError('unauthenticated', 'Invalid authentication token');
  }

  // Additional token validation
  try {
    // Verify token is not expired (Firebase should handle this, but double-check)
    const currentTime = Math.floor(Date.now() / 1000);
    if (token.exp <= currentTime) {
      logger.error('Authentication failed: Token expired', {
        uid,
        exp: token.exp,
        currentTime,
        expired: currentTime - token.exp
      });
      throw new HttpsError('unauthenticated', 'Authentication token has expired');
    }

    // Verify token was issued recently (within 24 hours)
    const tokenAge = currentTime - token.iat;
    if (tokenAge > 86400) {
      logger.warn('Authentication warning: Old token', {
        uid,
        iat: token.iat,
        age: tokenAge,
        ageHours: Math.floor(tokenAge / 3600)
      });
    }

    // SECURITY REQUIREMENT: Email verification enforcement for production
    const isProduction = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';
    
    if (!token.email_verified && token.email && isProduction) {
      logger.error('Authentication failed: Email verification required in production', {
        uid,
        email: token.email,
        emailVerified: token.email_verified,
        environment: process.env.NODE_ENV,
        isProduction
      });
      throw new HttpsError(
        'permission-denied', 
        'Email verification is required. Please verify your email address before accessing this service.'
      );
    }
    
    // Log warning in development only
    if (!token.email_verified && token.email && !isProduction) {
      logger.warn('Authentication warning: Unverified email (development mode)', {
        uid,
        email: token.email,
        emailVerified: token.email_verified
      });
    }

    logger.info('Authentication successful', {
      uid,
      email: token.email,
      emailVerified: token.email_verified,
      tokenAge: tokenAge,
      provider: token.firebase?.sign_in_provider
    });

    return {
      ...request,
      auth: { uid, token }
    } as AuthenticatedRequest;

  } catch (error) {
    logger.error('Authentication failed during validation', {
      uid,
      error: error instanceof Error ? error.message : 'Unknown error',
      hasEmail: !!token?.email,
      provider: token?.firebase?.sign_in_provider
    });
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('unauthenticated', 'Authentication validation failed');
  }
};

/**
 * Admin authentication middleware - migrated from root repository
 * Validates admin role and permissions with comprehensive logging
  */
export const requireAdmin = async (request: CallableRequest): Promise<AuthenticatedRequest> => {
  // First ensure basic authentication
  const authRequest = await requireAuth(request);
  
  try {
    const { uid } = authRequest.auth;
    
    // Get user's custom claims to check admin status
    const userRecord = await admin.auth().getUser(uid);
    const customClaims = userRecord.customClaims || {};
    
    // Check if user has admin role
    const isAdmin = customClaims.role === 'admin' || customClaims.role === 'superadmin';
    
    if (!isAdmin) {
      logger.error('Admin access denied: Insufficient privileges', {
        uid,
        email: userRecord.email,
        role: customClaims.role,
        hasCustomClaims: Object.keys(customClaims).length > 0
      });
      
      throw new HttpsError(
        'permission-denied', 
        'Administrator access required. You do not have sufficient permissions to perform this action.'
      );
    }
    
    // Log successful admin access
    logger.info('Admin access granted', {
      uid,
      email: userRecord.email,
      role: customClaims.role,
      adminLevel: customClaims.adminLevel,
      function: request.rawRequest?.url || 'unknown'
    });
    
    return authRequest;
    
  } catch (error) {
    logger.error('Admin authentication failed', {
      uid: authRequest.auth.uid,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('permission-denied', 'Admin authentication validation failed');
  }
};

/**
 * Rate limiting middleware for authenticated users
 * Prevents abuse of Firebase Functions by implementing per-user rate limits
  */
interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const createRateLimit = (options: RateLimitOptions) => {
  return async (request: CallableRequest): Promise<AuthenticatedRequest> => {
    const authRequest = await requireAuth(request);
    const { uid } = authRequest.auth;
    
    const now = Date.now();
    const windowMs = options.windowMs;
    const maxRequests = options.maxRequests;
    
    // Clean up expired entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
    
    // Check current user's rate limit
    const userLimit = rateLimitStore.get(uid);
    
    if (!userLimit) {
      // First request in window
      rateLimitStore.set(uid, {
        count: 1,
        resetTime: now + windowMs
      });
    } else if (now > userLimit.resetTime) {
      // Window expired, reset
      rateLimitStore.set(uid, {
        count: 1,
        resetTime: now + windowMs
      });
    } else if (userLimit.count >= maxRequests) {
      // Rate limit exceeded
      logger.warn('Rate limit exceeded', {
        uid,
        count: userLimit.count,
        maxRequests,
        resetTime: userLimit.resetTime,
        remainingMs: userLimit.resetTime - now
      });
      
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Too many requests. Try again in ${Math.ceil((userLimit.resetTime - now) / 1000)} seconds.`
      );
    } else {
      // Increment counter
      userLimit.count++;
    }
    
    return authRequest;
  };
};

/**
 * Standard rate limits for different types of functions
  */
export const standardRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute
});

export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute  
  maxRequests: 10 // 10 requests per minute
});

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100 // 100 requests per minute
});

/**
 * Utility function to check if user has specific custom claims
  */
export const requireClaim = (claimKey: string, expectedValue?: any) => {
  return async (request: CallableRequest): Promise<AuthenticatedRequest> => {
    const authRequest = await requireAuth(request);
    const { uid } = authRequest.auth;
    
    try {
      const userRecord = await admin.auth().getUser(uid);
      const customClaims = userRecord.customClaims || {};
      
      if (!(claimKey in customClaims)) {
        throw new HttpsError(
          'permission-denied',
          `Missing required claim: ${claimKey}`
        );
      }
      
      if (expectedValue !== undefined && customClaims[claimKey] !== expectedValue) {
        throw new HttpsError(
          'permission-denied',
          `Invalid claim value for ${claimKey}`
        );
      }
      
      return authRequest;
      
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'permission-denied',
        'Claim validation failed'
      );
    }
  };
};

/**
 * Export all middleware functions
  */
export default {
  requireAuth,
  requireAdmin,
  createRateLimit,
  standardRateLimit,
  strictRateLimit,
  apiRateLimit,
  requireClaim
};