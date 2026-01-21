/**
 * AppConfig Tests
 *
 * Comprehensive test suite for configuration loading and validation.
 * Tests fail-fast behavior, type safety, and proper environment variable handling.
 */

import { loadConfig, getConfig, resetConfig, isFeatureEnabled, getApiUrl, getWsUrl } from './AppConfig';

describe('AppConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetConfig();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load valid configuration from environment variables', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000',
        REACT_APP_FEATURE_ENABLE_RAG: 'true',
        REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES: 'true',
        REACT_APP_FEATURE_ENABLE_MICROSERVICES: 'false',
        REACT_APP_FEATURE_ENABLE_WIZARD: 'true',
        REACT_APP_FEATURE_ENABLE_TEMPLATES: 'true',
        REACT_APP_FEATURE_ENABLE_MULTI_ENTITY: 'true',
        REACT_APP_PAGINATION_SIZE: '20',
        REACT_APP_REQUEST_TIMEOUT_MS: '30000',
        REACT_APP_MAX_ENTITIES: '10',
        REACT_APP_MAX_TOOLS: '20',
        REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS: '30000',
        REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS: '500',
        REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS: '1000',
        REACT_APP_DEFAULT_RISK_THRESHOLD: '50',
        REACT_APP_DEFAULT_CORRELATION_MODE: 'OR',
        REACT_APP_DEFAULT_EXECUTION_MODE: 'parallel'
      };

      const config = loadConfig();

      expect(config.env).toBe('development');
      expect(config.apiBaseUrl).toBe('https://api.example.com');
      expect(config.wsBaseUrl).toBe('wss://ws.example.com');
      expect(config.frontendPort).toBe(3000);
      expect(config.features.enableRag).toBe(true);
      expect(config.features.enableRealTimeUpdates).toBe(true);
      expect(config.features.enableMicroservices).toBe(false);
      expect(config.ui.paginationSize).toBe(20);
      expect(config.ui.requestTimeoutMs).toBe(30000);
      expect(config.wizard.defaultRiskThreshold).toBe(50);
    });

    it('should fail fast with invalid environment enum', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'invalid',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000'
      };

      expect(() => loadConfig()).toThrow('Invalid configuration');
    });

    it('should fail fast with invalid API URL', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'not-a-url',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000'
      };

      expect(() => loadConfig()).toThrow('Invalid configuration');
    });

    it('should fail fast with invalid WebSocket URL', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'invalid-ws-url',
        REACT_APP_FRONTEND_PORT: '3000'
      };

      expect(() => loadConfig()).toThrow('Invalid configuration');
    });

    it('should fail fast with invalid port number', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '-1'
      };

      expect(() => loadConfig()).toThrow('Invalid configuration');
    });

    it('should use default values for optional fields', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000'
      };

      const config = loadConfig();

      expect(config.ui.paginationSize).toBe(20);
      expect(config.ui.requestTimeoutMs).toBe(30000);
      expect(config.wizard.defaultRiskThreshold).toBe(50);
      expect(config.wizard.defaultCorrelationMode).toBe('OR');
      expect(config.wizard.defaultExecutionMode).toBe('parallel');
    });
  });

  describe('getConfig', () => {
    it('should return singleton configuration instance', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'production',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000'
      };

      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
      expect(config1.env).toBe('production');
    });

    it('should load config on first call to getConfig', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'staging',
        REACT_APP_API_BASE_URL: 'https://api.staging.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.staging.example.com',
        REACT_APP_FRONTEND_PORT: '3000'
      };

      const config = getConfig();

      expect(config.env).toBe('staging');
      expect(config.apiBaseUrl).toBe('https://api.staging.example.com');
    });
  });

  describe('resetConfig', () => {
    it('should reset global configuration instance', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.dev.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.dev.example.com',
        REACT_APP_FRONTEND_PORT: '3000'
      };

      const config1 = getConfig();
      resetConfig();

      process.env.REACT_APP_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.prod.example.com';

      const config2 = getConfig();

      expect(config1).not.toBe(config2);
      expect(config1.env).toBe('development');
      expect(config2.env).toBe('production');
    });
  });

  describe('isFeatureEnabled', () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000',
        REACT_APP_FEATURE_ENABLE_RAG: 'true',
        REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES: 'false',
        REACT_APP_FEATURE_ENABLE_WIZARD: 'true'
      };
    });

    it('should return true for enabled features', () => {
      expect(isFeatureEnabled('enableRag')).toBe(true);
      expect(isFeatureEnabled('enableWizard')).toBe(true);
    });

    it('should return false for disabled features', () => {
      expect(isFeatureEnabled('enableRealTimeUpdates')).toBe(false);
    });
  });

  describe('getApiUrl', () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000'
      };
    });

    it('should generate correct API endpoint URL with leading slash', () => {
      const url = getApiUrl('/v1/investigations');
      expect(url).toBe('https://api.example.com/v1/investigations');
    });

    it('should generate correct API endpoint URL without leading slash', () => {
      const url = getApiUrl('v1/investigations');
      expect(url).toBe('https://api.example.com/v1/investigations');
    });

    it('should handle nested paths correctly', () => {
      const url = getApiUrl('/api/v1/users/profile');
      expect(url).toBe('https://api.example.com/api/v1/users/profile');
    });
  });

  describe('getWsUrl', () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000'
      };
    });

    it('should return base WebSocket URL when no path provided', () => {
      const url = getWsUrl();
      expect(url).toBe('wss://ws.example.com');
    });

    it('should generate correct WebSocket URL with leading slash', () => {
      const url = getWsUrl('/live-updates');
      expect(url).toBe('wss://ws.example.com/live-updates');
    });

    it('should generate correct WebSocket URL without leading slash', () => {
      const url = getWsUrl('live-updates');
      expect(url).toBe('wss://ws.example.com/live-updates');
    });
  });

  describe('Configuration Validation Edge Cases', () => {
    it('should reject negative pagination size', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000',
        REACT_APP_PAGINATION_SIZE: '-10'
      };

      expect(() => loadConfig()).toThrow('Invalid configuration');
    });

    it('should reject invalid correlation mode', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000',
        REACT_APP_DEFAULT_CORRELATION_MODE: 'INVALID'
      };

      expect(() => loadConfig()).toThrow('Invalid configuration');
    });

    it('should reject risk threshold above 100', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000',
        REACT_APP_DEFAULT_RISK_THRESHOLD: '150'
      };

      expect(() => loadConfig()).toThrow('Invalid configuration');
    });

    it('should reject risk threshold below 0', () => {
      process.env = {
        ...originalEnv,
        REACT_APP_ENV: 'development',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        REACT_APP_WS_BASE_URL: 'wss://ws.example.com',
        REACT_APP_FRONTEND_PORT: '3000',
        REACT_APP_DEFAULT_RISK_THRESHOLD: '-10'
      };

      expect(() => loadConfig()).toThrow('Invalid configuration');
    });
  });
});
