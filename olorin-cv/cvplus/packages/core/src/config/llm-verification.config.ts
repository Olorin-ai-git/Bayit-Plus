// Inline ValidationCriteria interface to avoid circular dependency
interface ValidationCriteria {
  accuracy: boolean;
  completeness: boolean;
  relevance: boolean;
  consistency: boolean;
  safety: boolean;
  format: boolean;
  customCriteria?: {
    name: string;
    description: string;
    weight: number;
  }[];
}

/**
 * LLM Verification System Configuration
 * 
 * Centralized configuration for the LLM verification system with
 * environment-specific settings and service-specific validation criteria.
  */

export interface LLMVerificationConfig {
  // Core settings
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  
  // API Configuration
  apis: {
    anthropic: {
      apiKey: string;
      model: string;
      maxTokens: number;
      temperature: number;
      timeout: number;
    };
    openai: {
      apiKey: string;
      model: string;
      maxTokens: number;
      temperature: number;
      timeout: number;
    };
  };
  
  // Verification Settings
  verification: {
    enabled: boolean;
    confidenceThreshold: number; // 0-1
    scoreThreshold: number; // 0-100
    maxRetries: number;
    retryDelay: number; // milliseconds
    timeoutMs: number;
  };
  
  // Security Settings
  security: {
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
      burstLimit: number;
      blockDuration: number; // minutes
    };
    ipBlocking: {
      enabled: boolean;
      maxFailures: number;
      blockDuration: number; // minutes
    };
    auditLogging: {
      enabled: boolean;
      logLevel: 'debug' | 'info' | 'warn' | 'error';
      sanitizePII: boolean;
      retentionDays: number;
    };
    threatDetection: {
      enabled: boolean;
      alertThresholds: {
        verificationFailures: number;
        rateLimitViolations: number;
        suspiciousPatterns: number;
      };
    };
  };
  
  // Service-specific validation criteria
  serviceValidation: {
    [serviceName: string]: ValidationCriteria;
  };
  
  // Performance monitoring
  monitoring: {
    enabled: boolean;
    metricsCollection: boolean;
    performanceThresholds: {
      maxResponseTime: number; // milliseconds
      maxMemoryUsage: number; // MB
      maxCpuUsage: number; // percentage
    };
  };
}

// Environment-specific configurations
const developmentConfig: LLMVerificationConfig = {
  enabled: true,
  environment: 'development',
  
  apis: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4000,
      temperature: 0,
      timeout: 30000
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo-preview',
      maxTokens: 2000,
      temperature: 0.1,
      timeout: 30000
    }
  },
  
  verification: {
    enabled: true,
    confidenceThreshold: 0.6, // Lower threshold for development
    scoreThreshold: 60,
    maxRetries: 2, // Fewer retries for development
    retryDelay: 500,
    timeoutMs: 30000
  },
  
  security: {
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 120, // Higher limit for development
      burstLimit: 20,
      blockDuration: 5
    },
    ipBlocking: {
      enabled: false, // Disabled for development
      maxFailures: 10,
      blockDuration: 15
    },
    auditLogging: {
      enabled: true,
      logLevel: 'debug',
      sanitizePII: false, // Less strict for development
      retentionDays: 7
    },
    threatDetection: {
      enabled: true,
      alertThresholds: {
        verificationFailures: 20,
        rateLimitViolations: 10,
        suspiciousPatterns: 5
      }
    }
  },
  
  serviceValidation: {
    'cv-parsing': {
      accuracy: true,
      completeness: true,
      relevance: true,
      consistency: true,
      safety: true,
      format: true,
      customCriteria: [
        {
          name: 'json_structure',
          description: 'Validate JSON structure compliance',
          weight: 0.8
        },
        {
          name: 'data_extraction',
          description: 'Verify accurate data extraction',
          weight: 0.9
        }
      ]
    },
    'pii-detection': {
      accuracy: true,
      completeness: true,
      relevance: true,
      consistency: true,
      safety: true,
      format: true,
      customCriteria: [
        {
          name: 'pii_accuracy',
          description: 'High accuracy PII identification',
          weight: 1.0
        }
      ]
    },
    'skills-analysis': {
      accuracy: true,
      completeness: true,
      relevance: true,
      consistency: true,
      safety: true,
      format: true,
      customCriteria: [
        {
          name: 'skill_categorization',
          description: 'Proper skill categorization',
          weight: 0.8
        }
      ]
    }
  },
  
  monitoring: {
    enabled: true,
    metricsCollection: true,
    performanceThresholds: {
      maxResponseTime: 60000,
      maxMemoryUsage: 512,
      maxCpuUsage: 80
    }
  }
};

const stagingConfig: LLMVerificationConfig = {
  ...developmentConfig,
  environment: 'staging',
  
  verification: {
    ...developmentConfig.verification,
    confidenceThreshold: 0.7,
    scoreThreshold: 70,
    maxRetries: 3,
    retryDelay: 1000
  },
  
  security: {
    ...developmentConfig.security,
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 80,
      burstLimit: 15,
      blockDuration: 10
    },
    ipBlocking: {
      enabled: true,
      maxFailures: 8,
      blockDuration: 15
    },
    auditLogging: {
      enabled: true,
      logLevel: 'info',
      sanitizePII: true,
      retentionDays: 30
    },
    threatDetection: {
      enabled: true,
      alertThresholds: {
        verificationFailures: 15,
        rateLimitViolations: 8,
        suspiciousPatterns: 3
      }
    }
  }
};

const productionConfig: LLMVerificationConfig = {
  ...stagingConfig,
  environment: 'production',
  
  verification: {
    enabled: true,
    confidenceThreshold: 0.75,
    scoreThreshold: 75,
    maxRetries: 3,
    retryDelay: 1500,
    timeoutMs: 45000
  },
  
  security: {
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 60,
      burstLimit: 10,
      blockDuration: 15
    },
    ipBlocking: {
      enabled: true,
      maxFailures: 5,
      blockDuration: 30
    },
    auditLogging: {
      enabled: true,
      logLevel: 'warn',
      sanitizePII: true,
      retentionDays: 90
    },
    threatDetection: {
      enabled: true,
      alertThresholds: {
        verificationFailures: 10,
        rateLimitViolations: 5,
        suspiciousPatterns: 2
      }
    }
  },
  
  monitoring: {
    enabled: true,
    metricsCollection: true,
    performanceThresholds: {
      maxResponseTime: 30000,
      maxMemoryUsage: 256,
      maxCpuUsage: 60
    }
  }
};

// Export configuration based on environment
const getEnvironmentConfig = (): LLMVerificationConfig => {
  const env = process.env.NODE_ENV as 'development' | 'staging' | 'production';
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    case 'development':
    default:
      return developmentConfig;
  }
};

export const llmVerificationConfig = getEnvironmentConfig();

// Configuration validation
export function validateLLMConfig(config: LLMVerificationConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check required API keys
  if (config.apis.anthropic.apiKey === '') {
    errors.push('ANTHROPIC_API_KEY is required');
  }
  
  if (config.verification.enabled && config.apis.openai.apiKey === '') {
    errors.push('OPENAI_API_KEY is required when verification is enabled');
  }
  
  // Validate thresholds
  if (config.verification.confidenceThreshold < 0 || config.verification.confidenceThreshold > 1) {
    errors.push('Confidence threshold must be between 0 and 1');
  }
  
  if (config.verification.scoreThreshold < 0 || config.verification.scoreThreshold > 100) {
    errors.push('Score threshold must be between 0 and 100');
  }
  
  // Validate retry settings
  if (config.verification.maxRetries < 0 || config.verification.maxRetries > 10) {
    errors.push('Max retries must be between 0 and 10');
  }
  
  // Validate rate limiting
  if (config.security.rateLimiting.requestsPerMinute < 1) {
    errors.push('Requests per minute must be at least 1');
  }
  
  // Validate timeout settings
  if (config.verification.timeoutMs < 1000 || config.verification.timeoutMs > 300000) {
    errors.push('Timeout must be between 1 second and 5 minutes');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Configuration health check
export function performConfigHealthCheck(): {
  healthy: boolean;
  issues: string[];
  recommendations: string[];
} {
  const config = llmVerificationConfig;
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check API connectivity (placeholder - would need actual API calls)
  if (!config.apis.anthropic.apiKey) {
    issues.push('Anthropic API key not configured');
  }
  
  if (config.verification.enabled && !config.apis.openai.apiKey) {
    issues.push('OpenAI API key not configured but verification is enabled');
  }
  
  // Performance recommendations
  if (config.verification.maxRetries > 3) {
    recommendations.push('Consider reducing maxRetries to improve response time');
  }
  
  if (config.verification.timeoutMs > 60000) {
    recommendations.push('Long timeout settings may impact user experience');
  }
  
  if (!config.security.rateLimiting.enabled) {
    issues.push('Rate limiting is disabled - security risk');
  }
  
  if (!config.security.auditLogging.enabled) {
    issues.push('Audit logging is disabled - compliance risk');
  }
  
  return {
    healthy: issues.length === 0,
    issues,
    recommendations
  };
}

// Export utility functions
export {
  developmentConfig,
  stagingConfig,
  productionConfig
};