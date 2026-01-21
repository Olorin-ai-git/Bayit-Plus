/**
 * Recovery Models Index - CVPlus Level 2 Recovery System
 *
 * Exports all data models for the recovery system (T030-T037)
  */

// Core Recovery Models
export * from './ModuleRecoveryState';
export * from './RecoveryPhase';
export * from './ValidationGate';
export * from './ValidationCriteria';

// Dependency and Build Models
export * from './DependencyInfo';
export * from './BuildMetrics';

// Test and Coverage Models
export * from './TestMetrics';
export * from './TestCoverage';

// Re-export common types for convenience
export type {
  ModuleRecoveryState,
  RecoveryPhase,
  ValidationGate,
  ValidationCriteria,
  DependencyInfo,
  BuildMetrics,
  TestMetrics,
  TestCoverage
} from './ModuleRecoveryState';

export type {
  PhaseStatus,
  PhaseCategory,
  PhaseDependency,
  PhaseTask,
  PhaseConfiguration
} from './RecoveryPhase';

export type {
  ValidationExecution,
  ValidationCriteriaResult,
  ValidationMetrics
} from './ValidationGate';

export type {
  DependencyType,
  DependencyStatus,
  DependencyConflict,
  SecurityVulnerability
} from './DependencyInfo';

export type {
  BuildStatus,
  BuildConfiguration,
  CompilationMetrics,
  BundleMetrics,
  BuildArtifact,
  BuildError
} from './BuildMetrics';

export type {
  TestStatus,
  TestConfiguration,
  TestSuiteResult,
  TestCaseResult,
  TestPerformanceMetrics
} from './TestMetrics';

export type {
  CoverageMetrics,
  FileCoverage,
  CoverageThresholds,
  UncoveredAnalysis,
  CoverageTrends
} from './TestCoverage';

// Factory functions
export {
  createModuleRecoveryState,
  isHealthy,
  isCritical,
  hasActiveRecovery,
  getLastRecoveryAction
} from './ModuleRecoveryState';

export {
  RECOVERY_PHASES,
  createRecoveryPhase,
  isPhaseReady,
  getPhaseProgress,
  isPhaseCritical
} from './RecoveryPhase';

export {
  VALIDATION_GATES
} from './ValidationGate';

export {
  VALIDATION_CRITERIA,
  createValidationCriteria
} from './ValidationCriteria';

export {
  createDependencyInfo
} from './DependencyInfo';

export {
  createBuildMetrics
} from './BuildMetrics';

export {
  createTestMetrics
} from './TestMetrics';

export {
  createTestCoverage,
  calculateCoverageScore,
  getCoverageStatus
} from './TestCoverage';

// Model validation utilities
export function validateModuleId(moduleId: string): boolean {
  const validModules = [
    'auth', 'i18n', 'processing', 'multimedia', 'analytics',
    'premium', 'public-profiles', 'recommendations', 'admin', 'workflow', 'payments'
  ];
  return validModules.includes(moduleId);
}

export function validatePhaseId(phaseId: string): boolean {
  const validPhases = [
    'emergency-stabilization',
    'build-infrastructure',
    'test-recovery',
    'architecture-compliance'
  ];
  return validPhases.includes(phaseId);
}

export function validateGateId(gateId: string): boolean {
  return Object.values(VALIDATION_GATES).includes(gateId as any);
}

// Common constants
export const MODULE_IDS = [
  'auth', 'i18n', 'processing', 'multimedia', 'analytics',
  'premium', 'public-profiles', 'recommendations', 'admin', 'workflow', 'payments'
] as const;

export const PHASE_IDS = [
  'emergency-stabilization',
  'build-infrastructure',
  'test-recovery',
  'architecture-compliance'
] as const;

export const HEALTH_THRESHOLDS = {
  CRITICAL: 30,
  DEGRADED: 60,
  HEALTHY: 90
} as const;

export const COVERAGE_THRESHOLDS = {
  LINES: 80,
  FUNCTIONS: 80,
  BRANCHES: 70,
  STATEMENTS: 80
} as const;