/**
 * Core Middleware Factory
 * Provides dependency injection and factory patterns for middleware creation
 * Author: Gil Klainert
 * Date: 2025-08-29
  */

import { Request, Response, NextFunction } from 'express';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  IMiddleware,
  IPreAuthMiddleware,
  IMiddlewareFactory,
  MiddlewareFactoryConfig,
  AuthenticatedRequest,
  PremiumGuardOptions,
  RateLimitOptions,
  MiddlewareAuthenticationError as AuthenticationError,
  RateLimitError,
  FeatureAccessError,
  isAuthenticatedRequest
} from '../types/middleware';

/**
 * Core Middleware Factory Implementation
 * Uses dependency injection to create middleware without external dependencies
  */
export class CoreMiddlewareFactory implements IMiddlewareFactory {
  private config: MiddlewareFactoryConfig = {};

  /**
   * Configure the factory with service implementations
    */
  configure(config: MiddlewareFactoryConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create authentication middleware
   * Always available in Core module
    */
  createAuthGuard(): IPreAuthMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (this.config.authGuard) {
          // Use injected auth guard
          const authenticatedRequest = await this.config.authGuard.requireAuth(req);
          Object.assign(req, authenticatedRequest);
          return next();
        } else {
          // Fallback implementation - basic Firebase auth check
          return this.basicAuthCheck(req, res, next);
        }
      } catch (error) {
        this.handleAuthError(error, res);
      }
    };
  }

  /**
   * Create premium feature guard
   * Requires premium service injection
    */
  createPremiumGuard(featureId: string, options: PremiumGuardOptions = {}): IMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Ensure request is authenticated first
        if (!isAuthenticatedRequest(req)) {
          throw new AuthenticationError('Authentication required for premium features');
        }

        if (this.config.premiumGuard) {
          // Use injected premium guard
          const result = await this.config.premiumGuard.checkPremiumAccess(
            req.auth.uid,
            featureId,
            options
          );

          if (!result.allowed) {
            throw new FeatureAccessError(
              options.customErrorMessage || `Premium access required for feature: ${featureId}`,
              {
                featureId,
                reason: result.reason,
                details: result.details,
                upgradeUrl: `/pricing?feature=${featureId}`
              }
            );
          }

          return next();
        } else {
          // Fallback: Log warning and allow access (development mode)
          logger.warn('Premium guard not configured - allowing access in development mode', {
            featureId,
            userId: req.auth.uid
          });
          return next();
        }
      } catch (error) {
        this.handlePremiumError(error, featureId, res);
      }
    };
  }

  /**
   * Create rate limiting middleware
   * Requires rate limit service injection
    */
  createRateLimitGuard(featureId: string, options: RateLimitOptions): IMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!isAuthenticatedRequest(req)) {
          throw new AuthenticationError('Authentication required for rate limiting');
        }

        if (this.config.rateLimitGuard) {
          // Use injected rate limit guard
          const result = await this.config.rateLimitGuard.checkRateLimit(
            req.auth.uid,
            featureId,
            options
          );

          if (!result.allowed) {
            throw new RateLimitError(
              'Rate limit exceeded',
              {
                featureId,
                retryAfter: result.retryAfter,
                currentCount: result.currentCount,
                limit: result.limit,
                resetTime: result.resetTime
              }
            );
          }

          return next();
        } else {
          // Fallback: Basic in-memory rate limiting
          return this.basicRateLimit(req, featureId, options, res, next);
        }
      } catch (error) {
        this.handleRateLimitError(error, featureId, res);
      }
    };
  }

  /**
   * Create combined feature guard (auth + premium + rate limit)
    */
  createFeatureGuard(featureId: string, options: PremiumGuardOptions = {}): IMiddleware {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 1. Authentication check
        const authGuard = this.createAuthGuard();
        await new Promise<void>((resolve, reject) => {
          authGuard(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // At this point, req is authenticated
        const authReq = req as AuthenticatedRequest;

        // 2. Rate limiting check (if configured)
        if (options.rateLimitPerMinute) {
          const rateLimitGuard = this.createRateLimitGuard(featureId, {
            limitPerMinute: options.rateLimitPerMinute
          });
          await new Promise<void>((resolve, reject) => {
            rateLimitGuard(authReq, res, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        // 3. Premium access check (if not free tier)
        if (options.tier && options.tier !== 'free') {
          const premiumGuard = this.createPremiumGuard(featureId, options);
          await new Promise<void>((resolve, reject) => {
            premiumGuard(authReq, res, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        next();
      } catch (error) {
        this.handleFeatureGuardError(error, featureId, res);
      }
    };
  }

  /**
   * Authentication check
   * REQUIRES: authGuard middleware must be injected via configure()
   * FAILS if authGuard is not configured
    */
  private basicAuthCheck(_req: Request, _res: Response, _next: NextFunction): void {
    throw new Error(
      'CRITICAL: No authentication middleware configured. ' +
      'The CoreMiddlewareFactory requires an injected authGuard implementation. ' +
      'Call factory.configure({ authGuard: <AuthGuardService> }) before using authentication middleware. ' +
      'Use @cvplus/auth authGuard implementation in production.'
    );
  }

  /**
   * Rate limiting enforcement
   * REQUIRES: rateLimitService middleware must be injected via configure()
   * FAILS if rateLimitService is not configured
    */
  private basicRateLimit(
    _req: Request,
    _featureId: string,
    _options: RateLimitOptions,
    _res: Response,
    _next: NextFunction
  ): void {
    throw new Error(
      'CRITICAL: No rate limiting service configured. ' +
      'The CoreMiddlewareFactory requires an injected rateLimitService implementation. ' +
      'Call factory.configure({ rateLimitService: <RateLimitService> }) before using rate limit middleware. ' +
      'In-memory rate limiting is not suitable for distributed systems. ' +
      'Use a proper implementation backed by Redis or similar in production.'
    );
  }

  /**
   * Error handlers
    */
  private handleAuthError(error: any, res: Response): void {
    logger.error('Authentication error:', error);

    if (error instanceof AuthenticationError) {
      res.status(401).json({
        error: error.message,
        code: error.code,
        details: error.details
      });
      return;
    }

    if (error instanceof HttpsError) {
      res.status(error.httpErrorCode?.status || 500).json({
        error: error.message,
        code: error.code
      });
      return;
    }

    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }

  private handlePremiumError(error: any, featureId: string, res: Response): void {
    logger.error('Premium access error:', { error, featureId });

    if (error instanceof FeatureAccessError) {
      res.status(403).json({
        error: error.message,
        code: error.code,
        details: error.details
      });
      return;
    }

    if (error instanceof HttpsError) {
      res.status(error.httpErrorCode?.status || 500).json({
        error: error.message,
        code: error.code
      });
      return;
    }

    res.status(403).json({
      error: 'Premium access denied',
      code: 'ACCESS_DENIED',
      featureId
    });
  }

  private handleRateLimitError(error: any, featureId: string, res: Response): void {
    logger.error('Rate limit error:', { error, featureId });

    if (error instanceof RateLimitError) {
      res.status(429).json({
        error: error.message,
        code: error.code,
        details: error.details
      });
      return;
    }

    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      featureId
    });
  }

  private handleFeatureGuardError(error: any, featureId: string, res: Response): void {
    logger.error('Feature guard error:', { error, featureId });

    // Delegate to specific error handlers based on error type
    if (error instanceof AuthenticationError) {
      return this.handleAuthError(error, res);
    }

    if (error instanceof FeatureAccessError) {
      return this.handlePremiumError(error, featureId, res);
    }

    if (error instanceof RateLimitError) {
      return this.handleRateLimitError(error, featureId, res);
    }

    // Generic error handling
    res.status(500).json({
      error: 'Feature access check failed',
      code: 'SYSTEM_ERROR',
      featureId
    });
  }
}

/**
 * Global factory instance
  */
export const middlewareFactory = new CoreMiddlewareFactory();

/**
 * Convenience functions for creating common middleware
  */
export const requireAuth = () => middlewareFactory.createAuthGuard();

export const requirePremiumFeature = (featureId: string, options?: PremiumGuardOptions) =>
  middlewareFactory.createPremiumGuard(featureId, options);

export const requireRateLimit = (featureId: string, options: RateLimitOptions) =>
  middlewareFactory.createRateLimitGuard(featureId, options);

export const requireFeatureAccess = (featureId: string, options?: PremiumGuardOptions) =>
  middlewareFactory.createFeatureGuard(featureId, options);

/**
 * Configuration helper for dependency injection
  */
export const configureMiddleware = (config: MiddlewareFactoryConfig) => {
  middlewareFactory.configure(config);
};

/**
 * Type exports for external modules
  */
export type { 
  IMiddlewareFactory,
  MiddlewareFactoryConfig,
  PremiumGuardOptions,
  RateLimitOptions
};