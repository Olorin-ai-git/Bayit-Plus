// @ts-ignore - Export conflicts/**
 * Configuration Manager
 * 
 * Manages configuration loading, validation, and service-specific
 * configuration management for multimedia services.
 */

import { ServiceConfig, ServiceType } from '../../types';
import { multimediaConfig } from '../../config/MultimediaConfig';
import { Logger } from '../utils/Logger';

export class ConfigManager {
  private readonly logger: Logger;
  private baseConfig: ServiceConfig;
  private serviceConfigs: Map<ServiceType, Partial<ServiceConfig>>;

  constructor() {
    this.logger = new Logger('ConfigManager');
    this.baseConfig = multimediaConfig.getConfig();
    this.serviceConfigs = new Map();
  }

  /**
   * Load configuration with optional overrides
   */
  public async loadConfig(overrides?: Partial<ServiceConfig>): Promise<void> {
    try {
      this.baseConfig = {
        ...multimediaConfig.getConfig(),
        ...overrides
      };

      // Validate configuration
      const validation = this.validateConfig(this.baseConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      this.logger.info('Configuration loaded successfully');

    } catch (error) {
      this.logger.error('Failed to load configuration', { error });
      throw error;
    }
  }

  /**
   * Get service-specific configuration
   */
  public async getServiceConfig(
    serviceType: ServiceType,
    overrides?: Partial<ServiceConfig>
  ): Promise<ServiceConfig> {
    // Start with base configuration
    let config = { ...this.baseConfig };

    // Apply service-specific defaults
    const serviceDefaults = this.getServiceDefaults(serviceType);
    config = { ...config, ...serviceDefaults };

    // Apply cached service-specific config
    const cachedConfig = this.serviceConfigs.get(serviceType);
    if (cachedConfig) {
      config = { ...config, ...cachedConfig };
    }

    // Apply runtime overrides
    if (overrides) {
      config = { ...config, ...overrides };
    }

    return config;
  }

  /**
   * Get default configuration for service type
   */
  public async getDefaultServiceConfig(serviceType: ServiceType): Promise<Partial<ServiceConfig>> {
    return this.getServiceDefaults(serviceType);
  }

  /**
   * Set service-specific configuration
   */
  public setServiceConfig(serviceType: ServiceType, config: Partial<ServiceConfig>): void {
    this.serviceConfigs.set(serviceType, config);
    this.logger.debug(`Configuration set for ${serviceType} service`);
  }

  /**
   * Get current base configuration
   */
  public getBaseConfig(): ServiceConfig {
    return { ...this.baseConfig };
  }

  /**
   * Update base configuration
   */
  public updateBaseConfig(updates: Partial<ServiceConfig>): void {
    this.baseConfig = { ...this.baseConfig, ...updates };
    this.logger.info('Base configuration updated');
  }

  /**
   * Validate configuration
   */
  public validateConfig(config: ServiceConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!config.version) {
      errors.push('Version is required');
    }

    if (!config.environment) {
      errors.push('Environment is required');
    }

    // Storage configuration validation
    if (!config.storage?.primaryProvider) {
      errors.push('Primary storage provider is required');
    }

    if (!config.storage?.providers || Object.keys(config.storage.providers).length === 0) {
      errors.push('At least one storage provider must be configured');
    }

    // Timeout validation
    if (config.defaultTimeout && config.defaultTimeout < 1000) {
      errors.push('Default timeout must be at least 1000ms');
    }

    if (config.defaultTimeout && config.defaultTimeout > 300000) {
      errors.push('Default timeout cannot exceed 300000ms (5 minutes)');
    }

    // Quality validation
    if (config.defaultQuality && (config.defaultQuality < 1 || config.defaultQuality > 100)) {
      errors.push('Default quality must be between 1 and 100');
    }

    // Job configuration validation
    if (config.jobs?.maxConcurrentJobs && config.jobs.maxConcurrentJobs < 1) {
      errors.push('Max concurrent jobs must be at least 1');
    }

    if (config.jobs?.maxConcurrentJobs && config.jobs.maxConcurrentJobs > 50) {
      errors.push('Max concurrent jobs cannot exceed 50');
    }

    if (config.jobs?.processingInterval && config.jobs.processingInterval < 100) {
      errors.push('Processing interval must be at least 100ms');
    }

    // Storage limits validation
    if (config.storage?.maxFileSize && config.storage.maxFileSize < 1024) {
      errors.push('Max file size must be at least 1KB');
    }

    // Security configuration validation
    if (config.security && typeof config.security.enableScanning !== 'boolean') {
      errors.push('Security enableScanning must be a boolean');
    }

    // Retry configuration validation
    if (config.errorHandling?.retry) {
      const retry = config.errorHandling.retry;
      
      if (retry.maxRetries && (retry.maxRetries < 0 || retry.maxRetries > 10)) {
        errors.push('Max retries must be between 0 and 10');
      }

      if (retry.baseDelay && retry.baseDelay < 100) {
        errors.push('Base delay must be at least 100ms');
      }

      if (retry.maxDelay && retry.baseDelay && retry.maxDelay < retry.baseDelay) {
        errors.push('Max delay must be greater than base delay');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get service-specific default configurations
   */
  private getServiceDefaults(serviceType: ServiceType): Partial<ServiceConfig> {
    const defaults: Record<ServiceType, Partial<ServiceConfig>> = {
      image: {
        defaultQuality: 85,
        defaultTimeout: 30000,
        processing: {
          maxDimensions: { width: 8192, height: 8192 },
          concurrent: 4,
          supportedFormats: ['jpeg', 'png', 'webp', 'gif', 'bmp']
        }
      },

      video: {
        defaultQuality: 80,
        defaultTimeout: 120000, // 2 minutes for video
        processing: {
          maxDuration: 3600, // 1 hour
          maxResolution: { width: 3840, height: 2160 }, // 4K
          concurrent: 2,
          supportedFormats: ['mp4', 'webm', 'avi', 'mov']
        }
      },

      audio: {
        defaultQuality: 90,
        defaultTimeout: 60000,
        processing: {
          maxDuration: 7200, // 2 hours
          maxSampleRate: 96000,
          concurrent: 3,
          supportedFormats: ['mp3', 'wav', 'ogg', 'aac', 'flac']
        }
      },

      storage: {
        defaultTimeout: 45000,
        storage: {
          enableCDN: true,
          enableCache: true,
          enableOptimization: true
        }
      },

      jobs: {
        jobs: {
          maxConcurrentJobs: 5,
          processingInterval: 1000,
          maxRetries: 3,
          autoStart: true
        }
      }
    };

    return defaults[serviceType] || {};
  }

  /**
   * Get configuration value by path
   */
  public getConfigValue(path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let current: any = this.baseConfig;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current !== undefined ? current : defaultValue;
  }

  /**
   * Set configuration value by path
   */
  public setConfigValue(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current: any = this.baseConfig;

    // Navigate to the parent object
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Check if feature is enabled
   */
  public isFeatureEnabled(feature: string): boolean {
    return this.getConfigValue(`features.${feature}`, false);
  }

  /**
   * Get environment-specific configuration
   */
  public getEnvironmentConfig(): Partial<ServiceConfig> {
    const environment = this.baseConfig.environment;
    
    const envConfigs: Record<string, Partial<ServiceConfig>> = {
      development: {
        security: { enableMalwareScanning: false },
        jobs: { maxConcurrentJobs: 2 },
        errorHandling: { friendlyMessages: false }
      },
      
      staging: {
        security: { enableMalwareScanning: true },
        jobs: { maxConcurrentJobs: 5 },
        errorHandling: { friendlyMessages: true }
      },
      
      production: {
        security: { enableMalwareScanning: true },
        jobs: { maxConcurrentJobs: 10 },
        errorHandling: { friendlyMessages: true, sanitizeErrors: true }
      }
    };

    return envConfigs[environment] || {};
  }

  /**
   * Export configuration for debugging (sanitized)
   */
  public exportConfig(): Record<string, any> {
    const config = JSON.parse(JSON.stringify(this.baseConfig));

    // Remove sensitive information
    if (config.storage?.providers) {
      Object.keys(config.storage.providers).forEach((provider: string) => {
        const providerConfig = config.storage.providers[provider];
        if (providerConfig.accessKey) providerConfig.accessKey = '[REDACTED]';
        if (providerConfig.secretKey) providerConfig.secretKey = '[REDACTED]';
        if (providerConfig.apiKey) providerConfig.apiKey = '[REDACTED]';
      });
    }

    return {
      timestamp: new Date().toISOString(),
      environment: config.environment,
      version: config.version,
      config
    };
  }

  /**
   * Reset configuration to defaults
   */
  public resetToDefaults(): void {
    this.baseConfig = multimediaConfig.getConfig();
    this.serviceConfigs.clear();
    this.logger.info('Configuration reset to defaults');
  }
}