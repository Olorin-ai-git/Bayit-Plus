/**
 * Autonomous Investigation Components Index
 *
 * Main entry point for all components in the autonomous investigation microservice.
 * Exports the HybridInvestigationApp and all concept-specific components.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

// Main application component
export { default as HybridInvestigationApp } from './HybridInvestigationApp';
export type { HybridInvestigationAppProps } from './HybridInvestigationApp';

// Concept-specific views
export { default as PowerGridView } from './concepts/power-grid/PowerGridView';
export type { PowerGridViewProps } from './concepts/power-grid/PowerGridView';

export { default as CommandCenterView } from './concepts/command-center/CommandCenterView';
export type { CommandCenterViewProps } from './concepts/command-center/CommandCenterView';

export { default as EvidenceTrailView } from './concepts/evidence-trail/EvidenceTrailView';
export type { EvidenceTrailViewProps } from './concepts/evidence-trail/EvidenceTrailView';

export { default as NetworkExplorerView } from './concepts/network-explorer/NetworkExplorerView';
export type { NetworkExplorerViewProps } from './concepts/network-explorer/NetworkExplorerView';

// Shared components (re-export for convenience)
export * from './shared';

// Store exports for external integration
export {
  useActiveConcept,
  useActiveConfiguration,
  useTransitionState,
  useConceptActions,
  useConceptHistory,
  type UIConcept,
} from '../stores/conceptStore';

export {
  useInvestigationStore,
  useGraphStore,
  useUIStore,
} from '../stores';