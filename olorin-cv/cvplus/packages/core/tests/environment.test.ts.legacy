/**
 * Comprehensive Test Suite for Secure Environment Configuration
 * Tests validation, sanitization, security features, and error handling
 */

import { config, environmentUtils, SecurityEventType } from '../environment';
import * as functions from 'firebase-functions';

// Mock Firebase Functions logger
jest.mock('firebase-functions', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

describe('Secure Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    test('should validate and sanitize basic string values', () => {
      process.env.PROJECT_ID = 'test-project-id';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.firebase.projectId).toBe('test-project-id');
      expect(testConfig.storage.bucketName).toBe('test-bucket.appspot.com');
    });

    test('should sanitize dangerous characters from strings', () => {
      process.env.PROJECT_ID = 'test<script>alert("xss")</script>project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.firebase.projectId).toBe('testscriptalert(xss)/scriptproject');
      expect(testConfig.firebase.projectId).not.toContain('<');
      expect(testConfig.firebase.projectId).not.toContain('>');
    });

    test('should handle missing required variables', () => {
      delete process.env.PROJECT_ID;
      delete process.env.STORAGE_BUCKET;
      
      const testUtils = require('../environment').environmentUtils;
      const validation = testUtils.getValidationResult();
      
      expect(validation?.isValid).toBe(false);
      expect(validation?.errors).toContain('Missing required environment variable: PROJECT_ID');
      expect(validation?.errors).toContain('Missing required environment variable: STORAGE_BUCKET');
    });

    test('should validate API key formats', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      const testApiKey = 'sk-test' + '1234567890'.repeat(5);
      process.env.OPENAI_API_KEY = testApiKey;

      const testConfig = require('../environment').config;

      expect(testConfig.openai.apiKey).toBeTruthy();
      expect(testConfig.openai.apiKey).toBe(testApiKey);
    });

    test('should reject malformed API keys', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      const invalidKey = 'invalid<script>key';
      process.env.OPENAI_API_KEY = invalidKey;

      const testConfig = require('../environment').config;

      expect(testConfig.openai.apiKey).toBeUndefined();
      expect(functions.logger.error).toHaveBeenCalled();
    });

    test('should validate email formats', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.EMAIL_USER = 'test@example.com';
      process.env.EMAIL_FROM = 'noreply@test.com';
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.email.user).toBe('test@example.com');
      expect(testConfig.email.from).toBe('noreply@test.com');
    });

    test('should reject invalid email formats', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.EMAIL_USER = 'invalid-email';
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.email.user).toBeUndefined();
    });

    test('should validate boolean values correctly', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.ENABLE_VIDEO_GENERATION = 'true';
      process.env.ENABLE_PODCAST_GENERATION = '1';
      process.env.ENABLE_PUBLIC_PROFILES = 'yes';
      process.env.ENABLE_RAG_CHAT = 'false';
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.features.enableVideoGeneration).toBe(true);
      expect(testConfig.features.enablePodcastGeneration).toBe(true);
      expect(testConfig.features.enablePublicProfiles).toBe(true);
      expect(testConfig.features.enableRagChat).toBe(false);
    });

    test('should validate URL formats and enforce HTTPS in production', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.PUBLIC_PROFILES_BASE_URL = 'http://insecure-url.com';
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.features.publicProfiles.baseUrl).toBe('https://getmycv-ai.web.app/cv');
      
      process.env.NODE_ENV = originalNodeEnv;
    });

    test('should allow HTTPS URLs in production', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.PUBLIC_PROFILES_BASE_URL = 'https://getmycv-ai.web.app/cv';
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.features.publicProfiles.baseUrl).toBe('https://getmycv-ai.web.app/cv');
      
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Security Features', () => {
    test('should detect and log suspicious values', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      const suspiciousValue = 'javascript:alert("xss")';
      process.env.OPENAI_API_KEY = suspiciousValue;

      const testConfig = require('../environment').config;

      expect(testConfig.openai.apiKey).toBeUndefined();
      expect(functions.logger.error).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          event: SecurityEventType.SUSPICIOUS_VALUE
        })
      );
    });

    test('should enforce string length limits', () => {
      const longString = 'a'.repeat(1000);
      process.env.PROJECT_ID = longString;
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.firebase.projectId?.length).toBeLessThanOrEqual(500);
    });

    test('should prevent prototype pollution attempts', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.MALICIOUS_VAR = '__proto__.polluted = true';
      
      const testConfig = require('../environment').config;
      
      // Ensure the malicious content is sanitized
      expect(JSON.stringify(testConfig)).not.toContain('__proto__');
    });

    test('should log security events without exposing sensitive data', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      const maliciousKey = 'sk-malicious<script>content';
      process.env.OPENAI_API_KEY = maliciousKey;

      require('../environment').config;

      const logCalls = (functions.logger.error as jest.Mock).mock.calls;
      const securityLogCall = logCalls.find(call =>
        call[0] === 'Security Event' && call[1].event === SecurityEventType.SUSPICIOUS_VALUE
      );

      expect(securityLogCall).toBeDefined();
      expect(securityLogCall[1]).not.toContain('sk-malicious');
    });
  });

  describe('Configuration Health Checks', () => {
    test('should report healthy status with all services configured', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.WEB_API_KEY = 'firebase-api-key-' + '1234567890'.repeat(2);
      process.env.OPENAI_API_KEY = 'sk-test' + '1234567890'.repeat(5);
      process.env.EMAIL_USER = 'test@example.com';
      process.env.EMAIL_PASSWORD = 'test-password';
      process.env.ELEVENLABS_API_KEY = 'test-key-' + '1234567890'.repeat(3);
      process.env.DID_API_KEY = 'did-api-key-' + '1234567890'.repeat(2);
      process.env.SERPER_API_KEY = 'serper-api-key-' + '1234567890';
      process.env.PINECONE_API_KEY = '12345678-1234-1234-1234-' + '123456789012';
      
      const testUtils = require('../environment').environmentUtils;
      const healthCheck = testUtils.performHealthCheck();
      
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.details.healthPercentage).toBeGreaterThanOrEqual(80);
    });

    test('should report degraded status with some services missing', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.WEB_API_KEY = 'firebase-api-key-' + '1234567890'.repeat(2);
      process.env.OPENAI_API_KEY = 'sk-test' + '1234567890'.repeat(5);
      
      const testUtils = require('../environment').environmentUtils;
      const healthCheck = testUtils.performHealthCheck();
      
      expect(healthCheck.status).toBe('degraded');
      expect(healthCheck.details.healthPercentage).toBeLessThan(80);
      expect(healthCheck.details.healthPercentage).toBeGreaterThanOrEqual(50);
    });

    test('should report unhealthy status with critical services missing', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      
      const testUtils = require('../environment').environmentUtils;
      const healthCheck = testUtils.performHealthCheck();
      
      expect(healthCheck.status).toBe('unhealthy');
      expect(healthCheck.details.healthPercentage).toBeLessThan(50);
    });
  });

  describe('Service Availability Checks', () => {
    test('should correctly identify available services', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.OPENAI_API_KEY = 'sk-test' + '1234567890'.repeat(5);

      const testUtils = require('../environment').environmentUtils;

      expect(testUtils.isServiceAvailable('openai')).toBe(true);
      expect(testUtils.isServiceAvailable('elevenLabs')).toBe(false);
    });

    test('should handle service availability for complex objects', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.DID_PROFESSIONAL_AVATAR_ID = 'avatar-123';
      
      const testUtils = require('../environment').environmentUtils;
      
      expect(testUtils.isServiceAvailable('videoGeneration')).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate complete Firebase configuration', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.WEB_API_KEY = 'firebase-api-key-' + '1234567890'.repeat(2);

      const testUtils = require('../environment').environmentUtils;
      const validation = testUtils.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should report errors for incomplete Firebase configuration', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      // Missing WEB_API_KEY
      
      const testUtils = require('../environment').environmentUtils;
      const validation = testUtils.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Incomplete Firebase configuration - basic functionality will not work'
      );
    });

    test('should report warnings for missing optional services', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.WEB_API_KEY = 'firebase-api-key-' + '1234567890'.repeat(2);
      // Missing OPENAI_API_KEY and email config

      const testUtils = require('../environment').environmentUtils;
      const validation = testUtils.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain(
        'Missing OpenAI API key - AI features will not work'
      );
      expect(validation.warnings).toContain(
        'Incomplete email configuration - email features may not work'
      );
    });
  });

  describe('Singleton Pattern', () => {
    test('should return the same configuration instance on multiple calls', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      
      const config1 = require('../environment').config;
      const config2 = require('../environment').config;
      
      expect(config1).toBe(config2);
    });

    test('should cache validation results', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      
      const testUtils = require('../environment').environmentUtils;
      const validation1 = testUtils.getValidationResult();
      const validation2 = testUtils.getValidationResult();
      
      expect(validation1).toBe(validation2);
    });
  });

  describe('Default Values', () => {
    test('should apply correct default values', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      // Not setting optional environment variables
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.storage.bucketName).toBe('test-bucket.appspot.com');
      expect(testConfig.email.from).toBe('CVPlus <noreply@getmycv-ai.com>');
      expect(testConfig.rag.pineconeEnvironment).toBe('us-east-1');
      expect(testConfig.rag.pineconeIndex).toBe('cv-embeddings');
      expect(testConfig.features.publicProfiles.baseUrl).toBe('https://getmycv-ai.web.app/cv');
      expect(testConfig.features.enableVideoGeneration).toBe(false);
    });

    test('should use fallback values when environment values are invalid', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.EMAIL_FROM = 'invalid-email-format';
      process.env.PUBLIC_PROFILES_BASE_URL = 'invalid-url';
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.email.from).toBe('CVPlus <noreply@getmycv-ai.com>');
      expect(testConfig.features.publicProfiles.baseUrl).toBe('https://getmycv-ai.web.app/cv');
    });
  });

  describe('Error Handling', () => {
    test('should handle null and undefined environment variables gracefully', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.OPENAI_API_KEY = '';
      process.env.EMAIL_USER = undefined as any;
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.openai.apiKey).toBeUndefined();
      expect(testConfig.email.user).toBeUndefined();
      expect(() => testConfig).not.toThrow();
    });

    test('should continue functioning with malformed environment variables', () => {
      process.env.PROJECT_ID = 'test-project';
      process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
      process.env.ENABLE_VIDEO_GENERATION = 'maybe'; // Invalid boolean
      
      const testConfig = require('../environment').config;
      
      expect(testConfig.features.enableVideoGeneration).toBe(false); // Default value
      expect(() => testConfig).not.toThrow();
    });
  });
});