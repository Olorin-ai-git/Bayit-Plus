/**
 * Security Monitor Configuration
 * Provides security monitoring and threat detection settings
  */

import { logger } from '@cvplus/logging/backend';

// Validate required environment variables at startup
if (!process.env.JWT_SECRET) {
  throw new Error(
    'CRITICAL: JWT_SECRET environment variable is required but not set. ' +
    'Please configure the JWT_SECRET in your environment before starting the application.'
  );
}

export interface SecurityConfig {
  rateLimiting: {
    windowMs: number;
    max: number;
  };
  authentication: {
    jwtSecret: string;
    tokenExpiry: string;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
  };
}

export const securityConfig: SecurityConfig = {
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  authentication: {
    jwtSecret: process.env.JWT_SECRET,
    tokenExpiry: '24h'
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32
  }
};

export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit_exceeded' | 'suspicious_activity';
  userId?: string;
  ip: string;
  timestamp: Date;
  details: Record<string, any>;
}

export class SecurityMonitor {
  static logEvent(event: SecurityEvent): void {
    logger.info(`Security Event: ${event.type}`, {
      type: event.type,
      userId: event.userId,
      ip: event.ip,
      timestamp: event.timestamp,
      details: event.details
    });
  }

  static checkRateLimit(_ip: string): boolean {
    // Rate limiting should be handled by dedicated rate limiting middleware
    // This is a placeholder for when rate limiting is not configured
    // In production, this must be implemented via Redis or similar
    logger.warn('Rate limit check called - ensure proper rate limiting middleware is configured');
    return true;
  }
}

export default securityConfig;