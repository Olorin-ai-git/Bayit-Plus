/**
 * Middleware Factory Service
 * 
 * Factory functions to generate reusable authentication and authorization middleware.
 * Replaces the 1,111 lines of scattered middleware patterns.
 * 
 * Author: Gil Klainert
 * Date: August 28, 2025
  */

import { Response, NextFunction } from 'express';
import { CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { AuthenticatedExpressRequest } from '../types/firebase-auth.types';
import { 
  firebaseAuth as authService,
  AuthValidationOptions,
  JobOwnershipValidationOptions
} from './authentication.service';
import {
  firebaseAuth as authzService,
  RoleCheckOptions,
  AuthorizationContext
} from './authorization.service';

// Types for middleware configurations
export interface BasicAuthMiddlewareConfig {
  requireEmailVerification?: boolean;
  logRequests?: boolean;
  customErrorMessage?: string;
}

export interface RoleMiddlewareConfig extends RoleCheckOptions {
  roles: string | string[];
  logAccess?: boolean;
}

export interface PremiumMiddlewareConfig {
  requiredFeature?: string;
  gracePeriodDays?: number;
  customErrorMessage?: string;
  trackUsage?: boolean;
  allowGracePeriod?: boolean;
  rateLimitPerMinute?: number;
}

export interface ResourceOwnershipConfig extends JobOwnershipValidationOptions {
  logOwnershipChecks?: boolean;
}

/**
 * Middleware Factory Service
 * 
 * Creates standardized middleware functions to replace scattered auth patterns
  */
export class MiddlewareFactory {

  /**
   * Create basic authentication middleware for Express
   * 
   * Replaces scattered Express auth patterns across middleware files
    */
  createExpressAuthMiddleware(config?: BasicAuthMiddlewareConfig) {
    return async (req: AuthenticatedExpressRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (config?.logRequests) {
          logger.info('Auth middleware processing request', {
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
          });
        }

        await authService.requireAuthExpress(req);
        
        if (config?.requireEmailVerification && req.user) {
          const token = req.user.token;
          if (!token.email_verified) {
            res.status(403).json({
              error: 'Email verification required',
              code: 'EMAIL_NOT_VERIFIED'
            });
            return;
          }
        }

        next();
      } catch (error) {
        const message = config?.customErrorMessage || 'Authentication required';
        logger.error('Express auth middleware failed', {
          path: req.path,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        
        res.status(401).json({
          error: message,
          code: 'AUTHENTICATION_FAILED'
        });
      }
    };
  }

  /**
   * Create role-based authorization middleware for Express
   * 
   * Consolidates role checking patterns from multiple middleware files
    */
  createRoleMiddleware(config: RoleMiddlewareConfig) {
    return async (req: AuthenticatedExpressRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.uid) {
          res.status(401).json({
            error: 'Authentication required',
            code: 'UNAUTHENTICATED'
          });
          return;
        }

        if (config.logAccess) {
          logger.info('Role middleware checking access', {
            uid: req.user.uid,
            requiredRoles: config.roles,
            path: req.path,
            timestamp: new Date().toISOString()
          });
        }

        await authzService.requireRole(req.user.uid, config.roles, config);
        next();
      } catch (error) {
        logger.error('Role middleware failed', {
          uid: req.user?.uid,
          requiredRoles: config.roles,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        
        res.status(403).json({
          error: error instanceof Error ? error.message : 'Access denied',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    };
  }

  /**
   * Create premium access middleware
   * 
   * Consolidates patterns from enhancedPremiumGuard.ts (572 lines)
    */
  createPremiumMiddleware(config?: PremiumMiddlewareConfig) {
    return async (req: AuthenticatedExpressRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user?.uid) {
          res.status(401).json({
            error: 'Authentication required',
            code: 'UNAUTHENTICATED'
          });
          return;
        }

        // Rate limiting (if configured)
        if (config?.rateLimitPerMinute) {
          // TODO: Implement rate limiting logic
          logger.info('Rate limiting check', {
            uid: req.user.uid,
            limit: config.rateLimitPerMinute,
            timestamp: new Date().toISOString()
          });
        }

        // Premium access validation
        await authzService.requirePremiumAccess(req.user.uid);
        
        // Feature-specific validation (if configured)
        if (config?.requiredFeature) {
          const context: AuthorizationContext = {
            uid: req.user.uid,
            roles: req.user.token.roles || [],
            customClaims: req.user.token
          };
          
          await authzService.requirePermission(
            context,
            'feature',
            config.requiredFeature,
            config.customErrorMessage
          );
        }

        // Usage tracking (if configured)
        if (config?.trackUsage) {
          logger.info('Premium feature usage', {
            uid: req.user.uid,
            feature: config.requiredFeature,
            path: req.path,
            timestamp: new Date().toISOString()
          });
        }

        next();
      } catch (error) {
        const message = config?.customErrorMessage || 'Premium access required';
        logger.error('Premium middleware failed', {
          uid: req.user?.uid,
          feature: config?.requiredFeature,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        
        res.status(403).json({
          error: message,
          code: 'PREMIUM_ACCESS_REQUIRED'
        });
      }
    };
  }

  /**
   * Create Firebase Functions auth validator
   * 
   * Replaces the basic auth validation pattern found in 50+ functions
    */
  createCallableAuthValidator(options?: AuthValidationOptions) {
    return async (request: CallableRequest) => {
      return authService.requireAuth(request, options);
    };
  }

  /**
   * Create Firebase Functions role validator
    */
  createCallableRoleValidator(roles: string | string[], options?: RoleCheckOptions) {
    return async (request: CallableRequest) => {
      const authResult = await authService.requireAuth(request);
      await authzService.requireRole(authResult.uid, roles, options);
      return authResult;
    };
  }

  /**
   * Create Firebase Functions admin validator
    */
  createCallableAdminValidator() {
    return async (request: CallableRequest) => {
      const authResult = await authService.requireAuth(request);
      await authzService.requireAdminAccess(authResult.uid);
      return authResult;
    };
  }

  /**
   * Create Firebase Functions premium validator
    */
  createCallablePremiumValidator(feature?: string) {
    return async (request: CallableRequest) => {
      const authResult = await authService.requireAuth(request);
      await authzService.requirePremiumAccess(authResult.uid);
      
      if (feature) {
        const context: AuthorizationContext = {
          uid: authResult.uid,
          roles: authResult.roles,
          customClaims: authResult.customClaims
        };
        await authzService.requirePermission(context, 'feature', feature);
      }
      
      return authResult;
    };
  }

  /**
   * Create resource ownership validator
   * 
   * Consolidates job ownership patterns from authGuard.ts
    */
  createResourceOwnershipValidator(config: ResourceOwnershipConfig) {
    return async (request: CallableRequest, resourceId: string) => {
      if (config.logOwnershipChecks) {
        logger.info('Resource ownership validation', {
          uid: request.auth?.uid,
          resourceId,
          collection: config.collectionPath,
          timestamp: new Date().toISOString()
        });
      }

      return authService.requireAuthWithJobOwnership(request, resourceId, config);
    };
  }

  /**
   * Create composite middleware that combines multiple checks
   * 
   * For complex scenarios requiring multiple validations
    */
  createCompositeMiddleware(middlewares: Array<(req: AuthenticatedExpressRequest, res: Response, next: NextFunction) => void>) {
    return async (req: AuthenticatedExpressRequest, res: Response, next: NextFunction): Promise<void> => {
      const runMiddleware = (middleware: any) => {
        return new Promise<void>((resolve, reject) => {
          middleware(req, res, (error: any) => {
            if (error) reject(error);
            else resolve();
          });
        });
      };

      try {
        for (const middleware of middlewares) {
          await runMiddleware(middleware);
        }
        next();
      } catch (error) {
        logger.error('Composite middleware failed', {
          error: error instanceof Error ? error.message : String(error),
          path: req.path,
          timestamp: new Date().toISOString()
        });
        
        res.status(403).json({
          error: 'Access validation failed',
          code: 'COMPOSITE_AUTH_FAILED'
        });
      }
    };
  }
}

// Singleton instance
export const middlewareFactory = new MiddlewareFactory();

// Export convenience functions that match the original middleware patterns
export const createAuthMiddleware = (config?: BasicAuthMiddlewareConfig) =>
  middlewareFactory.createExpressAuthMiddleware(config);

export const createRoleMiddleware = (config: RoleMiddlewareConfig) =>
  middlewareFactory.createRoleMiddleware(config);

export const createPremiumMiddleware = (config?: PremiumMiddlewareConfig) =>
  middlewareFactory.createPremiumMiddleware(config);

export const createCallableAuth = (options?: AuthValidationOptions) =>
  middlewareFactory.createCallableAuthValidator(options);

export const createCallableRole = (roles: string | string[], options?: RoleCheckOptions) =>
  middlewareFactory.createCallableRoleValidator(roles, options);

export const createCallableAdmin = () =>
  middlewareFactory.createCallableAdminValidator();

export const createCallablePremium = (feature?: string) =>
  middlewareFactory.createCallablePremiumValidator(feature);

export const createResourceOwnership = (config: ResourceOwnershipConfig) =>
  middlewareFactory.createResourceOwnershipValidator(config);