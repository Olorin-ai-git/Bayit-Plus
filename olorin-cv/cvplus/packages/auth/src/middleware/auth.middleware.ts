/**
 * Real Authentication Middleware
 *
 * Production-ready Firebase authentication middleware with comprehensive
 * security, role-based access control, and premium subscription validation.
 *
 * @author Gil Klainert
 * @version 2.0.0
  */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    role?: string;
    roles?: string[];
    verified?: boolean;
    subscription?: {
      tier: 'free' | 'premium' | 'enterprise';
      status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trial';
      expiresAt?: Date;
      features?: string[];
    };
    customClaims?: Record<string, any>;
    isAdmin?: boolean;
    isPremium?: boolean;
    permissions?: string[];
  };
  authToken?: admin.auth.DecodedIdToken;
}

export interface AuthResult {
  success: boolean;
  userId?: string;
  user?: AuthRequest['user'];
  error?: string;
  statusCode?: number;
}

// Type definitions for middleware configurations
export interface BasicAuthMiddlewareConfig {
  required?: boolean;
  allowAnonymous?: boolean;
  redirectUrl?: string;
  validateEmail?: boolean;
}

export interface RoleMiddlewareConfig {
  roles: string[];
  requireAll?: boolean;
  allowOwner?: boolean;
  resourceOwnerField?: string;
}

export interface PremiumMiddlewareConfig {
  tier?: 'premium' | 'enterprise';
  features?: string[];
  gracePeriod?: number; // days
  allowTrialUsers?: boolean;
}

/**
 * Extract and verify Firebase ID token from request
  */
async function extractAndVerifyToken(req: AuthRequest): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(idToken);
    req.authToken = decodedToken;

    return decodedToken;
  } catch (error) {
    logger.warn('Token verification failed:', error);
    return null;
  }
}

/**
 * Fetch user data and subscription info from Firestore
  */
async function fetchUserData(uid: string): Promise<AuthRequest['user'] | null> {
  try {
    const [userDoc, subscriptionDoc] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('subscriptions').doc(uid).get()
    ]);

    const userData = userDoc.data();
    const subscriptionData = subscriptionDoc.data();

    if (!userData) {
      return null;
    }

    return {
      uid,
      email: userData.email,
      emailVerified: userData.emailVerified || false,
      role: userData.role || 'user',
      roles: userData.roles || [userData.role || 'user'],
      verified: userData.emailVerified || false,
      subscription: subscriptionData ? {
        tier: subscriptionData.tier || 'free',
        status: subscriptionData.status || 'inactive',
        expiresAt: subscriptionData.expiresAt?.toDate(),
        features: subscriptionData.features || []
      } : {
        tier: 'free',
        status: 'inactive',
        features: []
      },
      customClaims: userData.customClaims || {},
      isAdmin: userData.role === 'admin' || (userData.roles && userData.roles.includes('admin')),
      isPremium: subscriptionData?.status === 'active' && ['premium', 'enterprise'].includes(subscriptionData?.tier),
      permissions: userData.permissions || []
    };
  } catch (error) {
    logger.error('Failed to fetch user data:', error);
    return null;
  }
}

/**
 * Core authentication function
  */
export const authenticateUser = async (req: AuthRequest, options: BasicAuthMiddlewareConfig = {}): Promise<AuthResult> => {
  try {
    const decodedToken = await extractAndVerifyToken(req);

    if (!decodedToken) {
      if (options.allowAnonymous) {
        return { success: true };
      }
      return {
        success: false,
        error: 'Authentication required',
        statusCode: 401
      };
    }

    const userData = await fetchUserData(decodedToken.uid);

    if (!userData) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 404
      };
    }

    // Email verification check
    if (options.validateEmail && !userData.emailVerified) {
      return {
        success: false,
        error: 'Email verification required',
        statusCode: 403
      };
    }

    req.user = userData;

    return {
      success: true,
      userId: userData.uid,
      user: userData
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      statusCode: 500
    };
  }
};

/**
 * Express middleware: Require authentication
  */
export const requireAuth = (config: BasicAuthMiddlewareConfig = {}) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const result = await authenticateUser(req, { required: true, ...config });

    if (!result.success) {
      res.status(result.statusCode || 401).json({
        error: result.error,
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    next();
  };
};

/**
 * Express middleware: Require email verification
  */
export const requireEmailVerification = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user?.emailVerified) {
    res.status(403).json({
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
    return;
  }

  next();
};

/**
 * Express middleware: Require admin role
  */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user?.isAdmin) {
    res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
    return;
  }

  next();
};

/**
 * Express middleware: Require premium subscription
  */
export const requirePremium = (config: PremiumMiddlewareConfig = {}) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user?.isPremium) {
      // Check for trial users if allowed
      if (config.allowTrialUsers && user?.subscription?.status === 'trial') {
        return next();
      }

      return res.status(403).json({
        error: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED',
        requiredTier: config.tier || 'premium'
      });
    }

    // Check specific tier requirement
    if (config.tier && user.subscription?.tier !== config.tier) {
      return res.status(403).json({
        error: `${config.tier} subscription required`,
        code: 'TIER_REQUIRED',
        currentTier: user.subscription?.tier,
        requiredTier: config.tier
      });
    }

    // Check specific features
    if (config.features && config.features.length > 0) {
      const userFeatures = user.subscription?.features || [];
      const missingFeatures = config.features.filter(feature => !userFeatures.includes(feature));

      if (missingFeatures.length > 0) {
        return res.status(403).json({
          error: 'Required features not available in subscription',
          code: 'FEATURES_REQUIRED',
          missingFeatures
        });
      }
    }

    next();
  };
};

/**
 * Express middleware: Require enterprise subscription
  */
export const requireEnterprise = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.subscription?.tier !== 'enterprise') {
    res.status(403).json({
      error: 'Enterprise subscription required',
      code: 'ENTERPRISE_REQUIRED'
    });
    return;
  }

  next();
};

/**
 * Express middleware: Require specific role(s)
  */
export const requireRole = (config: RoleMiddlewareConfig) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRoles = req.user?.roles || [];

    if (config.requireAll) {
      // User must have ALL specified roles
      const hasAllRoles = config.roles.every(role => userRoles.includes(role));
      if (!hasAllRoles) {
        res.status(403).json({
          error: 'Insufficient role permissions',
          code: 'ROLES_REQUIRED',
          requiredRoles: config.roles,
          userRoles
        });
        return;
      }
    } else {
      // User must have at least ONE of the specified roles
      const hasAnyRole = config.roles.some(role => userRoles.includes(role));
      if (!hasAnyRole) {
        res.status(403).json({
          error: 'Insufficient role permissions',
          code: 'ROLE_REQUIRED',
          requiredRoles: config.roles,
          userRoles
        });
        return;
      }
    }

    next();
  };
};

/**
 * Firebase Functions: Validate authentication
  */
export const validateAuth = async (req: AuthRequest): Promise<AuthResult> => {
  return await authenticateUser(req, { required: true });
};

/**
 * Firebase Functions: Validate authentication with email verification
  */
export const validateAuthWithEmail = async (req: AuthRequest): Promise<AuthResult> => {
  return await authenticateUser(req, { required: true, validateEmail: true });
};

/**
 * Firebase Functions: Validate admin access
  */
export const validateAdmin = async (req: AuthRequest): Promise<AuthResult> => {
  const authResult = await authenticateUser(req, { required: true });

  if (!authResult.success) {
    return authResult;
  }

  if (!req.user?.isAdmin) {
    return {
      success: false,
      error: 'Admin access required',
      statusCode: 403
    };
  }

  return authResult;
};

/**
 * Firebase Functions: Validate premium subscription
  */
export const validatePremium = async (req: AuthRequest): Promise<AuthResult> => {
  const authResult = await authenticateUser(req, { required: true });

  if (!authResult.success) {
    return authResult;
  }

  if (!req.user?.isPremium) {
    return {
      success: false,
      error: 'Premium subscription required',
      statusCode: 403
    };
  }

  return authResult;
};

/**
 * Firebase Functions: Validate premium feature access
  */
export const validatePremiumFeature = async (feature: string, req: AuthRequest): Promise<AuthResult> => {
  const authResult = await validatePremium(req);

  if (!authResult.success) {
    return authResult;
  }

  const userFeatures = req.user?.subscription?.features || [];

  if (!userFeatures.includes(feature)) {
    return {
      success: false,
      error: `Feature '${feature}' not available in subscription`,
      statusCode: 403
    };
  }

  return authResult;
};

/**
 * Firebase Functions: Validate role access
  */
export const validateRole = async (role: string, req: AuthRequest): Promise<AuthResult> => {
  const authResult = await authenticateUser(req, { required: true });

  if (!authResult.success) {
    return authResult;
  }

  const userRoles = req.user?.roles || [];

  if (!userRoles.includes(role)) {
    return {
      success: false,
      error: `Role '${role}' required`,
      statusCode: 403
    };
  }

  return authResult;
};

/**
 * Create composite middleware that runs multiple auth checks
  */
export const createComposite = (...middlewares: Function[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    let index = 0;

    const runNext = (err?: any) => {
      if (err) {
        return next(err);
      }

      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    };

    runNext();
  };
};

/**
 * Authentication error handler
  */
export const authErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Authentication error:', err);

  if (err.code === 'auth/id-token-expired') {
    res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
    return;
  }

  if (err.code === 'auth/id-token-revoked') {
    res.status(401).json({
      error: 'Token revoked',
      code: 'TOKEN_REVOKED'
    });
    return;
  }

  if (err.code === 'auth/invalid-id-token') {
    res.status(401).json({
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
    return;
  }

  res.status(500).json({
    error: 'Authentication system error',
    code: 'AUTH_ERROR'
  });
};

/**
 * Authentication logger middleware
  */
export const authLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';

  logger.info(`Auth request: ${req.method} ${req.path}`, {
    ip,
    userAgent,
    timestamp: new Date().toISOString()
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`Auth response: ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
};

/**
 * Legacy API key validation (for backward compatibility)
  */
export const validateApiKey = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({
      error: 'API key required',
      code: 'API_KEY_REQUIRED'
    });
    return;
  }

  try {
    // Check API key in database
    const apiKeyDoc = await db.collection('api_keys').doc(apiKey).get();

    if (!apiKeyDoc.exists) {
      res.status(401).json({
        error: 'Invalid API key',
        code: 'API_KEY_INVALID'
      });
      return;
    }

    const apiKeyData = apiKeyDoc.data();

    if (!apiKeyData?.active) {
      res.status(401).json({
        error: 'API key disabled',
        code: 'API_KEY_DISABLED'
      });
      return;
    }

    // Set user context from API key
    req.user = {
      uid: apiKeyData.userId,
      email: apiKeyData.email,
      role: apiKeyData.role || 'api',
      roles: apiKeyData.roles || ['api'],
      isAdmin: apiKeyData.role === 'admin',
      isPremium: apiKeyData.isPremium || false
    };

    next();
  } catch (error) {
    logger.error('API key validation error:', error);
    res.status(500).json({
      error: 'API key validation failed',
      code: 'API_KEY_ERROR'
    });
  }
};

/**
 * Get user from token (for backward compatibility)
  */
export const getUserFromToken = async (req: AuthRequest): Promise<AuthResult> => {
  return await authenticateUser(req, { required: true });
};

export default {
  authenticateUser,
  requireAuth,
  requireEmailVerification,
  requireAdmin,
  requirePremium,
  requireEnterprise,
  requireRole,
  validateAuth,
  validateAuthWithEmail,
  validateAdmin,
  validatePremium,
  validatePremiumFeature,
  validateRole,
  validateApiKey,
  getUserFromToken,
  createComposite,
  authErrorHandler,
  authLogger
};