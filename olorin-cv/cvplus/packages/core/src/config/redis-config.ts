/**
 * Redis Configuration for CVPlus Performance Optimization
 * 
 * Centralized Redis configuration management with environment-specific
 * settings for development, staging, and production environments.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-28
  */

import { logger } from 'firebase-functions';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  tls?: boolean;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

export interface RedisEnvironmentConfig {
  development: RedisConfig;
  staging: RedisConfig;
  production: RedisConfig;
}

class RedisConfigurationManager {
  private static instance: RedisConfigurationManager | null = null;
  private redisConfig: RedisEnvironmentConfig;

  private constructor() {
    this.redisConfig = this.loadRedisConfiguration();
  }

  static getInstance(): RedisConfigurationManager {
    if (!RedisConfigurationManager.instance) {
      RedisConfigurationManager.instance = new RedisConfigurationManager();
    }
    return RedisConfigurationManager.instance;
  }

  /**
   * Load Redis configuration from environment variables
    */
  private loadRedisConfiguration(): RedisEnvironmentConfig {
    const baseConfig = {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000
    };

    return {
      development: {
        ...baseConfig,
        host: process.env.REDIS_DEV_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_DEV_PORT || '6379', 10),
        password: process.env.REDIS_DEV_PASSWORD,
        db: parseInt(process.env.REDIS_DEV_DB || '2', 10),
        tls: false
      },
      staging: {
        ...baseConfig,
        host: process.env.REDIS_STAGING_HOST || 'redis-staging.cvplus.com',
        port: parseInt(process.env.REDIS_STAGING_PORT || '6379', 10),
        password: process.env.REDIS_STAGING_PASSWORD,
        db: parseInt(process.env.REDIS_STAGING_DB || '1', 10),
        tls: process.env.REDIS_STAGING_TLS === 'true'
      },
      production: {
        ...baseConfig,
        host: process.env.REDIS_PROD_HOST || 'redis-prod.cvplus.com',
        port: parseInt(process.env.REDIS_PROD_PORT || '6379', 10),
        password: process.env.REDIS_PROD_PASSWORD,
        db: parseInt(process.env.REDIS_PROD_DB || '0', 10),
        tls: process.env.REDIS_PROD_TLS === 'true'
      }
    };
  }

  /**
   * Get Redis configuration for current environment
    */
  getConfig(environment?: string): RedisConfig {
    const env = environment || process.env.NODE_ENV || 'development';
    
    let config: RedisConfig;
    
    switch (env) {
      case 'production':
        config = this.redisConfig.production;
        break;
      case 'staging':
        config = this.redisConfig.staging;
        break;
      default:
        config = this.redisConfig.development;
        break;
    }

    // Log configuration (without sensitive data)
    logger.debug('Redis configuration loaded', {
      environment: env,
      host: config.host,
      port: config.port,
      db: config.db,
      tls: config.tls
    });

    return config;
  }

  /**
   * Get connection URL for Redis (useful for some clients)
    */
  getConnectionUrl(environment?: string): string {
    const config = this.getConfig(environment);
    
    let url = `redis://`;
    
    if (config.password) {
      url += `:${config.password}@`;
    }
    
    url += `${config.host}:${config.port}`;
    
    if (config.db > 0) {
      url += `/${config.db}`;
    }

    return url;
  }

  /**
   * Validate Redis configuration
    */
  validateConfiguration(environment?: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const config = this.getConfig(environment);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.host || config.host === '127.0.0.1' && process.env.NODE_ENV === 'production') {
      errors.push('Redis host not configured properly for production environment');
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      errors.push('Redis port is invalid');
    }

    if (process.env.NODE_ENV === 'production' && !config.password) {
      warnings.push('Redis password not set for production environment (security risk)');
    }

    if (process.env.NODE_ENV === 'production' && !config.tls) {
      warnings.push('Redis TLS not enabled for production environment (security risk)');
    }

    if (config.connectTimeout < 5000) {
      warnings.push('Redis connect timeout is very low, may cause connection issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get performance-optimized configuration
    */
  getPerformanceConfig(environment?: string): RedisConfig {
    const baseConfig = this.getConfig(environment);
    
    return {
      ...baseConfig,
      // Optimize for performance
      retryDelayOnFailover: 50,  // Faster retry
      maxRetriesPerRequest: 5,   // More retries for reliability
      connectTimeout: 8000,      // Slightly shorter timeout
      commandTimeout: 3000,      // Shorter command timeout for faster failures
      keepAlive: 60000          // Longer keep alive
    };
  }

  /**
   * Get high-availability configuration
    */
  getHAConfig(environment?: string): RedisConfig & {
    enableOfflineQueue: boolean;
    maxLoadingTimeout: number;
    enableReadyCheck: boolean;
  } {
    const baseConfig = this.getConfig(environment);
    
    return {
      ...baseConfig,
      retryDelayOnFailover: 200,  // More conservative retry
      maxRetriesPerRequest: 10,   // Many retries for HA
      connectTimeout: 15000,      // Longer timeout for stability
      commandTimeout: 8000,       // Longer command timeout
      enableOfflineQueue: true,   // Queue commands while reconnecting
      maxLoadingTimeout: 10000,   // Wait for Redis to load
      enableReadyCheck: true      // Ensure Redis is ready
    };
  }

  /**
   * Test Redis connection configuration
    */
  async testConnection(environment?: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const Redis = require('ioredis');
    const config = this.getConfig(environment);
    const startTime = Date.now();
    
    let client: any = null;
    
    try {
      client = new Redis({
        ...config,
        lazyConnect: true,
        maxRetriesPerRequest: 1,  // Quick test
        connectTimeout: 5000
      });

      await client.connect();
      await client.ping();
      
      const responseTime = Date.now() - startTime;
      
      logger.info('Redis connection test successful', {
        environment,
        responseTime,
        host: config.host,
        port: config.port
      });

      return {
        success: true,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Redis connection test failed', {
        environment,
        error: errorMessage,
        responseTime,
        host: config.host,
        port: config.port
      });

      return {
        success: false,
        responseTime,
        error: errorMessage
      };

    } finally {
      if (client) {
        try {
          await client.disconnect();
        } catch (disconnectError) {
          logger.warn('Error disconnecting Redis test client', { 
            error: disconnectError 
          });
        }
      }
    }
  }
}

// Singleton instance
export const redisConfigManager = RedisConfigurationManager.getInstance();

// Convenience exports
export const getRedisConfig = (environment?: string) => 
  redisConfigManager.getConfig(environment);

export const getRedisConnectionUrl = (environment?: string) => 
  redisConfigManager.getConnectionUrl(environment);

export const validateRedisConfig = (environment?: string) => 
  redisConfigManager.validateConfiguration(environment);

export const testRedisConnection = (environment?: string) => 
  redisConfigManager.testConnection(environment);