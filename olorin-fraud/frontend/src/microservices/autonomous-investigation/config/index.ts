import { developmentConfig } from './development';

// Environment-based configuration
const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'development':
      return developmentConfig;
    case 'production':
      return {
        ...developmentConfig,
        development: {
          ...developmentConfig.development,
          enableDebugging: false,
          enablePerformanceLogging: false,
          verboseLogging: false,
        },
        ui: {
          ...developmentConfig.ui,
          animations: {
            ...developmentConfig.ui.animations,
            enabled: true, // Keep animations in production
          },
        },
      };
    case 'test':
      return {
        ...developmentConfig,
        development: {
          ...developmentConfig.development,
          enableDebugging: false,
          enablePerformanceLogging: false,
          mockDataEnabled: true,
          verboseLogging: false,
        },
        ui: {
          ...developmentConfig.ui,
          animations: {
            ...developmentConfig.ui.animations,
            enabled: false, // Disable animations in tests
          },
        },
      };
    default:
      return developmentConfig;
  }
};

export const config = getConfig();
export type Config = typeof config;

// Utility functions
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isTest = () => process.env.NODE_ENV === 'test';

// Feature flag utilities
export const isFeatureEnabled = (featureName: keyof typeof config.features): boolean => {
  return config.features[featureName] === true;
};
