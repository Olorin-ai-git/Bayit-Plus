# Data Model: Visualization Microservice

**Feature**: 002-visualization-microservice
**Date**: 2025-11-08
**Status**: Design Complete

## Overview

This document defines all data structures used by the Visualization Microservice. All types are defined in TypeScript with Zod schema validation for runtime type checking and configuration validation.

---

## 1. Risk Visualization Data Models

### 1.1 Risk Score

```typescript
import { z } from 'zod';

// Zod schema
export const RiskScoreSchema = z.object({
  score: z.number().min(0).max(100),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  timestamp: z.string().datetime(),
  agentId: z.string(),
  agentName: z.string(),
  trend: z.enum(['increasing', 'decreasing', 'stable']).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// TypeScript type
export type RiskScore = z.infer<typeof RiskScoreSchema>;

// Helper function
export const getRiskSeverity = (score: number): RiskScore['severity'] => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};
```

### 1.2 Risk Trend Data

```typescript
export const RiskTrendPointSchema = z.object({
  timestamp: z.string().datetime(),
  score: z.number().min(0).max(100),
});

export const RiskTrendSchema = z.object({
  agentId: z.string(),
  dataPoints: z.array(RiskTrendPointSchema),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

export type RiskTrendPoint = z.infer<typeof RiskTrendPointSchema>;
export type RiskTrend = z.infer<typeof RiskTrendSchema>;
```

### 1.3 Overall Investigation Risk

```typescript
export const InvestigationRiskSchema = z.object({
  overallScore: z.number().min(0).max(100),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  agentRisks: z.array(RiskScoreSchema),
  calculationMethod: z.enum(['average', 'maximum', 'weighted']),
  lastUpdated: z.string().datetime(),
});

export type InvestigationRisk = z.infer<typeof InvestigationRiskSchema>;
```

---

## 2. Network Graph Data Models

### 2.1 Network Node

```typescript
export const NetworkNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['account', 'device', 'location', 'transaction', 'person']),
  label: z.string(),
  riskScore: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  group: z.string().optional(),
  color: z.string().optional(),
  size: z.number().positive().optional(),
});

export type NetworkNode = z.infer<typeof NetworkNodeSchema>;
```

### 2.2 Network Edge

```typescript
export const NetworkEdgeSchema = z.object({
  id: z.string(),
  from: z.string(), // Source node ID
  to: z.string(),   // Target node ID
  relationshipType: z.string(),
  strength: z.number().min(0).max(1).optional(),
  directed: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
  color: z.string().optional(),
  width: z.number().positive().optional(),
  dashes: z.boolean().default(false),
});

export type NetworkEdge = z.infer<typeof NetworkEdgeSchema>;
```

### 2.3 Network Data

```typescript
export const NetworkDataSchema = z.object({
  nodes: z.array(NetworkNodeSchema),
  edges: z.array(NetworkEdgeSchema),
  layoutType: z.enum(['force-directed', 'hierarchical', 'radial', 'circular']),
  metadata: z.object({
    nodeCount: z.number().nonnegative(),
    edgeCount: z.number().nonnegative(),
    averageDegree: z.number().nonnegative(),
    connectedComponents: z.number().nonnegative(),
  }).optional(),
});

export type NetworkData = z.infer<typeof NetworkDataSchema>;
```

### 2.4 Network Layout Settings

```typescript
export const NetworkLayoutSchema = z.object({
  physics: z.object({
    enabled: z.boolean(),
    solver: z.enum(['barnesHut', 'forceAtlas2Based', 'repulsion']),
    barnesHut: z.object({
      gravitationalConstant: z.number(),
      centralGravity: z.number(),
      springLength: z.number(),
      springConstant: z.number(),
      damping: z.number(),
      avoidOverlap: z.number(),
    }).optional(),
  }),
  hierarchical: z.object({
    enabled: z.boolean(),
    direction: z.enum(['UD', 'DU', 'LR', 'RL']).optional(),
    sortMethod: z.enum(['hubsize', 'directed']).optional(),
    levelSeparation: z.number().optional(),
  }).optional(),
});

export type NetworkLayout = z.infer<typeof NetworkLayoutSchema>;
```

---

## 3. Geographic Data Models

### 3.1 Location Marker

```typescript
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const LocationMarkerSchema = z.object({
  id: z.string(),
  coordinates: CoordinatesSchema,
  type: z.enum(['customer', 'business', 'device', 'transaction', 'risk']),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  clusterId: z.string().optional(),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type LocationMarker = z.infer<typeof LocationMarkerSchema>;
```

### 3.2 Map View State

```typescript
export const MapViewStateSchema = z.object({
  center: CoordinatesSchema,
  zoom: z.number().min(1).max(20),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number(),
  }).optional(),
  activeFilters: z.array(z.enum(['customer', 'business', 'device', 'transaction', 'risk'])),
});

export type MapViewState = z.infer<typeof MapViewStateSchema>;
```

### 3.3 Location Cluster

```typescript
export const LocationClusterSchema = z.object({
  id: z.string(),
  center: CoordinatesSchema,
  markerCount: z.number().positive(),
  markerIds: z.array(z.string()),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number(),
  }),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export type LocationCluster = z.infer<typeof LocationClusterSchema>;
```

---

## 4. Timeline Data Models

### 4.1 Timeline Event

```typescript
export const TimelineEventSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  type: z.enum(['info', 'warning', 'critical', 'success']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  title: z.string(),
  description: z.string(),
  metadata: z.object({
    agentId: z.string().optional(),
    agentName: z.string().optional(),
    toolName: z.string().optional(),
    phase: z.string().optional(),
    data: z.record(z.unknown()).optional(),
  }).optional(),
  expanded: z.boolean().default(false),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
```

### 4.2 Timeline Filters

```typescript
export const TimelineFiltersSchema = z.object({
  types: z.array(z.enum(['info', 'warning', 'critical', 'success'])),
  severities: z.array(z.enum(['low', 'medium', 'high', 'critical'])),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
  searchQuery: z.string().optional(),
  agents: z.array(z.string()).optional(),
});

export type TimelineFilters = z.infer<typeof TimelineFiltersSchema>;
```

### 4.3 Timeline State

```typescript
export const TimelineStateSchema = z.object({
  events: z.array(TimelineEventSchema),
  filters: TimelineFiltersSchema,
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  virtualization: z.object({
    enabled: z.boolean(),
    itemHeight: z.number().positive(),
    overscan: z.number().nonnegative(),
  }),
});

export type TimelineState = z.infer<typeof TimelineStateSchema>;
```

---

## 5. Real-Time Monitoring Data Models

### 5.1 EKG Monitor Data

```typescript
export const EKGDataPointSchema = z.object({
  timestamp: z.number(), // milliseconds since epoch
  value: z.number().min(0).max(1), // normalized value
});

export const EKGMonitorDataSchema = z.object({
  heartbeatBPM: z.number().min(0).max(200),
  dataPoints: z.array(EKGDataPointSchema),
  status: z.enum(['active', 'inactive', 'error']),
  lastUpdate: z.string().datetime(),
});

export type EKGDataPoint = z.infer<typeof EKGDataPointSchema>;
export type EKGMonitorData = z.infer<typeof EKGMonitorDataSchema>;
```

### 5.2 TPS Sparkline Data

```typescript
export const TPSDataPointSchema = z.object({
  timestamp: z.number(), // milliseconds since epoch
  toolsPerSecond: z.number().min(0).max(40),
});

export const TPSSparklineDataSchema = z.object({
  dataPoints: z.array(TPSDataPointSchema).max(30), // Last 30 samples
  currentTPS: z.number().min(0).max(40),
  averageTPS: z.number().min(0).max(40),
  peakTPS: z.number().min(0).max(40),
});

export type TPSDataPoint = z.infer<typeof TPSDataPointSchema>;
export type TPSSparklineData = z.infer<typeof TPSSparklineDataSchema>;
```

### 5.3 Radar Visualization Data

```typescript
export const RadarAnomalySchema = z.object({
  id: z.string(),
  angle: z.number().min(0).max(360), // Position in degrees
  distance: z.number().min(0).max(1), // Normalized distance from center
  type: z.enum(['warning', 'critical']),
  label: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const RadarAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['active', 'inactive', 'error']),
  angle: z.number().min(0).max(360),
});

export const RadarDataSchema = z.object({
  agents: z.array(RadarAgentSchema),
  anomalies: z.array(RadarAnomalySchema),
  scanSpeed: z.number().min(0).max(10), // Rotations per second
  isPaused: z.boolean(),
});

export type RadarAnomaly = z.infer<typeof RadarAnomalySchema>;
export type RadarAgent = z.infer<typeof RadarAgentSchema>;
export type RadarData = z.infer<typeof RadarDataSchema>;
```

---

## 6. Chart Builder Data Models

### 6.1 Chart Configuration

```typescript
export const ChartTypeSchema = z.enum([
  'line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'bubble',
  'radar', 'polar', 'histogram', 'heatmap', 'treemap', 'funnel',
  'gauge', 'waterfall'
]);

export const ColorPaletteSchema = z.enum([
  'default', 'professional', 'vibrant', 'pastel', 'monochrome'
]);

export const ChartDatasetSchema = z.object({
  label: z.string(),
  data: z.array(z.number()),
  backgroundColor: z.string().or(z.array(z.string())).optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
});

export const ChartConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ChartTypeSchema,
  datasets: z.array(ChartDatasetSchema),
  labels: z.array(z.string()),
  options: z.object({
    title: z.object({
      display: z.boolean(),
      text: z.string(),
      position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
    }).optional(),
    legend: z.object({
      display: z.boolean(),
      position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
    }).optional(),
    scales: z.object({
      x: z.object({
        display: z.boolean(),
        title: z.object({
          display: z.boolean(),
          text: z.string(),
        }).optional(),
      }).optional(),
      y: z.object({
        display: z.boolean(),
        title: z.object({
          display: z.boolean(),
          text: z.string(),
        }).optional(),
      }).optional(),
    }).optional(),
    colorPalette: ColorPaletteSchema.optional(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ChartType = z.infer<typeof ChartTypeSchema>;
export type ColorPalette = z.infer<typeof ColorPaletteSchema>;
export type ChartDataset = z.infer<typeof ChartDatasetSchema>;
export type ChartConfiguration = z.infer<typeof ChartConfigurationSchema>;
```

### 6.2 Dashboard View Configuration

```typescript
export const DashboardViewSchema = z.enum(['overview', 'risk-analysis', 'geographic', 'trends']);

export const DashboardConfigurationSchema = z.object({
  activeView: DashboardViewSchema,
  timeRange: z.object({
    preset: z.enum(['1h', '6h', '24h', '7d', '30d', 'custom']),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }),
  refreshInterval: z.number().min(0).optional(), // milliseconds, 0 = manual
  panels: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({
      row: z.number(),
      col: z.number(),
      width: z.number(),
      height: z.number(),
    }),
  })),
});

export type DashboardView = z.infer<typeof DashboardViewSchema>;
export type DashboardConfiguration = z.infer<typeof DashboardConfigurationSchema>;
```

---

## 7. Visualization State Management

### 7.1 Global Visualization State

```typescript
export const VisualizationStateSchema = z.object({
  // Network graph state
  network: z.object({
    data: NetworkDataSchema.optional(),
    layout: NetworkLayoutSchema,
    selectedNodeId: z.string().optional(),
    selectedEdgeId: z.string().optional(),
    zoomLevel: z.number().min(0.1).max(10),
  }).optional(),

  // Map state
  map: z.object({
    viewState: MapViewStateSchema,
    markers: z.array(LocationMarkerSchema),
    clusters: z.array(LocationClusterSchema),
    selectedMarkerId: z.string().optional(),
  }).optional(),

  // Timeline state
  timeline: TimelineStateSchema.optional(),

  // Chart builder state
  chartBuilder: z.object({
    currentStep: z.enum(['type', 'data', 'style', 'preview']),
    configuration: ChartConfigurationSchema.optional(),
    savedConfigurations: z.array(ChartConfigurationSchema),
  }).optional(),

  // Dashboard state
  dashboard: DashboardConfigurationSchema.optional(),

  // Export state
  export: z.object({
    isExporting: z.boolean(),
    format: z.enum(['png', 'svg', 'json']).optional(),
    progress: z.number().min(0).max(100).optional(),
  }).optional(),
});

export type VisualizationState = z.infer<typeof VisualizationStateSchema>;
```

---

## 8. Configuration Schema

### 8.1 Visualization Service Configuration

```typescript
export const VisualizationConfigSchema = z.object({
  // Service configuration
  service: z.object({
    port: z.number().int().min(1024).max(65535),
    name: z.string(),
    version: z.string(),
  }),

  // API configuration
  api: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().int().positive(),
  }),

  // Event bus configuration
  eventBus: z.object({
    enabled: z.boolean(),
    debug: z.boolean().optional(),
  }),

  // Performance configuration
  performance: z.object({
    targetFPS: z.number().int().min(30).max(120).default(60),
    maxNetworkNodes: z.number().int().positive().default(1000),
    maxTimelineEvents: z.number().int().positive().default(10000),
    maxMapMarkers: z.number().int().positive().default(500),
    virtualizationThreshold: z.number().int().positive().default(100),
  }),

  // Feature flags
  features: z.object({
    enableNetworkGraph: z.boolean().default(true),
    enableMaps: z.boolean().default(true),
    enableTimeline: z.boolean().default(true),
    enableRealTimeMonitoring: z.boolean().default(true),
    enableChartBuilder: z.boolean().default(true),
    enableExport: z.boolean().default(true),
  }),

  // UI configuration
  ui: z.object({
    theme: z.enum(['light', 'dark']).default('dark'),
    colorPalette: ColorPaletteSchema.default('default'),
    animations: z.boolean().default(true),
    reducedMotion: z.boolean().default(false),
  }),
});

export type VisualizationConfig = z.infer<typeof VisualizationConfigSchema>;

// Configuration loader with validation
export const loadVisualizationConfig = (): VisualizationConfig => {
  const config = {
    service: {
      port: Number(process.env.REACT_APP_VISUALIZATION_PORT) || 3004,
      name: process.env.REACT_APP_SERVICE_NAME || 'visualization',
      version: process.env.REACT_APP_VERSION || '1.0.0',
    },
    api: {
      baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090',
      timeout: Number(process.env.REACT_APP_API_TIMEOUT) || 30000,
    },
    eventBus: {
      enabled: process.env.REACT_APP_EVENT_BUS_ENABLED === 'true',
      debug: process.env.REACT_APP_EVENT_BUS_DEBUG === 'true',
    },
    performance: {
      targetFPS: Number(process.env.REACT_APP_TARGET_FPS) || 60,
      maxNetworkNodes: Number(process.env.REACT_APP_MAX_NETWORK_NODES) || 1000,
      maxTimelineEvents: Number(process.env.REACT_APP_MAX_TIMELINE_EVENTS) || 10000,
      maxMapMarkers: Number(process.env.REACT_APP_MAX_MAP_MARKERS) || 500,
      virtualizationThreshold: Number(process.env.REACT_APP_VIRTUALIZATION_THRESHOLD) || 100,
    },
    features: {
      enableNetworkGraph: process.env.REACT_APP_ENABLE_NETWORK_GRAPH !== 'false',
      enableMaps: process.env.REACT_APP_ENABLE_MAPS !== 'false',
      enableTimeline: process.env.REACT_APP_ENABLE_TIMELINE !== 'false',
      enableRealTimeMonitoring: process.env.REACT_APP_ENABLE_REAL_TIME !== 'false',
      enableChartBuilder: process.env.REACT_APP_ENABLE_CHART_BUILDER !== 'false',
      enableExport: process.env.REACT_APP_ENABLE_EXPORT !== 'false',
    },
    ui: {
      theme: (process.env.REACT_APP_THEME as 'light' | 'dark') || 'dark',
      colorPalette: (process.env.REACT_APP_COLOR_PALETTE as ColorPalette) || 'default',
      animations: process.env.REACT_APP_ANIMATIONS !== 'false',
      reducedMotion: process.env.REACT_APP_REDUCED_MOTION === 'true',
    },
  };

  // Validate configuration with Zod
  const result = VisualizationConfigSchema.safeParse(config);

  if (!result.success) {
    console.error('Invalid visualization configuration:', result.error.format());
    throw new Error('Configuration validation failed - refusing to start');
  }

  return result.data;
};
```

---

## 9. Export Data Models

### 9.1 Export Metadata

```typescript
export const ExportMetadataSchema = z.object({
  format: z.enum(['png', 'svg', 'json']),
  timestamp: z.string().datetime(),
  investigationId: z.string().optional(),
  visualizationType: z.string(),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).optional(),
  colorMode: z.enum(['color', 'grayscale']).optional(),
});

export type ExportMetadata = z.infer<typeof ExportMetadataSchema>;
```

### 9.2 Export Request

```typescript
export const ExportRequestSchema = z.object({
  visualizationId: z.string(),
  format: z.enum(['png', 'svg', 'json']),
  options: z.object({
    filename: z.string().optional(),
    scale: z.number().min(1).max(4).default(2), // Retina quality
    backgroundColor: z.string().optional(),
    includeMetadata: z.boolean().default(true),
  }).optional(),
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;
```

---

## Data Model Status: ✅ COMPLETE

All data structures defined with:
- TypeScript type definitions
- Zod schema validation
- Helper functions for common operations
- Configuration loading with fail-fast validation

**Next Steps**: Define event bus contracts and API interfaces in the contracts/ directory.
