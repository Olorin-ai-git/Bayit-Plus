/**
 * Shared TypeScript Type Definitions for Visualization Microservice
 *
 * This file contains type definitions that can be imported by other microservices
 * when consuming visualization components via Webpack Module Federation.
 *
 * Import pattern:
 * import type { RiskGaugeProps, NetworkGraphProps } from '@visualization/contracts';
 */

import { z } from 'zod';

// =============================================================================
// CORE DOMAIN TYPES
// =============================================================================

/**
 * Risk severity levels used across all risk visualizations
 */
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Node types supported in network visualizations
 */
export type NodeType = 'account' | 'device' | 'location' | 'transaction' | 'person';

/**
 * Location types for map markers
 */
export type LocationType = 'customer' | 'business' | 'device' | 'transaction' | 'risk';

/**
 * Timeline event types
 */
export type TimelineEventType = 'info' | 'warning' | 'critical' | 'success';

/**
 * Chart types supported by the chart builder
 */
export type ChartType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'doughnut'
  | 'area'
  | 'scatter'
  | 'bubble'
  | 'radar'
  | 'polar'
  | 'histogram'
  | 'heatmap'
  | 'treemap'
  | 'funnel'
  | 'gauge'
  | 'waterfall';

/**
 * Export formats for visualization downloads
 */
export type ExportFormat = 'png' | 'svg' | 'json';

/**
 * Dashboard view types
 */
export type DashboardView = 'overview' | 'risk-analysis' | 'geographic' | 'trends';

// =============================================================================
// COMPONENT PROP INTERFACES
// =============================================================================

/**
 * Props for RiskGauge component
 */
export interface RiskGaugeProps {
  /** Current risk score (0-100) */
  score: number;
  /** Risk severity level */
  severity: RiskSeverity;
  /** Optional label text */
  label?: string;
  /** Gauge size in pixels */
  size?: number;
  /** Enable real-time animation */
  animated?: boolean;
  /** Callback when gauge is clicked */
  onClick?: () => void;
}

/**
 * Props for NetworkGraph component
 */
export interface NetworkGraphProps {
  /** Investigation ID for data loading */
  investigationId: string;
  /** Network nodes */
  nodes: NetworkNode[];
  /** Network edges */
  edges: NetworkEdge[];
  /** Enable physics simulation */
  physicsEnabled?: boolean;
  /** Callback when node is selected */
  onNodeSelect?: (nodeId: string) => void;
  /** Callback when edge is selected */
  onEdgeSelect?: (edgeId: string) => void;
  /** Graph height in pixels */
  height?: number;
}

/**
 * Network node structure
 */
export interface NetworkNode {
  id: string;
  type: NodeType;
  label: string;
  riskScore?: number;
  metadata?: Record<string, unknown>;
  position?: { x: number; y: number };
}

/**
 * Network edge structure
 */
export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  relationshipType: string;
  weight?: number;
}

/**
 * Props for LocationMap component
 */
export interface LocationMapProps {
  /** Investigation ID for data loading */
  investigationId: string;
  /** Map markers */
  markers: LocationMarker[];
  /** Initial center coordinates */
  center?: { latitude: number; longitude: number };
  /** Initial zoom level (1-20) */
  zoom?: number;
  /** Callback when marker is clicked */
  onMarkerClick?: (markerId: string) => void;
  /** Map height in pixels */
  height?: number;
}

/**
 * Location marker structure
 */
export interface LocationMarker {
  id: string;
  locationType: LocationType;
  coordinates: { latitude: number; longitude: number };
  label: string;
  riskScore?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Props for Timeline component
 */
export interface TimelineProps {
  /** Investigation ID for data loading */
  investigationId: string;
  /** Timeline events */
  events: TimelineEvent[];
  /** Enable filtering controls */
  showFilters?: boolean;
  /** Callback when event is expanded */
  onEventExpand?: (eventId: string) => void;
  /** Maximum height in pixels */
  maxHeight?: number;
}

/**
 * Timeline event structure
 */
export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: TimelineEventType;
  severity: RiskSeverity;
  title: string;
  description: string;
  agentId?: string;
  agentName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Props for EKGMonitor component
 */
export interface EKGMonitorProps {
  /** Investigation ID for data loading */
  investigationId: string;
  /** Heartbeat data points */
  data: EKGDataPoint[];
  /** Target FPS for animation */
  targetFPS?: number;
  /** Monitor height in pixels */
  height?: number;
}

/**
 * EKG monitor data point
 */
export interface EKGDataPoint {
  timestamp: number;
  value: number;
  agentId: string;
}

/**
 * Props for ChartBuilder component
 */
export interface ChartBuilderProps {
  /** Investigation ID for data loading */
  investigationId: string;
  /** Initial chart type */
  initialChartType?: ChartType;
  /** Available data sources */
  dataSources: DataSource[];
  /** Callback when chart is created */
  onChartCreate?: (chartConfig: ChartConfig) => void;
}

/**
 * Data source for chart builder
 */
export interface DataSource {
  id: string;
  name: string;
  fields: DataField[];
  data: Record<string, unknown>[];
}

/**
 * Data field definition
 */
export interface DataField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  label: string;
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  dataSourceId: string;
  xAxis: string;
  yAxis: string[];
  colors?: string[];
  options?: Record<string, unknown>;
}

// =============================================================================
// SERVICE INTEGRATION TYPES
// =============================================================================

/**
 * Visualization service configuration
 */
export interface VisualizationServiceConfig {
  /** Service base URL */
  baseUrl: string;
  /** Google Maps API key */
  googleMapsApiKey: string;
  /** Maximum network nodes before warning */
  maxNetworkNodes: number;
  /** Maximum map markers before clustering */
  maxMapMarkers: number;
  /** Maximum timeline events to display */
  maxTimelineEvents: number;
  /** Target FPS for real-time visualizations */
  targetFPS: number;
  /** Event bus instance */
  eventBus: EventBusInstance;
}

/**
 * Event bus interface for inter-service communication
 */
export interface EventBusInstance {
  subscribe<T>(eventType: string, callback: (data: T) => void): () => void;
  publish<T>(eventType: string, data: T): void;
  unsubscribe(eventType: string, callback: Function): void;
}

/**
 * Visualization state for persistence
 */
export interface VisualizationState {
  /** Current investigation ID */
  investigationId: string;
  /** Selected visualization type */
  currentView: DashboardView;
  /** Network graph state */
  networkState?: NetworkGraphState;
  /** Map state */
  mapState?: MapState;
  /** Timeline state */
  timelineState?: TimelineState;
}

/**
 * Network graph state
 */
export interface NetworkGraphState {
  selectedNodeId?: string;
  selectedEdgeId?: string;
  zoom: number;
  physicsEnabled: boolean;
  layout: 'hierarchical' | 'force-directed' | 'circular';
}

/**
 * Map state
 */
export interface MapState {
  center: { latitude: number; longitude: number };
  zoom: number;
  selectedMarkerId?: string;
  clusteringEnabled: boolean;
}

/**
 * Timeline state
 */
export interface TimelineState {
  expandedEventIds: string[];
  filters: TimelineFilters;
  sortOrder: 'asc' | 'desc';
}

/**
 * Timeline filters
 */
export interface TimelineFilters {
  types: TimelineEventType[];
  severities: RiskSeverity[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
}

// =============================================================================
// EXPORT SERVICE TYPES
// =============================================================================

/**
 * Export request configuration
 */
export interface ExportRequest {
  /** Visualization type to export */
  visualizationType: string;
  /** Export format */
  format: ExportFormat;
  /** Optional filename override */
  filename?: string;
  /** Export quality (for PNG) */
  quality?: number;
  /** Include metadata */
  includeMetadata?: boolean;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  filename?: string;
  dataUrl?: string;
  error?: string;
  metadata?: ExportMetadata;
}

/**
 * Export metadata
 */
export interface ExportMetadata {
  investigationId: string;
  visualizationType: string;
  format: ExportFormat;
  timestamp: string;
  dimensions?: { width: number; height: number };
  fileSize?: number;
}

// =============================================================================
// COLOR PALETTE TYPES
// =============================================================================

/**
 * Predefined color palettes
 */
export type ColorPalette =
  | 'olorin-corporate'
  | 'risk-severity'
  | 'category-10'
  | 'sequential-blue'
  | 'diverging-red-blue';

/**
 * Color scheme definition
 */
export interface ColorScheme {
  id: ColorPalette;
  name: string;
  colors: string[];
  description: string;
}

/**
 * Risk severity color mapping
 */
export interface RiskColorMap {
  low: string;
  medium: string;
  high: string;
  critical: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Visualization error details
 */
export interface VisualizationError {
  code: VisualizationErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Error codes for visualization failures
 */
export type VisualizationErrorCode =
  | 'INVALID_DATA'
  | 'RENDER_FAILED'
  | 'EXPORT_FAILED'
  | 'CONFIG_INVALID'
  | 'SERVICE_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT';

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Generic async result type
 */
export type AsyncResult<T> = Promise<Result<T>>;

/**
 * Result type for operations that can fail
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: VisualizationError };

/**
 * Pagination params for large datasets
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  totalItems?: number;
}

/**
 * Sort params for ordered data
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Filter params for data queries
 */
export interface FilterParams {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}
