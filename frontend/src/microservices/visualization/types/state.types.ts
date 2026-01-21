/**
 * Visualization State Management Interfaces
 *
 * Core state types for visualization microservice.
 * Focused on filter state, selection state, and dashboard configuration.
 */

// Filter types
export interface VisualizationFilters {
  timeRange?: {
    start: Date;
    end: Date;
  };
  riskLevels?: Array<'low' | 'medium' | 'high' | 'critical'>;
  entityTypes?: Array<'account' | 'device' | 'location' | 'transaction' | 'person'>;
  severities?: Array<'low' | 'medium' | 'high' | 'critical'>;
  eventTypes?: Array<'info' | 'warning' | 'critical' | 'success'>;
  searchQuery?: string;
  agentIds?: string[];
}

// Selection types
export interface NodeSelection {
  nodeId: string;
  nodeType: 'account' | 'device' | 'location' | 'transaction' | 'person';
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface EdgeSelection {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  timestamp: Date;
}

export interface LocationSelection {
  locationId: string;
  locationType: 'customer' | 'business' | 'device' | 'transaction' | 'risk';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
}

export interface TimelineEventSelection {
  eventId: string;
  expanded: boolean;
  timestamp: Date;
}

export interface VisualizationSelection {
  nodes: NodeSelection[];
  edges: EdgeSelection[];
  locations: LocationSelection[];
  timelineEvents: TimelineEventSelection[];
}

// Zoom and pan state
export interface MapViewState {
  center: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  timestamp: Date;
}

export interface GraphViewState {
  zoom: number;
  panX: number;
  panY: number;
  rotation?: number;
  timestamp: Date;
}

export interface TimelineViewState {
  scrollPosition: number;
  visibleRange?: {
    start: Date;
    end: Date;
  };
  zoomLevel: number;
  timestamp: Date;
}

// Dashboard view types
export type DashboardView = 'overview' | 'risk-analysis' | 'geographic' | 'trends';

export interface DashboardConfiguration {
  currentView: DashboardView;
  layout: {
    columns: number;
    rows: number;
    gaps: number;
  };
  widgets: DashboardWidget[];
  autoRefresh: boolean;
  refreshInterval?: number;
}

export interface DashboardWidget {
  id: string;
  type: 'network-graph' | 'risk-gauge' | 'map' | 'timeline' | 'chart' | 'metrics';
  position: {
    row: number;
    column: number;
    rowSpan: number;
    columnSpan: number;
  };
  config: Record<string, unknown>;
  visible: boolean;
}

// Visualization state container
export interface VisualizationState {
  investigationId: string;
  filters: VisualizationFilters;
  selection: VisualizationSelection;
  mapView: MapViewState | null;
  graphView: GraphViewState | null;
  timelineView: TimelineViewState | null;
  dashboard: DashboardConfiguration;
  loading: boolean;
  error: string | null;
  lastUpdated: Date;
}

// State update actions
export type VisualizationStateAction =
  | { type: 'SET_FILTERS'; payload: Partial<VisualizationFilters> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SELECT_NODE'; payload: NodeSelection }
  | { type: 'DESELECT_NODE'; payload: string }
  | { type: 'SELECT_EDGE'; payload: EdgeSelection }
  | { type: 'DESELECT_EDGE'; payload: string }
  | { type: 'SELECT_LOCATION'; payload: LocationSelection }
  | { type: 'DESELECT_LOCATION'; payload: string }
  | { type: 'EXPAND_TIMELINE_EVENT'; payload: string }
  | { type: 'COLLAPSE_TIMELINE_EVENT'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'UPDATE_MAP_VIEW'; payload: MapViewState }
  | { type: 'UPDATE_GRAPH_VIEW'; payload: GraphViewState }
  | { type: 'UPDATE_TIMELINE_VIEW'; payload: TimelineViewState }
  | { type: 'CHANGE_DASHBOARD_VIEW'; payload: DashboardView }
  | { type: 'UPDATE_DASHBOARD_CONFIG'; payload: Partial<DashboardConfiguration> }
  | { type: 'ADD_WIDGET'; payload: DashboardWidget }
  | { type: 'REMOVE_WIDGET'; payload: string }
  | { type: 'UPDATE_WIDGET'; payload: { id: string; updates: Partial<DashboardWidget> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_STATE' };

// Initial state factory
export const createInitialVisualizationState = (investigationId: string): VisualizationState => ({
  investigationId,
  filters: {},
  selection: {
    nodes: [],
    edges: [],
    locations: [],
    timelineEvents: []
  },
  mapView: null,
  graphView: null,
  timelineView: null,
  dashboard: {
    currentView: 'overview',
    layout: {
      columns: 12,
      rows: 12,
      gaps: 16
    },
    widgets: [],
    autoRefresh: false
  },
  loading: false,
  error: null,
  lastUpdated: new Date()
});
