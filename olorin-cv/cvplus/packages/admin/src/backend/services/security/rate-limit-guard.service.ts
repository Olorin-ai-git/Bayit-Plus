import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { adminLogger } from '../../../logging/AdminLogger';

/**
 * Secure Rate Limiting Service with Fail-Closed Policy
 *
 * SECURITY POLICY: This service fails closed (deny access) by default
 * when rate limiting checks cannot be completed successfully.
 *
 * This is the CONSOLIDATED and SECURE implementation from the CVPlus Core Module.
 * All modules should use this implementation to ensure consistent security policies.
  */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  currentCount?: number;
  reason?: string;
  securityEvent?: string;
}

export interface RateLimitConfig {
  limitPerMinute: number;
  burstLimit?: number;
  windowMinutes?: number;
}

export class SecureRateLimitGuard {
  private static instance: SecureRateLimitGuard;
  private db = getFirestore();
  private serviceHealth = new Map<string, boolean>();

  private constructor() {
    // Initialize service health tracking
    this.serviceHealth.set('rate-limiting', true);
  }

  public static getInstance(): SecureRateLimitGuard {
    if (!SecureRateLimitGuard.instance) {
      SecureRateLimitGuard.instance = new SecureRateLimitGuard();
    }
    return SecureRateLimitGuard.instance;
  }

  /**
   * Check rate limits with fail-closed security policy
   *
   * @param userId - User identifier
   * @param featureId - Feature being accessed
   * @param config - Rate limiting configuration
   * @returns Rate limit result with secure defaults
    */
  async checkRateLimit(
    userId: string,
    featureId: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      // Check service health first - fail closed if service is unhealthy
      if (!this.serviceHealth.get('rate-limiting')) {
        this.logSecurityEvent('RATE_LIMIT_SERVICE_DEGRADED', userId, featureId, {
          reason: 'Service marked as unhealthy',
          timestamp: new Date().toISOString()
        });

        return {
          allowed: false,
          reason: 'Service temporarily unavailable',
          securityEvent: 'RATE_LIMIT_SERVICE_DEGRADED'
        };
      }

      const result = await this.executeRateLimitCheck(userId, featureId, config);

      // Log successful check
      this.logSecurityEvent('RATE_LIMIT_CHECK_SUCCESS', userId, featureId, {
        allowed: result.allowed,
        currentCount: result.currentCount,
        duration: Date.now() - startTime
      });

      return result;

    } catch (error) {
      // CRITICAL SECURITY FIX: FAIL CLOSED ON ERRORS
      this.logSecurityEvent('RATE_LIMIT_CHECK_FAILED', userId, featureId, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        securityAction: 'DENY_ACCESS'
      });

      // Mark service as unhealthy temporarily
      this.serviceHealth.set('rate-limiting', false);
      setTimeout(() => this.serviceHealth.set('rate-limiting', true), 60000); // Recover after 1 minute

      // SECURE DEFAULT: Deny access when rate limiting fails
      return {
        allowed: false,
        reason: 'Unable to verify rate limits',
        securityEvent: 'RATE_LIMIT_SERVICE_ERROR'
      };
    }
  }

  /**
   * Execute the actual rate limit check
    */
  private async executeRateLimitCheck(
    userId: string,
    featureId: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = (config.windowMinutes || 1) * 60 * 1000;
    const windowStart = now - windowMs;

    // Query recent usage within the time window
    const recentUsageQuery = this.db.collection('usage_tracking')
      .where('userId', '==', userId)
      .where('featureId', '==', featureId)
      .where('timestamp', '>=', new Date(windowStart))
      .orderBy('timestamp', 'desc');

    const recentUsageSnapshot = await recentUsageQuery.get();
    const currentCount = recentUsageSnapshot.size;

    // Check against limits
    const isWithinLimits = currentCount < config.limitPerMinute;

    if (!isWithinLimits) {
      // Log rate limit exceeded
      this.logSecurityEvent('RATE_LIMIT_EXCEEDED', userId, featureId, {
        currentCount,
        limit: config.limitPerMinute,
        windowMs
      });
    }

    // Mark service as healthy
    this.serviceHealth.set('rate-limiting', true);

    return {
      allowed: isWithinLimits,
      retryAfter: isWithinLimits ? undefined : Math.ceil(windowMs / 1000),
      currentCount,
      reason: isWithinLimits ? undefined : 'Rate limit exceeded'
    };
  }

  /**
   * Track usage event with security logging
    */
  async trackUsage(userId: string, featureId: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const usageRecord = {
        userId,
        featureId,
        timestamp: new Date(),
        metadata: metadata || {}
      };

      await this.db.collection('usage_tracking').add(usageRecord);

      this.logSecurityEvent('USAGE_TRACKED', userId, featureId, {
        metadata,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Log but don't fail the request for tracking errors
      this.logSecurityEvent('USAGE_TRACKING_FAILED', userId, featureId, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current usage statistics
    */
  async getUsageStats(userId: string, featureId: string, windowMinutes: number = 60): Promise<{
    count: number;
    firstUsage?: Date;
    lastUsage?: Date;
  }> {
    try {
      const now = Date.now();
      const windowStart = now - (windowMinutes * 60 * 1000);

      const usageQuery = this.db.collection('usage_tracking')
        .where('userId', '==', userId)
        .where('featureId', '==', featureId)
        .where('timestamp', '>=', new Date(windowStart))
        .orderBy('timestamp', 'asc');

      const usageSnapshot = await usageQuery.get();

      if (usageSnapshot.empty) {
        return { count: 0 };
      }

      const docs = usageSnapshot.docs;
      return {
        count: docs.length,
        firstUsage: docs[0]?.data().timestamp?.toDate(),
        lastUsage: docs[docs.length - 1]?.data().timestamp?.toDate()
      };

    } catch (error) {
      // Fail closed for usage stats too
      logger.error('Failed to get usage stats:', error);
      return { count: -1 }; // Indicates error state
    }
  }

  /**
   * Security event logging with structured format
    */
  private logSecurityEvent(
    eventType: string,
    userId: string,
    featureId: string,
    details: Record<string, any>
  ): void {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || 'unknown',
      featureId: featureId || 'unknown',
      service: 'RateLimitGuard',
      severity: this.getEventSeverity(eventType),
      details
    };

    // Log to structured logger
    logger.info('SECURITY_EVENT', securityEvent);

    // In production, also send to security monitoring system
    if (process.env.NODE_ENV === 'production') {
      this.sendToSecurityMonitoring(securityEvent);
    }
  }

  /**
   * Determine event severity for proper alerting
    */
  private getEventSeverity(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (eventType) {
      case 'RATE_LIMIT_CHECK_FAILED':
      case 'RATE_LIMIT_SERVICE_ERROR':
        return 'CRITICAL';
      case 'RATE_LIMIT_SERVICE_DEGRADED':
      case 'RATE_LIMIT_EXCEEDED':
        return 'HIGH';
      case 'USAGE_TRACKING_FAILED':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  /**
   * Send security events to external monitoring system
    */
  private sendToSecurityMonitoring(event: Record<string, any>): void {
    // Send security events to configured monitoring systems
    // Based on CVPlus monitoring configuration

    // Send to configured webhook if available
    const webhookUrl = process.env.SECURITY_MONITORING_WEBHOOK;
    if (webhookUrl) {
      this.sendToWebhook(webhookUrl, event);
    }

    // Send to logging service for collection and analysis
    adminLogger.info('SECURITY_MONITOR:', JSON.stringify(event));
  }

  /**
   * Send event to webhook endpoint
   */
  private async sendToWebhook(webhookUrl: string, event: Record<string, any>): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CVPlus-Security-Monitor/1.0',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          source: 'cvplus-admin-rate-limiter',
          event,
        }),
      });

      if (!response.ok) {
        adminLogger.error('Failed to send security event to webhook:', response.statusText);
      }
    } catch (error) {
      adminLogger.error('Error sending security event to webhook:', error);
    }
  }

  /**
   * Health check for the rate limiting service
    */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: Record<string, any>;
  }> {
    try {
      const testStart = Date.now();

      // Test database connectivity
      await this.db.collection('health_check').limit(1).get();

      const dbLatency = Date.now() - testStart;

      // Check service health state
      const serviceHealthy = this.serviceHealth.get('rate-limiting') || false;

      const healthy = dbLatency < 1000 && serviceHealthy;

      return {
        healthy,
        details: {
          dbLatency,
          serviceHealthy,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Health check failed',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

// Export singleton instance for easy consumption
export const secureRateLimitGuard = SecureRateLimitGuard.getInstance();