/**
 * Store Types for Hybrid Graph Investigation UI
 *
 * This module defines Zustand store interfaces and state management types
 * for the autonomous investigation microservice.
 *
 * @author Gil Klainert
 * @created 2025-01-21
 */

import type {
  ConceptType,
  PowerGridUIState,
  CommandCenterUIState,
  EvidenceTrailUIState,
  NetworkExplorerUIState
} from './ui.types';

// ============================================================================
// Base Store Types
// ============================================================================

/**
 * Base store state interface with common properties
 */
export interface BaseStoreState {
  /** Loading states */
  loading: boolean;
  error: string | null;

  /** Last update tracking */
  last_updated: string | null;

  /** Optimistic updates */
  pending_updates: Set<string>;
}

/**
 * Store action result type
 */
export type StoreActionResult<T = void> = Promise<{ success: boolean; data?: T; error?: string }>;

// ============================================================================
// Investigation Store Interface
// ============================================================================

/**
 * Main Zustand store state interface for investigations
 */
export interface InvestigationStore extends BaseStoreState {
  /** Current state */
  current_investigation_id: string | null;
  current_concept: ConceptType;

  /** UI states for each concept */
  ui_states: {
    power_grid: PowerGridUIState;
    command_center: CommandCenterUIState;
    evidence_trail: EvidenceTrailUIState;
    network_explorer: NetworkExplorerUIState;
  };

  /** Investigation data cache */
  investigations: Record<string, any>; // Investigation objects indexed by ID
  domains: Record<string, any[]>; // Domain arrays indexed by investigation ID
  evidence: Record<string, any[]>; // Evidence arrays indexed by investigation ID
  timeline: Record<string, any[]>; // Timeline events indexed by investigation ID

  /** Real-time connection state */
  websocket_connected: boolean;
  websocket_reconnect_attempts: number;

  /** Actions */
  setCurrentInvestigation: (id: string) => StoreActionResult;
  setCurrentConcept: (concept: ConceptType) => void;
  updateUIState: <T extends ConceptType>(
    concept: T,
    updates: Partial<InvestigationStore['ui_states'][T]>
  ) => void;
  resetUIState: (concept?: ConceptType) => void;

  /** Data management actions */
  loadInvestigation: (id: string) => StoreActionResult<any>;
  updateInvestigation: (id: string, updates: Partial<any>) => StoreActionResult;
  loadDomains: (investigationId: string) => StoreActionResult<any[]>;
  loadEvidence: (investigationId: string) => StoreActionResult<any[]>;
  loadTimeline: (investigationId: string) => StoreActionResult<any[]>;

  /** Real-time actions */
  connectWebSocket: (investigationId: string) => void;
  disconnectWebSocket: () => void;
  handleWebSocketMessage: (message: any) => void;

  /** Cache management */
  clearCache: (investigationId?: string) => void;
  invalidateCache: (investigationId: string, dataType?: 'domains' | 'evidence' | 'timeline') => void;

  /** Error handling */
  setError: (error: string) => void;
  clearError: () => void;
}

// ============================================================================
// UI State Store Slices
// ============================================================================

/**
 * PowerGrid store slice interface
 */
export interface PowerGridStoreSlice {
  powerGrid: PowerGridUIState;
  setPowerGridLayout: (layout: PowerGridUIState['graph_layout']) => void;
  setPowerGridZoom: (zoom: number) => void;
  setPowerGridCenter: (position: { x: number; y: number }) => void;
  selectPowerGridNodes: (nodeIds: string[]) => void;
  updatePowerGridFilters: (filters: Partial<Pick<PowerGridUIState, 'domain_filter' | 'risk_threshold'>>) => void;
  resetPowerGridState: () => void;
}

/**
 * CommandCenter store slice interface
 */
export interface CommandCenterStoreSlice {
  commandCenter: CommandCenterUIState;
  setCommandCenterViewMode: (mode: CommandCenterUIState['tool_view_mode']) => void;
  updateCommandCenterFilters: (filters: Partial<Pick<CommandCenterUIState, 'tool_filter' | 'health_filter'>>) => void;
  setCommandCenterMetricsTimespan: (timespan: CommandCenterUIState['metrics_timespan']) => void;
  toggleCommandCenterPanel: (panelId: string) => void;
  resetCommandCenterState: () => void;
}

/**
 * EvidenceTrail store slice interface
 */
export interface EvidenceTrailStoreSlice {
  evidenceTrail: EvidenceTrailUIState;
  setEvidenceTrailZoom: (zoom: EvidenceTrailUIState['timeline_zoom']) => void;
  setEvidenceTrailPosition: (position: string) => void;
  updateEvidenceTrailFilters: (filters: Partial<Pick<EvidenceTrailUIState, 'evidence_type_filter' | 'strength_threshold'>>) => void;
  selectEvidence: (evidenceIds: string[]) => void;
  expandEvidence: (evidenceId: string, expanded: boolean) => void;
  resetEvidenceTrailState: () => void;
}

/**
 * NetworkExplorer store slice interface
 */
export interface NetworkExplorerStoreSlice {
  networkExplorer: NetworkExplorerUIState;
  setNetworkExplorerLayout: (layout: NetworkExplorerUIState['network_layout']) => void;
  setNetworkExplorerMapView: (center: { lat: number; lng: number }, zoom: number) => void;
  updateNetworkExplorerFilters: (filters: Partial<Pick<NetworkExplorerUIState, 'entity_types' | 'relationship_depth'>>) => void;
  toggleNetworkExplorerAnalysis: (type: 'path_analysis_enabled' | 'anomaly_detection_enabled') => void;
  resetNetworkExplorerState: () => void;
}

// ============================================================================
// Combined Store Interface
// ============================================================================

/**
 * Combined store interface with all slices
 */
export interface CombinedInvestigationStore extends
  InvestigationStore,
  PowerGridStoreSlice,
  CommandCenterStoreSlice,
  EvidenceTrailStoreSlice,
  NetworkExplorerStoreSlice {}

// ============================================================================
// Store Middleware Types
// ============================================================================

/**
 * Persistence middleware configuration
 */
export interface PersistenceConfig {
  name: string;
  version: number;
  migrate?: (persistedState: any, version: number) => any;
  partialize?: (state: InvestigationStore) => Partial<InvestigationStore>;
  whitelist?: (keyof InvestigationStore)[];
  blacklist?: (keyof InvestigationStore)[];
}

/**
 * DevTools middleware configuration
 */
export interface DevToolsConfig {
  name: string;
  enabled: boolean;
  actionSanitizer?: (action: any) => any;
  stateSanitizer?: (state: any) => any;
}

/**
 * Store subscription callback type
 */
export type StoreSubscriptionCallback<T = InvestigationStore> = (
  state: T,
  previousState: T
) => void;

// ============================================================================
// Store Selectors
// ============================================================================

/**
 * Common store selectors
 */
export interface StoreSelectors {
  /** Investigation selectors */
  getCurrentInvestigation: (state: InvestigationStore) => any | null;
  getCurrentConcept: (state: InvestigationStore) => ConceptType;
  getUIStateForConcept: <T extends ConceptType>(
    concept: T
  ) => (state: InvestigationStore) => InvestigationStore['ui_states'][T];

  /** Data selectors */
  getDomainsByInvestigation: (investigationId: string) => (state: InvestigationStore) => any[];
  getEvidenceByInvestigation: (investigationId: string) => (state: InvestigationStore) => any[];
  getTimelineByInvestigation: (investigationId: string) => (state: InvestigationStore) => any[];

  /** State selectors */
  isLoading: (state: InvestigationStore) => boolean;
  hasError: (state: InvestigationStore) => boolean;
  isWebSocketConnected: (state: InvestigationStore) => boolean;
}

// ============================================================================
// Store Action Types
// ============================================================================

/**
 * Store action type definitions
 */
export type StoreActions =
  | { type: 'SET_CURRENT_INVESTIGATION'; payload: string }
  | { type: 'SET_CURRENT_CONCEPT'; payload: ConceptType }
  | { type: 'UPDATE_UI_STATE'; payload: { concept: ConceptType; updates: any } }
  | { type: 'RESET_UI_STATE'; payload: ConceptType | undefined }
  | { type: 'LOAD_INVESTIGATION_START'; payload: string }
  | { type: 'LOAD_INVESTIGATION_SUCCESS'; payload: { id: string; data: any } }
  | { type: 'LOAD_INVESTIGATION_ERROR'; payload: { id: string; error: string } }
  | { type: 'WEBSOCKET_CONNECT'; payload: string }
  | { type: 'WEBSOCKET_DISCONNECT' }
  | { type: 'WEBSOCKET_MESSAGE'; payload: any }
  | { type: 'CLEAR_CACHE'; payload: string | undefined }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

// ============================================================================
// Store Configuration
// ============================================================================

/**
 * Store configuration options
 */
export interface StoreConfig {
  /** Enable persistence */
  persistence?: PersistenceConfig;

  /** Enable DevTools */
  devtools?: DevToolsConfig;

  /** Initial state overrides */
  initialState?: Partial<InvestigationStore>;

  /** WebSocket configuration */
  websocket?: {
    url: string;
    reconnect_interval_ms: number;
    max_reconnect_attempts: number;
  };

  /** Cache configuration */
  cache?: {
    max_investigations: number;
    ttl_ms: number;
    auto_cleanup: boolean;
  };
}