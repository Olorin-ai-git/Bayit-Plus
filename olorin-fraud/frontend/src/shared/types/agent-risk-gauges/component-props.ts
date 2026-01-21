/**
 * Component Props Interfaces
 * Type definitions for all component props
 * Feature: 012-agents-risk-gauges
 */

import type { AgentRiskGaugeState, AgentColorScheme } from './agent-types';
import type { RiskThresholds, RiskZone, RiskConfiguration } from './risk-config-types';

/**
 * Props for TPSSparkline component
 */
export interface TPSSparklineProps {
  /** Tools/sec history data (last 30 samples) */
  data: number[];

  /** Sparkline width in pixels */
  width?: number;

  /** Sparkline height in pixels */
  height?: number;

  /** Line color (hex) */
  lineColor?: string;

  /** Enable gradient fill under line */
  fill?: boolean;
}

/**
 * Props for EKGMonitor component
 */
export interface EKGMonitorProps {
  /** Heart rate in beats per minute (40-200) */
  bpm: number;

  /** Canvas width in pixels */
  width?: number;

  /** Canvas height in pixels */
  height?: number;

  /** Waveform line color (hex) */
  lineColor?: string;

  /** Grid line color (hex) */
  gridColor?: string;
}

/**
 * Props for HyperGauge component
 */
export interface HyperGaugeProps {
  /** Gauge diameter in pixels */
  size: number;

  /** Current value (0-max) */
  value: number;

  /** Maximum value (100 for risk, 40 for tools) */
  max: number;

  /** Gauge label (e.g., "RISK", "TOOLS") */
  label: string;

  /** Optional subtitle (e.g., "0-40") */
  subtitle?: string;

  /** Primary color (hex) */
  color: string;

  /** Agent color scheme */
  colorScheme: AgentColorScheme;

  /** Display risk threshold zones */
  showZones: boolean;

  /** Color zones for thresholds */
  zones?: RiskZone[];

  /** Arc fill from 0 to value */
  continuousFill: boolean;

  /** Pulse animation for severe mode */
  warnPulse: boolean;

  /** Animation style */
  needleMode: 'spring' | 'ease';

  /** Animation duration in milliseconds */
  animationMs: number;

  /** Optional value formatter */
  valueFormatter?: (value: number) => string;
}

/**
 * Props for LuxGaugesDashboard component
 */
export interface LuxGaugesDashboardProps {
  /** Agent states (1-6 agents) */
  agents: AgentRiskGaugeState[];

  /** Risk thresholds */
  riskThresholds: RiskThresholds;

  /** Pulse animation threshold */
  pulseThreshold: number;

  /** Animation speed in milliseconds */
  animationSpeed: number;

  /** Color scheme override */
  colorScheme?: 'light' | 'dark';
}

/**
 * Props for AgentRiskGaugesSection component
 */
export interface AgentRiskGaugesSectionProps {
  /** Investigation ID */
  investigationId: string;

  /** Agent states from investigation */
  agents: AgentRiskGaugeState[];

  /** ICE connection status */
  isConnected: boolean;

  /** Configuration change callback */
  onConfigChange?: (config: RiskConfiguration) => void;

  /** Initial configuration */
  initialConfig?: RiskConfiguration;

  /** Default expanded state */
  defaultExpanded?: boolean;
}

/**
 * Props for GaugeConfigPanel component
 */
export interface GaugeConfigPanelProps {
  /** Current configuration */
  config: RiskConfiguration;

  /** Configuration change callback */
  onChange: (config: RiskConfiguration) => void;

  /** Disabled state (all controls disabled) */
  disabled: boolean;
}
