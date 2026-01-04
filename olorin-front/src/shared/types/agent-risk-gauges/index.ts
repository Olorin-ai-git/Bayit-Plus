/**
 * Agent Risk Gauges - Public API
 * Main entry point with backward-compatible exports
 * Feature: 012-agents-risk-gauges
 *
 * REFACTORED FROM: AgentRiskGauges.ts (714 lines, 357% over 200-line limit)
 * NEW ARCHITECTURE: Modular structure with focused type files
 *
 * MODULES:
 * - ekg-monitor-types.ts (139 lines) - EKG Monitor types
 * - agent-types.ts (77 lines) - Agent Risk Gauge types
 * - risk-config-types.ts (71 lines) - Risk configuration types
 * - config-schema.ts (114 lines) - Configuration schema & validation
 * - ice-event-types.ts (51 lines) - ICE event types
 * - component-props.ts (158 lines) - Component props interfaces
 * - validation-utils.ts (66 lines) - Validation utilities
 * - defaults.ts (71 lines) - Default values & constants
 */

// EKG Monitor Types
export type {
  InvestigationStatus,
  EnhancedEKGMonitorState,
  EnhancedEKGMonitorProps,
  ToolExecutionTimestamp,
  ToolExecutionMetrics,
} from './ekg-monitor-types';

// Agent Types
export type {
  AgentType,
  AgentStatus,
  AgentColorScheme,
  AgentRiskGaugeState,
} from './agent-types';

// Risk Configuration Types
export type {
  RiskThresholds,
  RiskColors,
  RiskConfiguration,
  RiskZone,
} from './risk-config-types';

// Configuration Schema & Validation
export {
  validateRiskConfig,
  DEFAULT_RISK_CONFIG,
  loadConfig,
  saveConfig,
  migrateConfig,
} from './config-schema';

// ICE Event Types
export type {
  ToolExecutionEvent,
  AgentResultsEvent,
  ProgressUpdateEvent,
} from './ice-event-types';

// Component Props
export type {
  TPSSparklineProps,
  EKGMonitorProps,
  HyperGaugeProps,
  LuxGaugesDashboardProps,
  AgentRiskGaugesSectionProps,
  GaugeConfigPanelProps,
} from './component-props';

// Validation Utilities
export {
  isValidInvestigationStatus,
  isValidAgentStatus,
  isValidAgentType,
  isValidRiskScore,
  isValidToolsCount,
  isValidHexColor,
  isValidTimestamp,
} from './validation-utils';

// Default Values
export {
  DEFAULT_EKG_STATE,
  AGENT_COLORS,
  DEFAULT_AGENT_STATE,
  DEFAULT_METRICS,
} from './defaults';
