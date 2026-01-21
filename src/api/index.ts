/**
 * Recovery API
 * Main entry point for the Level 2 module recovery API system
 */

// Export main server class and utilities
export { RecoveryAPIServer, createRecoveryServer } from './server';
export type { ServerOptions } from './server';

// Export route handlers
export { default as ModulesHandler } from './handlers/modulesHandler';
export { default as PhasesHandler } from './handlers/phasesHandler';

// Export router factory
export { createRecoveryRouter } from './routes/recovery';

// Export API types and interfaces
export interface APIResponse<T = any> {
  code?: string;
  message?: string;
  data?: T;
  details?: Record<string, any>;
  timestamp?: string;
  requestId?: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: string;
  requestId?: string;
}

export interface ModuleStateResponse {
  moduleId: string;
  status: 'healthy' | 'warning' | 'critical' | 'failed' | 'recovering' | 'unknown';
  buildStatus: 'success' | 'failed' | 'building' | 'not_started' | 'cancelled';
  testStatus: 'passing' | 'failing' | 'running' | 'not_configured' | 'not_started' | 'cancelled';
  dependencyHealth: 'resolved' | 'missing' | 'conflicted' | 'circular' | 'outdated';
  lastBuildTime: string | null;
  lastTestRun: string | null;
  errorCount: number;
  warningCount: number;
  healthScore: number;
  lastModified?: string;
  modifiedBy?: string;
}

export interface ModuleSummaryResponse {
  totalModules: number;
  healthyModules: number;
  criticalModules: number;
  recoveringModules: number;
  overallHealthScore: number;
}

export interface AllModulesResponse {
  modules: ModuleStateResponse[];
  summary: ModuleSummaryResponse;
}

export interface PhaseResponse {
  phaseId: number;
  phaseName: string;
  status: 'pending' | 'ready' | 'executing' | 'completed' | 'failed' | 'skipped' | 'rolled_back';
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  tasksTotal: number;
  tasksCompleted: number;
  tasksRemaining: number;
  healthImprovement: number;
  errors: string[];
}

export interface AllPhasesResponse {
  phases: PhaseResponse[];
  currentPhase: number;
  overallProgress: number;
  totalHealthImprovement: number;
  estimatedCompletion: string;
}

export interface PhaseExecutionResponse {
  phaseId: number;
  phaseName: string;
  executionTriggered: boolean;
  executionId: string;
  estimatedDuration: number;
  executionStrategy: 'sequential' | 'parallel';
  maxConcurrency?: number;
  startTime: string;
  status: 'executing' | 'completed' | 'failed' | 'cancelled';
  endTime?: string;
  duration?: number;
  tasksExecuted: number;
  tasksSuccessful: number;
  tasksFailed: number;
  healthImprovement: number;
  errorsResolved: number;
  artifacts: string[];
  logs: string[];
}

export interface ModuleBuildResponse {
  moduleId: string;
  buildTriggered: boolean;
  buildId: string;
  estimatedDuration: number;
  buildPhases: string[];
  buildStatus: 'building';
  startTime: string;
  recoveryResult: {
    status: 'completed' | 'failed' | 'partial' | 'cancelled';
    healthImprovement: number;
    errorsResolved: number;
  };
}

export interface ModuleTestResponse {
  moduleId: string;
  testTriggered: boolean;
  testId: string;
  estimatedDuration: number;
  testPhases: string[];
  testStatus: 'running';
  startTime: string;
  recoveryResult: {
    status: 'completed' | 'failed' | 'partial' | 'cancelled';
    healthImprovement: number;
    errorsResolved: number;
  };
}

// API Client interface for type-safe consumption
export interface RecoveryAPIClient {
  // Module operations
  getAllModules(options?: {
    includeDependencyGraph?: boolean;
    includeErrorDetails?: boolean;
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  }): Promise<AllModulesResponse>;

  getModule(moduleId: string): Promise<ModuleStateResponse>;

  updateModule(moduleId: string, data: {
    status?: 'healthy' | 'critical' | 'recovering' | 'recovered' | 'failed';
    notes?: string;
  }): Promise<ModuleStateResponse>;

  buildModule(moduleId: string, options?: {
    cleanBuild?: boolean;
    skipTests?: boolean;
    dependencyResolution?: boolean;
    timeout?: number;
  }): Promise<ModuleBuildResponse>;

  testModule(moduleId: string, options?: {
    testSuite?: string;
    coverage?: boolean;
    generateReport?: boolean;
    fixFailures?: boolean;
    timeout?: number;
  }): Promise<ModuleTestResponse>;

  // Phase operations
  getAllPhases(options?: {
    includeProgress?: boolean;
    includeMetrics?: boolean;
  }): Promise<AllPhasesResponse>;

  executePhase(phaseId: number, options?: {
    forceExecution?: boolean;
    skipValidation?: boolean;
    parallelExecution?: boolean;
    maxConcurrency?: number;
    timeout?: number;
    dryRun?: boolean;
  }): Promise<PhaseExecutionResponse>;

  getPhaseStatus(phaseId: number, executionId?: string): Promise<PhaseResponse>;

  cancelPhaseExecution(phaseId: number, executionId: string): Promise<{
    executionId: string;
    cancelled: boolean;
    reason: string;
    cleanupPerformed: boolean;
    cancelledAt: string;
  }>;

  // Utility operations
  getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    workspacePath: string;
    services: {
      workspaceAnalyzer: boolean;
      moduleRecovery: boolean;
      phaseExecutor: boolean;
      overall: boolean;
    };
  }>;

  getInfo(): Promise<{
    name: string;
    version: string;
    description: string;
    endpoints: Record<string, any>;
    authentication: string;
    rateLimit: Record<string, string>;
  }>;
}

// Standard HTTP status codes for API responses
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// Standard error codes for API responses
export const ERROR_CODES = {
  // General errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVICE_ERROR: 'SERVICE_ERROR',

  // Authentication/Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN_FORMAT: 'INVALID_TOKEN_FORMAT',

  // Request errors
  INVALID_JSON: 'INVALID_JSON',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',

  // Resource errors
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  ENDPOINT_NOT_FOUND: 'ENDPOINT_NOT_FOUND',
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  PHASE_NOT_FOUND: 'PHASE_NOT_FOUND',
  EXECUTION_NOT_FOUND: 'EXECUTION_NOT_FOUND',

  // Validation errors
  INVALID_MODULE_ID: 'INVALID_MODULE_ID',
  INVALID_PHASE_ID: 'INVALID_PHASE_ID',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_FIELD_TYPE: 'INVALID_FIELD_TYPE',
  EMPTY_UPDATE: 'EMPTY_UPDATE',
  UNKNOWN_FIELDS: 'UNKNOWN_FIELDS',

  // Operation errors
  PHASE_EXECUTION_ERROR: 'PHASE_EXECUTION_ERROR',
  CANCELLATION_FAILED: 'CANCELLATION_FAILED',
  PHASE_MISMATCH: 'PHASE_MISMATCH',
  INVALID_EXECUTION_OPTIONS: 'INVALID_EXECUTION_OPTIONS',
  INVALID_BUILD_OPTIONS: 'INVALID_BUILD_OPTIONS',
  INVALID_TEST_OPTIONS: 'INVALID_TEST_OPTIONS',
  MISSING_EXECUTION_ID: 'MISSING_EXECUTION_ID'
} as const;

// Utility functions for API responses
export const createSuccessResponse = <T>(data: T, message?: string): APIResponse<T> => ({
  data,
  message,
  timestamp: new Date().toISOString()
});

export const createErrorResponse = (code: string, message: string, details?: Record<string, any>): APIError => ({
  code,
  message,
  details,
  timestamp: new Date().toISOString()
});

// Validation utilities
export const isValidModuleId = (moduleId: string): boolean => {
  const validModuleIds = [
    'auth', 'i18n', 'cv-processing', 'multimedia', 'analytics',
    'premium', 'public-profiles', 'recommendations', 'admin',
    'workflow', 'payments'
  ];
  return validModuleIds.includes(moduleId);
};

export const isValidPhaseId = (phaseId: number): boolean => {
  return Number.isInteger(phaseId) && phaseId >= 1 && phaseId <= 5;
};

export const validateModuleStatus = (status: string): boolean => {
  const validStatuses = ['healthy', 'warning', 'critical', 'failed', 'recovering', 'unknown'];
  return validStatuses.includes(status);
};

export const validateBuildStatus = (status: string): boolean => {
  const validStatuses = ['success', 'failed', 'building', 'not_started', 'cancelled'];
  return validStatuses.includes(status);
};

export const validateTestStatus = (status: string): boolean => {
  const validStatuses = ['passing', 'failing', 'running', 'not_configured', 'not_started', 'cancelled'];
  return validStatuses.includes(status);
};

export const validateDependencyHealth = (health: string): boolean => {
  const validHealthStates = ['resolved', 'missing', 'conflicted', 'circular', 'outdated'];
  return validHealthStates.includes(health);
};

// Rate limiting utilities
export const createRateLimitInfo = (limit: number, windowMs: number, remaining: number, resetTime: number) => ({
  limit,
  remaining,
  resetTime,
  windowMs
});

// API versioning utilities
export const API_VERSIONS = {
  V1: 'v1',
  CURRENT: 'recovery'
} as const;

export const getAPIBasePath = (version: keyof typeof API_VERSIONS = 'CURRENT'): string => {
  return `/api/${API_VERSIONS[version]}`;
};

// Default configuration values
export const DEFAULT_CONFIG = {
  PORT: 3000,
  HOST: 'localhost',
  RATE_LIMIT: {
    STANDARD: { requests: 100, window: 60000 }, // 100 requests per minute
    HEAVY: { requests: 10, window: 60000 }      // 10 requests per minute
  },
  TIMEOUTS: {
    REQUEST: 30000,     // 30 seconds
    PHASE: 3600000,     // 1 hour
    BUILD: 600000,      // 10 minutes
    TEST: 300000        // 5 minutes
  },
  SECURITY: {
    HELMET_ENABLED: true,
    CORS_ENABLED: true,
    COMPRESSION_ENABLED: true
  }
} as const;

export default RecoveryAPIServer;