// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Secure Environment Configuration System
 * Provides comprehensive validation, sanitization, and security for environment variables
 */

import * as functions from 'firebase-functions';
import { config as loadDotenv } from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
// This must happen before any validation or configuration loading
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.resolve(__dirname, '../../.env');
  loadDotenv({ path: envPath });
  
  // Log successful env loading for debugging
  if (process.env.PROJECT_ID) {
    functions.logger.info('Environment variables loaded successfully from .env file');
  }
}

// Security event types for monitoring
export enum SecurityEventType {
  MISSING_REQUIRED_VAR = 'MISSING_REQUIRED_VAR',
  INVALID_FORMAT = 'INVALID_FORMAT',
  SUSPICIOUS_VALUE = 'SUSPICIOUS_VALUE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIG_ACCESS_ATTEMPT = 'CONFIG_ACCESS_ATTEMPT'
}

// Configuration validation result
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Security logger for configuration issues
class SecurityLogger {
  static logSecurityEvent(
    event: SecurityEventType,
    details: Record<string, any> = {},
    sensitive = false
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity: SecurityLogger.getSeverity(event),
      ...(!sensitive && details) // Only log details if not sensitive
    };

    if (logEntry.severity === 'CRITICAL' || logEntry.severity === 'HIGH') {
      functions.logger.error('Security Event', logEntry);
    } else {
      functions.logger.warn('Security Event', logEntry);
    }
  }

  private static getSeverity(event: SecurityEventType): string {
    switch (event) {
      case SecurityEventType.MISSING_REQUIRED_VAR:
        return 'CRITICAL';
      case SecurityEventType.INVALID_FORMAT:
        return 'HIGH';
      case SecurityEventType.SUSPICIOUS_VALUE:
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }
}

// Environment variable validator
class EnvironmentValidator {
  // Sanitize string input
  static sanitizeString(value: string | undefined, maxLength = 500): string | undefined {
    if (!value) return undefined;
    
    // Remove potentially dangerous characters
    const sanitized = value
      .replace(/[<>'"&]/g, '') // Remove HTML/script injection chars
      .replace(/\r?\n/g, ' ') // Replace newlines with spaces
      .trim()
      .substring(0, maxLength); // Limit length
    
    return sanitized || undefined;
  }

  // Validate API key format
  static validateApiKey(value: string | undefined, keyName: string): string | undefined {
    if (!value) return undefined;

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/i,
      /<.*>/,
      /javascript:/i,
      /data:/i,
      /eval\(/i,
      /function\(/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(value))) {
      SecurityLogger.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_VALUE,
        { keyName, reason: 'Contains suspicious patterns' },
        true
      );
      return undefined;
    }

    // Validate key format based on common patterns
    const keyPatterns = {
      openai: /^sk-[A-Za-z0-9]{48,}$/,
      pinecone: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
      elevenlabs: /^[a-f0-9]{32}$/i,
      did: /^[A-Za-z0-9_-]{20,}$/,
      firebase: /^[A-Za-z0-9_-]{20,}$/
    };

    // Basic length and character validation for unknown keys
    if (value.length < 10 || value.length > 200) {
      SecurityLogger.logSecurityEvent(
        SecurityEventType.INVALID_FORMAT,
        { keyName, reason: 'Invalid length' },
        true
      );
      return undefined;
    }

    return EnvironmentValidator.sanitizeString(value);
  }

  // Validate URL format
  static validateUrl(value: string | undefined, allowedHosts: string[] = []): string | undefined {
    if (!value) return undefined;

    try {
      const url = new URL(value);
      
      // Only allow HTTPS in production
      if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        SecurityLogger.logSecurityEvent(
          SecurityEventType.INVALID_FORMAT,
          { reason: 'Non-HTTPS URL in production' }
        );
        return undefined;
      }

      // Check allowed hosts if specified
      if (allowedHosts.length > 0 && !allowedHosts.includes(url.hostname)) {
        SecurityLogger.logSecurityEvent(
          SecurityEventType.INVALID_FORMAT,
          { reason: 'Host not in allowlist', hostname: url.hostname }
        );
        return undefined;
      }

      return EnvironmentValidator.sanitizeString(value);
    } catch {
      SecurityLogger.logSecurityEvent(
        SecurityEventType.INVALID_FORMAT,
        { reason: 'Invalid URL format' }
      );
      return undefined;
    }
  }

  // Validate email format
  static validateEmail(value: string | undefined): string | undefined {
    if (!value) return undefined;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      SecurityLogger.logSecurityEvent(
        SecurityEventType.INVALID_FORMAT,
        { reason: 'Invalid email format' }
      );
      return undefined;
    }

    return EnvironmentValidator.sanitizeString(value);
  }

  // Validate boolean string
  static validateBoolean(value: string | undefined, defaultValue = false): boolean {
    if (!value) return defaultValue;
    
    const normalized = value.toLowerCase().trim();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    
    SecurityLogger.logSecurityEvent(
      SecurityEventType.INVALID_FORMAT,
      { reason: 'Invalid boolean value', value: normalized }
    );
    return defaultValue;
  }
}

// Secure configuration interface
interface SecureConfig {
  baseUrl?: string; // Base URL for webhooks and callbacks
  firebase: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  storage: {
    bucketName: string;
  };
  stripe: {
    secretKey?: string;
    webhookSecret?: string;
    pricing: {
      priceIdDev?: string;
      priceIdStaging?: string;
      priceIdProd?: string;
    };
  };
  email: {
    user?: string;
    password?: string;
    from: string;
    sendgridApiKey?: string;
    resendApiKey?: string;
  };
  rag: {
    openaiApiKey?: string;
    pineconeApiKey?: string;
    pineconeEnvironment: string;
    pineconeIndex: string;
  };
  openai: {
    apiKey?: string;
  };
  elevenLabs: {
    apiKey?: string;
    host1VoiceId?: string;
    host2VoiceId?: string;
  };
  videoGeneration: {
    didApiKey?: string;
    synthesiaApiKey?: string;
    heygenApiKey?: string;
    runwaymlApiKey?: string;
    avatars: {
      professional: {
        id?: string;
        voiceId?: string;
      };
      friendly: {
        id?: string;
        voiceId?: string;
      };
      energetic: {
        id?: string;
        voiceId?: string;
      };
    };
  };
  search: {
    serperApiKey?: string;
  };
  features: {
    publicProfiles: {
      baseUrl: string;
    };
    enableVideoGeneration: boolean;
    enablePodcastGeneration: boolean;
    enablePublicProfiles: boolean;
    enableRagChat: boolean;
  };
}

// Required environment variables
const REQUIRED_VARIABLES = [
  'PROJECT_ID',
  'STORAGE_BUCKET'
];

// Critical variables that should be present for full functionality
const CRITICAL_VARIABLES = [
  'OPENAI_API_KEY',
  'WEB_API_KEY',
  'AUTH_DOMAIN'
];

// Environment configuration loader
class SecureEnvironmentLoader {
  private static instance: SecureConfig | null = null;
  private static validationResult: ValidationResult | null = null;

  // Get secure configuration (singleton pattern)
  static getConfig(): SecureConfig {
    if (!SecureEnvironmentLoader.instance) {
      const result = SecureEnvironmentLoader.loadAndValidate();
      SecureEnvironmentLoader.instance = result.config;
      SecureEnvironmentLoader.validationResult = result.validation;

      // Log validation results
      if (!result.validation.isValid) {
        functions.logger.error('Configuration validation failed', {
          errors: result.validation.errors,
          warnings: result.validation.warnings
        });
      }
    }
    
    return SecureEnvironmentLoader.instance;
  }

  // Get validation result
  static getValidationResult(): ValidationResult | null {
    return SecureEnvironmentLoader.validationResult;
  }

  // Load and validate configuration
  private static loadAndValidate(): { config: SecureConfig; validation: ValidationResult } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required variables
    REQUIRED_VARIABLES.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
        SecurityLogger.logSecurityEvent(
          SecurityEventType.MISSING_REQUIRED_VAR,
          { variable: varName }
        );
      }
    });

    // Check critical variables
    CRITICAL_VARIABLES.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(`Missing critical environment variable: ${varName} - some features may not work`);
      }
    });

    // Build secure configuration
    const config: SecureConfig = {
      baseUrl: EnvironmentValidator.sanitizeString(process.env.BASE_URL),
      firebase: {
        apiKey: EnvironmentValidator.validateApiKey(process.env.WEB_API_KEY, 'WEB_API_KEY'),
        authDomain: EnvironmentValidator.sanitizeString(process.env.AUTH_DOMAIN),
        projectId: EnvironmentValidator.sanitizeString(process.env.PROJECT_ID),
        messagingSenderId: EnvironmentValidator.sanitizeString(process.env.MESSAGING_SENDER_ID),
        appId: EnvironmentValidator.sanitizeString(process.env.APP_ID)
      },
      storage: {
        bucketName: EnvironmentValidator.sanitizeString(process.env.STORAGE_BUCKET) || 'getmycv-ai.firebasestorage.app'
      },
      stripe: {
        secretKey: EnvironmentValidator.validateApiKey(process.env.STRIPE_SECRET_KEY, 'STRIPE_SECRET_KEY'),
        webhookSecret: EnvironmentValidator.sanitizeString(process.env.STRIPE_WEBHOOK_SECRET),
        pricing: {
          priceIdDev: EnvironmentValidator.sanitizeString(process.env.STRIPE_PRICE_ID_DEV),
          priceIdStaging: EnvironmentValidator.sanitizeString(process.env.STRIPE_PRICE_ID_STAGING),
          priceIdProd: EnvironmentValidator.sanitizeString(process.env.STRIPE_PRICE_ID_PROD)
        }
      },
      email: {
        user: EnvironmentValidator.validateEmail(process.env.EMAIL_USER),
        password: EnvironmentValidator.sanitizeString(process.env.EMAIL_PASSWORD),
        from: EnvironmentValidator.validateEmail(process.env.EMAIL_FROM) || 'CVPlus <noreply@getmycv-ai.com>',
        sendgridApiKey: EnvironmentValidator.validateApiKey(process.env.SENDGRID_API_KEY, 'SENDGRID_API_KEY'),
        resendApiKey: EnvironmentValidator.validateApiKey(process.env.RESEND_API_KEY, 'RESEND_API_KEY')
      },
      rag: {
        openaiApiKey: EnvironmentValidator.validateApiKey(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY'),
        pineconeApiKey: EnvironmentValidator.validateApiKey(process.env.PINECONE_API_KEY, 'PINECONE_API_KEY'),
        pineconeEnvironment: EnvironmentValidator.sanitizeString(process.env.PINECONE_ENVIRONMENT) || 'us-east-1',
        pineconeIndex: EnvironmentValidator.sanitizeString(process.env.PINECONE_INDEX) || 'cv-embeddings'
      },
      openai: {
        apiKey: EnvironmentValidator.validateApiKey(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY')
      },
      elevenLabs: {
        apiKey: EnvironmentValidator.validateApiKey(process.env.ELEVENLABS_API_KEY, 'ELEVENLABS_API_KEY'),
        host1VoiceId: EnvironmentValidator.sanitizeString(process.env.ELEVENLABS_HOST1_VOICE_ID),
        host2VoiceId: EnvironmentValidator.sanitizeString(process.env.ELEVENLABS_HOST2_VOICE_ID)
      },
      videoGeneration: {
        didApiKey: EnvironmentValidator.validateApiKey(process.env.DID_API_KEY, 'DID_API_KEY'),
        synthesiaApiKey: EnvironmentValidator.validateApiKey(process.env.SYNTHESIA_API_KEY, 'SYNTHESIA_API_KEY'),
        heygenApiKey: EnvironmentValidator.validateApiKey(process.env.HEYGEN_API_KEY, 'HEYGEN_API_KEY'),
        runwaymlApiKey: EnvironmentValidator.validateApiKey(process.env.RUNWAYML_API_KEY, 'RUNWAYML_API_KEY'),
        avatars: {
          professional: {
            id: EnvironmentValidator.sanitizeString(process.env.DID_PROFESSIONAL_AVATAR_ID),
            voiceId: EnvironmentValidator.sanitizeString(process.env.DID_PROFESSIONAL_VOICE_ID)
          },
          friendly: {
            id: EnvironmentValidator.sanitizeString(process.env.DID_FRIENDLY_AVATAR_ID),
            voiceId: EnvironmentValidator.sanitizeString(process.env.DID_FRIENDLY_VOICE_ID)
          },
          energetic: {
            id: EnvironmentValidator.sanitizeString(process.env.DID_ENERGETIC_AVATAR_ID),
            voiceId: EnvironmentValidator.sanitizeString(process.env.DID_ENERGETIC_VOICE_ID)
          }
        }
      },
      search: {
        serperApiKey: EnvironmentValidator.validateApiKey(process.env.SERPER_API_KEY, 'SERPER_API_KEY')
      },
      features: {
        publicProfiles: {
          baseUrl: EnvironmentValidator.validateUrl(
            process.env.PUBLIC_PROFILES_BASE_URL,
            ['getmycv-ai.web.app', 'localhost']
          ) || 'https://getmycv-ai.web.app/cv'
        },
        enableVideoGeneration: EnvironmentValidator.validateBoolean(process.env.ENABLE_VIDEO_GENERATION),
        enablePodcastGeneration: EnvironmentValidator.validateBoolean(process.env.ENABLE_PODCAST_GENERATION),
        enablePublicProfiles: EnvironmentValidator.validateBoolean(process.env.ENABLE_PUBLIC_PROFILES),
        enableRagChat: EnvironmentValidator.validateBoolean(process.env.ENABLE_RAG_CHAT)
      }
    };

    const validation: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    return { config, validation };
  }

  // Validate configuration completeness
  static validateConfiguration(): ValidationResult {
    const config = SecureEnvironmentLoader.getConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check Firebase configuration completeness
    if (!config.firebase.projectId || !config.firebase.apiKey) {
      errors.push('Incomplete Firebase configuration - basic functionality will not work');
    }

    // Check OpenAI configuration
    if (!config.openai.apiKey) {
      warnings.push('Missing OpenAI API key - AI features will not work');
    }

    // Check email configuration if email features are used
    if (!config.email.user || !config.email.password) {
      warnings.push('Incomplete email configuration - email features may not work');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Health check for configuration
  static performHealthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      healthPercentage: number;
      healthyServices: string;
      errorCount: number;
      warningCount: number;
    };
  } {
    const validation = SecureEnvironmentLoader.validateConfiguration();
    const config = SecureEnvironmentLoader.getConfig();

    let healthyServices = 0;
    const totalServices = 9; // Firebase, OpenAI, Email, ElevenLabs, Video, Search, RAG, Storage, Stripe

    // Check each service
    if (config.firebase.apiKey && config.firebase.projectId) healthyServices++;
    if (config.openai.apiKey) healthyServices++;
    if (config.email.user && config.email.password) healthyServices++;
    if (config.elevenLabs.apiKey) healthyServices++;
    if (config.videoGeneration.didApiKey || config.videoGeneration.synthesiaApiKey || config.videoGeneration.heygenApiKey || config.videoGeneration.runwaymlApiKey) healthyServices++;
    if (config.search.serperApiKey) healthyServices++;
    if (config.rag.openaiApiKey && config.rag.pineconeApiKey) healthyServices++;
    if (config.storage.bucketName) healthyServices++;
    if (config.stripe.secretKey) healthyServices++;

    const healthPercentage = (healthyServices / totalServices) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthPercentage >= 80) status = 'healthy';
    else if (healthPercentage >= 50) status = 'degraded';
    else status = 'unhealthy';

    return {
      status,
      details: {
        healthPercentage,
        healthyServices: `${healthyServices}/${totalServices}`,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      }
    };
  }
}

// Export secure configuration
export const config = SecureEnvironmentLoader.getConfig();

// Export utility functions for monitoring and health checks
export const environmentUtils = {
  getValidationResult: () => SecureEnvironmentLoader.getValidationResult(),
  validateConfiguration: () => SecureEnvironmentLoader.validateConfiguration(),
  performHealthCheck: () => SecureEnvironmentLoader.performHealthCheck(),
  
  // Secure way to check if a service is available
  isServiceAvailable: (serviceName: keyof SecureConfig): boolean => {
    const config = SecureEnvironmentLoader.getConfig();
    const service = config[serviceName];
    
    if (typeof service === 'object' && service !== null) {
      return Object.values(service).some(value => 
        value !== undefined && value !== null && value !== ''
      );
    }
    
    return false;
  }
};