import * as admin from 'firebase-admin';
import { Request } from 'express';
import { createRateLimitError } from './error.middleware';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
  headers?: boolean; // Include rate limit headers
  store?: 'memory' | 'firestore'; // Storage backend
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // Seconds until next request allowed
}

/**
 * In-memory storage for rate limiting (for single instance)
 */
class MemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async get(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      const newRecord = { count: 0, resetTime: now + windowMs };
      this.store.set(key, newRecord);
      return newRecord;
    }

    return record;
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const record = await this.get(key, windowMs);
    record.count++;
    this.store.set(key, record);
    return record;
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Firestore storage for rate limiting (for distributed instances)
 */
class FirestoreStore {
  private firestore = admin.firestore();
  private collection = 'rate_limits';

  async get(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const docRef = this.firestore.collection(this.collection).doc(key);
    const doc = await docRef.get();

    if (!doc.exists) {
      const newRecord = { count: 0, resetTime: now + windowMs };
      await docRef.set({
        ...newRecord,
        createdAt: admin.firestore.Timestamp.now()
      });
      return newRecord;
    }

    const data = doc.data()!;
    const resetTime = data.resetTime;

    if (now > resetTime) {
      const newRecord = { count: 0, resetTime: now + windowMs };
      await docRef.set({
        ...newRecord,
        updatedAt: admin.firestore.Timestamp.now()
      }, { merge: true });
      return newRecord;
    }

    return { count: data.count, resetTime };
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const docRef = this.firestore.collection(this.collection).doc(key);

    try {
      const result = await this.firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        const now = Date.now();

        let count = 1;
        let resetTime = now + windowMs;

        if (doc.exists) {
          const data = doc.data()!;

          if (now <= data.resetTime) {
            count = data.count + 1;
            resetTime = data.resetTime;
          }
        }

        transaction.set(docRef, {
          count,
          resetTime,
          lastUpdated: admin.firestore.Timestamp.now()
        }, { merge: true });

        return { count, resetTime };
      });

      return result;

    } catch (error) {
      console.error('Rate limit increment failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    const now = admin.firestore.Timestamp.now();
    const cutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000); // 24 hours ago

    const query = this.firestore
      .collection(this.collection)
      .where('lastUpdated', '<', cutoff)
      .limit(100);

    const snapshot = await query.get();

    if (snapshot.empty) return;

    const batch = this.firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.docs.length} expired rate limit records`);
  }
}

// Global stores
const memoryStore = new MemoryStore();
const firestoreStore = new FirestoreStore();

/**
 * Check rate limit for request
 */
export async function checkRateLimit(
  req: Request,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const key = options.keyGenerator ? options.keyGenerator(req) : getDefaultKey(req);
  const store = options.store === 'memory' ? memoryStore : firestoreStore;

  try {
    const record = await store.increment(key, options.windowMs);

    const result: RateLimitResult = {
      allowed: record.count <= options.maxRequests,
      limit: options.maxRequests,
      current: record.count,
      remaining: Math.max(0, options.maxRequests - record.count),
      resetTime: new Date(record.resetTime)
    };

    if (!result.allowed) {
      result.retryAfter = Math.ceil((record.resetTime - Date.now()) / 1000);
    }

    return result;

  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      limit: options.maxRequests,
      current: 0,
      remaining: options.maxRequests,
      resetTime: new Date(Date.now() + options.windowMs)
    };
  }
}

/**
 * Rate limiting middleware function
 */
export async function rateLimitMiddleware(
  req: Request,
  options: RateLimitOptions
): Promise<void> {
  const result = await checkRateLimit(req, options);

  if (!result.allowed) {
    const message = options.message || `Too many requests. Try again in ${result.retryAfter} seconds.`;

    throw createRateLimitError(result.retryAfter, message);
  }
}

/**
 * Generate default rate limit key
 */
function getDefaultKey(req: Request): string {
  // Try to get user ID from auth
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      // This is simplified - in reality you'd decode the JWT to get user ID
      return `user:${token.substring(0, 10)}`;
    } catch {
      // Fall back to IP if token is invalid
    }
  }

  // Use IP address as fallback
  const ip = req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           'unknown';

  return `ip:${Array.isArray(ip) ? ip[0] : ip}`;
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  // Strict limits for resource-intensive operations
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many requests. This endpoint is rate limited to 5 requests per 15 minutes.',
    store: 'firestore' as const
  },

  // Standard limits for API endpoints
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests. Please try again later.',
    store: 'firestore' as const
  },

  // Generous limits for read operations
  generous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    message: 'Too many requests. Please try again later.',
    store: 'memory' as const
  },

  // Very strict for auth operations
  auth: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please wait 5 minutes.',
    store: 'firestore' as const
  },

  // Contact form submissions
  contact: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many contact form submissions. Please wait an hour between submissions.',
    store: 'firestore' as const,
    keyGenerator: (req: Request) => {
      // Rate limit by email address if provided
      const email = req.body?.senderEmail;
      if (email && typeof email === 'string') {
        return `contact:${email.toLowerCase()}`;
      }
      return getDefaultKey(req);
    }
  },

  // File uploads
  upload: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 10,
    message: 'Too many file uploads. Please wait before uploading more files.',
    store: 'firestore' as const
  },

  // Multimedia generation
  multimedia: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    message: 'Multimedia generation limit reached. Please upgrade your plan for more generations.',
    store: 'firestore' as const
  }
};

/**
 * User-tier based rate limiting
 */
export function getRateLimitByTier(
  tier: string,
  operation: 'upload' | 'multimedia' | 'api' | 'contact'
): RateLimitOptions {
  const tierLimits = {
    free: {
      upload: { windowMs: 60 * 60 * 1000, maxRequests: 2 },
      multimedia: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 1 },
      api: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
      contact: { windowMs: 60 * 60 * 1000, maxRequests: 2 }
    },
    basic: {
      upload: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
      multimedia: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 3 },
      api: { windowMs: 15 * 60 * 1000, maxRequests: 200 },
      contact: { windowMs: 60 * 60 * 1000, maxRequests: 5 }
    },
    premium: {
      upload: { windowMs: 60 * 60 * 1000, maxRequests: 50 },
      multimedia: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 15 },
      api: { windowMs: 15 * 60 * 1000, maxRequests: 1000 },
      contact: { windowMs: 60 * 60 * 1000, maxRequests: 10 }
    },
    enterprise: {
      upload: { windowMs: 60 * 60 * 1000, maxRequests: 200 },
      multimedia: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 50 },
      api: { windowMs: 15 * 60 * 1000, maxRequests: 5000 },
      contact: { windowMs: 60 * 60 * 1000, maxRequests: 25 }
    }
  };

  const limits = tierLimits[tier as keyof typeof tierLimits] || tierLimits.free;
  const operationLimits = limits[operation];

  return {
    ...operationLimits,
    message: `Rate limit exceeded for ${tier} tier. Upgrade for higher limits.`,
    store: 'firestore',
    keyGenerator: (req: Request) => {
      // Include tier in key for proper isolation
      const baseKey = getDefaultKey(req);
      return `${baseKey}:${tier}:${operation}`;
    }
  };
}

/**
 * Cleanup expired rate limit records (scheduled function)
 */
export async function cleanupRateLimits(): Promise<void> {
  try {
    console.log('Starting rate limit cleanup...');

    // Cleanup memory store
    await memoryStore.cleanup();

    // Cleanup Firestore store
    await firestoreStore.cleanup();

    console.log('Rate limit cleanup completed');

  } catch (error) {
    console.error('Rate limit cleanup failed:', error);
    throw error;
  }
}

/**
 * Get rate limit status for user
 */
export async function getRateLimitStatus(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult | null> {
  try {
    const store = options.store === 'memory' ? memoryStore : firestoreStore;
    const record = await store.get(key, options.windowMs);

    return {
      allowed: record.count < options.maxRequests,
      limit: options.maxRequests,
      current: record.count,
      remaining: Math.max(0, options.maxRequests - record.count),
      resetTime: new Date(record.resetTime)
    };

  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return null;
  }
}

/**
 * Bypass rate limiting for specific keys (admin function)
 */
export async function bypassRateLimit(
  key: string,
  durationMs: number = 60 * 60 * 1000 // 1 hour
): Promise<void> {
  try {
    const firestore = admin.firestore();
    const bypassDoc = firestore.collection('rate_limit_bypasses').doc(key);

    await bypassDoc.set({
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + durationMs),
      createdAt: admin.firestore.Timestamp.now()
    });

    console.log(`Rate limit bypass created for key: ${key}`);

  } catch (error) {
    console.error('Failed to create rate limit bypass:', error);
    throw error;
  }
}

/**
 * Check if key has rate limit bypass
 */
export async function hasRateLimitBypass(key: string): Promise<boolean> {
  try {
    const firestore = admin.firestore();
    const bypassDoc = await firestore.collection('rate_limit_bypasses').doc(key).get();

    if (!bypassDoc.exists) return false;

    const data = bypassDoc.data()!;
    const now = admin.firestore.Timestamp.now();

    if (now.toMillis() > data.expiresAt.toMillis()) {
      // Bypass expired, clean up
      await bypassDoc.ref.delete();
      return false;
    }

    return true;

  } catch (error) {
    console.error('Failed to check rate limit bypass:', error);
    return false;
  }
}