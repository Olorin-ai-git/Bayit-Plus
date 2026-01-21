/**
 * Hooks Index
 * Exports all React hooks for the autonomous investigation microservice
 */

// Legacy hooks
export * from './useExportReporting';
export * from './useInvestigationWorkflow';

// Phase 3 infrastructure hooks
export * from './useInvestigationQueries';
export * from './useWebSocket';
export * from './useLoadingStates';

// Re-export key hook functions for convenience
export {
  // React Query hooks
  useInvestigations,
  useInvestigation,
  useInvestigationDomains,
  useInvestigationEvidence,
  useInvestigationGraph,
  useCreateInvestigation,
  useUpdateInvestigationStatus,
  investigationKeys,
} from './useInvestigationQueries';

export {
  // WebSocket hooks
  useWebSocket,
  useWebSocketEvent,
  useInvestigationSubscription,
  useInvestigationUpdates,
  useSystemUpdates,
  useWebSocketIntegration,
} from './useWebSocket';

export {
  // Loading state hooks
  useLoadingState,
  useGlobalLoading,
  useCoordinatedLoading,
  useInvestigationLoading,
  useGraphLoading,
  useEvidenceLoading,
  useDomainLoading,
  useAsyncLoading,
  useParallelLoading,
  createLoadingKey,
  LOADING_KEYS,
} from './useLoadingStates';