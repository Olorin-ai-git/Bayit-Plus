/**
 * Shared Components Index
 *
 * Centralized exports for all shared components used across
 * the Hybrid Graph Investigation UI concepts.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

// Core visualization components
export { default as GraphVisualization } from './GraphVisualization';
export type { GraphVisualizationProps, GraphMode, RenderEngine } from './GraphVisualization';

export { default as Timeline } from './Timeline';
export type { TimelineProps, TimelineEvent } from './Timeline';

export { default as EvidencePanel } from './EvidencePanel';
export type { EvidencePanelProps, Evidence } from './EvidencePanel';

export { default as DomainCard } from './DomainCard';
export type { DomainCardProps, Domain } from './DomainCard';

// UI components
export { default as LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

export { default as ErrorAlert } from './ErrorAlert';
export type { ErrorAlertProps } from './ErrorAlert';

export {
  default as StatusBadge,
  SuccessBadge,
  WarningBadge,
  ErrorBadge,
  InfoBadge,
  ProcessingBadge,
  InvestigationStatusBadge,
  RiskLevelBadge,
} from './StatusBadge';
export type { StatusBadgeProps } from './StatusBadge';

// Layout and navigation components
export { default as ConceptSwitcher } from './ConceptSwitcher';
export type { ConceptSwitcherProps } from './ConceptSwitcher';

export { default as ResponsiveLayout } from './ResponsiveLayout';
export type { ResponsiveLayoutProps, LayoutPanel } from './ResponsiveLayout';

// Re-export commonly used types for convenience
export type {
  GraphVisualizationProps as GraphProps,
  TimelineEvent as Event,
  Evidence as EvidenceItem,
  Domain as DomainItem,
} from './GraphVisualization';