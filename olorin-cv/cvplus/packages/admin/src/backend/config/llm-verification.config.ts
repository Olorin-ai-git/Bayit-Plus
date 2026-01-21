/**
 * LLM Verification Configuration
 *
 * Configuration for LLM model verification and validation in the CVPlus Admin module.
 * Handles API keys, endpoints, verification rules, and monitoring settings.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

// LLM Provider configuration
export interface LLMProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retries: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  models: string[];
  enabled: boolean;
}

// Verification rules configuration
export interface VerificationRules {
  enabled: boolean;
  confidenceThreshold: number;
  scoreThreshold: number;
  maxRetries: number;
  timeoutMs: number;
  contentFilters: ContentFilter[];
  qualityChecks: QualityCheck[];
  performanceThresholds: PerformanceThresholds;
  complianceRules: ComplianceRule[];
}

export interface ContentFilter {
  id: string;
  name: string;
  enabled: boolean;
  rules: FilterRule[];
}

export interface FilterRule {
  pattern: string;
  action: 'block' | 'flag' | 'warn';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface QualityCheck {
  id: string;
  name: string;
  enabled: boolean;
  threshold: number;
  metric: 'accuracy' | 'relevance' | 'coherence' | 'safety';
}

export interface PerformanceThresholds {
  maxResponseTime: number;
  minSuccessRate: number;
  maxErrorRate: number;
  maxTokensPerRequest: number;
}

export interface ComplianceRule {
  id: string;
  name: string;
  regulation: string;
  enabled: boolean;
  checks: string[];
}

// Default LLM verification configuration
export const llmVerificationConfig = {
  environment: process.env.NODE_ENV || 'development',
  providers: {
    claude: {
      name: 'Anthropic Claude',
      apiKey: process.env.CLAUDE_API_KEY || '',
      baseUrl: 'https://api.anthropic.com/v1',
      timeout: 30000,
      retries: 3,
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerHour: 10000,
      },
      models: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'],
      enabled: true,
    } as LLMProviderConfig,

    openai: {
      name: 'OpenAI GPT',
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: 'https://api.openai.com/v1',
      timeout: 30000,
      retries: 3,
      rateLimit: {
        requestsPerMinute: 3000,
        requestsPerHour: 10000,
      },
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      enabled: true,
    } as LLMProviderConfig,
  },

  verification: {
    enabled: true,
    confidenceThreshold: 0.8,
    scoreThreshold: 0.7,
    maxRetries: 3,
    timeoutMs: 30000,
    contentFilters: [
      {
        id: 'profanity-filter',
        name: 'Profanity Filter',
        enabled: true,
        rules: [
          {
            pattern: '\\b(explicit-word-patterns)\\b',
            action: 'block',
            severity: 'high',
          },
        ],
      },
      {
        id: 'pii-filter',
        name: 'Personal Information Filter',
        enabled: true,
        rules: [
          {
            pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN pattern
            action: 'flag',
            severity: 'critical',
          },
          {
            pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', // Email pattern
            action: 'flag',
            severity: 'medium',
          },
        ],
      },
    ] as ContentFilter[],

    qualityChecks: [
      {
        id: 'relevance-check',
        name: 'Content Relevance',
        enabled: true,
        threshold: 0.8,
        metric: 'relevance',
      },
      {
        id: 'safety-check',
        name: 'Content Safety',
        enabled: true,
        threshold: 0.9,
        metric: 'safety',
      },
    ] as QualityCheck[],

    performanceThresholds: {
      maxResponseTime: 30000, // 30 seconds
      minSuccessRate: 0.95, // 95%
      maxErrorRate: 0.05, // 5%
      maxTokensPerRequest: 4000,
    } as PerformanceThresholds,

    complianceRules: [
      {
        id: 'gdpr-compliance',
        name: 'GDPR Compliance',
        regulation: 'GDPR',
        enabled: true,
        checks: ['pii-detection', 'data-retention', 'consent-tracking'],
      },
      {
        id: 'ccpa-compliance',
        name: 'CCPA Compliance',
        regulation: 'CCPA',
        enabled: true,
        checks: ['personal-data-detection', 'opt-out-handling'],
      },
    ] as ComplianceRule[],
  } as VerificationRules,

  security: {
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 1000,
      requestsPerHour: 10000,
    },
    auditLogging: {
      enabled: true,
      logLevel: 'info',
      retentionDays: 90,
      sanitizePII: true,
    },
  },

  monitoring: {
    enabled: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    metricsRetentionDays: 30,
    alertThresholds: {
      errorRate: 0.1, // 10%
      responseTime: 45000, // 45 seconds
      failureCount: 10,
    },
    notifications: {
      email: true,
      slack: true,
      webhook: process.env.LLM_MONITORING_WEBHOOK || '',
    },
  },

  // Test environment overrides
  ...(process.env.NODE_ENV === 'test' && {
    providers: {
      claude: {
        name: 'Claude API Test',
        apiKey: process.env.CLAUDE_API_KEY_TEST || process.env.CLAUDE_API_KEY || '',
        baseUrl: process.env.CLAUDE_BASE_URL_TEST || 'https://api.anthropic.com/v1',
        timeout: 5000,
        retries: 1,
        rateLimit: { requestsPerMinute: 100, requestsPerHour: 1000 },
        models: ['claude-3-haiku'],
        enabled: !!process.env.CLAUDE_API_KEY_TEST || !!process.env.CLAUDE_API_KEY,
      },
    },
    monitoring: {
      enabled: false,
      logLevel: 'silent',
    },
    verification: {
      enabled: false, // Disable verification in test mode for faster execution
      confidenceThreshold: 0.5,
      scoreThreshold: 0.5,
      maxRetries: 1,
      timeoutMs: 5000,
      contentFilters: [],
      qualityChecks: [],
      performanceThresholds: {
        maxResponseTime: 10000,
        minSuccessRate: 0.8,
        maxErrorRate: 0.2,
        maxTokensPerRequest: 1000,
      },
      complianceRules: [],
    },
  }),
};

export default llmVerificationConfig;