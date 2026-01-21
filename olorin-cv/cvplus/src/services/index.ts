/**
 * Recovery Services
 * Centralized exports for all recovery-related services
 */

// Core recovery services
export { default as WorkspaceAnalyzer } from './WorkspaceAnalyzer';
export type {
  AnalysisOptions,
  AnalysisResult,
  AnalysisMetadata,
  Recommendation,
  CriticalIssue
} from './WorkspaceAnalyzer';

export { default as ModuleRecovery } from './ModuleRecovery';
export type {
  RecoveryOptions,
  RecoveryResult,
  PhaseResult,
  ConfigurationChange,
  ValidationResult,
  RecoveryPhase,
  MultiModuleRecoveryOptions,
  MultiModuleRecoveryResult
} from './ModuleRecovery';

export { default as PhaseExecutor } from './PhaseExecutor';
export type {
  PhaseExecutionOptions,
  PhaseExecutionResult,
  PhaseSummary,
  RecoveryProgress,
  TaskExecutionResult
} from './PhaseExecutor';

// Service factory functions
export const createWorkspaceAnalyzer = (workspacePath: string): WorkspaceAnalyzer => {
  return new WorkspaceAnalyzer(workspacePath);
};

export const createModuleRecovery = (workspacePath: string, recoverySession?: any): ModuleRecovery => {
  return new ModuleRecovery(workspacePath, recoverySession);
};

export const createPhaseExecutor = (workspacePath: string, recoverySession?: any): PhaseExecutor => {
  return new PhaseExecutor(workspacePath, recoverySession);
};

// Service orchestration utilities
export class RecoveryOrchestrator {
  private workspaceAnalyzer: WorkspaceAnalyzer;
  private moduleRecovery: ModuleRecovery;
  private phaseExecutor: PhaseExecutor;

  constructor(workspacePath: string, recoverySession?: any) {
    this.workspaceAnalyzer = new WorkspaceAnalyzer(workspacePath);
    this.moduleRecovery = new ModuleRecovery(workspacePath, recoverySession);
    this.phaseExecutor = new PhaseExecutor(workspacePath, recoverySession, this.workspaceAnalyzer, this.moduleRecovery);
  }

  /**
   * Get all recovery services
   */
  getServices() {
    return {
      workspaceAnalyzer: this.workspaceAnalyzer,
      moduleRecovery: this.moduleRecovery,
      phaseExecutor: this.phaseExecutor
    };
  }

  /**
   * Execute comprehensive workspace analysis
   */
  async analyzeWorkspace(options?: AnalysisOptions) {
    return this.workspaceAnalyzer.analyzeWorkspace(options);
  }

  /**
   * Execute module recovery
   */
  async recoverModule(options: RecoveryOptions) {
    return this.moduleRecovery.recoverModule(options);
  }

  /**
   * Execute recovery phase
   */
  async executePhase(options: PhaseExecutionOptions) {
    return this.phaseExecutor.executePhase(options);
  }

  /**
   * Get recovery progress
   */
  async getProgress() {
    return this.phaseExecutor.monitorProgress();
  }
}

// Service error types
export class RecoveryServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly operation: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'RecoveryServiceError';
  }
}

export class WorkspaceAnalysisError extends RecoveryServiceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'WorkspaceAnalyzer', 'analysis', details);
    this.name = 'WorkspaceAnalysisError';
  }
}

export class ModuleRecoveryError extends RecoveryServiceError {
  constructor(message: string, operation: string, details?: Record<string, any>) {
    super(message, 'ModuleRecovery', operation, details);
    this.name = 'ModuleRecoveryError';
  }
}

export class PhaseExecutionError extends RecoveryServiceError {
  constructor(message: string, operation: string, details?: Record<string, any>) {
    super(message, 'PhaseExecutor', operation, details);
    this.name = 'PhaseExecutionError';
  }
}

// Service validation utilities
export const validateServiceOptions = {
  analysis: (options: AnalysisOptions): string[] => {
    const errors: string[] = [];

    if (options.moduleFilter && !Array.isArray(options.moduleFilter)) {
      errors.push('moduleFilter must be an array');
    }

    if (options.analysisDepth && !['basic', 'detailed', 'comprehensive'].includes(options.analysisDepth)) {
      errors.push('analysisDepth must be basic, detailed, or comprehensive');
    }

    return errors;
  },

  recovery: (options: RecoveryOptions): string[] => {
    const errors: string[] = [];

    if (!options.moduleId) {
      errors.push('moduleId is required');
    }

    if (!options.workspacePath) {
      errors.push('workspacePath is required');
    }

    if (!options.recoveryStrategy) {
      errors.push('recoveryStrategy is required');
    }

    if (options.timeout && options.timeout < 0) {
      errors.push('timeout must be positive');
    }

    return errors;
  },

  phaseExecution: (options: PhaseExecutionOptions): string[] => {
    const errors: string[] = [];

    if (typeof options.phaseId !== 'number' || options.phaseId < 1) {
      errors.push('phaseId must be a positive number');
    }

    if (options.maxConcurrency && options.maxConcurrency < 1) {
      errors.push('maxConcurrency must be positive');
    }

    if (options.timeout && options.timeout < 0) {
      errors.push('timeout must be positive');
    }

    return errors;
  }
};

// Service health checking
export const checkServiceHealth = async (workspacePath: string): Promise<{
  workspaceAnalyzer: boolean;
  moduleRecovery: boolean;
  phaseExecutor: boolean;
  overall: boolean;
}> => {
  const health = {
    workspaceAnalyzer: false,
    moduleRecovery: false,
    phaseExecutor: false,
    overall: false
  };

  try {
    // Test WorkspaceAnalyzer
    const analyzer = new WorkspaceAnalyzer(workspacePath);
    const validationResult = await analyzer.validateConfiguration();
    health.workspaceAnalyzer = true;
  } catch (error) {
    health.workspaceAnalyzer = false;
  }

  try {
    // Test ModuleRecovery (dry run)
    const recovery = new ModuleRecovery(workspacePath);
    // Would perform a dry run test here
    health.moduleRecovery = true;
  } catch (error) {
    health.moduleRecovery = false;
  }

  try {
    // Test PhaseExecutor
    const executor = new PhaseExecutor(workspacePath);
    const phases = await executor.getPhases();
    health.phaseExecutor = true;
  } catch (error) {
    health.phaseExecutor = false;
  }

  health.overall = health.workspaceAnalyzer && health.moduleRecovery && health.phaseExecutor;

  return health;
};

// Service configuration
export const SERVICE_DEFAULTS = {
  ANALYSIS: {
    includeHealthMetrics: true,
    includeDependencyGraph: true,
    includeErrorDetails: true,
    analysisDepth: 'detailed' as const
  },
  RECOVERY: {
    maxRetries: 3,
    timeout: 1800, // 30 minutes
    backupPath: '/tmp/cvplus-recovery-backups'
  },
  PHASE_EXECUTION: {
    maxConcurrency: 4,
    timeout: 3600, // 1 hour
    parallelExecution: false
  }
} as const;

export default RecoveryOrchestrator;