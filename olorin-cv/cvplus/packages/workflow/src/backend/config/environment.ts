/**
 * Environment configuration for workflow module
  */

export interface WorkflowConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  firebase: {
    projectId: string;
    storageBucket: string;
  };
  ai: {
    analysisTimeout: number;
    maxRetries: number;
    enableAdvancedFeatures: boolean;
  };
  workflow: {
    maxConcurrentJobs: number;
    jobTimeout: number;
    enableMonitoring: boolean;
  };
}

// Default configuration
const defaultConfig: WorkflowConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10)
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'cvplus-dev',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'cvplus-dev.appspot.com'
  },
  ai: {
    analysisTimeout: parseInt(process.env.AI_ANALYSIS_TIMEOUT || '60000', 10),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
    enableAdvancedFeatures: process.env.AI_ENABLE_ADVANCED_FEATURES === 'true'
  },
  workflow: {
    maxConcurrentJobs: parseInt(process.env.WORKFLOW_MAX_CONCURRENT_JOBS || '5', 10),
    jobTimeout: parseInt(process.env.WORKFLOW_JOB_TIMEOUT || '300000', 10),
    enableMonitoring: process.env.WORKFLOW_ENABLE_MONITORING !== 'false'
  }
};

// Validate configuration
function validateConfig(config: WorkflowConfig): void {
  if (!config.openai.apiKey) {
    logger.warn('OPENAI_API_KEY not set - AI features may not work');
  }
  
  if (!config.firebase.projectId) {
    throw new Error('FIREBASE_PROJECT_ID must be set');
  }
  
  if (config.ai.maxRetries < 1 || config.ai.maxRetries > 10) {
    throw new Error('AI_MAX_RETRIES must be between 1 and 10');
  }
  
  if (config.workflow.maxConcurrentJobs < 1 || config.workflow.maxConcurrentJobs > 50) {
    throw new Error('WORKFLOW_MAX_CONCURRENT_JOBS must be between 1 and 50');
  }
}

// Export validated config
export const config: WorkflowConfig = (() => {
  validateConfig(defaultConfig);
  return defaultConfig;
})();

// Environment helpers
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// Feature flags
export const featureFlags = {
  enableAdvancedAI: config.ai.enableAdvancedFeatures,
  enableWorkflowMonitoring: config.workflow.enableMonitoring,
  enableDebugLogging: isDevelopment,
  enablePerformanceMetrics: isProduction
};