/**
 * Configuration Validation and Loading
 *
 * This module handles loading configuration from environment variables
 * and validating it using Zod schemas.
 *
 * Implements fail-fast behavior:
 * - Missing required environment variables will throw an error
 * - Invalid configuration values will throw an error
 * - Service will not start if configuration is invalid
 */

import { VisualizationConfigSchema, VisualizationConfig } from './schemas';

export * from './schemas';

/**
 * Build configuration object from environment variables
 */
function buildConfigFromEnv() {
  return {
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
}

/**
 * Load and validate configuration from environment variables
 *
 * @throws {Error} If configuration is invalid or incomplete
 * @returns {VisualizationConfig} Validated configuration object
 */
export function loadVisualizationConfig(): VisualizationConfig {
  const config = buildConfigFromEnv();
  const result = VisualizationConfigSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.format();
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Visualization service configuration validation failed:');
      console.error(JSON.stringify(errors, null, 2));
    }
    throw new Error(
      'Configuration validation failed. Check environment variables. Service will not start.'
    );
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Visualization service configuration loaded and validated successfully');
    console.log(`   Environment: ${result.data.service.environment}`);
    console.log(`   Port: ${result.data.service.port}`);
    console.log(`   Event Bus: ${result.data.eventBus.type}`);
    console.log(`   Features enabled: ${Object.entries(result.data.features).filter(([_, v]) => v).length}/10`);
  }

  return result.data;
}
