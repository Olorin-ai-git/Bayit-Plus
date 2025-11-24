/**
<<<<<<< HEAD
 * Shared Components for Olorin Microservices
 * Common UI components used across all microservices
 */

import React from 'react';

// Placeholder components - will be expanded in next phases
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant,
  size,
  disabled,
  loading,
  onClick,
  className,
  ...props
}) => {
  return React.createElement('button', {
    ...props,
    variant,
    size,
    disabled,
    loading: loading ? 'true' : undefined,
    onClick,
    className
  }, children);
};

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className, ...props }) => {
  return React.createElement(
    'div',
    { ...props, className },
    title && React.createElement('h3', null, title),
    children
  );
};

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ size = 'md', message }) => {
  return React.createElement(
    'div',
    null,
    React.createElement('div', null, 'Loading...'),
    message && React.createElement('p', null, message)
  );
};

export default {
  Button,
  Card,
  Loading
};
=======
 * Shared Components Index
 * Feature: 004-new-olorin-frontend
 *
 * Central export for all shared Investigation Wizard components.
 * These components use the Olorin purple corporate color palette.
 */

export { WizardButton } from './WizardButton';
export type { WizardButtonProps, WizardButtonVariant, WizardButtonSize } from './WizardButton';
export { ConfirmationModal } from './ConfirmationModal';
export type { ConfirmationModalProps } from './ConfirmationModal';

export { WizardPanel } from './WizardPanel';
export type { WizardPanelProps } from './WizardPanel';

export { WizardProgressIndicator } from './WizardProgressIndicator';
export type { WizardProgressIndicatorProps } from './WizardProgressIndicator';

export { Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbItem } from './Breadcrumbs';

export { NotificationToast } from './NotificationToast';
export type { NotificationToastProps, NotificationType } from './NotificationToast';

export { EntitySelector } from './EntitySelector';
export type { EntitySelectorProps } from './EntitySelector';

export { RiskGauge } from '@microservices/visualization';
export type { RiskGaugeProps } from '@microservices/visualization';

export { FormField } from './FormField';
export type { FormFieldProps, FormFieldType } from './FormField';

export { LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps, LoadingSpinnerSize } from './LoadingSpinner';

export { ErrorBoundary } from './ErrorBoundary';
export { ServiceErrorBoundary } from './ServiceErrorBoundary';

// Settings Page Components (Feature: 004-new-olorin-frontend)
export { TemplateSelector } from './TemplateSelector';
export type { TemplateSelectorProps, TemplateOption } from './TemplateSelector';

export { EntityInput } from './EntityInput';
export type { EntityInputProps } from './EntityInput';

export { EntityList } from './EntityList';
export type { EntityListProps } from './EntityList';

export { TimeRangePicker } from './TimeRangePicker';
export type { TimeRangePickerProps, TimeRange } from './TimeRangePicker';

export { InvestigationModeSwitch } from './InvestigationModeSwitch';
export type { InvestigationModeSwitchProps, InvestigationMode } from './InvestigationModeSwitch';

export { ToolMatrix, ToolCategory } from './ToolMatrix';
export type { ToolMatrixProps, InvestigationTool } from './ToolMatrix';

// Olorin Enterprise Enhanced Components (Feature: 004-new-olorin-frontend)
export { EnhancedToolCard } from './EnhancedToolCard';
export type { EnhancedToolCardProps } from './EnhancedToolCard';

export { ToolCategorySection } from './ToolCategorySection';
export type { ToolCategorySectionProps } from './ToolCategorySection';

export { AgentToolsSummary } from './AgentToolsSummary';
export type { AgentToolsSummaryProps } from './AgentToolsSummary';

export { BulkToolActions } from './BulkToolActions';
export type { BulkToolActionsProps } from './BulkToolActions';

export { AgentSelectionPanel } from './AgentSelectionPanel';
export type { AgentSelectionPanelProps } from './AgentSelectionPanel';

export { ValidationSidebar } from './ValidationSidebar';
export type { ValidationSidebarProps, ValidationItem } from './ValidationSidebar';

// Progress Page Components (Feature: 004-new-olorin-frontend)
export { LogStream } from './LogStream';
export type { LogStreamProps, LogEntry } from './LogStream';

export { PhaseProgress } from './PhaseProgress';
export type { PhaseProgressProps, Phase } from './PhaseProgress';

export { ToolExecutionCard } from './ToolExecutionCard';
export type { ToolExecutionCardProps, ToolExecution } from './ToolExecutionCard';

export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps, ProgressBarVariant } from './ProgressBar';

export { InvestigationStatus } from './InvestigationStatus';
export type { InvestigationStatusProps } from './InvestigationStatus';

// Results Page Components (Feature: 004-new-olorin-frontend)
export { ResultCard } from './ResultCard';
export type { ResultCardProps, Result } from './ResultCard';

export { EntityCard } from './EntityCard';
export type { EntityCardProps } from './EntityCard';

export { NetworkGraph } from './NetworkGraph';
export type { NetworkGraphProps, NetworkNode, NetworkEdge } from './NetworkGraph';

export { Timeline } from './Timeline';
export type { TimelineProps, TimelineEvent } from './Timeline';

export { ExportMenu } from './ExportMenu';
export type { ExportMenuProps, ExportFormat } from './ExportMenu';

export { FindingsList } from './FindingsList';
export type { FindingsListProps, Finding } from './FindingsList';

export { RecommendationsList } from './RecommendationsList';
export type { RecommendationsListProps, Recommendation } from './RecommendationsList';

export { InvestigationSummary } from './InvestigationSummary';
export type { InvestigationSummaryProps } from './InvestigationSummary';

// Multi-Entity View Component (Feature: 004-new-olorin-frontend)
export { MultiEntityView } from './MultiEntityView';
export type {
  MultiEntityViewProps,
  EntityResult,
  CorrelationResult
} from './MultiEntityView';

// Radar Visualization Components (Feature: 004-new-olorin-frontend)
export { RadarVisualization } from './RadarVisualization';
export type { RadarVisualizationProps } from './RadarVisualization';

export { RadarNeedle } from './RadarNeedle';
export type { RadarNeedleProps } from './RadarNeedle';

export { RadarAgentRings } from './RadarAgentRings';
export type { RadarAgentRingsProps } from './RadarAgentRings';

export { RadarAnomalies, ScanningRay } from './RadarAnomalies';
export type { RadarAnomaliesProps, ScanningRayProps } from './RadarAnomalies';

export { RadarHUDHeader } from './RadarHUDHeader';
export type { RadarHUDHeaderProps } from './RadarHUDHeader';

export { RadarDetectionLog } from './RadarDetectionLog';
export type { RadarDetectionLogProps } from './RadarDetectionLog';

export { RadarToolsStatus } from './RadarToolsStatus';
export type { RadarToolsStatusProps } from './RadarToolsStatus';

// Agent Risk Gauge Components (Copied from Olorin - Feature: 012-agents-risk-gauges)
export { HyperGauge } from '@microservices/visualization';
export type { HyperGaugeProps } from '@microservices/visualization';

export { LuxGaugesDashboard } from './LuxGaugesDashboard';
export type { LuxGaugesDashboardProps } from './LuxGaugesDashboard';

export { RiskGaugeCard } from '@microservices/visualization';
export type { RiskGaugeCardProps } from '@microservices/visualization';

export { RiskAssessmentGaugeCard } from './RiskAssessmentGaugeCard';
export type { RiskAssessmentGaugeCardProps } from './RiskAssessmentGaugeCard';

export { ToolsGaugeCard } from './ToolsGaugeCard';
export type { ToolsGaugeCardProps } from './ToolsGaugeCard';

export { AgentGaugeColumn } from './AgentGaugeColumn';
export type { AgentGaugeColumnProps } from './AgentGaugeColumn';

// EKG Activity Monitor Components (Copied from Olorin - Exact Style Preserved)
export { EKGMonitor } from './EKGMonitor';
export type { EKGMonitorProps } from './EKGMonitor';

export { EnhancedEKGMonitor } from './EnhancedEKGMonitor';
export type { EnhancedEKGMonitorProps } from './EnhancedEKGMonitor';

export { TPSSparkline } from './TPSSparkline';
export type { TPSSparklineProps } from './TPSSparkline';

// Collapsible Panel Component (Adapted from Olorin)
export { CollapsiblePanel } from './CollapsiblePanel';
export type { CollapsiblePanelProps } from './CollapsiblePanel';

// Table Component (Phase 3 - Refactoring)
export { Table } from './Table';
export { useTableState } from './Table';
export type {
  Column,
  ColumnAlignment,
  SortDirection,
  TableConfig,
  TableSort,
  TableSelection,
  TablePagination,
  TableProps
} from './Table';
>>>>>>> 001-modify-analyzer-method
