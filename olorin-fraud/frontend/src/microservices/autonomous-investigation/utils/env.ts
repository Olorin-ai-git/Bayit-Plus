/**
 * Environment utility for safe access to process.env variables
 * Handles browser context where process might not be defined
 */

// Safe access to process.env with fallbacks
const getEnv = (key: string, defaultValue: string = ''): string => {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[key]) || defaultValue;
  } catch {
    return defaultValue;
  }
};

const isEnv = (value: string): boolean => {
  try {
    return typeof process !== 'undefined' && process.env && process.env.NODE_ENV === value;
  } catch {
    return value === 'development'; // Default to development in browser
  }
};

export const env = {
  // Node environment
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnv('PORT', getEnv('REACT_APP_PORT', '3007')),

  // API Configuration
  REACT_APP_API_BASE_URL: getEnv('REACT_APP_API_BASE_URL', 'http://localhost:8090'),
  REACT_APP_API_TIMEOUT: getEnv('REACT_APP_API_TIMEOUT', '30000'),

  // WebSocket Configuration
  REACT_APP_WS_URL: getEnv('REACT_APP_WS_URL', 'ws://localhost:8090'),
  REACT_APP_WEBSOCKET_URL: getEnv('REACT_APP_WEBSOCKET_URL', 'ws://localhost:8090/ws'),
  REACT_APP_WEBSOCKET_RECONNECT_INTERVAL: getEnv('REACT_APP_WEBSOCKET_RECONNECT_INTERVAL', '5000'),
  REACT_APP_WEBSOCKET_MAX_RETRIES: getEnv('REACT_APP_WEBSOCKET_MAX_RETRIES', '5'),

  // App Configuration
  REACT_APP_VERSION: getEnv('REACT_APP_VERSION', '1.0.0'),
  REACT_APP_USE_MOCK_DATA: getEnv('REACT_APP_USE_MOCK_DATA', 'true'),

  // Debug and Development
  REACT_APP_DEBUG_MODE: getEnv('REACT_APP_DEBUG_MODE', 'false'),
  REACT_APP_LOG_LEVEL: getEnv('REACT_APP_LOG_LEVEL', 'info'),

  // Feature Flags
  REACT_APP_FEATURE_POWER_GRID_CONCEPT: getEnv('REACT_APP_FEATURE_POWER_GRID_CONCEPT', 'true'),
  REACT_APP_FEATURE_COMMAND_CENTER_CONCEPT: getEnv('REACT_APP_FEATURE_COMMAND_CENTER_CONCEPT', 'true'),
  REACT_APP_FEATURE_EVIDENCE_TRAIL_CONCEPT: getEnv('REACT_APP_FEATURE_EVIDENCE_TRAIL_CONCEPT', 'true'),
  REACT_APP_FEATURE_NETWORK_EXPLORER_CONCEPT: getEnv('REACT_APP_FEATURE_NETWORK_EXPLORER_CONCEPT', 'true'),

  // Performance and Limits
  REACT_APP_MAX_INVESTIGATION_NODES: getEnv('REACT_APP_MAX_INVESTIGATION_NODES', '1000'),
  REACT_APP_MAX_TIMELINE_EVENTS: getEnv('REACT_APP_MAX_TIMELINE_EVENTS', '5000'),
  REACT_APP_MAX_EVIDENCE_ITEMS: getEnv('REACT_APP_MAX_EVIDENCE_ITEMS', '500'),
  REACT_APP_GRAPH_PERFORMANCE_MODE: getEnv('REACT_APP_GRAPH_PERFORMANCE_MODE', 'false'),

  // Module Federation
  REACT_APP_MF_SHELL_URL: getEnv('REACT_APP_MF_SHELL_URL', 'http://localhost:3000/remoteEntry.js'),
  REACT_APP_MF_CORE_UI_URL: getEnv('REACT_APP_MF_CORE_UI_URL', 'http://localhost:3006/remoteEntry.js'),

  // Security
  REACT_APP_ENABLE_CSP: getEnv('REACT_APP_ENABLE_CSP', 'true'),
  REACT_APP_ENABLE_HTTPS_REDIRECT: getEnv('REACT_APP_ENABLE_HTTPS_REDIRECT', 'false'),

  // Monitoring
  REACT_APP_MONITORING_ENABLED: getEnv('REACT_APP_MONITORING_ENABLED', 'true'),
  REACT_APP_PERFORMANCE_TRACKING_ENABLED: getEnv('REACT_APP_PERFORMANCE_TRACKING_ENABLED', 'true'),

  // Event Bus
  REACT_APP_EVENT_BUS_DEBUG: getEnv('REACT_APP_EVENT_BUS_DEBUG', 'false'),
  REACT_APP_EVENT_BUS_PERSISTENCE: getEnv('REACT_APP_EVENT_BUS_PERSISTENCE', 'true'),
};

// Helper functions
export const isProduction = (): boolean => isEnv('production');
export const isDevelopment = (): boolean => isEnv('development');
export const isTest = (): boolean => isEnv('test');

// Get boolean value from string
export const getBooleanEnv = (key: keyof typeof env, defaultValue: boolean = false): boolean => {
  const value = env[key];
  return value === 'true' || (defaultValue && value !== 'false');
};

// Get number value from string
export const getNumberEnv = (key: keyof typeof env, defaultValue: number = 0): number => {
  const value = env[key];
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
};

export default env;