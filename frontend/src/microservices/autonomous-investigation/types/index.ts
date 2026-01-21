/**
 * Type Exports for Autonomous Investigation Microservice
 *
 * This module provides a centralized export point for all TypeScript types
 * used in the Hybrid Graph Investigation UI.
 *
 * @author Gil Klainert
 * @created 2025-01-21
 */

// Export all types from the new comprehensive type system
export * from './investigation.types';
export * from './ui.types';

// Export legacy types from existing investigation.ts for backward compatibility
// Note: These may need to be migrated to the new type system over time
export * from './investigation';

// ============================================================================
// Re-export commonly used types for convenience
// ============================================================================

export type {
  // Core investigation types
  Investigation,
  Domain,
  Evidence,
  RiskProgression,

  // UI types
  GraphNode,
  GraphEdge,
  TimelineEvent,
  AgentTool,

  // State management
  InvestigationStore,
  PowerGridUIState,
  CommandCenterUIState,
  EvidenceTrailUIState,
  NetworkExplorerUIState,

  // API types
  ApiResponse,
  InvestigationResponse,
  EvidenceResponse,

  // Validation
  ValidationResult
} from './investigation.types';

export type {
  // Graph visualization
  GraphData,
  ForceLayoutData,
  RadialLayoutData,
  HierarchicalLayoutData,

  // System monitoring
  SystemTelemetry,
  ToolPerformanceMetrics,
  QualityMetrics,

  // Event types
  InvestigationWebSocketEvent,
  TimelineEventDisplay,

  // Concept types
  ConceptType
} from './ui.types';

// ============================================================================
// Query key exports for React Query integration
// ============================================================================

export { investigationQueryKeys } from './ui.types';

// ============================================================================
// Validation function exports
// ============================================================================

export { validateInvestigation, validateEvidence } from './investigation.types';