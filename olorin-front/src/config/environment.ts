// Environment Configuration for Olorin Frontend
export interface EnvironmentConfig {
  apiBaseUrl: string;
  websocketUrl: string;
  enableAnalytics: boolean;
  debugMode: boolean;
  firebaseConfig: {
    projectId: string;
    authDomain: string;
    measurementId: string;
  };
  apiEndpoints: {
    investigation: string;
    agent: string;
    mcp: string;
    settings: string;
    comments: string;
  };
  featureFlags: {
    enableAutonomousMode: boolean;
    enableMockData: boolean;
    enableDebugLogs: boolean;
  };
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  // Determine environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Get hostname to determine deployment context
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isFirebaseApp =
    hostname.includes('web.app') || hostname.includes('firebaseapp.com');

  // Base API URL determination
  let apiBaseUrl = 'http://localhost:8000'; // Default for development

  if (isProduction && isFirebaseApp) {
    // Production Firebase deployment - uses Cloud Run backend
    apiBaseUrl =
      process.env.REACT_APP_API_BASE_URL ||
      'https://olorin-backend-682679371769.us-central1.run.app';
  } else if (isProduction) {
    // Production but not Firebase (e.g., other hosting)
    apiBaseUrl =
      process.env.REACT_APP_API_BASE_URL ||
      'https://olorin-backend-682679371769.us-central1.run.app';
  } else {
    // Development
    apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
  }

  // WebSocket URL
  const websocketUrl =
    apiBaseUrl
      .replace(/^https?:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://') + '/ws';

  return {
    apiBaseUrl,
    websocketUrl,
    enableAnalytics: isProduction,
    debugMode: isDevelopment,
    firebaseConfig: {
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'olorin-ai',
      authDomain:
        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
        'olorin-ai.firebaseapp.com',
      measurementId:
        process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-HM69PZF9QE',
    },
    apiEndpoints: {
      investigation: `${apiBaseUrl}/api/investigation`,
      agent: `${apiBaseUrl}/api/agent`,
      mcp: `${apiBaseUrl}/api/mcp`,
      settings: `${apiBaseUrl}/api/settings`,
      comments: `${apiBaseUrl}/api/comments`,
    },
    featureFlags: {
      enableAutonomousMode:
        process.env.REACT_APP_ENABLE_AUTONOMOUS_MODE !== 'false',
      enableMockData:
        process.env.REACT_APP_ENABLE_MOCK_DATA === 'true' || isDevelopment,
      enableDebugLogs:
        process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true' || isDevelopment,
    },
  };
};

export const environmentConfig = getEnvironmentConfig();

// Export specific configs for easier access
export const {
  apiBaseUrl,
  websocketUrl,
  enableAnalytics,
  debugMode,
  firebaseConfig,
  apiEndpoints,
  featureFlags,
} = environmentConfig;

// Utility function to log configuration in development
if (debugMode) {
  console.log('🔧 Environment Configuration:', {
    environment: process.env.NODE_ENV,
    apiBaseUrl,
    websocketUrl,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    featureFlags,
  });
}
