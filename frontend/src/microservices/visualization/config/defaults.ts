/**
 * Default Configuration Values
 *
 * This file contains default values for optional configuration settings.
 * These values are used when environment variables are not provided.
 *
 * IMPORTANT:
 * - NO secrets or API keys should be defined here
 * - NO required configuration values should have defaults
 * - All defaults must match the Zod schema defaults
 * - Values here are for documentation and reference only
 */

import {
  Environment,
  ServiceConfig,
  EventBusConfig,
  GoogleMapsConfig,
  FeatureFlags,
  PerformanceConfig,
  VisualizationDefaults,
  StorageConfig,
  ExportConfig,
} from './validation';

/**
 * Default service configuration values
 */
export const DEFAULT_SERVICE_CONFIG: Partial<ServiceConfig> = {
  port: 3004,
  host: 'localhost',
  enableDebugLogging: false,
  logLevel: 'info',
};

/**
 * Default event bus configuration values
 */
export const DEFAULT_EVENT_BUS_CONFIG: Partial<EventBusConfig> = {
  type: 'local',
  maxQueueSize: 1000,
  processingTimeoutMs: 5000,
  persistEvents: false,
};

/**
 * Default Google Maps configuration values
 * Note: apiKey is REQUIRED and has no default
 */
export const DEFAULT_GOOGLE_MAPS_CONFIG: Partial<GoogleMapsConfig> = {
  defaultZoom: 10,
  mapStyle: 'standard',
  enableClustering: true,
  clusterGridSize: 60,
};

/**
 * Default feature flags (all enabled by default)
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableRiskGauges: true,
  enableNetworkGraphs: true,
  enableMaps: true,
  enableTimeline: true,
  enableRealtimeMonitoring: true,
  enableChartBuilder: true,
  enablePngExport: true,
  enableSvgExport: true,
  enableJsonExport: true,
  enableDashboard: true,
};

/**
 * Default performance configuration values
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  targetFPS: 60,
  maxNetworkNodes: 1000,
  maxRenderableNodes: 5000,
  maxMapMarkers: 500,
  maxTimelineEvents: 1000,
  maxConcurrentCharts: 10,
  canvasRenderTimeoutMs: 5000,
  enablePerformanceMonitoring: true,
  performanceSampleRate: 0.1,
};

/**
 * Default visualization settings
 */
export const DEFAULT_VISUALIZATION_DEFAULTS: VisualizationDefaults = {
  defaultColorPalette: 'olorin-corporate',
  defaultGaugeSize: 200,
  defaultNetworkHeight: 600,
  defaultMapHeight: 500,
  defaultTimelineMaxHeight: 800,
  defaultEkgHeight: 200,
  enableAnimationsByDefault: true,
  enablePhysicsByDefault: true,
  defaultChartType: 'line',
};

/**
 * Default storage configuration values
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  provider: 'localStorage',
  keyPrefix: 'olorin:visualization:',
  enablePersistence: true,
  stateTTLMs: 86400000,
  maxStorageSizeBytes: 10485760,
};

/**
 * Default export configuration values
 */
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  defaultPngQuality: 0.95,
  maxExportWidth: 4096,
  maxExportHeight: 4096,
  filenamePrefix: 'olorin-visualization',
  includeTimestamp: true,
  includeMetadata: true,
  exportTimeoutMs: 30000,
};

/**
 * Environment-specific default values
 */
export const ENVIRONMENT_DEFAULTS: Record<Environment, Partial<ServiceConfig>> = {
  production: {
    logLevel: 'warn',
    enableDebugLogging: false,
  },
  staging: {
    logLevel: 'info',
    enableDebugLogging: false,
  },
  development: {
    logLevel: 'debug',
    enableDebugLogging: true,
  },
  test: {
    logLevel: 'error',
    enableDebugLogging: false,
  },
};
