/**
 * Store Index
 * Exports all Zustand stores and related utilities
 */

// Investigation store
export {
  useInvestigationStore,
  useCurrentInvestigation,
  useCurrentPhase,
  useSelectedInvestigationId,
  useInvestigationFilters,
  useInvestigationActions,
} from './investigationStore';

// Graph store
export {
  useGraphStore,
  useGraphData,
  useGraphSelection,
  useGraphVisualState,
  useGraphFilters,
  useGraphUI,
  useGraphActions,
} from './graphStore';

// UI store
export {
  useUIStore,
  usePanelStates,
  useModalStates,
  useLayoutState,
  useNotifications,
  useLoadingStates,
  useSidebarPanel,
  useEvidencePanel,
  useDomainPanel,
  useTimelinePanel,
  useDetailsPanel,
  useCreateInvestigationModal,
  useInvestigationSettingsModal,
  useExportModal,
  useHelpModal,
  useUIActions,
} from './uiStore';

// Concept store
export {
  useConceptStore,
  useActiveConcept,
  useActiveConfiguration,
  useTransitionState,
  useConceptHistory,
  usePowerGridConfig,
  useCommandCenterConfig,
  useEvidenceTrailConfig,
  useNetworkExplorerConfig,
  useConceptActions,
  useIsConceptActive,
  useConceptPreferences,
  useConceptSettings,
  type UIConcept,
} from './conceptStore';

// Store reset utilities
export const resetAllStores = () => {
  // Reset investigation store
  useInvestigationStore.getState().setCurrentInvestigation(null);
  useInvestigationStore.getState().setSelectedInvestigationId(null);
  useInvestigationStore.getState().clearInvestigationFilters();

  // Reset graph store
  useGraphStore.getState().setGraphData([], []);
  useGraphStore.getState().clearSelection();
  useGraphStore.getState().clearFilters();

  // Reset UI store
  useUIStore.getState().closeAllPanels();
  useUIStore.getState().closeAllModals();
  useUIStore.getState().clearNotifications();
};

// Store persistence utilities
export const clearPersistedStores = () => {
  localStorage.removeItem('investigation-store');
  localStorage.removeItem('ui-store');
  localStorage.removeItem('concept-store');
};