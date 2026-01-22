/**
 * Session Management Middleware
 * Implements secure session handling with Redis storage
 */

import { Request, Response, NextFunction } from 'express';
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';
import { createClient } from 'redis';
import { getConfig } from '../config/schema';

// Redis client instance
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Redis client for session storage
 */
async function initializeRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const config = getConfig();

  redisClient = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
      tls: config.redis.tls,
    },
    password: config.redis.password,
    database: config.redis.db,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis client connected');
  });

  await redisClient.connect();
  return redisClient;
}

/**
 * Get Redis client instance
 */
export async function getRedisClient() {
  if (!redisClient) {
    await initializeRedisClient();
  }
  return redisClient!;
}

/**
 * Create session middleware with Redis store
 */
export async function createSessionMiddleware() {
  const config = getConfig();
  const client = await getRedisClient();

  // connect-redis v7+ uses a factory pattern
  const RedisStore = connectRedis.default as any;
  const store = new RedisStore({
    client: client as any,
    prefix: 'cvplus:session:',
    ttl: config.security.sessionMaxAge / 1000, // Convert ms to seconds
  });

  return session.default({
    store,
    secret: config.security.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'cvplus.sid', // Custom session cookie name
    cookie: {
      secure: config.app.env === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: config.security.sessionMaxAge,
      sameSite: 'strict', // CSRF protection
      domain: config.app.env === 'production' ? '.olorin.ai' : undefined,
    },
    rolling: true, // Reset expiration on every request
  });
}

/**
 * Session data interface
 */
export interface SessionData extends session.SessionData {
  userId?: string;
  email?: string;
  role?: string;
  loginAt?: number;
  lastActivity?: number;
}

/**
 * Session-based authentication middleware
 * Requires active session with userId
 */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const sessionData = req.session as SessionData;

  if (!sessionData.userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Session not found or expired',
    });
    return;
  }

  // Update last activity timestamp
  sessionData.lastActivity = Date.now();

  next();
}

/**
 * Create user session
 */
export function createUserSession(
  req: Request,
  user: { id: string; email: string; role: string }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const sessionData = req.session as SessionData;

    sessionData.userId = user.id;
    sessionData.email = user.email;
    sessionData.role = user.role;
    sessionData.loginAt = Date.now();
    sessionData.lastActivity = Date.now();

    req.session.save((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Destroy user session
 */
export function destroyUserSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Session activity tracking middleware
 * Updates last activity timestamp on every request
 */
export function trackSessionActivity(req: Request, _res: Response, next: NextFunction): void {
  const sessionData = req.session as SessionData;

  if (sessionData.userId) {
    sessionData.lastActivity = Date.now();
  }

  next();
}

/**
 * Session timeout middleware
 * Destroys session if inactive for too long
 */
export function sessionTimeoutCheck(maxInactiveMs: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sessionData = req.session as SessionData;

    if (sessionData.userId && sessionData.lastActivity) {
      const inactiveMs = Date.now() - sessionData.lastActivity;

      if (inactiveMs > maxInactiveMs) {
        await destroyUserSession(req);
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Session expired due to inactivity',
        });
        return;
      }
    }

    next();
  };
}
