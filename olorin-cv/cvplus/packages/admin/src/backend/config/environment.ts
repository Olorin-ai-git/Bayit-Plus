/**
 * Environment Configuration
 *
 * Configuration settings for the CVPlus Admin module backend services.
 * Handles environment-specific settings and provides type-safe configuration access.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

// Environment configuration interface
export interface EnvironmentConfig {
  // Firebase configuration
  projectId: string;

  // Alert system configuration
  alerting: {
    enabled: boolean;
    defaultChannels: string[];
    escalationTimeoutMs: number;
    maxRetries: number;
  };

  // Performance monitoring configuration
  performance: {
    metricsCollectionInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      successRate: number;
    };
  };

  // Security configuration
  security: {
    auditLogRetentionDays: number;
    maxFailedLoginAttempts: number;
    sessionTimeoutMs: number;
  };

  // LLM service configuration
  openai: {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    enabled: boolean;
  };

  claude: {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    enabled: boolean;
  };

  // Development/production flags
  isDevelopment: boolean;
  isProduction: boolean;
  enableDebugLogging: boolean;
}

// Default configuration based on environment
const defaultConfig: EnvironmentConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'cvplus-development',

  alerting: {
    enabled: true,
    defaultChannels: ['email', 'slack'],
    escalationTimeoutMs: 15 * 60 * 1000, // 15 minutes
    maxRetries: 3,
  },

  performance: {
    metricsCollectionInterval: 60000, // 1 minute
    alertThresholds: {
      responseTime: 5000, // 5 seconds
      errorRate: 0.05, // 5%
      successRate: 0.95, // 95%
    },
  },

  security: {
    auditLogRetentionDays: 90,
    maxFailedLoginAttempts: 5,
    sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10),
    enabled: process.env.OPENAI_ENABLED !== 'false',
  },

  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    baseUrl: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com/v1',
    timeout: parseInt(process.env.CLAUDE_TIMEOUT || '30000', 10),
    enabled: process.env.CLAUDE_ENABLED !== 'false',
  },

  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  enableDebugLogging: process.env.NODE_ENV !== 'production',
};

// Export the configuration
export const config: EnvironmentConfig = {
  ...defaultConfig,

  // Override with environment-specific values
  ...(process.env.NODE_ENV === 'production' && {
    alerting: {
      ...defaultConfig.alerting,
      escalationTimeoutMs: 5 * 60 * 1000, // 5 minutes in production
    },
    performance: {
      ...defaultConfig.performance,
      alertThresholds: {
        responseTime: 2000, // 2 seconds in production
        errorRate: 0.01, // 1% in production
        successRate: 0.99, // 99% in production
      },
    },
  }),

  // Override with test environment values
  ...(process.env.NODE_ENV === 'test' && {
    alerting: {
      ...defaultConfig.alerting,
      enabled: false, // Disable alerts in tests
    },
    enableDebugLogging: false,
  }),
};

export default config;