/**
 * Core Middleware Type Definitions
 * Interface-based architecture for loose coupling
 * Author: Gil Klainert
 * Date: 2025-08-29
  */

import { Request, Response, NextFunction } from 'express';

// Base authenticated request interface
export interface AuthenticatedRequest extends Request {
  auth: {
    uid: string;
    email?: string;
    token?: any;
  };
  user?: UserContext;
}

// User context for middleware
export interface UserContext {
  uid: string;
  email?: string;
  subscription?: UserSubscription;
  premiumAccess?: boolean;
  gracePeriodAccess?: boolean;
  gracePeriodEnd?: Date;
}

// Subscription interface
export interface UserSubscription {
  tier: 'free' | 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'grace_period';
  features: string[];
  expiresAt?: Date;
  gracePeriodEnd?: Date;
  limits: {
    monthlyUploads: number;
    cvGenerations: number;
    featuresPerCV: number;
    apiCallsPerMonth: number;
  };
  stripeSubscriptionId?: string;
}

// Feature definition interface
export interface Feature {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'premium' | 'enterprise';
  usageLimits?: {
    free?: number;
    premium?: number;
    enterprise?: number;
  };
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

// Middleware result interface
export interface MiddlewareResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  details?: Record<string, any>;
}

// Rate limiting result interface
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  currentCount?: number;
  limit?: number;
  resetTime?: number;
}

// Usage check result interface
export interface UsageCheckResult {
  withinLimits: boolean;
  currentUsage: number;
  limit: number;
  resetDate: Date;
  upgradeOptions?: UpgradeOption[];
}

// Upgrade option interface
export interface UpgradeOption {
  tier: string;
  newLimit: number;
  price: number;
  billingPeriod: 'month' | 'year';
}

// Base middleware interface (for authenticated requests)
export interface IMiddleware {
  (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> | void;
}

// Pre-authentication middleware interface (for unauthenticated requests)
export interface IPreAuthMiddleware {
  (req: Request, res: Response, next: NextFunction): Promise<void> | void;
}

// Authentication guard interface
export interface IAuthGuard {
  requireAuth(request: any): Promise<AuthenticatedRequest>;
}

// Premium guard interface
export interface IPremiumGuard {
  checkPremiumAccess(
    userId: string,
    featureId: string,
    options?: PremiumGuardOptions
  ): Promise<MiddlewareResult>;
  
  createMiddleware(
    featureId: string,
    options?: PremiumGuardOptions
  ): IMiddleware;
}

// Premium guard options
export interface PremiumGuardOptions {
  requiredFeature?: string;
  gracePeriodDays?: number;
  customErrorMessage?: string;
  trackUsage?: boolean;
  allowGracePeriod?: boolean;
  rateLimitPerMinute?: number;
  tier?: 'free' | 'premium' | 'enterprise';
}

// Rate limit guard interface
export interface IRateLimitGuard {
  checkRateLimit(
    userId: string,
    featureId: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult>;
  
  createMiddleware(
    featureId: string,
    options: RateLimitOptions
  ): IMiddleware;
}

// Rate limit options
export interface RateLimitOptions {
  limitPerMinute?: number;
  limitPerHour?: number;
  limitPerDay?: number;
  windowMs?: number;
  skipSuccessfulRequests?: boolean;
}

// Feature registry interface
export interface IFeatureRegistry {
  getFeature(featureId: string): Feature | undefined;
  registerFeature(feature: Feature): void;
  getAllFeatures(): Feature[];
  getFeaturesForTier(tier: string): Feature[];
}

// Subscription service interface
export interface ISubscriptionService {
  getUserSubscription(userId: string): Promise<UserSubscription | null>;
  checkFeatureAccess(userId: string, featureId: string): Promise<boolean>;
  getUsageStats(userId: string, featureId: string): Promise<UsageCheckResult>;
}

// Security monitor interface
export interface ISecurityMonitor {
  logSecurityEvent(event: SecurityEvent): Promise<void>;
}

// Security event interface
export interface SecurityEvent {
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  featureId?: string;
  service: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

// Middleware factory configuration
export interface MiddlewareFactoryConfig {
  authGuard?: IAuthGuard;
  premiumGuard?: IPremiumGuard;
  rateLimitGuard?: IRateLimitGuard;
  featureRegistry?: IFeatureRegistry;
  subscriptionService?: ISubscriptionService;
  securityMonitor?: ISecurityMonitor;
}

// Middleware factory interface
export interface IMiddlewareFactory {
  configure(config: MiddlewareFactoryConfig): void;
  createAuthGuard(): IMiddleware;
  createPremiumGuard(featureId: string, options?: PremiumGuardOptions): IMiddleware;
  createRateLimitGuard(featureId: string, options: RateLimitOptions): IMiddleware;
  createFeatureGuard(featureId: string, options?: PremiumGuardOptions): IMiddleware;
}

// Service injection types
export type ServiceProvider<T> = () => T | Promise<T>;
export type ServiceFactory<T> = (config?: any) => T;

// Error types for middleware
export class MiddlewareError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MiddlewareError';
  }
}

export class MiddlewareAuthenticationError extends MiddlewareError {
  constructor(message: string = 'Authentication required', details?: Record<string, any>) {
    super('AUTH_REQUIRED', message, details);
  }
}

export class MiddlewareAuthorizationError extends MiddlewareError {
  constructor(message: string = 'Access denied', details?: Record<string, any>) {
    super('ACCESS_DENIED', message, details);
  }
}

export class RateLimitError extends MiddlewareError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, any>) {
    super('RATE_LIMIT_EXCEEDED', message, details);
  }
}

export class FeatureAccessError extends MiddlewareError {
  constructor(message: string = 'Premium feature required', details?: Record<string, any>) {
    super('PREMIUM_REQUIRED', message, details);
  }
}

// Type guards
export const isAuthenticatedRequest = (req: Request): req is AuthenticatedRequest => {
  return 'auth' in req && typeof (req as any).auth?.uid === 'string';
};

export const hasUserContext = (req: AuthenticatedRequest): boolean => {
  return req.user !== undefined;
};

// Premium feature types
export type PremiumFeature = 
  | 'webPortal' 
  | 'aiChat' 
  | 'podcast' 
  | 'advancedAnalytics' 
  | 'videoIntroduction' 
  | 'roleDetection' 
  | 'externalData'
  | 'enterpriseFeatures'
  | 'customBranding'
  | 'apiAccess';

// Tier hierarchy
export const TIER_HIERARCHY = {
  free: 0,
  premium: 1,
  enterprise: 2
} as const;

// Default feature limits
export const DEFAULT_LIMITS: Record<string, UserSubscription['limits']> = {
  free: {
    monthlyUploads: 3,
    cvGenerations: 5,
    featuresPerCV: 2,
    apiCallsPerMonth: 20
  },
  premium: {
    monthlyUploads: 50,
    cvGenerations: 100,
    featuresPerCV: 10,
    apiCallsPerMonth: 500
  },
  enterprise: {
    monthlyUploads: -1, // Unlimited
    cvGenerations: -1,  // Unlimited
    featuresPerCV: -1,  // Unlimited
    apiCallsPerMonth: -1 // Unlimited
  }
};