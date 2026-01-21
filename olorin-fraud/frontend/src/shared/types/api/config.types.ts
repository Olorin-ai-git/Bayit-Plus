/**
 * Canonical Service Configuration Types
 * SINGLE SOURCE OF TRUTH for service config types
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
}

/**
 * Service configuration
 * This is the ONLY ServiceConfig type definition in the codebase
 */
export interface ServiceConfig {
  name: string;
  port: number;
  baseURL: string;
  healthEndpoint: string;
  timeout: number;
  retries: number;
  rateLimiting?: RateLimitConfig;
  headers?: Record<string, string>;
}

/**
 * Service health status
 */
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  lastCheck: Date;
}
