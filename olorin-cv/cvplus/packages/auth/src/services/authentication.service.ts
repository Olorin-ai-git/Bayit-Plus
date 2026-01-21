/**
 * Authentication Service for Firebase Functions
 * 
 * Consolidated authentication validation and token management for backend services.
 * Replaces scattered auth validation patterns across Firebase Functions.
 * 
 * Author: Gil Klainert
 * Date: August 28, 2025
  */

import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { Request } from 'express';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

// Types
export interface AuthenticatedRequest extends Omit<CallableRequest, 'auth'> {
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

export interface AuthValidationOptions {
  requireEmailVerification?: boolean;
  allowedRoles?: string[];
  customClaims?: Record<string, any>;
  gracePeriodDays?: number;
  trackUsage?: boolean;
}

export interface AuthValidationResult {
  uid: string;
  email?: string;
  token: admin.auth.DecodedIdToken;
  roles: string[];
  customClaims: Record<string, any>;
  isEmailVerified: boolean;
}

export interface JobOwnershipValidationOptions {
  collectionPath: string;
  docIdField?: string;
  userIdField?: string;
  allowedRoles?: string[];
}

/**
 * Firebase Functions Authentication Service
 * 
 * Provides consolidated authentication validation patterns to eliminate
 * the 237 scattered auth check occurrences across Firebase Functions.
  */
export class FirebaseAuthenticationService {
  private auth: admin.auth.Auth;

  constructor() {
    this.auth = admin.auth();
  }

  /**
   * Core authentication validator - replaces basic "if (!context.auth)" patterns
   * 
   * Consolidates the most common auth pattern found in 54+ Firebase Functions:
   * ```
   * if (!request.auth) {
   *   throw new HttpsError('unauthenticated', 'User must be authenticated');
   * }
   * ```
    */
  async requireAuth(request: CallableRequest, options?: AuthValidationOptions): Promise<AuthValidationResult> {
    // Basic auth context validation
    if (!request.auth) {
      logger.error('Authentication failed: No auth context', {
        hasRawRequest: !!request.rawRequest,
        origin: request.rawRequest?.headers?.origin,
        userAgent: request.rawRequest?.headers?.['user-agent'],
        timestamp: new Date().toISOString()
      });
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { uid, token } = request.auth;
    
    // Token validation
    if (!uid || !token) {
      logger.error('Authentication failed: Invalid token', { 
        uid: !!uid, 
        token: !!token,
        hasEmail: !!token?.email,
        timestamp: new Date().toISOString()
      });
      throw new HttpsError('unauthenticated', 'Invalid authentication token');
    }

    // Token expiration check
    const currentTime = Math.floor(Date.now() / 1000);
    if (token.exp <= currentTime) {
      logger.error('Authentication failed: Token expired', {
        uid,
        exp: token.exp,
        currentTime,
        expired: currentTime - token.exp,
        timestamp: new Date().toISOString()
      });
      throw new HttpsError('unauthenticated', 'Authentication token has expired');
    }

    // Additional validations based on options
    const result: AuthValidationResult = {
      uid,
      email: token.email,
      token,
      roles: token.roles || [],
      customClaims: token,
      isEmailVerified: token.email_verified || false
    };

    if (options) {
      await this.validateAuthOptions(result, options);
    }

    // Log successful authentication
    logger.info('User authenticated successfully', {
      uid,
      email: token.email,
      emailVerified: token.email_verified,
      roles: token.roles,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Express middleware authentication validator
   * 
   * For Express middleware patterns, validates Bearer token authentication
    */
  async requireAuthExpress(req: Request): Promise<AuthenticatedExpressRequest> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      logger.error('Express auth failed: No token provided', {
        path: req.path,
        method: req.method,
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
      });
      throw new HttpsError('unauthenticated', 'No authentication token provided');
    }

    try {
      const decodedToken = await this.auth.verifyIdToken(token);
      
      const authenticatedReq = req as AuthenticatedExpressRequest;
      authenticatedReq.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        token: decodedToken
      };

      logger.info('Express user authenticated', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      return authenticatedReq;
    } catch (error) {
      logger.error('Express auth failed: Token verification error', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        timestamp: new Date().toISOString()
      });
      throw new HttpsError('unauthenticated', 'Invalid authentication token');
    }
  }

  /**
   * Job ownership validation - consolidates ownership checking patterns
   * 
   * Replaces scattered patterns like:
   * ```
   * if (job.userId !== request.auth.uid) {
   *   throw new HttpsError('permission-denied', 'Access denied');
   * }
   * ```
    */
  async requireAuthWithJobOwnership(
    request: CallableRequest,
    jobId: string,
    options: JobOwnershipValidationOptions
  ): Promise<AuthValidationResult> {
    const authResult = await this.requireAuth(request);
    
    try {
      const db = admin.firestore();
      const jobDoc = await db.collection(options.collectionPath).doc(jobId).get();
      
      if (!jobDoc.exists) {
        logger.error('Job ownership validation failed: Job not found', {
          uid: authResult.uid,
          jobId,
          collection: options.collectionPath,
          timestamp: new Date().toISOString()
        });
        throw new HttpsError('not-found', 'Job not found');
      }
      
      const jobData = jobDoc.data();
      const userIdField = options.userIdField || 'userId';
      const jobUserId = jobData?.[userIdField];
      
      // Check ownership or allowed roles
      const hasOwnership = jobUserId === authResult.uid;
      const hasRoleAccess = options.allowedRoles?.some(role => 
        authResult.roles.includes(role)
      ) || false;
      
      if (!hasOwnership && !hasRoleAccess) {
        logger.error('Job ownership validation failed: Access denied', {
          uid: authResult.uid,
          jobId,
          jobUserId,
          userRoles: authResult.roles,
          allowedRoles: options.allowedRoles,
          timestamp: new Date().toISOString()
        });
        throw new HttpsError('permission-denied', 'Access denied to this resource');
      }
      
      logger.info('Job ownership validated', {
        uid: authResult.uid,
        jobId,
        hasOwnership,
        hasRoleAccess,
        timestamp: new Date().toISOString()
      });
      
      return authResult;
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      
      logger.error('Job ownership validation error', {
        uid: authResult.uid,
        jobId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw new HttpsError('internal', 'Failed to validate job ownership');
    }
  }

  /**
   * Validate additional auth options
    */
  private async validateAuthOptions(result: AuthValidationResult, options: AuthValidationOptions): Promise<void> {
    // Email verification requirement
    if (options.requireEmailVerification && !result.isEmailVerified) {
      logger.error('Authentication failed: Email not verified', {
        uid: result.uid,
        email: result.email,
        timestamp: new Date().toISOString()
      });
      throw new HttpsError('permission-denied', 'Email verification required');
    }

    // Role-based access control
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      const hasRequiredRole = options.allowedRoles.some(role => result.roles.includes(role));
      if (!hasRequiredRole) {
        logger.error('Authentication failed: Insufficient roles', {
          uid: result.uid,
          userRoles: result.roles,
          requiredRoles: options.allowedRoles,
          timestamp: new Date().toISOString()
        });
        throw new HttpsError('permission-denied', 'Insufficient permissions');
      }
    }

    // Custom claims validation
    if (options.customClaims) {
      const hasRequiredClaims = Object.entries(options.customClaims).every(([key, value]) => 
        result.customClaims[key] === value
      );
      if (!hasRequiredClaims) {
        logger.error('Authentication failed: Custom claims not met', {
          uid: result.uid,
          requiredClaims: options.customClaims,
          timestamp: new Date().toISOString()
        });
        throw new HttpsError('permission-denied', 'Custom authentication requirements not met');
      }
    }
  }

  /**
   * Batch user validation for administrative operations
    */
  async validateMultipleUsers(userIds: string[]): Promise<Map<string, admin.auth.UserRecord>> {
    const results = new Map<string, admin.auth.UserRecord>();
    const errors: string[] = [];

    for (const uid of userIds) {
      try {
        const userRecord = await this.auth.getUser(uid);
        results.set(uid, userRecord);
      } catch (error) {
        errors.push(`${uid}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (errors.length > 0) {
      logger.warn('Batch user validation had errors', {
        errors,
        successCount: results.size,
        totalRequested: userIds.length,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }
}

// Singleton instance for Firebase Functions
export const firebaseAuth = new FirebaseAuthenticationService();

// Export commonly used validation functions
export const requireAuth = (request: CallableRequest, options?: AuthValidationOptions) => 
  firebaseAuth.requireAuth(request, options);

export const requireAuthWithJobOwnership = (
  request: CallableRequest, 
  jobId: string, 
  options: JobOwnershipValidationOptions
) => firebaseAuth.requireAuthWithJobOwnership(request, jobId, options);

export const requireAuthExpress = (req: Request) => 
  firebaseAuth.requireAuthExpress(req);