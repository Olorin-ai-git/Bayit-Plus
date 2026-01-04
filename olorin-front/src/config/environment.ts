// Environment Configuration for Olorin Frontend
import { getConfig } from '../shared/config/env.config';

const env = getConfig();

export interface EnvironmentConfig {
  apiBaseUrl: string;
  enableAnalytics: boolean;
  debugMode: boolean;
  firebaseConfig: {
    projectId: string;
    authDomain: string;
    measurementId: string;
  };
  apiEndpoints: {
    agent: string;
    mcp: string;
    settings: string;
    comments: string;
  };
  featureFlags: {
    enableStructuredMode: boolean;
    enableMockData: boolean;
    enableDebugLogs: boolean;
  };
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const isProduction = env.nodeEnv === 'production';
  const isDevelopment = env.nodeEnv === 'development';

  const apiBaseUrl = env.api.baseUrl;

  // Firebase config from environment configuration
  const firebaseConfig = {
    projectId: env.firebase?.projectId || '',
    authDomain: env.firebase?.authDomain || '',
    measurementId: env.firebase?.measurementId || '',
  };

  return {
    apiBaseUrl,
    enableAnalytics: isProduction,
    debugMode: isDevelopment,
    firebaseConfig,
    apiEndpoints: {
      agent: `${apiBaseUrl}/api/agent`,
      mcp: `${apiBaseUrl}/api/mcp`,
      settings: `${apiBaseUrl}/api/settings`,
      comments: `${apiBaseUrl}/api/comments`,
    },
    featureFlags: {
      enableStructuredMode: env.features?.enableStructuredMode === true,
      enableMockData: env.features?.enableMockData === true,
      enableDebugLogs: isDevelopment,
    },
  };
};

export const environmentConfig = getEnvironmentConfig();

export const {
  apiBaseUrl,
  enableAnalytics,
  debugMode,
  firebaseConfig,
  apiEndpoints,
  featureFlags,
} = environmentConfig;

if (debugMode) {
  console.log('🔧 Environment Configuration:', {
    environment: env.nodeEnv,
    apiBaseUrl,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    featureFlags,
  });
}
