/**
 * JWT Authentication Middleware
 * Implements RS256 algorithm with secure token validation
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { getConfig } from '../config/schema';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'FREE_USER' | 'PREMIUM_USER' | 'ADMIN' | 'SUPER_ADMIN';
  permissions: string[];
  plan: 'free' | 'premium' | 'enterprise';
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and raw token
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Verify JWT token with RS256 algorithm
 */
function verifyToken(token: string): AuthenticatedUser {
  const config = getConfig();

  try {
    const decoded = jwt.verify(token, config.jwt.secretKey, {
      algorithms: [config.jwt.algorithm],
    }) as any;

    // Validate required fields
    if (!decoded.id || !decoded.email || !decoded.role) {
      throw new Error('Invalid token payload: missing required fields');
    }

    // Validate role
    const validRoles = ['FREE_USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(decoded.role)) {
      throw new Error('Invalid token payload: invalid role');
    }

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      plan: decoded.plan || 'free',
      isActive: decoded.isActive !== false, // default to true
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
      return;
    }

    const user = verifyToken(token);

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json({
      error: 'Unauthorized',
      message,
    });
  }
}

/**
 * Role-based access control middleware
 * Requires user to have one of the specified roles
 */
export function requireRole(...allowedRoles: AuthenticatedUser['role'][]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Permission-based access control middleware
 * Requires user to have ALL specified permissions
 */
export function requirePermissions(...requiredPermissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const hasAllPermissions = requiredPermissions.every(
      (permission) => req.user!.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: requiredPermissions,
        current: req.user.permissions,
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 */
export function optionalAuthenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);

    if (token) {
      const user = verifyToken(token);
      if (user.isActive) {
        req.user = user;
      }
    }
  } catch {
    // Silently fail - user will be undefined
  }

  next();
}

/**
 * Generate JWT token
 */
export function generateToken(user: Omit<AuthenticatedUser, 'isActive'> & { isActive?: boolean }): string {
  const config = getConfig();

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    plan: user.plan,
    isActive: user.isActive !== false,
  };

  return jwt.sign(payload, config.jwt.secretKey, {
    algorithm: config.jwt.algorithm,
    expiresIn: `${config.jwt.accessTokenExpireMinutes}m`,
  });
}
