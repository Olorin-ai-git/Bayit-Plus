/**
 * Rate Limiting Middleware
 * Implements rate limiting using Redis for distributed environments
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from './session.middleware';
import { getConfig } from '../config/schema';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
  message?: string; // Custom error message
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Try to get real IP from common headers (for proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor : forwardedFor.split(',');
    return ips[0].trim();
  }

  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Rate limiter middleware factory
 */
export function rateLimit(options: Partial<RateLimitOptions> = {}) {
  const config = getConfig();

  const opts: RateLimitOptions = {
    windowMs: options.windowMs || (config.rateLimit.windowSeconds * 1000),
    maxRequests: options.maxRequests || config.rateLimit.maxRequests,
    keyGenerator: options.keyGenerator || defaultKeyGenerator,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skipFailedRequests: options.skipFailedRequests ?? false,
    message: options.message || 'Too many requests, please try again later.',
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = await getRedisClient();
      const key = `rate-limit:${opts.keyGenerator!(req)}`;
      const now = Date.now();
      const windowStart = now - opts.windowMs;

      // Remove old entries outside the window
      await redis.zRemRangeByScore(key, 0, windowStart);

      // Get current request count
      const requestCount = await redis.zCard(key);

      if (requestCount >= opts.maxRequests) {
        // Get oldest request timestamp to calculate retry-after
        const oldest = await redis.zRange(key, 0, 0);
        const retryAfter = oldest.length > 0
          ? Math.ceil((parseInt(oldest[0]) + opts.windowMs - now) / 1000)
          : Math.ceil(opts.windowMs / 1000);

        res.status(429).json({
          error: 'Too Many Requests',
          message: opts.message,
          retryAfter,
        });
        return;
      }

      // Track the request (conditionally based on response status)
      const shouldTrack = () => {
        if (opts.skipSuccessfulRequests && res.statusCode < 400) {
          return false;
        }
        if (opts.skipFailedRequests && res.statusCode >= 400) {
          return false;
        }
        return true;
      };

      // Add current request to sorted set
      await redis.zAdd(key, { score: now, value: `${now}` });

      // Set expiration on the key
      await redis.expire(key, Math.ceil(opts.windowMs / 1000));

      // Attach headers
      res.setHeader('X-RateLimit-Limit', opts.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.maxRequests - requestCount - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(windowStart + opts.windowMs).toISOString());

      // Track request after response
      if (!opts.skipSuccessfulRequests && !opts.skipFailedRequests) {
        next();
      } else {
        const originalEnd = res.end.bind(res);
        res.end = function(this: Response, ...args: any[]): Response {
          if (!shouldTrack()) {
            redis.zRem(key, `${now}`).catch(console.error);
          }
          return originalEnd(...args);
        };
        next();
      }
    } catch (error) {
      console.error('Rate limit error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Strict rate limiter - fails closed (blocks) on errors
 */
export function strictRateLimit(options: Partial<RateLimitOptions> = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const middleware = rateLimit(options);
      await middleware(req, res, next);
    } catch (error) {
      console.error('Rate limit error:', error);
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Rate limiting service is temporarily unavailable',
      });
    }
  };
}

/**
 * IP-based rate limiter
 */
export function ipRateLimit(maxRequests: number, windowMs: number) {
  return rateLimit({
    maxRequests,
    windowMs,
    keyGenerator: defaultKeyGenerator,
  });
}

/**
 * User-based rate limiter (requires authentication)
 */
export function userRateLimit(maxRequests: number, windowMs: number) {
  return rateLimit({
    maxRequests,
    windowMs,
    keyGenerator: (req: any) => {
      return req.user?.id || req.session?.userId || defaultKeyGenerator(req);
    },
  });
}

/**
 * API endpoint rate limiter
 */
export function apiRateLimit(maxRequests: number, windowMs: number) {
  return rateLimit({
    maxRequests,
    windowMs,
    keyGenerator: (req) => {
      const ip = defaultKeyGenerator(req);
      const endpoint = req.path;
      return `${ip}:${endpoint}`;
    },
  });
}

/**
 * Sliding window rate limiter (more accurate)
 */
export function slidingWindowRateLimit(options: Partial<RateLimitOptions> = {}) {
  const config = getConfig();

  const opts: RateLimitOptions = {
    windowMs: options.windowMs || (config.rateLimit.windowSeconds * 1000),
    maxRequests: options.maxRequests || config.rateLimit.maxRequests,
    keyGenerator: options.keyGenerator || defaultKeyGenerator,
    message: options.message || 'Too many requests, please try again later.',
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = await getRedisClient();
      const key = `sliding-rate-limit:${opts.keyGenerator!(req)}`;
      const now = Date.now();

      // Increment counter
      const count = await redis.incr(key);

      // Set expiration on first request
      if (count === 1) {
        await redis.pExpire(key, opts.windowMs);
      }

      // Get TTL to calculate retry-after
      const ttl = await redis.pTTL(key);

      if (count > opts.maxRequests) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: opts.message,
          retryAfter: Math.ceil(ttl / 1000),
        });
        return;
      }

      // Attach headers
      res.setHeader('X-RateLimit-Limit', opts.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.maxRequests - count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(now + ttl).toISOString());

      next();
    } catch (error) {
      console.error('Sliding window rate limit error:', error);
      // Fail open
      next();
    }
  };
}
