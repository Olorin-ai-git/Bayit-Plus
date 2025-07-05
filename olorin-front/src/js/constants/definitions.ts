/**
 * Color definitions for different agents in the investigation
 */
export const AGENT_COLORS: { [agent: string]: string } = {
  'Network Agent': 'text-purple-600',
  'Location Agent': 'text-indigo-600',
  'Device Agent': 'text-pink-600',
  'Log Agent': 'text-orange-600',
  'Risk Assessment Agent': 'text-red-600',
  'Initialization Agent': 'text-blue-600',
  Initialization: 'text-gray-500',
};

/**
 * Default color for agents not found in AGENT_COLORS
 */
export const DEFAULT_AGENT_COLOR = 'text-gray-800';

/**
 * Risk level thresholds and their corresponding labels
 */
export const RISK_LEVELS = {
  HIGH: {
    threshold: 0.7,
    label: 'High',
    color: 'text-red-600',
  },
  MEDIUM: {
    threshold: 0.4,
    label: 'Medium',
    color: 'text-orange-500',
  },
  LOW: {
    threshold: 0,
    label: 'Low',
    color: 'text-yellow-500',
  },
  NONE: {
    threshold: -1,
    label: 'None',
    color: 'text-green-600',
  },
} as const;

/**
 * Default user ID for testing
 */
export const DEFAULT_USER_ID = '';

/**
 * Initial number of logs to show
 */
export const INITIAL_LOGS_COUNT = 3;

/**
 * Animation timing constants
 */
export const ANIMATION_TIMING = {
  LOG_DISPLAY_DELAY: 3000,
  CHARACTER_SPEED: 30,
  CARET_DURATION: 3000,
} as const;

/**
 * Sidebar dimensions
 */
export const SIDEBAR_DIMENSIONS = {
  MIN_WIDTH: 384,
  MAX_WIDTH: 800,
  DEFAULT_WIDTH: 384,
} as const;

/**
 * Investigation step IDs
 */
export enum InvestigationStepId {
  INIT = 'initialization',
  NETWORK = 'network',
  LOCATION = 'location',
  DEVICE = 'device',
  LOG = 'log',
  RISK = 'risk-assessment',
}

/**
 * Investigation step status
 */
export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
