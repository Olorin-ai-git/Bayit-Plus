/**
 * Recovery System Data Models
 * Centralized exports for all recovery-related data models
 */

// Core recovery session management
export {
  type RecoverySession,
  type RecoverySessionStatus,
  type RecoveryPlan,
  type RecoveryPhase,
  type PhaseStatus,
  type RecoveryTask,
  type TaskStatus,
  type RecoveryConfiguration,
  type PlanDependency,
  type SuccessCriteria,
  type PhaseArtifact,
  type PhaseValidationResult,
  type TaskValidationResult,
  createRecoverySession,
  createDefaultRecoveryPlan,
  createDefaultConfiguration
} from './RecoverySession';

// Module state tracking and health
export {
  type ModuleState,
  type ModuleStatus,
  type ModuleCategory,
  type BuildStatus,
  type TestStatus,
  type DependencyHealth,
  type BuildError,
  type BuildWarning,
  type TestResult,
  type TestAssertion,
  type TestCoverage,
  type CoverageMetric,
  type ModuleDependency,
  type DependencyIssue,
  type CriticalError,
  type NonCriticalError,
  type ModuleWarning,
  type ConfigurationError,
  type PerformanceMetrics,
  type RecoveryState,
  type RecoveryStrategy,
  type RecoveryAttempt,
  createModuleState,
  calculateHealthScore,
  getModuleStatus,
  getRecoveryPriority,
  getRecoveryStrategy
} from './ModuleState';

// Workspace-level health and analytics
export {
  type WorkspaceHealth,
  type WorkspaceHealthStatus,
  type ModuleSummary,
  type HealthDistribution,
  type LayerHealth,
  type LayerHealthMetrics,
  type LayerDependencyIssue,
  type DependencyGraph,
  type DependencyNode,
  type DependencyEdge,
  type CircularDependency,
  type BuildSystemHealth,
  type TestSystemHealth,
  type ConfigurationHealth,
  type ConfigurationConflict,
  type WorkspacePerformanceMetrics,
  type PerformanceCategory,
  type DeveloperExperienceMetrics,
  type ResourceUtilizationMetrics,
  type ResourceMetric,
  type ResourceUsageMetrics,
  type RiskAssessment,
  type Risk,
  type MitigationStrategy,
  type RecoveryReadiness,
  type RecoveryBlocker,
  type HealthTrend,
  type HealthSnapshot,
  type CommonIssue,
  type FlakyTest,
  createWorkspaceHealth,
  calculateOverallHealthScore,
  getWorkspaceHealthStatus,
  calculateModuleSummary
} from './WorkspaceHealth';

// Type guards and validation utilities
export const isValidModuleStatus = (status: string): status is ModuleStatus => {
  return ['healthy', 'warning', 'critical', 'failed', 'recovering', 'unknown'].includes(status);
};

export const isValidBuildStatus = (status: string): status is BuildStatus => {
  return ['success', 'failed', 'building', 'not_started', 'cancelled'].includes(status);
};

export const isValidTestStatus = (status: string): status is TestStatus => {
  return ['passing', 'failing', 'running', 'not_configured', 'not_started', 'cancelled'].includes(status);
};

export const isValidDependencyHealth = (health: string): health is DependencyHealth => {
  return ['resolved', 'missing', 'conflicted', 'circular', 'outdated'].includes(health);
};

export const isValidRecoverySessionStatus = (status: string): status is RecoverySessionStatus => {
  return ['initializing', 'analyzing', 'planning', 'executing', 'paused', 'interrupted', 'completed', 'failed', 'cancelled'].includes(status);
};

export const isValidPhaseStatus = (status: string): status is PhaseStatus => {
  return ['pending', 'ready', 'executing', 'completed', 'failed', 'skipped', 'rolled_back'].includes(status);
};

export const isValidTaskStatus = (status: string): status is TaskStatus => {
  return ['pending', 'ready', 'executing', 'completed', 'failed', 'skipped', 'retrying', 'cancelled'].includes(status);
};

export const isValidWorkspaceHealthStatus = (status: string): status is WorkspaceHealthStatus => {
  return ['excellent', 'good', 'fair', 'poor', 'critical', 'failed'].includes(status);
};

// Validation functions for data integrity
export const validateRecoverySession = (session: Partial<RecoverySession>): string[] => {
  const errors: string[] = [];

  if (!session.id) errors.push('Recovery session ID is required');
  if (!session.workspacePath) errors.push('Workspace path is required');
  if (!session.startTime) errors.push('Start time is required');
  if (session.overallProgress !== undefined && (session.overallProgress < 0 || session.overallProgress > 100)) {
    errors.push('Overall progress must be between 0 and 100');
  }
  if (session.healthImprovement !== undefined && (session.healthImprovement < 0 || session.healthImprovement > 100)) {
    errors.push('Health improvement must be between 0 and 100');
  }

  return errors;
};

export const validateModuleState = (moduleState: Partial<ModuleState>): string[] => {
  const errors: string[] = [];

  if (!moduleState.moduleId) errors.push('Module ID is required');
  if (moduleState.healthScore !== undefined && (moduleState.healthScore < 0 || moduleState.healthScore > 100)) {
    errors.push('Health score must be between 0 and 100');
  }
  if (moduleState.errorCount !== undefined && moduleState.errorCount < 0) {
    errors.push('Error count cannot be negative');
  }
  if (moduleState.warningCount !== undefined && moduleState.warningCount < 0) {
    errors.push('Warning count cannot be negative');
  }

  return errors;
};

export const validateWorkspaceHealth = (health: Partial<WorkspaceHealth>): string[] => {
  const errors: string[] = [];

  if (!health.workspaceId) errors.push('Workspace ID is required');
  if (!health.workspacePath) errors.push('Workspace path is required');
  if (health.overallHealthScore !== undefined && (health.overallHealthScore < 0 || health.overallHealthScore > 100)) {
    errors.push('Overall health score must be between 0 and 100');
  }

  return errors;
};

// Utility functions for common operations
export const getHealthScoreColor = (score: number): string => {
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
};

export const getHealthScoreLabel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  if (score >= 10) return 'Critical';
  return 'Failed';
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
};

export const calculateTimeRemaining = (startTime: string, totalDuration: number, progress: number): number => {
  const start = new Date(startTime).getTime();
  const elapsed = (Date.now() - start) / 1000;
  const estimatedTotal = progress > 0 ? elapsed / (progress / 100) : totalDuration;
  return Math.max(0, estimatedTotal - elapsed);
};

export const isRecoveryComplete = (session: RecoverySession): boolean => {
  return session.status === 'completed' && session.overallProgress === 100;
};

export const isRecoverySuccessful = (session: RecoverySession, targetHealthScore: number = 85): boolean => {
  return isRecoveryComplete(session) && session.currentHealthScore >= targetHealthScore;
};

export const getRecoverySessionSummary = (session: RecoverySession): string => {
  const duration = session.duration ? formatDuration(session.duration) : 'In progress';
  const improvement = session.healthImprovement > 0 ? `+${session.healthImprovement}` : '0';
  return `${session.status.toUpperCase()} | Duration: ${duration} | Health: ${session.currentHealthScore}/100 (${improvement})`;
};

// Constants for recovery system
export const RECOVERY_SYSTEM_VERSION = '1.0.0';

export const DEFAULT_HEALTH_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
  POOR: 30,
  CRITICAL: 10
} as const;

export const DEFAULT_RECOVERY_TIMEOUTS = {
  TASK_TIMEOUT: 300,        // 5 minutes per task
  PHASE_TIMEOUT: 3600,      // 1 hour per phase
  SESSION_TIMEOUT: 14400,   // 4 hours per session
  VALIDATION_TIMEOUT: 300   // 5 minutes for validation
} as const;

export const LAYER_DEPENDENCIES = {
  layer0: [], // No dependencies
  layer1: ['layer0'], // Depends on core
  layer2: ['layer0', 'layer1'] // Depends on core and foundation
} as const;

export const MODULE_CATEGORIES = {
  'core': 'layer0',
  'shell': 'layer0',
  'logging': 'layer0',
  'auth': 'layer1',
  'i18n': 'layer1',
  'cv-processing': 'layer2',
  'multimedia': 'layer2',
  'analytics': 'layer2',
  'premium': 'layer2',
  'public-profiles': 'layer2',
  'recommendations': 'layer2',
  'admin': 'layer2',
  'workflow': 'layer2',
  'payments': 'layer2'
} as const;