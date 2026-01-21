import * as admin from 'firebase-admin';
import { Request } from 'express';

export interface AuthResult {
  success: boolean;
  userId?: string;
  user?: admin.auth.DecodedIdToken;
  error?: string;
}

export interface AuthOptions {
  required?: boolean;
  allowAnonymous?: boolean;
  requiredClaims?: Record<string, any>;
  subscriptionTiers?: string[];
  permissions?: string[];
}

/**
 * Authenticate Firebase user from request
 */
export async function authenticateUser(
  req: Request,
  options: AuthOptions = { required: true }
): Promise<AuthResult> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      if (options.required) {
        return {
          success: false,
          error: 'Authorization header is required'
        };
      } else {
        return { success: true }; // Anonymous access allowed
      }
    }

    // Parse Bearer token
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      return {
        success: false,
        error: 'Invalid authorization header format. Expected "Bearer <token>"'
      };
    }

    const token = tokenMatch[1];

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if user exists and is not disabled
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    if (userRecord.disabled) {
      return {
        success: false,
        error: 'User account is disabled'
      };
    }

    // Validate custom claims if required
    if (options.requiredClaims) {
      for (const [claim, expectedValue] of Object.entries(options.requiredClaims)) {
        if (decodedToken[claim] !== expectedValue) {
          return {
            success: false,
            error: `Missing or invalid claim: ${claim}`
          };
        }
      }
    }

    // Check subscription tier if specified
    if (options.subscriptionTiers && options.subscriptionTiers.length > 0) {
      const userTier = decodedToken.subscription_tier || 'free';
      if (!options.subscriptionTiers.includes(userTier)) {
        return {
          success: false,
          error: `Access denied. Required subscription tier: ${options.subscriptionTiers.join(' or ')}`
        };
      }
    }

    // Check permissions if specified
    if (options.permissions && options.permissions.length > 0) {
      const userPermissions = decodedToken.permissions || [];
      const hasRequiredPermission = options.permissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasRequiredPermission) {
        return {
          success: false,
          error: `Insufficient permissions. Required: ${options.permissions.join(' or ')}`
        };
      }
    }

    // Check for anonymous access restrictions
    if (!options.allowAnonymous && decodedToken.firebase.sign_in_provider === 'anonymous') {
      return {
        success: false,
        error: 'Anonymous access not allowed for this resource'
      };
    }

    console.log(`User authenticated successfully: ${decodedToken.uid}`);

    return {
      success: true,
      userId: decodedToken.uid,
      user: decodedToken
    };

  } catch (error) {
    console.error('Authentication failed:', error);

    if (error instanceof Error) {
      // Handle specific Firebase Auth errors
      if (error.message.includes('auth/id-token-expired')) {
        return {
          success: false,
          error: 'Authentication token has expired. Please log in again.'
        };
      } else if (error.message.includes('auth/id-token-revoked')) {
        return {
          success: false,
          error: 'Authentication token has been revoked. Please log in again.'
        };
      } else if (error.message.includes('auth/invalid-id-token')) {
        return {
          success: false,
          error: 'Invalid authentication token'
        };
      } else if (error.message.includes('auth/user-not-found')) {
        return {
          success: false,
          error: 'User account not found'
        };
      }
    }

    return {
      success: false,
      error: 'Authentication verification failed'
    };
  }
}

/**
 * Authenticate with specific subscription tier requirement
 */
export async function authenticateWithTier(
  req: Request,
  requiredTier: 'basic' | 'premium' | 'enterprise'
): Promise<AuthResult> {
  const tierHierarchy = {
    basic: ['basic', 'premium', 'enterprise'],
    premium: ['premium', 'enterprise'],
    enterprise: ['enterprise']
  };

  return authenticateUser(req, {
    required: true,
    subscriptionTiers: tierHierarchy[requiredTier]
  });
}

/**
 * Authenticate admin user
 */
export async function authenticateAdmin(req: Request): Promise<AuthResult> {
  return authenticateUser(req, {
    required: true,
    requiredClaims: { role: 'admin' },
    permissions: ['admin:read', 'admin:write']
  });
}

/**
 * Get user from request (lightweight version)
 */
export async function getUserFromRequest(req: Request): Promise<{
  userId?: string;
  isAuthenticated: boolean;
  subscriptionTier?: string;
}> {
  try {
    const authResult = await authenticateUser(req, { required: false });

    if (authResult.success && authResult.user) {
      return {
        userId: authResult.userId,
        isAuthenticated: true,
        subscriptionTier: authResult.user.subscription_tier || 'free'
      };
    }

    return { isAuthenticated: false };

  } catch (error) {
    console.error('Error getting user from request:', error);
    return { isAuthenticated: false };
  }
}

/**
 * Validate API key (for server-to-server requests)
 */
export async function validateApiKey(req: Request): Promise<AuthResult> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return {
        success: false,
        error: 'API key is required'
      };
    }

    // In production, validate against stored API keys in Firestore
    // For now, check against environment variable
    const validApiKey = process.env.API_KEY;

    if (!validApiKey || apiKey !== validApiKey) {
      return {
        success: false,
        error: 'Invalid API key'
      };
    }

    return {
      success: true,
      userId: 'api-user' // Special user ID for API access
    };

  } catch (error) {
    console.error('API key validation failed:', error);
    return {
      success: false,
      error: 'API key validation failed'
    };
  }
}

/**
 * Check if user has specific feature access
 */
export async function checkFeatureAccess(
  userId: string,
  feature: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  try {
    // Get user custom claims
    const user = await admin.auth().getUser(userId);
    const customClaims = user.customClaims || {};

    const subscriptionTier = customClaims.subscription_tier || 'free';
    const permissions = customClaims.permissions || [];

    // Define feature access rules
    const featureAccess = {
      'cv_processing': ['free', 'basic', 'premium', 'enterprise'],
      'multimedia_podcast': ['basic', 'premium', 'enterprise'],
      'multimedia_video': ['premium', 'enterprise'],
      'public_profiles': ['basic', 'premium', 'enterprise'],
      'analytics_basic': ['basic', 'premium', 'enterprise'],
      'analytics_advanced': ['premium', 'enterprise'],
      'custom_domains': ['enterprise'],
      'api_access': ['enterprise'],
      'white_label': ['enterprise']
    };

    const allowedTiers = featureAccess[feature as keyof typeof featureAccess];

    if (!allowedTiers) {
      return {
        hasAccess: false,
        reason: `Unknown feature: ${feature}`
      };
    }

    if (!allowedTiers.includes(subscriptionTier)) {
      return {
        hasAccess: false,
        reason: `Feature requires ${allowedTiers.join(' or ')} subscription. Current tier: ${subscriptionTier}`
      };
    }

    // Check specific permissions if needed
    const permissionRequiredFeatures = {
      'admin_dashboard': 'admin:read',
      'user_management': 'admin:write',
      'system_monitoring': 'admin:read'
    };

    const requiredPermission = permissionRequiredFeatures[feature as keyof typeof permissionRequiredFeatures];
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      return {
        hasAccess: false,
        reason: `Missing required permission: ${requiredPermission}`
      };
    }

    return { hasAccess: true };

  } catch (error) {
    console.error('Feature access check failed:', error);
    return {
      hasAccess: false,
      reason: 'Failed to check feature access'
    };
  }
}

/**
 * Set custom claims for user (admin function)
 */
export async function setUserCustomClaims(
  userId: string,
  claims: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    await admin.auth().setCustomUserClaims(userId, claims);

    console.log(`Custom claims updated for user ${userId}:`, claims);

    return { success: true };

  } catch (error) {
    console.error('Failed to set custom claims:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set custom claims'
    };
  }
}

/**
 * Revoke user tokens (force re-authentication)
 */
export async function revokeUserTokens(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await admin.auth().revokeRefreshTokens(userId);

    console.log(`Tokens revoked for user: ${userId}`);

    return { success: true };

  } catch (error) {
    console.error('Failed to revoke tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke tokens'
    };
  }
}

/**
 * Create session cookie (for server-side sessions)
 */
export async function createSessionCookie(
  idToken: string,
  expiresIn: number = 60 * 60 * 24 * 5 * 1000 // 5 days
): Promise<{ success: boolean; sessionCookie?: string; error?: string }> {
  try {
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    return {
      success: true,
      sessionCookie
    };

  } catch (error) {
    console.error('Failed to create session cookie:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create session cookie'
    };
  }
}

/**
 * Verify session cookie
 */
export async function verifySessionCookie(
  sessionCookie: string
): Promise<{ success: boolean; user?: admin.auth.DecodedIdToken; error?: string }> {
  try {
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);

    return {
      success: true,
      user: decodedToken
    };

  } catch (error) {
    console.error('Failed to verify session cookie:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid session cookie'
    };
  }
}