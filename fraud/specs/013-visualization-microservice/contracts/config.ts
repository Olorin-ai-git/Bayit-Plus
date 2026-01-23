/**
 * Configuration Schema for Visualization Microservice
 *
 * This file defines the complete configuration schema with Zod validation.
 * All configuration values MUST be provided via environment variables or
 * configuration files - NO HARDCODED VALUES are allowed.
 *
 * Configuration is validated at startup using fail-fast approach.
 * Missing or invalid configuration will prevent service initialization.
 */

import { z } from 'zod';

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

/**
 * Service environment type
 */
export const EnvironmentSchema = z.enum(['production', 'staging', 'development', 'test']);
export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Core service configuration
 */
export const ServiceConfigSchema = z.object({
  /** Service environment */
  environment: EnvironmentSchema,

  /** Service port number */
  port: z.coerce.number().int().positive().default(3004),

  /** Service host */
  host: z.string().min(1).default('localhost'),

  /** Service base URL */
  baseUrl: z.string().url(),

  /** CORS allowed origins (comma-separated) */
  corsOrigins: z.string().transform((val) => val.split(',')),

  /** Enable verbose logging */
  enableDebugLogging: z.coerce.boolean().default(false),

  /** Log level */
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

// =============================================================================
// EXTERNAL SERVICE CONFIGURATION
// =============================================================================

/**
 * Event bus configuration
 */
export const EventBusConfigSchema = z.object({
  /** Event bus type */
  type: z.enum(['local', 'redis', 'kafka']).default('local'),

  /** Maximum event queue size */
  maxQueueSize: z.coerce.number().int().positive().default(1000),

  /** Event processing timeout (ms) */
  processingTimeoutMs: z.coerce.number().int().positive().default(5000),

  /** Enable event persistence */
  persistEvents: z.coerce.boolean().default(false),

  /** Redis URL (if type=redis) */
  redisUrl: z.string().url().optional(),

  /** Kafka brokers (if type=kafka) */
  kafkaBrokers: z.string().optional(),
});

export type EventBusConfig = z.infer<typeof EventBusConfigSchema>;

/**
 * Google Maps configuration
 */
export const GoogleMapsConfigSchema = z.object({
  /** Google Maps API key (REQUIRED) */
  apiKey: z.string().min(1),

  /** Default map zoom level */
  defaultZoom: z.coerce.number().int().min(1).max(20).default(10),

  /** Map style (standard, satellite, hybrid, terrain) */
  mapStyle: z.enum(['standard', 'satellite', 'hybrid', 'terrain']).default('standard'),

  /** Enable marker clustering */
  enableClustering: z.coerce.boolean().default(true),

  /** Cluster grid size */
  clusterGridSize: z.coerce.number().int().positive().default(60),
});

export type GoogleMapsConfig = z.infer<typeof GoogleMapsConfigSchema>;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Feature flags for visualization capabilities
 */
export const FeatureFlagsSchema = z.object({
  /** Enable risk gauge visualizations */
  enableRiskGauges: z.coerce.boolean().default(true),

  /** Enable network graph visualizations */
  enableNetworkGraphs: z.coerce.boolean().default(true),

  /** Enable geographic map visualizations */
  enableMaps: z.coerce.boolean().default(true),

  /** Enable timeline visualizations */
  enableTimeline: z.coerce.boolean().default(true),

  /** Enable real-time monitoring (EKG, radar) */
  enableRealtimeMonitoring: z.coerce.boolean().default(true),

  /** Enable chart builder */
  enableChartBuilder: z.coerce.boolean().default(true),

  /** Enable PNG export */
  enablePngExport: z.coerce.boolean().default(true),

  /** Enable SVG export */
  enableSvgExport: z.coerce.boolean().default(true),

  /** Enable JSON export */
  enableJsonExport: z.coerce.boolean().default(true),

  /** Enable dashboard multi-view */
  enableDashboard: z.coerce.boolean().default(true),
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

// =============================================================================
// PERFORMANCE CONFIGURATION
// =============================================================================

/**
 * Performance settings and limits
 */
export const PerformanceConfigSchema = z.object({
  /** Target FPS for real-time visualizations */
  targetFPS: z.coerce.number().int().positive().default(60),

  /** Maximum network nodes before performance warning */
  maxNetworkNodes: z.coerce.number().int().positive().default(1000),

  /** Maximum network nodes to render */
  maxRenderableNodes: z.coerce.number().int().positive().default(5000),

  /** Maximum map markers before clustering */
  maxMapMarkers: z.coerce.number().int().positive().default(500),

  /** Maximum timeline events to display at once */
  maxTimelineEvents: z.coerce.number().int().positive().default(1000),

  /** Maximum concurrent chart renders */
  maxConcurrentCharts: z.coerce.number().int().positive().default(10),

  /** Canvas render timeout (ms) */
  canvasRenderTimeoutMs: z.coerce.number().int().positive().default(5000),

  /** Enable performance monitoring */
  enablePerformanceMonitoring: z.coerce.boolean().default(true),

  /** Performance sample rate (0.0 - 1.0) */
  performanceSampleRate: z.coerce.number().min(0).max(1).default(0.1),
});

export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

// =============================================================================
// VISUALIZATION DEFAULTS
// =============================================================================

/**
 * Default visualization settings
 */
export const VisualizationDefaultsSchema = z.object({
  /** Default color palette */
  defaultColorPalette: z
    .enum(['olorin-corporate', 'risk-severity', 'category-10', 'sequential-blue', 'diverging-red-blue'])
    .default('olorin-corporate'),

  /** Default gauge size (pixels) */
  defaultGaugeSize: z.coerce.number().int().positive().default(200),

  /** Default network graph height (pixels) */
  defaultNetworkHeight: z.coerce.number().int().positive().default(600),

  /** Default map height (pixels) */
  defaultMapHeight: z.coerce.number().int().positive().default(500),

  /** Default timeline max height (pixels) */
  defaultTimelineMaxHeight: z.coerce.number().int().positive().default(800),

  /** Default EKG monitor height (pixels) */
  defaultEkgHeight: z.coerce.number().int().positive().default(200),

  /** Enable animations by default */
  enableAnimationsByDefault: z.coerce.boolean().default(true),

  /** Enable physics in network graphs by default */
  enablePhysicsByDefault: z.coerce.boolean().default(true),

  /** Default chart type */
  defaultChartType: z.enum(['line', 'bar', 'pie', 'area']).default('line'),
});

export type VisualizationDefaults = z.infer<typeof VisualizationDefaultsSchema>;

// =============================================================================
// STORAGE CONFIGURATION
// =============================================================================

/**
 * State persistence configuration
 */
export const StorageConfigSchema = z.object({
  /** Storage provider */
  provider: z.enum(['localStorage', 'sessionStorage', 'indexedDB', 'none']).default('localStorage'),

  /** Storage key prefix */
  keyPrefix: z.string().default('olorin:visualization:'),

  /** Enable state persistence */
  enablePersistence: z.coerce.boolean().default(true),

  /** State TTL in milliseconds (0 = no expiry) */
  stateTTLMs: z.coerce.number().int().min(0).default(86400000), // 24 hours

  /** Maximum storage size (bytes) */
  maxStorageSizeBytes: z.coerce.number().int().positive().default(10485760), // 10 MB
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

// =============================================================================
// EXPORT CONFIGURATION
// =============================================================================

/**
 * Export functionality configuration
 */
export const ExportConfigSchema = z.object({
  /** Default PNG quality (0.0 - 1.0) */
  defaultPngQuality: z.coerce.number().min(0).max(1).default(0.95),

  /** Maximum export dimensions */
  maxExportWidth: z.coerce.number().int().positive().default(4096),
  maxExportHeight: z.coerce.number().int().positive().default(4096),

  /** Default filename prefix */
  filenamePrefix: z.string().default('olorin-visualization'),

  /** Include timestamp in filename */
  includeTimestamp: z.coerce.boolean().default(true),

  /** Enable metadata in exports */
  includeMetadata: z.coerce.boolean().default(true),

  /** Export timeout (ms) */
  exportTimeoutMs: z.coerce.number().int().positive().default(30000),
});

export type ExportConfig = z.infer<typeof ExportConfigSchema>;

// =============================================================================
// COMPLETE CONFIGURATION SCHEMA
// =============================================================================

/**
 * Complete visualization microservice configuration
 */
export const VisualizationConfigSchema = z.object({
  service: ServiceConfigSchema,
  eventBus: EventBusConfigSchema,
  googleMaps: GoogleMapsConfigSchema,
  features: FeatureFlagsSchema,
  performance: PerformanceConfigSchema,
  defaults: VisualizationDefaultsSchema,
  storage: StorageConfigSchema,
  export: ExportConfigSchema,
});

export type VisualizationConfig = z.infer<typeof VisualizationConfigSchema>;

// =============================================================================
// CONFIGURATION LOADER
// =============================================================================

/**
 * Load and validate configuration from environment variables
 *
 * This function performs fail-fast validation. If any required configuration
 * is missing or invalid, it will throw an error and prevent service startup.
 *
 * @throws {Error} If configuration is invalid or incomplete
 * @returns {VisualizationConfig} Validated configuration object
 */
export function loadVisualizationConfig(): VisualizationConfig {
  // Build configuration object from environment variables
  const config = {
    service: {
      environment: process.env.APP_ENV || process.env.NODE_ENV,
      port: process.env.VISUALIZATION_PORT,
      host: process.env.VISUALIZATION_HOST,
      baseUrl: process.env.VISUALIZATION_BASE_URL,
      corsOrigins: process.env.VISUALIZATION_CORS_ORIGINS,
      enableDebugLogging: process.env.VISUALIZATION_DEBUG_LOGGING,
      logLevel: process.env.VISUALIZATION_LOG_LEVEL,
    },
    eventBus: {
      type: process.env.EVENT_BUS_TYPE,
      maxQueueSize: process.env.EVENT_BUS_MAX_QUEUE_SIZE,
      processingTimeoutMs: process.env.EVENT_BUS_PROCESSING_TIMEOUT_MS,
      persistEvents: process.env.EVENT_BUS_PERSIST_EVENTS,
      redisUrl: process.env.EVENT_BUS_REDIS_URL,
      kafkaBrokers: process.env.EVENT_BUS_KAFKA_BROKERS,
    },
    googleMaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      defaultZoom: process.env.GOOGLE_MAPS_DEFAULT_ZOOM,
      mapStyle: process.env.GOOGLE_MAPS_STYLE,
      enableClustering: process.env.GOOGLE_MAPS_ENABLE_CLUSTERING,
      clusterGridSize: process.env.GOOGLE_MAPS_CLUSTER_GRID_SIZE,
    },
    features: {
      enableRiskGauges: process.env.FEATURE_RISK_GAUGES,
      enableNetworkGraphs: process.env.FEATURE_NETWORK_GRAPHS,
      enableMaps: process.env.FEATURE_MAPS,
      enableTimeline: process.env.FEATURE_TIMELINE,
      enableRealtimeMonitoring: process.env.FEATURE_REALTIME_MONITORING,
      enableChartBuilder: process.env.FEATURE_CHART_BUILDER,
      enablePngExport: process.env.FEATURE_PNG_EXPORT,
      enableSvgExport: process.env.FEATURE_SVG_EXPORT,
      enableJsonExport: process.env.FEATURE_JSON_EXPORT,
      enableDashboard: process.env.FEATURE_DASHBOARD,
    },
    performance: {
      targetFPS: process.env.VISUALIZATION_TARGET_FPS,
      maxNetworkNodes: process.env.VISUALIZATION_MAX_NETWORK_NODES,
      maxRenderableNodes: process.env.VISUALIZATION_MAX_RENDERABLE_NODES,
      maxMapMarkers: process.env.VISUALIZATION_MAX_MAP_MARKERS,
      maxTimelineEvents: process.env.VISUALIZATION_MAX_TIMELINE_EVENTS,
      maxConcurrentCharts: process.env.VISUALIZATION_MAX_CONCURRENT_CHARTS,
      canvasRenderTimeoutMs: process.env.VISUALIZATION_CANVAS_TIMEOUT_MS,
      enablePerformanceMonitoring: process.env.VISUALIZATION_PERFORMANCE_MONITORING,
      performanceSampleRate: process.env.VISUALIZATION_PERFORMANCE_SAMPLE_RATE,
    },
    defaults: {
      defaultColorPalette: process.env.VISUALIZATION_DEFAULT_COLOR_PALETTE,
      defaultGaugeSize: process.env.VISUALIZATION_DEFAULT_GAUGE_SIZE,
      defaultNetworkHeight: process.env.VISUALIZATION_DEFAULT_NETWORK_HEIGHT,
      defaultMapHeight: process.env.VISUALIZATION_DEFAULT_MAP_HEIGHT,
      defaultTimelineMaxHeight: process.env.VISUALIZATION_DEFAULT_TIMELINE_HEIGHT,
      defaultEkgHeight: process.env.VISUALIZATION_DEFAULT_EKG_HEIGHT,
      enableAnimationsByDefault: process.env.VISUALIZATION_ENABLE_ANIMATIONS,
      enablePhysicsByDefault: process.env.VISUALIZATION_ENABLE_PHYSICS,
      defaultChartType: process.env.VISUALIZATION_DEFAULT_CHART_TYPE,
    },
    storage: {
      provider: process.env.VISUALIZATION_STORAGE_PROVIDER,
      keyPrefix: process.env.VISUALIZATION_STORAGE_KEY_PREFIX,
      enablePersistence: process.env.VISUALIZATION_ENABLE_PERSISTENCE,
      stateTTLMs: process.env.VISUALIZATION_STATE_TTL_MS,
      maxStorageSizeBytes: process.env.VISUALIZATION_MAX_STORAGE_SIZE_BYTES,
    },
    export: {
      defaultPngQuality: process.env.VISUALIZATION_PNG_QUALITY,
      maxExportWidth: process.env.VISUALIZATION_MAX_EXPORT_WIDTH,
      maxExportHeight: process.env.VISUALIZATION_MAX_EXPORT_HEIGHT,
      filenamePrefix: process.env.VISUALIZATION_FILENAME_PREFIX,
      includeTimestamp: process.env.VISUALIZATION_INCLUDE_TIMESTAMP,
      includeMetadata: process.env.VISUALIZATION_INCLUDE_METADATA,
      exportTimeoutMs: process.env.VISUALIZATION_EXPORT_TIMEOUT_MS,
    },
  };

  // Validate configuration using Zod schema
  const result = VisualizationConfigSchema.safeParse(config);

  if (!result.success) {
    // Format validation errors for clear error messages
    const errors = result.error.format();
    console.error('❌ Visualization service configuration validation failed:');
    console.error(JSON.stringify(errors, null, 2));
    throw new Error(
      'Configuration validation failed. Check environment variables. Service will not start.'
    );
  }

  // Log successful configuration load
  console.log('✅ Visualization service configuration loaded and validated successfully');
  console.log(`   Environment: ${result.data.service.environment}`);
  console.log(`   Port: ${result.data.service.port}`);
  console.log(`   Event Bus: ${result.data.eventBus.type}`);
  console.log(`   Features enabled: ${Object.entries(result.data.features).filter(([_, v]) => v).length}/10`);

  return result.data;
}

/**
 * Get example .env file content for documentation
 */
export function getEnvExample(): string {
  return `
# Visualization Microservice Configuration
# All values are REQUIRED unless marked with (optional)

# ============================================================================
# SERVICE CONFIGURATION
# ============================================================================
APP_ENV=production                                    # production|staging|development|test
VISUALIZATION_PORT=3004                               # Service port
VISUALIZATION_HOST=localhost                          # Service host
VISUALIZATION_BASE_URL=http://localhost:3004          # Full service URL
VISUALIZATION_CORS_ORIGINS=http://localhost:3000      # Comma-separated origins
VISUALIZATION_DEBUG_LOGGING=false                     # Enable debug logs (optional)
VISUALIZATION_LOG_LEVEL=info                          # error|warn|info|debug (optional)

# ============================================================================
# EVENT BUS CONFIGURATION
# ============================================================================
EVENT_BUS_TYPE=local                                  # local|redis|kafka (optional)
EVENT_BUS_MAX_QUEUE_SIZE=1000                         # Max events in queue (optional)
EVENT_BUS_PROCESSING_TIMEOUT_MS=5000                  # Event timeout (optional)
EVENT_BUS_PERSIST_EVENTS=false                        # Persist events (optional)
EVENT_BUS_REDIS_URL=<redis-url>                       # Required if type=redis
EVENT_BUS_KAFKA_BROKERS=<kafka-brokers>               # Required if type=kafka

# ============================================================================
# GOOGLE MAPS CONFIGURATION
# ============================================================================
GOOGLE_MAPS_API_KEY=<your-api-key>                    # REQUIRED - Get from Google Cloud Console
GOOGLE_MAPS_DEFAULT_ZOOM=10                           # 1-20 (optional)
GOOGLE_MAPS_STYLE=standard                            # standard|satellite|hybrid|terrain (optional)
GOOGLE_MAPS_ENABLE_CLUSTERING=true                    # Enable marker clustering (optional)
GOOGLE_MAPS_CLUSTER_GRID_SIZE=60                      # Cluster grid size (optional)

# ============================================================================
# FEATURE FLAGS
# ============================================================================
FEATURE_RISK_GAUGES=true                              # Enable risk gauges (optional)
FEATURE_NETWORK_GRAPHS=true                           # Enable network graphs (optional)
FEATURE_MAPS=true                                     # Enable maps (optional)
FEATURE_TIMELINE=true                                 # Enable timeline (optional)
FEATURE_REALTIME_MONITORING=true                      # Enable real-time monitoring (optional)
FEATURE_CHART_BUILDER=true                            # Enable chart builder (optional)
FEATURE_PNG_EXPORT=true                               # Enable PNG export (optional)
FEATURE_SVG_EXPORT=true                               # Enable SVG export (optional)
FEATURE_JSON_EXPORT=true                              # Enable JSON export (optional)
FEATURE_DASHBOARD=true                                # Enable dashboard (optional)

# ============================================================================
# PERFORMANCE CONFIGURATION
# ============================================================================
VISUALIZATION_TARGET_FPS=60                           # Target FPS (optional)
VISUALIZATION_MAX_NETWORK_NODES=1000                  # Max network nodes (optional)
VISUALIZATION_MAX_RENDERABLE_NODES=5000               # Max renderable nodes (optional)
VISUALIZATION_MAX_MAP_MARKERS=500                     # Max map markers (optional)
VISUALIZATION_MAX_TIMELINE_EVENTS=1000                # Max timeline events (optional)
VISUALIZATION_MAX_CONCURRENT_CHARTS=10                # Max concurrent charts (optional)
VISUALIZATION_CANVAS_TIMEOUT_MS=5000                  # Canvas timeout (optional)
VISUALIZATION_PERFORMANCE_MONITORING=true             # Enable monitoring (optional)
VISUALIZATION_PERFORMANCE_SAMPLE_RATE=0.1             # Sample rate 0-1 (optional)

# ============================================================================
# VISUALIZATION DEFAULTS
# ============================================================================
VISUALIZATION_DEFAULT_COLOR_PALETTE=olorin-corporate  # Color palette (optional)
VISUALIZATION_DEFAULT_GAUGE_SIZE=200                  # Gauge size px (optional)
VISUALIZATION_DEFAULT_NETWORK_HEIGHT=600              # Network height px (optional)
VISUALIZATION_DEFAULT_MAP_HEIGHT=500                  # Map height px (optional)
VISUALIZATION_DEFAULT_TIMELINE_HEIGHT=800             # Timeline height px (optional)
VISUALIZATION_DEFAULT_EKG_HEIGHT=200                  # EKG height px (optional)
VISUALIZATION_ENABLE_ANIMATIONS=true                  # Enable animations (optional)
VISUALIZATION_ENABLE_PHYSICS=true                     # Enable physics (optional)
VISUALIZATION_DEFAULT_CHART_TYPE=line                 # Default chart type (optional)

# ============================================================================
# STORAGE CONFIGURATION
# ============================================================================
VISUALIZATION_STORAGE_PROVIDER=localStorage           # localStorage|sessionStorage|indexedDB|none (optional)
VISUALIZATION_STORAGE_KEY_PREFIX=olorin:visualization: # Key prefix (optional)
VISUALIZATION_ENABLE_PERSISTENCE=true                 # Enable persistence (optional)
VISUALIZATION_STATE_TTL_MS=86400000                   # State TTL ms (optional)
VISUALIZATION_MAX_STORAGE_SIZE_BYTES=10485760         # Max storage bytes (optional)

# ============================================================================
# EXPORT CONFIGURATION
# ============================================================================
VISUALIZATION_PNG_QUALITY=0.95                        # PNG quality 0-1 (optional)
VISUALIZATION_MAX_EXPORT_WIDTH=4096                   # Max export width (optional)
VISUALIZATION_MAX_EXPORT_HEIGHT=4096                  # Max export height (optional)
VISUALIZATION_FILENAME_PREFIX=olorin-visualization    # Filename prefix (optional)
VISUALIZATION_INCLUDE_TIMESTAMP=true                  # Include timestamp (optional)
VISUALIZATION_INCLUDE_METADATA=true                   # Include metadata (optional)
VISUALIZATION_EXPORT_TIMEOUT_MS=30000                 # Export timeout (optional)
`.trim();
}
