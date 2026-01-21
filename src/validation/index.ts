/**
 * Validation System
 * Central export point for all validation functionality
 */

export * from './WorkspaceValidator';
export * from './ModuleValidator';
export * from './DependencyValidator';
export * from './ValidationReporter';
export * from './ValidationOrchestrator';

// Validation types and interfaces
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  validate(context: ValidationContext): Promise<ValidationRuleResult>;
}

export interface ValidationRuleResult {
  passed: boolean;
  message: string;
  details?: any;
  recommendations?: string[];
  affectedFiles?: string[];
  executionTime: number;
}

export interface ValidationContext {
  workspacePath: string;
  moduleId?: string;
  targetModules?: string[];
  validationOptions: ValidationOptions;
}

export interface ValidationOptions {
  includeHealthMetrics: boolean;
  includeDependencyChecks: boolean;
  includeFileSystemChecks: boolean;
  includeBuildValidation: boolean;
  includeTestValidation: boolean;
  validationDepth: 'basic' | 'standard' | 'comprehensive' | 'exhaustive';
  skipValidationIds?: string[];
  customValidationRules?: ValidationRule[];
}

export interface ValidationSuite {
  id: string;
  name: string;
  description: string;
  rules: ValidationRule[];
  executionOrder: number;
}

export interface ValidationReport {
  summary: ValidationSummary;
  suiteResults: ValidationSuiteResult[];
  moduleResults: ModuleValidationResult[];
  recommendations: ValidationRecommendation[];
  metadata: ValidationMetadata;
}

export interface ValidationSummary {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  skippedRules: number;
  overallScore: number;
  overallStatus: 'healthy' | 'warning' | 'critical' | 'failed';
  criticalIssues: number;
  warningIssues: number;
  executionTime: number;
}

export interface ValidationSuiteResult {
  suiteId: string;
  suiteName: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  ruleResults: ValidationRuleResult[];
  summary: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    score: number;
    executionTime: number;
  };
}

export interface ModuleValidationResult {
  moduleId: string;
  status: 'healthy' | 'warning' | 'critical' | 'failed';
  healthScore: number;
  suiteResults: ValidationSuiteResult[];
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  details: any;
  affectedFiles: string[];
  recommendations: string[];
}

export interface ValidationRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: ValidationCategory;
  title: string;
  description: string;
  actionItems: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  affectedModules: string[];
}

export interface ValidationMetadata {
  startTime: string;
  endTime: string;
  executionTime: number;
  workspacePath: string;
  validationOptions: ValidationOptions;
  systemInfo: {
    nodeVersion: string;
    platform: string;
    memory: any;
  };
  validationVersion: string;
}

export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ValidationCategory =
  | 'filesystem'
  | 'dependencies'
  | 'configuration'
  | 'build'
  | 'tests'
  | 'performance'
  | 'security'
  | 'architecture'
  | 'documentation'
  | 'integration';

// Validation constants
export const VALIDATION_SEVERITIES: Record<ValidationSeverity, { weight: number; label: string }> = {
  critical: { weight: 100, label: 'Critical' },
  high: { weight: 80, label: 'High' },
  medium: { weight: 60, label: 'Medium' },
  low: { weight: 40, label: 'Low' },
  info: { weight: 20, label: 'Info' }
};

export const VALIDATION_CATEGORIES: Record<ValidationCategory, { label: string; description: string }> = {
  filesystem: { label: 'File System', description: 'File and directory structure validation' },
  dependencies: { label: 'Dependencies', description: 'Package and dependency validation' },
  configuration: { label: 'Configuration', description: 'Configuration files and settings validation' },
  build: { label: 'Build', description: 'Build process and compilation validation' },
  tests: { label: 'Tests', description: 'Test suite and coverage validation' },
  performance: { label: 'Performance', description: 'Performance metrics and optimization validation' },
  security: { label: 'Security', description: 'Security vulnerabilities and best practices validation' },
  architecture: { label: 'Architecture', description: 'Architecture compliance and design patterns validation' },
  documentation: { label: 'Documentation', description: 'Documentation completeness and quality validation' },
  integration: { label: 'Integration', description: 'Module integration and API compatibility validation' }
};

// Default validation options
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  includeHealthMetrics: true,
  includeDependencyChecks: true,
  includeFileSystemChecks: true,
  includeBuildValidation: true,
  includeTestValidation: true,
  validationDepth: 'standard',
  skipValidationIds: [],
  customValidationRules: []
};

// Validation scoring utilities
export const calculateValidationScore = (passedRules: number, totalRules: number, weightedScore?: number): number => {
  if (totalRules === 0) return 100;

  const baseScore = (passedRules / totalRules) * 100;

  if (weightedScore !== undefined) {
    // Combine base score with weighted score (70% base, 30% weighted)
    return Math.round(baseScore * 0.7 + weightedScore * 0.3);
  }

  return Math.round(baseScore);
};

export const getValidationStatus = (score: number): 'healthy' | 'warning' | 'critical' | 'failed' => {
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'warning';
  if (score >= 50) return 'critical';
  return 'failed';
};

export const getScoreColor = (score: number): string => {
  if (score >= 90) return '#10B981'; // green
  if (score >= 70) return '#F59E0B'; // yellow
  if (score >= 50) return '#F97316'; // orange
  return '#EF4444'; // red
};

// Validation rule utilities
export const createValidationRule = (
  id: string,
  name: string,
  description: string,
  category: ValidationCategory,
  severity: ValidationSeverity,
  validator: (context: ValidationContext) => Promise<ValidationRuleResult>
): ValidationRule => ({
  id,
  name,
  description,
  category,
  severity,
  validate: validator
});

export const createValidationSuite = (
  id: string,
  name: string,
  description: string,
  rules: ValidationRule[],
  executionOrder: number = 0
): ValidationSuite => ({
  id,
  name,
  description,
  rules,
  executionOrder
});