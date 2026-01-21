/**
 * Demo Configuration for Marketing Portal
 *
 * All configuration values are loaded from environment variables
 * with sensible defaults for development.
 */

export interface DemoConfig {
  apiBaseUrl: string;
  enabled: boolean;
  rateLimit: number;
  sessionTimeoutMs: number;
  pollingIntervalMs: number;
  maxConcurrent: number;
}

export const getDemoConfig = (): DemoConfig => ({
  apiBaseUrl: process.env.REACT_APP_DEMO_API_BASE_URL || 'http://localhost:8090',
  enabled: process.env.REACT_APP_DEMO_ENABLED !== 'false',
  rateLimit: parseInt(process.env.REACT_APP_DEMO_RATE_LIMIT || '5', 10),
  sessionTimeoutMs: parseInt(process.env.REACT_APP_DEMO_SESSION_TIMEOUT_MS || '300000', 10),
  pollingIntervalMs: parseInt(process.env.REACT_APP_DEMO_POLLING_INTERVAL_MS || '2000', 10),
  maxConcurrent: parseInt(process.env.REACT_APP_DEMO_MAX_CONCURRENT || '2', 10),
});

export const DEMO_POLLING_INTERVALS = {
  idle: 0,
  starting: 1000,
  running: 2000,
  completed: 0,
  error: 5000,
} as const;

export type DemoStatus = keyof typeof DEMO_POLLING_INTERVALS;

export default getDemoConfig;
