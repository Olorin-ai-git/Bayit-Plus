/**
 * Shared Components Utility
 * Feature: 022-olorin-webportal-dark
 *
 * Centralized imports for shared components from the main olorin-front application.
 * This provides a single source of truth for accessing reusable UI components across
 * the marketing portal while maintaining clean import paths and consistent naming.
 *
 * NOTE: This file assumes a shared component library or monorepo structure where
 * olorin-front shared components are accessible. If using separate repositories,
 * these components should be extracted to a shared npm package.
 */

// ============================================================================
// CORE UI COMPONENTS
// ============================================================================

/**
 * LoadingSpinner - Generic loading indicator
 * Usage: <LoadingSpinner size="sm" | "md" | "lg" />
 */
export { default as LoadingSpinner } from '@olorin/shared/components/LoadingSpinner';

/**
 * ErrorBoundary - React error boundary for catching component errors
 * Usage: <ErrorBoundary><YourComponent /></ErrorBoundary>
 */
export { default as ErrorBoundary } from '@olorin/shared/components/ErrorBoundary';

/**
 * Modal - Glassmorphic modal dialog component
 * Usage: <Modal isOpen={true} onClose={handleClose}>Content</Modal>
 */
export { default as Modal } from '@olorin/shared/components/Modal';

/**
 * CollapsiblePanel - Expandable/collapsible content panel
 * Usage: <CollapsiblePanel title="Section Title">Content</CollapsiblePanel>
 */
export { default as CollapsiblePanel } from '@olorin/shared/components/CollapsiblePanel';

// ============================================================================
// WIZARD BRANDING COMPONENTS
// ============================================================================

/**
 * WizardButton - Branded primary CTA button with wizard theme
 * Usage: <WizardButton onClick={handleClick}>Action</WizardButton>
 */
export { default as WizardButton } from '@olorin/shared/components/WizardButton';

/**
 * WizardStateDisplay - Shows current wizard/investigation state
 * Usage: <WizardStateDisplay state="IN_PROGRESS" />
 */
export { default as WizardStateDisplay } from '@olorin/shared/components/WizardStateDisplay';

// ============================================================================
// DATA VISUALIZATION COMPONENTS
// ============================================================================

/**
 * RiskGauge - Circular risk score gauge (0-100)
 * Usage: <RiskGauge score={75} size="lg" />
 */
export { default as RiskGauge } from '@olorin/shared/components/RiskGauge';

/**
 * RiskGaugeCard - Risk gauge with card wrapper and title
 * Usage: <RiskGaugeCard title="Risk Score" score={75} />
 */
export { default as RiskGaugeCard } from '@olorin/shared/components/RiskGaugeCard';

/**
 * CircularProgressGauge - Generic circular progress indicator
 * Usage: <CircularProgressGauge progress={60} />
 */
export { default as CircularProgressGauge } from '@olorin/shared/components/CircularProgressGauge';

/**
 * NetworkGraph - Interactive network visualization (D3/vis.js)
 * Usage: <NetworkGraph nodes={nodes} edges={edges} />
 */
export { default as NetworkGraph } from '@olorin/shared/components/NetworkGraph';

/**
 * TPSSparkline - Transactions per second sparkline chart
 * Usage: <TPSSparkline data={tpsData} />
 */
export { default as TPSSparkline } from '@olorin/shared/components/TPSSparkline';

// ============================================================================
// STATUS & FEEDBACK COMPONENTS
// ============================================================================

/**
 * StatusBadge - Colored badge for status display
 * Usage: <StatusBadge status="success" | "warning" | "error" />
 */
export { default as StatusBadge } from '@olorin/shared/components/StatusBadge';

/**
 * ErrorAlert - Error message alert banner
 * Usage: <ErrorAlert message="Error occurred" onDismiss={handleDismiss} />
 */
export { default as ErrorAlert } from '@olorin/shared/components/ErrorAlert';

/**
 * PhaseProgress - Multi-phase progress indicator
 * Usage: <PhaseProgress currentPhase={2} totalPhases={5} />
 */
export { default as PhaseProgress } from '@olorin/shared/components/PhaseProgress';

/**
 * ProgressSkeleton - Loading skeleton UI
 * Usage: <ProgressSkeleton lines={3} />
 */
export { default as ProgressSkeleton } from '@olorin/shared/components/ProgressSkeleton';

// ============================================================================
// DATA INPUT COMPONENTS
// ============================================================================

/**
 * EntityInput - Input for investigation entities (email, IP, etc.)
 * Usage: <EntityInput onAdd={handleAddEntity} />
 */
export { default as EntityInput } from '@olorin/shared/components/EntityInput';

/**
 * EntitySelector - Multi-entity type selector
 * Usage: <EntitySelector selected={entities} onChange={handleChange} />
 */
export { default as EntitySelector } from '@olorin/shared/components/EntitySelector';

/**
 * TimeRangePicker - Date/time range picker component
 * Usage: <TimeRangePicker onChange={handleRangeChange} />
 */
export { default as TimeRangePicker } from '@olorin/shared/components/TimeRangePicker';

// ============================================================================
// TABLE COMPONENTS
// ============================================================================

/**
 * Table - Main table wrapper component
 * Usage: <Table data={data} columns={columns} />
 */
export { default as Table } from '@olorin/shared/components/Table/Table';

/**
 * TableHeader - Table header component
 * Usage: <TableHeader columns={columns} onSort={handleSort} />
 */
export { default as TableHeader } from '@olorin/shared/components/Table/TableHeader';

/**
 * TableBody - Table body component
 * Usage: <TableBody rows={rows} />
 */
export { default as TableBody } from '@olorin/shared/components/Table/TableBody';

/**
 * TablePagination - Table pagination controls
 * Usage: <TablePagination page={1} total={100} onChange={handlePageChange} />
 */
export { default as TablePagination } from '@olorin/shared/components/Table/TablePagination';

// ============================================================================
// SPECIALIZED INVESTIGATION COMPONENTS
// ============================================================================

/**
 * Timeline - Event timeline visualization
 * Usage: <Timeline events={events} />
 */
export { default as Timeline } from '@olorin/shared/components/Timeline';

/**
 * ToolExecutionCard - Shows tool execution status
 * Usage: <ToolExecutionCard tool={toolData} />
 */
export { default as ToolExecutionCard } from '@olorin/shared/components/ToolExecutionCard';

/**
 * RecommendationsList - Display AI-generated recommendations
 * Usage: <RecommendationsList recommendations={recommendations} />
 */
export { default as RecommendationsList } from '@olorin/shared/components/RecommendationsList';
