import { 
  VerifiedClaudeService, 
  VerifiedMessageOptions
} from './verified-claude.service';
import { ValidationCriteria } from './llm-verification.service';

/**
 * LLM Integration Wrapper Service
 * 
 * This service provides a seamless integration layer for existing services
 * to adopt the LLM verification system without major code changes.
 * 
 * It maintains backward compatibility while adding verification capabilities.
  */

export interface LLMIntegrationConfig {
  enableVerification?: boolean;
  serviceName: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  customValidationCriteria?: ValidationCriteria;
}

export interface LegacyClaudeCall {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  context?: Record<string, any>;
}

export interface LegacyClaudeResponse {
  content: string;
  verified?: boolean;
  verificationScore?: number;
  auditId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Integration wrapper that provides backward-compatible methods
 * while adding verification capabilities
  */
export class LLMIntegrationWrapperService {
  private verifiedClaudeService: VerifiedClaudeService;
  private config: Required<LLMIntegrationConfig>;

  constructor(config: LLMIntegrationConfig) {
    const defaultConfig: Required<LLMIntegrationConfig> = {
      enableVerification: true,
      serviceName: config.serviceName,
      defaultModel: 'claude-sonnet-4-20250514',
      defaultTemperature: 0,
      defaultMaxTokens: 4000,
      customValidationCriteria: { accuracy: true, completeness: true, relevance: true, consistency: true, safety: true, format: true }
    };

    this.config = { ...defaultConfig, ...config };
    
    this.verifiedClaudeService = new VerifiedClaudeService();
  }

  /**
   * Legacy-compatible Claude call method
   * 
   * This method maintains the same interface as the original Claude calls
   * but adds verification behind the scenes.
    */
  async callClaude(request: LegacyClaudeCall): Promise<LegacyClaudeResponse> {
    const verifiedRequest: VerifiedMessageOptions = {
      prompt: request.system ? `${request.system}\n\n${request.prompt}` : request.prompt,
      model: this.config.defaultModel,
      messages: [{
        role: 'user',
        content: request.system ? `${request.system}\n\n${request.prompt}` : request.prompt
      }],
      maxTokens: request.maxTokens || this.config.defaultMaxTokens,
      temperature: request.temperature ?? this.config.defaultTemperature
    };

    try {
      const response = await this.verifiedClaudeService.createVerifiedMessage(verifiedRequest);

      return {
        content: Array.isArray(response.content) ? response.content.map(c => c.content || '').join('') : String(response.content || response.response || ''),
        verified: response.verification?.verified || false,
        verificationScore: response.verification?.confidence || 0,
        auditId: `audit-${Date.now()}`,
        usage: response.usage ? {
          inputTokens: response.usage.inputTokens || 0,
          outputTokens: response.usage.outputTokens || 0
        } : undefined
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Advanced method for services that need more control
    */
  async callClaudeWithMessages(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      system?: string;
      context?: Record<string, any>;
      customValidation?: ValidationCriteria;
    }
  ): Promise<any> {
    const filteredMessages = messages.filter(msg => msg.role !== 'system') as Array<{ role: 'user' | 'assistant'; content: string; }>;

    // Prepend system message to first user message if provided
    if (options?.system && filteredMessages.length > 0 && filteredMessages[0].role === 'user') {
      filteredMessages[0] = {
        ...filteredMessages[0],
        content: `${options.system}\n\n${filteredMessages[0].content}`
      };
    }

    const request: VerifiedMessageOptions = {
      prompt: filteredMessages.length > 0 ? filteredMessages[0].content : '',
      model: this.config.defaultModel,
      messages: filteredMessages,
      maxTokens: options?.maxTokens || this.config.defaultMaxTokens,
      temperature: options?.temperature ?? this.config.defaultTemperature
    };

    return await this.verifiedClaudeService.createVerifiedMessage(request);
  }

  /**
   * Get service-specific statistics
    */
  getServiceStats() {
    return {
      serviceName: this.config.serviceName,
      verificationEnabled: this.config.enableVerification
    };
  }
}

/**
 * Factory function to create service-specific wrappers
  */
export function createLLMWrapper(serviceName: string, options?: {
  enableVerification?: boolean;
  customValidation?: ValidationCriteria;
}): LLMIntegrationWrapperService {
  return new LLMIntegrationWrapperService({
    serviceName,
    enableVerification: options?.enableVerification ?? true,
    customValidationCriteria: options?.customValidation || { accuracy: true, completeness: true, relevance: true, consistency: true, safety: true, format: true }
  });
}

/**
 * Admin Orchestration Interfaces for Domain Services
 *
 * These interfaces provide admin monitoring and orchestration access to domain services
 * without containing the business logic implementations.
 */

// Service status interfaces for admin monitoring
export interface ServiceMonitoringStatus {
  serviceName: string;
  available: boolean;
  lastChecked: Date;
  responseTime?: number;
  errorRate?: number;
}

export interface DomainServiceOrchestrator {
  getServiceStatus(): Promise<ServiceMonitoringStatus>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  getUsageMetrics(): Promise<{ requestCount: number; avgResponseTime: number }>;
}

/**
 * CV Processing Service Orchestrator
 * Admin interface to cv-processing module services
 */
export class CVProcessingOrchestrator implements DomainServiceOrchestrator {
  async getServiceStatus(): Promise<ServiceMonitoringStatus> {
    return {
      serviceName: 'cv-processing',
      available: true, // Note: Implementation pending for actual health check via @cvplus/processing
      lastChecked: new Date()
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    // Note: Implementation pending for connection test to @cvplus/processing module
    return { success: true };
  }

  async getUsageMetrics(): Promise<{ requestCount: number; avgResponseTime: number }> {
    // Note: Implementation pending for metrics collection from @cvplus/processing module
    return { requestCount: 0, avgResponseTime: 0 };
  }
}

/**
 * PII Detection Service Orchestrator
 * Admin interface to auth module PII detection services
 */
export class PIIDetectionOrchestrator implements DomainServiceOrchestrator {
  async getServiceStatus(): Promise<ServiceMonitoringStatus> {
    return {
      serviceName: 'pii-detection',
      available: true, // Note: Implementation pending for actual health check via @cvplus/auth
      lastChecked: new Date()
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    // Note: Implementation pending for connection test to @cvplus/auth module
    return { success: true };
  }

  async getUsageMetrics(): Promise<{ requestCount: number; avgResponseTime: number }> {
    // Note: Implementation pending for metrics collection from @cvplus/auth module
    return { requestCount: 0, avgResponseTime: 0 };
  }
}

/**
 * Skills Analysis Service Orchestrator
 * Admin interface to recommendations module skills analysis services
 */
export class SkillsAnalysisOrchestrator implements DomainServiceOrchestrator {
  async getServiceStatus(): Promise<ServiceMonitoringStatus> {
    return {
      serviceName: 'skills-analysis',
      available: true, // Note: Implementation pending for actual health check via @cvplus/recommendations
      lastChecked: new Date()
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    // Note: Implementation pending for connection test to @cvplus/recommendations module
    return { success: true };
  }

  async getUsageMetrics(): Promise<{ requestCount: number; avgResponseTime: number }> {
    // Note: Implementation pending for metrics collection from @cvplus/recommendations module
    return { requestCount: 0, avgResponseTime: 0 };
  }
}

// Export orchestrator instances for admin monitoring
export const cvProcessingOrchestrator = new CVProcessingOrchestrator();
export const piiDetectionOrchestrator = new PIIDetectionOrchestrator();
export const skillsAnalysisOrchestrator = new SkillsAnalysisOrchestrator();