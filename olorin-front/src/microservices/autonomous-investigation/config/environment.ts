/**
 * Environment Configuration for Autonomous Investigation Microservice
 * Handles different deployment environments and feature flags
 */

import { z } from 'zod';

// Environment schema validation
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3007),

  // API Configuration
  API_BASE_URL: z.string().default('http://localhost:8090'),
  API_TIMEOUT: z.coerce.number().default(30000),

  // WebSocket Configuration
  WEBSOCKET_URL: z.string().default('ws://localhost:8090/ws'),
  WEBSOCKET_RECONNECT_INTERVAL: z.coerce.number().default(5000),
  WEBSOCKET_MAX_RETRIES: z.coerce.number().default(5),

  // Authentication
  AUTH_TOKEN_REFRESH_THRESHOLD: z.coerce.number().default(300000), // 5 minutes
  AUTH_SESSION_TIMEOUT: z.coerce.number().default(3600000), // 1 hour

  // Monitoring & Analytics
  MONITORING_ENABLED: z.coerce.boolean().default(true),
  MONITORING_ENDPOINT: z.string().optional(),
  MONITORING_API_KEY: z.string().optional(),
  MONITORING_BATCH_SIZE: z.coerce.number().default(10),
  MONITORING_FLUSH_INTERVAL: z.coerce.number().default(30000),

  // Performance
  PERFORMANCE_TRACKING_ENABLED: z.coerce.boolean().default(true),
  PERFORMANCE_WEB_VITALS_ENABLED: z.coerce.boolean().default(true),

  // Event Bus
  EVENT_BUS_DEBUG: z.coerce.boolean().default(false),
  EVENT_BUS_PERSISTENCE: z.coerce.boolean().default(true),

  // Feature Flags
  FEATURE_POWER_GRID_CONCEPT: z.coerce.boolean().default(true),
  FEATURE_COMMAND_CENTER_CONCEPT: z.coerce.boolean().default(true),
  FEATURE_EVIDENCE_TRAIL_CONCEPT: z.coerce.boolean().default(true),
  FEATURE_NETWORK_EXPLORER_CONCEPT: z.coerce.boolean().default(true),
  FEATURE_GRAPH_3D_VISUALIZATION: z.coerce.boolean().default(false),
  FEATURE_ADVANCED_FILTERING: z.coerce.boolean().default(true),
  FEATURE_REAL_TIME_COLLABORATION: z.coerce.boolean().default(false),
  FEATURE_EXPORT_CAPABILITIES: z.coerce.boolean().default(true),

  // Module Federation
  MF_SHELL_URL: z.string().default('http://localhost:3000/remoteEntry.js'),
  MF_CORE_UI_URL: z.string().default('http://localhost:3006/remoteEntry.js'),
  MF_INVESTIGATION_URL: z.string().default('http://localhost:3001/remoteEntry.js'),
  MF_AGENT_ANALYTICS_URL: z.string().default('http://localhost:3002/remoteEntry.js'),
  MF_VISUALIZATION_URL: z.string().default('http://localhost:3004/remoteEntry.js'),
  MF_REPORTING_URL: z.string().default('http://localhost:3005/remoteEntry.js'),

  // Deployment
  PUBLIC_PATH: z.string().default('/autonomous-investigation/'),
  ASSET_PATH: z.string().default('/autonomous-investigation/assets/'),
  CDN_URL: z.string().optional(),

  // Security
  ENABLE_CSP: z.coerce.boolean().default(true),
  CSP_REPORT_URI: z.string().optional(),
  ENABLE_HTTPS_REDIRECT: z.coerce.boolean().default(false),

  // Debugging
  DEBUG_MODE: z.coerce.boolean().default(false),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Resource Limits
  MAX_INVESTIGATION_NODES: z.coerce.number().default(1000),
  MAX_TIMELINE_EVENTS: z.coerce.number().default(5000),
  MAX_EVIDENCE_ITEMS: z.coerce.number().default(500),
  GRAPH_PERFORMANCE_MODE: z.coerce.boolean().default(false),
});

// Type for validated environment
type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Environment Configuration Class
 */
class EnvironmentConfig {
  private config: Environment;
  private isInitialized: boolean = false;

  constructor() {
    this.config = this.loadAndValidateConfig();
    this.isInitialized = true;
  }

  /**
   * Load and validate environment configuration
   */
  private loadAndValidateConfig(): Environment {
    try {
      // Load from process.env with fallbacks
      const envConfig = {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || process.env.REACT_APP_PORT || '3007',

        // API Configuration
        API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090',
        API_TIMEOUT: process.env.REACT_APP_API_TIMEOUT || '30000',

        // WebSocket Configuration
        WEBSOCKET_URL: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8090/ws',
        WEBSOCKET_RECONNECT_INTERVAL: process.env.REACT_APP_WEBSOCKET_RECONNECT_INTERVAL || '5000',
        WEBSOCKET_MAX_RETRIES: process.env.REACT_APP_WEBSOCKET_MAX_RETRIES || '5',

        // Authentication
        AUTH_TOKEN_REFRESH_THRESHOLD: process.env.REACT_APP_AUTH_TOKEN_REFRESH_THRESHOLD || '300000',
        AUTH_SESSION_TIMEOUT: process.env.REACT_APP_AUTH_SESSION_TIMEOUT || '3600000',

        // Monitoring & Analytics
        MONITORING_ENABLED: process.env.REACT_APP_MONITORING_ENABLED || 'true',
        MONITORING_ENDPOINT: process.env.REACT_APP_MONITORING_ENDPOINT,
        MONITORING_API_KEY: process.env.REACT_APP_MONITORING_API_KEY,
        MONITORING_BATCH_SIZE: process.env.REACT_APP_MONITORING_BATCH_SIZE || '10',
        MONITORING_FLUSH_INTERVAL: process.env.REACT_APP_MONITORING_FLUSH_INTERVAL || '30000',

        // Performance
        PERFORMANCE_TRACKING_ENABLED: process.env.REACT_APP_PERFORMANCE_TRACKING_ENABLED || 'true',
        PERFORMANCE_WEB_VITALS_ENABLED: process.env.REACT_APP_PERFORMANCE_WEB_VITALS_ENABLED || 'true',

        // Event Bus
        EVENT_BUS_DEBUG: process.env.REACT_APP_EVENT_BUS_DEBUG || 'false',
        EVENT_BUS_PERSISTENCE: process.env.REACT_APP_EVENT_BUS_PERSISTENCE || 'true',

        // Feature Flags
        FEATURE_POWER_GRID_CONCEPT: process.env.REACT_APP_FEATURE_POWER_GRID_CONCEPT || 'true',
        FEATURE_COMMAND_CENTER_CONCEPT: process.env.REACT_APP_FEATURE_COMMAND_CENTER_CONCEPT || 'true',
        FEATURE_EVIDENCE_TRAIL_CONCEPT: process.env.REACT_APP_FEATURE_EVIDENCE_TRAIL_CONCEPT || 'true',
        FEATURE_NETWORK_EXPLORER_CONCEPT: process.env.REACT_APP_FEATURE_NETWORK_EXPLORER_CONCEPT || 'true',
        FEATURE_GRAPH_3D_VISUALIZATION: process.env.REACT_APP_FEATURE_GRAPH_3D_VISUALIZATION || 'false',
        FEATURE_ADVANCED_FILTERING: process.env.REACT_APP_FEATURE_ADVANCED_FILTERING || 'true',
        FEATURE_REAL_TIME_COLLABORATION: process.env.REACT_APP_FEATURE_REAL_TIME_COLLABORATION || 'false',
        FEATURE_EXPORT_CAPABILITIES: process.env.REACT_APP_FEATURE_EXPORT_CAPABILITIES || 'true',

        // Module Federation URLs
        MF_SHELL_URL: process.env.REACT_APP_MF_SHELL_URL || 'http://localhost:3000/remoteEntry.js',
        MF_CORE_UI_URL: process.env.REACT_APP_MF_CORE_UI_URL || 'http://localhost:3006/remoteEntry.js',
        MF_INVESTIGATION_URL: process.env.REACT_APP_MF_INVESTIGATION_URL || 'http://localhost:3001/remoteEntry.js',
        MF_AGENT_ANALYTICS_URL: process.env.REACT_APP_MF_AGENT_ANALYTICS_URL || 'http://localhost:3002/remoteEntry.js',
        MF_VISUALIZATION_URL: process.env.REACT_APP_MF_VISUALIZATION_URL || 'http://localhost:3004/remoteEntry.js',
        MF_REPORTING_URL: process.env.REACT_APP_MF_REPORTING_URL || 'http://localhost:3005/remoteEntry.js',

        // Deployment
        PUBLIC_PATH: process.env.REACT_APP_PUBLIC_PATH || '/autonomous-investigation/',
        ASSET_PATH: process.env.REACT_APP_ASSET_PATH || '/autonomous-investigation/assets/',
        CDN_URL: process.env.REACT_APP_CDN_URL,

        // Security
        ENABLE_CSP: process.env.REACT_APP_ENABLE_CSP || 'true',
        CSP_REPORT_URI: process.env.REACT_APP_CSP_REPORT_URI,
        ENABLE_HTTPS_REDIRECT: process.env.REACT_APP_ENABLE_HTTPS_REDIRECT || 'false',

        // Debugging
        DEBUG_MODE: process.env.REACT_APP_DEBUG_MODE || 'false',
        LOG_LEVEL: process.env.REACT_APP_LOG_LEVEL || 'info',

        // Resource Limits
        MAX_INVESTIGATION_NODES: process.env.REACT_APP_MAX_INVESTIGATION_NODES || '1000',
        MAX_TIMELINE_EVENTS: process.env.REACT_APP_MAX_TIMELINE_EVENTS || '5000',
        MAX_EVIDENCE_ITEMS: process.env.REACT_APP_MAX_EVIDENCE_ITEMS || '500',
        GRAPH_PERFORMANCE_MODE: process.env.REACT_APP_GRAPH_PERFORMANCE_MODE || 'false',
      };

      // Validate configuration
      const validatedConfig = EnvironmentSchema.parse(envConfig);

      console.log(`[EnvironmentConfig] Configuration loaded for ${validatedConfig.NODE_ENV} environment`);

      if (validatedConfig.DEBUG_MODE) {
        console.debug('[EnvironmentConfig] Configuration:', validatedConfig);
      }

      return validatedConfig;
    } catch (error) {
      console.error('[EnvironmentConfig] Invalid environment configuration:', error);
      throw new Error(`Environment configuration validation failed: ${error}`);
    }
  }

  /**
   * Get configuration value by key
   */
  public get<K extends keyof Environment>(key: K): Environment[K] {
    if (!this.isInitialized) {
      throw new Error('Environment configuration not initialized');
    }
    return this.config[key];
  }

  /**
   * Get all configuration
   */
  public getAll(): Environment {
    if (!this.isInitialized) {
      throw new Error('Environment configuration not initialized');
    }
    return { ...this.config };
  }

  /**
   * Check if feature is enabled
   */
  public isFeatureEnabled(feature: string): boolean {
    const featureKey = `FEATURE_${feature.toUpperCase()}` as keyof Environment;
    return this.config[featureKey] as boolean || false;
  }

  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * Check if running in staging
   */
  public isStaging(): boolean {
    return this.config.NODE_ENV === 'staging';
  }

  /**
   * Get Module Federation remote URLs
   */
  public getRemoteUrls(): Record<string, string> {
    return {
      shell: this.config.MF_SHELL_URL,
      core_ui: this.config.MF_CORE_UI_URL,
      investigation: this.config.MF_INVESTIGATION_URL,
      agent_analytics: this.config.MF_AGENT_ANALYTICS_URL,
      visualization: this.config.MF_VISUALIZATION_URL,
      reporting: this.config.MF_REPORTING_URL,
    };
  }

  /**
   * Get monitoring configuration
   */
  public getMonitoringConfig(): {
    enabled: boolean;
    endpoint?: string;
    apiKey?: string;
    batchSize: number;
    flushInterval: number;
  } {
    return {
      enabled: this.config.MONITORING_ENABLED,
      endpoint: this.config.MONITORING_ENDPOINT,
      apiKey: this.config.MONITORING_API_KEY,
      batchSize: this.config.MONITORING_BATCH_SIZE,
      flushInterval: this.config.MONITORING_FLUSH_INTERVAL,
    };
  }

  /**
   * Get WebSocket configuration
   */
  public getWebSocketConfig(): {
    url: string;
    reconnectInterval: number;
    maxRetries: number;
  } {
    return {
      url: this.config.WEBSOCKET_URL,
      reconnectInterval: this.config.WEBSOCKET_RECONNECT_INTERVAL,
      maxRetries: this.config.WEBSOCKET_MAX_RETRIES,
    };
  }

  /**
   * Get resource limits
   */
  public getResourceLimits(): {
    maxInvestigationNodes: number;
    maxTimelineEvents: number;
    maxEvidenceItems: number;
    graphPerformanceMode: boolean;
  } {
    return {
      maxInvestigationNodes: this.config.MAX_INVESTIGATION_NODES,
      maxTimelineEvents: this.config.MAX_TIMELINE_EVENTS,
      maxEvidenceItems: this.config.MAX_EVIDENCE_ITEMS,
      graphPerformanceMode: this.config.GRAPH_PERFORMANCE_MODE,
    };
  }
}

// Singleton instance
export const environmentConfig = new EnvironmentConfig();

// Export types and schemas for external use
export type { Environment };
export { EnvironmentSchema };