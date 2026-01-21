/**
 * Zod Schema Definitions for Visualization Microservice
 *
 * This file contains all Zod schema definitions for configuration validation.
 * Schemas are split from the loader for better modularity and maintainability.
 */

import { z } from 'zod';

export const EnvironmentSchema = z.enum(['production', 'staging', 'development', 'test']);
export type Environment = z.infer<typeof EnvironmentSchema>;

export const ServiceConfigSchema = z.object({
  environment: EnvironmentSchema,
  port: z.coerce.number().int().positive().default(3004),
  host: z.string().min(1).default('localhost'),
  baseUrl: z.string().url(),
  corsOrigins: z.string().transform((val) => val.split(',')),
  enableDebugLogging: z.coerce.boolean().default(false),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export const EventBusConfigSchema = z.object({
  type: z.enum(['local', 'redis', 'kafka']).default('local'),
  maxQueueSize: z.coerce.number().int().positive().default(1000),
  processingTimeoutMs: z.coerce.number().int().positive().default(5000),
  persistEvents: z.coerce.boolean().default(false),
  redisUrl: z.string().url().optional(),
  kafkaBrokers: z.string().optional(),
});

export type EventBusConfig = z.infer<typeof EventBusConfigSchema>;

export const GoogleMapsConfigSchema = z.object({
  apiKey: z.string().min(1),
  defaultZoom: z.coerce.number().int().min(1).max(20).default(10),
  mapStyle: z.enum(['standard', 'satellite', 'hybrid', 'terrain']).default('standard'),
  enableClustering: z.coerce.boolean().default(true),
  clusterGridSize: z.coerce.number().int().positive().default(60),
});

export type GoogleMapsConfig = z.infer<typeof GoogleMapsConfigSchema>;

export const FeatureFlagsSchema = z.object({
  enableRiskGauges: z.coerce.boolean().default(true),
  enableNetworkGraphs: z.coerce.boolean().default(true),
  enableMaps: z.coerce.boolean().default(true),
  enableTimeline: z.coerce.boolean().default(true),
  enableRealtimeMonitoring: z.coerce.boolean().default(true),
  enableChartBuilder: z.coerce.boolean().default(true),
  enablePngExport: z.coerce.boolean().default(true),
  enableSvgExport: z.coerce.boolean().default(true),
  enableJsonExport: z.coerce.boolean().default(true),
  enableDashboard: z.coerce.boolean().default(true),
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export const PerformanceConfigSchema = z.object({
  targetFPS: z.coerce.number().int().positive().default(60),
  maxNetworkNodes: z.coerce.number().int().positive().default(1000),
  maxRenderableNodes: z.coerce.number().int().positive().default(5000),
  maxMapMarkers: z.coerce.number().int().positive().default(500),
  maxTimelineEvents: z.coerce.number().int().positive().default(1000),
  maxConcurrentCharts: z.coerce.number().int().positive().default(10),
  canvasRenderTimeoutMs: z.coerce.number().int().positive().default(5000),
  enablePerformanceMonitoring: z.coerce.boolean().default(true),
  performanceSampleRate: z.coerce.number().min(0).max(1).default(0.1),
});

export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

export const VisualizationDefaultsSchema = z.object({
  defaultColorPalette: z
    .enum(['olorin-corporate', 'risk-severity', 'category-10', 'sequential-blue', 'diverging-red-blue'])
    .default('olorin-corporate'),
  defaultGaugeSize: z.coerce.number().int().positive().default(200),
  defaultNetworkHeight: z.coerce.number().int().positive().default(600),
  defaultMapHeight: z.coerce.number().int().positive().default(500),
  defaultTimelineMaxHeight: z.coerce.number().int().positive().default(800),
  defaultEkgHeight: z.coerce.number().int().positive().default(200),
  enableAnimationsByDefault: z.coerce.boolean().default(true),
  enablePhysicsByDefault: z.coerce.boolean().default(true),
  defaultChartType: z.enum(['line', 'bar', 'pie', 'area']).default('line'),
});

export type VisualizationDefaults = z.infer<typeof VisualizationDefaultsSchema>;

export const StorageConfigSchema = z.object({
  provider: z.enum(['localStorage', 'sessionStorage', 'indexedDB', 'none']).default('localStorage'),
  keyPrefix: z.string().default('olorin:visualization:'),
  enablePersistence: z.coerce.boolean().default(true),
  stateTTLMs: z.coerce.number().int().min(0).default(86400000),
  maxStorageSizeBytes: z.coerce.number().int().positive().default(10485760),
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

export const ExportConfigSchema = z.object({
  defaultPngQuality: z.coerce.number().min(0).max(1).default(0.95),
  maxExportWidth: z.coerce.number().int().positive().default(4096),
  maxExportHeight: z.coerce.number().int().positive().default(4096),
  filenamePrefix: z.string().default('olorin-visualization'),
  includeTimestamp: z.coerce.boolean().default(true),
  includeMetadata: z.coerce.boolean().default(true),
  exportTimeoutMs: z.coerce.number().int().positive().default(30000),
});

export type ExportConfig = z.infer<typeof ExportConfigSchema>;

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
