/**
 * ValidationGate Model - T032
 * CVPlus Level 2 Recovery System
 */

export interface ValidationGate {
  gateId: string;
  name: string;
  description: string;
  required: boolean;
  order: number;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  criteria: ValidationCriteria[];
  configuration: ValidationGateConfig;
  executionHistory: ValidationExecution[];
  lastExecution?: ValidationExecution;
  metrics: ValidationMetrics;
}

export interface ValidationCriteria {
  criteriaId: string;
  name: string;
  description: string;
  weight: number;
  type: 'boolean' | 'numeric' | 'percentage' | 'enum';
  expectedValue: any;
  actualValue?: any;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  errorMessage?: string;
  autoFixable: boolean;
  category: 'build' | 'test' | 'dependency' | 'configuration' | 'security' | 'performance';
}

export interface ValidationGateConfig {
  timeout: number;
  retryAttempts: number;
  passingScore: number;
  autoFix: boolean;
  strictMode: boolean;
  modules?: string[];
  environment?: Record<string, string>;
}

export interface ValidationExecution {
  executionId: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'passed' | 'failed' | 'warning' | 'timeout';
  score: number;
  criteriaResults: ValidationCriteriaResult[];
  logs: string[];
  performedBy: string;
  recommendations: string[];
}

export interface ValidationCriteriaResult {
  criteriaId: string;
  status: 'passed' | 'failed' | 'warning';
  actualValue: any;
  score: number;
  duration: number;
  error?: string;
  autoFixed?: boolean;
}

export interface ValidationMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  averageScore: number;
  averageDuration: number;
  successRate: number;
  lastExecutionTimestamp?: string;
}

export const VALIDATION_GATES = {
  WORKSPACE_HEALTH: 'workspace-health',
  DEPENDENCY_RESOLUTION: 'dependency-resolution',
  BUILD_SUCCESS: 'build-success',
  TEST_COVERAGE: 'test-coverage',
  ARCHITECTURE_COMPLIANCE: 'architecture-compliance',
  SECURITY_AUDIT: 'security-audit'
} as const;