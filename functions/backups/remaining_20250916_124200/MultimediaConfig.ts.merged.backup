// @ts-ignore - Export conflicts/**
 * Multimedia Configuration Manager
 * 
 * Centralized configuration management for all multimedia services
 * with environment-specific settings and validation.
 */

import { ServiceConfig, MultimediaEnvironment } from '../types';

/**
 * Default configuration values for different environments
 */
const DEFAULT_CONFIGS: Record<MultimediaEnvironment, Partial<ServiceConfig>> = {
  development: {
    version: '1.0.0',
    environment: 'development',
    
    // Processing settings
    defaultQuality: 85,
    defaultTimeout: 30000,
    
    // Storage settings
    storage: {
      primaryProvider: 'firebase',
      maxFileSize: 100 * 1024 * 1024, // 100MB
      providers: {
        firebase: {
          bucket: process.env.FIREBASE_STORAGE_BUCKET || 'cvplus-dev-multimedia'
        }
      }
    },

    // Security settings
    security: {
      enableScanning: true,
      enableMalwareScanning: false, // Disabled in dev for performance
      sanitizeErrors: false
    },

    // Error handling
    errorHandling: {
      friendlyMessages: false,
      includeSuggestions: true,
      sanitizeErrors: false,
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000
      },
      circuitBreaker: {
        enabled: false
      }
    },

    // Job processing
    jobs: {
      autoStart: true,
      maxConcurrentJobs: 3,
      processingInterval: 1000,
      maxRetries: 2
    },

    // Features
    features: {
      aiEnhancement: false,
      voiceProcessing: false,
      watermarking: false
    }
  },

  staging: {
    version: '1.0.0',
    environment: 'staging',
    
    defaultQuality: 85,
    defaultTimeout: 45000,
    
    storage: {
      primaryProvider: 'firebase',
      maxFileSize: 200 * 1024 * 1024, // 200MB
      providers: {
        firebase: {
          bucket: process.env.FIREBASE_STORAGE_BUCKET || 'cvplus-staging-multimedia'
        }
      }
    },

    security: {
      enableScanning: true,
      enableMalwareScanning: true,
      sanitizeErrors: true
    },

    errorHandling: {
      friendlyMessages: true,
      includeSuggestions: true,
      sanitizeErrors: true,
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 60000
      }
    },

    jobs: {
      autoStart: true,
      maxConcurrentJobs: 5,
      processingInterval: 500,
      maxRetries: 3
    },

    features: {
      aiEnhancement: true,
      voiceProcessing: true,
      watermarking: true
    }
  },

  production: {
    version: '1.0.0',
    environment: 'production',
    
    defaultQuality: 90,
    defaultTimeout: 60000,
    
    storage: {
      primaryProvider: 'firebase',
      maxFileSize: 500 * 1024 * 1024, // 500MB
      providers: {
        firebase: {
          bucket: process.env.FIREBASE_STORAGE_BUCKET || 'cvplus-prod-multimedia'
        }
      },
      enableCDN: true
    },

    security: {
      enableScanning: true,
      enableMalwareScanning: true,
      sanitizeErrors: true
    },

    errorHandling: {
      friendlyMessages: true,
      includeSuggestions: true,
      sanitizeErrors: true,
      retry: {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 30000
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        resetTimeout: 300000 // 5 minutes
      }
    },

    jobs: {
      autoStart: true,
      maxConcurrentJobs: 10,
      processingInterval: 200,
      maxRetries: 5
    },

    features: {
      aiEnhancement: true,
      voiceProcessing: true,
      watermarking: true
    }
  }
};

/**
 * Multimedia configuration manager
 */
export class MultimediaConfig {
  private static instance: MultimediaConfig;
  private config: ServiceConfig;
  private environment: MultimediaEnvironment;

  private constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.loadConfiguration();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MultimediaConfig {
    if (!MultimediaConfig.instance) {
      MultimediaConfig.instance = new MultimediaConfig();
    }
    return MultimediaConfig.instance;
  }

  /**
   * Get configuration for service
   */
  public getConfig(): ServiceConfig {
    return { ...this.config };
  }

  /**
   * Get configuration for specific service
   */
  public getServiceConfig(serviceType: string): Partial<ServiceConfig> {
    const baseConfig = this.getConfig();
    
    // Return service-specific configuration if available
    if (baseConfig[serviceType as keyof ServiceConfig]) {
      return {
        ...baseConfig,
        ...baseConfig[serviceType as keyof ServiceConfig]
      };
    }

    return baseConfig;
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<ServiceConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
  }

  /**
   * Get current environment
   */
  public getEnvironment(): MultimediaEnvironment {
    return this.environment;
  }

  /**
   * Check if feature is enabled
   */
  public isFeatureEnabled(feature: string): boolean {
    return this.config.features?.[feature] === true;
  }

  /**
   * Get storage configuration
   */
  public getStorageConfig() {
    return this.config.storage;
  }

  /**
   * Get security configuration
   */
  public getSecurityConfig() {
    return this.config.security;
  }

  /**
   * Get job configuration
   */
  public getJobConfig() {
    return this.config.jobs;
  }

  /**
   * Validate configuration
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!this.config.version) {
      errors.push('Version is required');
    }

    if (!this.config.environment) {
      errors.push('Environment is required');
    }

    // Validate storage configuration
    if (!this.config.storage?.primaryProvider) {
      errors.push('Primary storage provider is required');
    }

    if (!this.config.storage?.providers || Object.keys(this.config.storage.providers).length === 0) {
      errors.push('At least one storage provider must be configured');
    }

    // Validate timeout values
    if (this.config.defaultTimeout && this.config.defaultTimeout < 1000) {
      errors.push('Default timeout must be at least 1000ms');
    }

    // Validate quality settings
    if (this.config.defaultQuality && typeof this.config.defaultQuality === 'number' && (this.config.defaultQuality < 1 || this.config.defaultQuality > 100)) {
      errors.push('Default quality must be between 1 and 100');
    }

    // Validate job configuration
    if (this.config.jobs?.maxConcurrentJobs && this.config.jobs.maxConcurrentJobs < 1) {
      errors.push('Max concurrent jobs must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export configuration for debugging
   */
  public exportConfig(): string {
    return JSON.stringify({
      environment: this.environment,
      config: this.sanitizeConfigForExport(this.config),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): MultimediaEnvironment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const cvplusEnv = process.env.CVPLUS_ENV?.toLowerCase();

    // Check explicit CVPlus environment first
    if (cvplusEnv === 'development' || cvplusEnv === 'staging' || cvplusEnv === 'production') {
      return cvplusEnv as MultimediaEnvironment;
    }

    // Fall back to NODE_ENV
    if (nodeEnv === 'production') {
      return 'production';
    }

    if (nodeEnv === 'staging' || nodeEnv === 'test') {
      return 'staging';
    }

    // Default to development
    return 'development';
  }

  /**
   * Load configuration based on environment
   */
  private loadConfiguration(): ServiceConfig {
    const baseConfig = DEFAULT_CONFIGS[this.environment];
    
    // Merge with environment variables
    const envConfig = this.loadEnvironmentConfig();
    
    return {
      ...baseConfig,
      ...envConfig
    } as ServiceConfig;
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentConfig(): Partial<ServiceConfig> {
    const envConfig: Partial<ServiceConfig> = {};

    // Map environment variables to config
    if (process.env.MULTIMEDIA_DEFAULT_QUALITY) {
      envConfig.defaultQuality = parseInt(process.env.MULTIMEDIA_DEFAULT_QUALITY, 10);
    }

    if (process.env.MULTIMEDIA_DEFAULT_TIMEOUT) {
      envConfig.defaultTimeout = parseInt(process.env.MULTIMEDIA_DEFAULT_TIMEOUT, 10);
    }

    if (process.env.MULTIMEDIA_MAX_FILE_SIZE) {
      envConfig.storage = {
        ...envConfig.storage,
        maxFileSize: parseInt(process.env.MULTIMEDIA_MAX_FILE_SIZE, 10)
      };
    }

    if (process.env.MULTIMEDIA_MAX_CONCURRENT_JOBS) {
      envConfig.jobs = {
        ...envConfig.jobs,
        maxConcurrentJobs: parseInt(process.env.MULTIMEDIA_MAX_CONCURRENT_JOBS, 10)
      };
    }

    // Feature flags
    if (process.env.MULTIMEDIA_ENABLE_AI_ENHANCEMENT === 'true') {
      envConfig.features = {
        ...envConfig.features,
        aiEnhancement: true
      };
    }

    return envConfig;
  }

  /**
   * Sanitize configuration for safe export (remove sensitive data)
   */
  private sanitizeConfigForExport(config: ServiceConfig): any {
    const sanitized = JSON.parse(JSON.stringify(config));

    // Remove sensitive information
    if (sanitized.storage?.providers) {
      Object.keys(sanitized.storage.providers).forEach(provider => {
        const providerConfig = sanitized.storage.providers[provider];
        if (providerConfig.accessKey) providerConfig.accessKey = '[REDACTED]';
        if (providerConfig.secretKey) providerConfig.secretKey = '[REDACTED]';
        if (providerConfig.apiKey) providerConfig.apiKey = '[REDACTED]';
      });
    }

    return sanitized;
  }
}

// Export singleton instance
export const multimediaConfig = MultimediaConfig.getInstance();