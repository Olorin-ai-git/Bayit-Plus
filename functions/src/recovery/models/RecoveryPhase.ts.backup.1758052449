/**
 * RecoveryPhase Model - T031
 * CVPlus Level 2 Recovery System
 *
 * Represents a recovery phase in the Level 2 recovery process
 */

export interface RecoveryPhase {
  /** Unique phase identifier */
  phaseId: string;

  /** Human-readable phase name */
  name: string;

  /** Phase description */
  description: string;

  /** Phase execution order */
  order: number;

  /** Current phase status */
  status: PhaseStatus;

  /** Phase category */
  category: PhaseCategory;

  /** Required dependencies (other phases) */
  dependencies: PhaseDependency[];

  /** Validation gates for this phase */
  validationGates: ValidationGate[];

  /** Tasks to be executed in this phase */
  tasks: PhaseTask[];

  /** Modules affected by this phase */
  affectedModules: string[];

  /** Estimated execution time in milliseconds */
  estimatedDuration: number;

  /** Actual execution time in milliseconds */
  actualDuration?: number;

  /** Phase execution start time */
  startTime?: string;

  /** Phase execution end time */
  endTime?: string;

  /** Current execution progress (0-100) */
  progress: number;

  /** Phase execution results */
  executionResults?: PhaseExecutionResult;

  /** Phase configuration */
  configuration: PhaseConfiguration;

  /** Phase metrics */
  metrics: PhaseMetrics;

  /** Phase metadata */
  metadata: {
    /** Phase version */
    version: string;
    /** Last updated timestamp */
    lastUpdated: string;
    /** Created by */
    createdBy: string;
    /** Phase documentation URL */
    documentationUrl?: string;
    /** Phase tags for categorization */
    tags: string[];
  };
}

export type PhaseStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'blocked';

export type PhaseCategory =
  | 'infrastructure'
  | 'validation'
  | 'build'
  | 'test'
  | 'deployment'
  | 'monitoring'
  | 'compliance'
  | 'security';

export interface PhaseDependency {
  /** Dependent phase ID */
  phaseId: string;
  /** Dependency type */
  type: 'strict' | 'soft' | 'optional';
  /** Dependency reason/description */
  reason: string;
  /** Whether dependency must be completed or just started */
  completionRequired: boolean;
}

export interface ValidationGate {
  /** Unique gate identifier */
  gateId: string;
  /** Gate name */
  name: string;
  /** Gate description */
  description: string;
  /** Whether gate is required for phase completion */
  required: boolean;
  /** Gate execution order within phase */
  order: number;
  /** Current gate status */
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  /** Validation criteria */
  criteria: ValidationCriteria[];
  /** Gate configuration */
  configuration: {
    /** Timeout in milliseconds */
    timeout: number;
    /** Retry attempts */
    retryAttempts: number;
    /** Minimum passing score */
    passingScore: number;
    /** Whether to auto-fix issues */
    autoFix: boolean;
  };
}

export interface ValidationCriteria {
  /** Criteria identifier */
  criteriaId: string;
  /** Criteria name */
  name: string;
  /** Criteria description */
  description: string;
  /** Criteria weight in overall validation */
  weight: number;
  /** Criteria type */
  type: 'boolean' | 'numeric' | 'percentage' | 'enum';
  /** Expected value or range */
  expectedValue: any;
  /** Actual measured value */
  actualValue?: any;
  /** Criteria status */
  status: 'pending' | 'passed' | 'failed' | 'warning';
  /** Error message if failed */
  errorMessage?: string;
}

export interface PhaseTask {
  /** Unique task identifier */
  taskId: string;
  /** Task name */
  name: string;
  /** Task description */
  description: string;
  /** Task type */
  type: 'script' | 'validation' | 'build' | 'test' | 'configuration' | 'manual';
  /** Task execution order within phase */
  order: number;
  /** Current task status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  /** Task dependencies within phase */
  dependencies: string[];
  /** Modules this task applies to */
  applicableModules: string[];
  /** Task configuration */
  configuration: {
    /** Script path or command */
    script?: string;
    /** Working directory */
    workingDirectory?: string;
    /** Environment variables */
    environment?: Record<string, string>;
    /** Timeout in milliseconds */
    timeout: number;
    /** Whether task can run in parallel */
    parallel: boolean;
    /** Retry configuration */
    retry: {
      attempts: number;
      backoff: number;
    };
  };
  /** Task execution result */
  result?: TaskExecutionResult;
}

export interface TaskExecutionResult {
  /** Task execution start time */
  startTime: string;
  /** Task execution end time */
  endTime: string;
  /** Task execution duration */
  duration: number;
  /** Task exit code */
  exitCode: number;
  /** Task standard output */
  stdout: string;
  /** Task standard error */
  stderr: string;
  /** Task execution logs */
  logs: string[];
  /** Task metrics */
  metrics: Record<string, any>;
}

export interface PhaseExecutionResult {
  /** Phase execution ID */
  executionId: string;
  /** Phase execution start time */
  startTime: string;
  /** Phase execution end time */
  endTime: string;
  /** Phase execution duration */
  duration: number;
  /** Number of tasks executed */
  tasksExecuted: number;
  /** Number of tasks succeeded */
  tasksSucceeded: number;
  /** Number of tasks failed */
  tasksFailed: number;
  /** Number of tasks skipped */
  tasksSkipped: number;
  /** Validation gate results */
  validationResults: ValidationGateResult[];
  /** Module impact assessment */
  moduleImpact: Record<string, ModuleImpact>;
  /** Phase execution logs */
  logs: string[];
  /** Performance metrics */
  performanceMetrics: {
    /** Memory usage peak */
    peakMemoryUsage: number;
    /** CPU usage average */
    averageCpuUsage: number;
    /** Network I/O */
    networkIO: number;
    /** Disk I/O */
    diskIO: number;
  };
}

export interface ValidationGateResult {
  /** Gate identifier */
  gateId: string;
  /** Gate execution status */
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  /** Gate score (0-100) */
  score: number;
  /** Gate execution duration */
  duration: number;
  /** Criteria results */
  criteriaResults: ValidationCriteriaResult[];
  /** Gate recommendations */
  recommendations: string[];
}

export interface ValidationCriteriaResult {
  /** Criteria identifier */
  criteriaId: string;
  /** Criteria status */
  status: 'passed' | 'failed' | 'warning';
  /** Actual value measured */
  actualValue: any;
  /** Score contribution */
  score: number;
  /** Error details if failed */
  error?: string;
}

export interface ModuleImpact {
  /** Whether module was affected by phase */
  affected: boolean;
  /** Changes made to module */
  changes: string[];
  /** Health score change */
  healthDelta: number;
  /** Build status change */
  buildStatusChange?: string;
  /** Test status change */
  testStatusChange?: string;
  /** Files modified */
  filesModified: string[];
  /** Configuration changes */
  configurationChanges: Record<string, any>;
}

export interface PhaseConfiguration {
  /** Phase execution mode */
  executionMode: 'sequential' | 'parallel' | 'mixed';
  /** Whether to continue on task failure */
  continueOnFailure: boolean;
  /** Whether to rollback on phase failure */
  rollbackOnFailure: boolean;
  /** Maximum parallel tasks */
  maxParallelTasks: number;
  /** Phase timeout in milliseconds */
  timeout: number;
  /** Environment variables */
  environment: Record<string, string>;
  /** Resource limits */
  resourceLimits: {
    memory: number;
    cpu: number;
    disk: number;
  };
}

export interface PhaseMetrics {
  /** Total phase executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Average execution time */
  averageExecutionTime: number;
  /** Success rate percentage */
  successRate: number;
  /** Performance trend */
  performanceTrend: 'improving' | 'stable' | 'declining';
  /** Last execution metrics */
  lastExecution?: {
    timestamp: string;
    duration: number;
    status: PhaseStatus;
    score: number;
  };
}

/**
 * Predefined recovery phases for CVPlus Level 2 Recovery
 */
export const RECOVERY_PHASES: RecoveryPhase[] = [
  {
    phaseId: 'emergency-stabilization',
    name: 'Emergency Stabilization',
    description: 'Stabilize workspace configuration and resolve critical issues',
    order: 1,
    status: 'pending',
    category: 'infrastructure',
    dependencies: [],
    validationGates: [
      {
        gateId: 'workspace-health',
        name: 'Workspace Health Check',
        description: 'Validate workspace configuration integrity',
        required: true,
        order: 1,
        status: 'pending',
        criteria: [],
        configuration: {
          timeout: 30000,
          retryAttempts: 3,
          passingScore: 80,
          autoFix: true
        }
      }
    ],
    tasks: [],
    affectedModules: [],
    estimatedDuration: 300000,
    progress: 0,
    configuration: {
      executionMode: 'sequential',
      continueOnFailure: false,
      rollbackOnFailure: true,
      maxParallelTasks: 1,
      timeout: 600000,
      environment: {},
      resourceLimits: {
        memory: 1024,
        cpu: 100,
        disk: 1024
      }
    },
    metrics: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      successRate: 0,
      performanceTrend: 'stable'
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      createdBy: 'system',
      tags: ['critical', 'infrastructure', 'stabilization']
    }
  },
  {
    phaseId: 'build-infrastructure',
    name: 'Build Infrastructure Recovery',
    description: 'Standardize and fix build configurations across all modules',
    order: 2,
    status: 'pending',
    category: 'build',
    dependencies: [
      {
        phaseId: 'emergency-stabilization',
        type: 'strict',
        reason: 'Workspace must be stable before build infrastructure changes',
        completionRequired: true
      }
    ],
    validationGates: [
      {
        gateId: 'build-success',
        name: 'Build Success Validation',
        description: 'Validate all modules build successfully',
        required: true,
        order: 1,
        status: 'pending',
        criteria: [],
        configuration: {
          timeout: 300000,
          retryAttempts: 2,
          passingScore: 95,
          autoFix: false
        }
      }
    ],
    tasks: [],
    affectedModules: [],
    estimatedDuration: 600000,
    progress: 0,
    configuration: {
      executionMode: 'parallel',
      continueOnFailure: true,
      rollbackOnFailure: false,
      maxParallelTasks: 5,
      timeout: 1200000,
      environment: {},
      resourceLimits: {
        memory: 2048,
        cpu: 200,
        disk: 2048
      }
    },
    metrics: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      successRate: 0,
      performanceTrend: 'stable'
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      createdBy: 'system',
      tags: ['build', 'infrastructure', 'standardization']
    }
  },
  {
    phaseId: 'test-recovery',
    name: 'Test Suite Recovery',
    description: 'Recover and standardize test infrastructure across all modules',
    order: 3,
    status: 'pending',
    category: 'test',
    dependencies: [
      {
        phaseId: 'build-infrastructure',
        type: 'strict',
        reason: 'Build infrastructure must be working before test recovery',
        completionRequired: true
      }
    ],
    validationGates: [
      {
        gateId: 'test-coverage',
        name: 'Test Coverage Validation',
        description: 'Validate test coverage meets minimum requirements',
        required: true,
        order: 1,
        status: 'pending',
        criteria: [],
        configuration: {
          timeout: 600000,
          retryAttempts: 1,
          passingScore: 80,
          autoFix: false
        }
      }
    ],
    tasks: [],
    affectedModules: [],
    estimatedDuration: 900000,
    progress: 0,
    configuration: {
      executionMode: 'mixed',
      continueOnFailure: true,
      rollbackOnFailure: false,
      maxParallelTasks: 3,
      timeout: 1800000,
      environment: {},
      resourceLimits: {
        memory: 4096,
        cpu: 300,
        disk: 4096
      }
    },
    metrics: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      successRate: 0,
      performanceTrend: 'stable'
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      createdBy: 'system',
      tags: ['test', 'coverage', 'quality']
    }
  },
  {
    phaseId: 'architecture-compliance',
    name: 'Architecture Compliance Recovery',
    description: 'Ensure all modules comply with CVPlus architecture standards',
    order: 4,
    status: 'pending',
    category: 'compliance',
    dependencies: [
      {
        phaseId: 'test-recovery',
        type: 'strict',
        reason: 'Tests must be working before architecture validation',
        completionRequired: true
      }
    ],
    validationGates: [
      {
        gateId: 'architecture-compliance',
        name: 'Architecture Compliance Check',
        description: 'Validate architecture compliance across all modules',
        required: true,
        order: 1,
        status: 'pending',
        criteria: [],
        configuration: {
          timeout: 300000,
          retryAttempts: 1,
          passingScore: 85,
          autoFix: true
        }
      },
      {
        gateId: 'security-audit',
        name: 'Security Audit',
        description: 'Validate security compliance and detect vulnerabilities',
        required: true,
        order: 2,
        status: 'pending',
        criteria: [],
        configuration: {
          timeout: 600000,
          retryAttempts: 1,
          passingScore: 90,
          autoFix: false
        }
      }
    ],
    tasks: [],
    affectedModules: [],
    estimatedDuration: 450000,
    progress: 0,
    configuration: {
      executionMode: 'sequential',
      continueOnFailure: false,
      rollbackOnFailure: true,
      maxParallelTasks: 2,
      timeout: 900000,
      environment: {},
      resourceLimits: {
        memory: 2048,
        cpu: 150,
        disk: 2048
      }
    },
    metrics: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      successRate: 0,
      performanceTrend: 'stable'
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      createdBy: 'system',
      tags: ['architecture', 'compliance', 'security']
    }
  }
];

/**
 * Factory functions for RecoveryPhase
 */
export function createRecoveryPhase(
  phaseId: string,
  name: string,
  description: string,
  order: number,
  category: PhaseCategory
): RecoveryPhase {
  return {
    phaseId,
    name,
    description,
    order,
    status: 'pending',
    category,
    dependencies: [],
    validationGates: [],
    tasks: [],
    affectedModules: [],
    estimatedDuration: 300000,
    progress: 0,
    configuration: {
      executionMode: 'sequential',
      continueOnFailure: false,
      rollbackOnFailure: true,
      maxParallelTasks: 1,
      timeout: 600000,
      environment: {},
      resourceLimits: {
        memory: 1024,
        cpu: 100,
        disk: 1024
      }
    },
    metrics: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      successRate: 0,
      performanceTrend: 'stable'
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      createdBy: 'system',
      tags: []
    }
  };
}

/**
 * Utility functions for RecoveryPhase
 */
export function isPhaseReady(phase: RecoveryPhase, completedPhases: string[]): boolean {
  return phase.dependencies.every(dep =>
    !dep.completionRequired || completedPhases.includes(dep.phaseId)
  );
}

export function getPhaseProgress(phase: RecoveryPhase): number {
  if (phase.tasks.length === 0) return 0;

  const completedTasks = phase.tasks.filter(task => task.status === 'completed').length;
  return Math.round((completedTasks / phase.tasks.length) * 100);
}

export function isPhaseCritical(phase: RecoveryPhase): boolean {
  return phase.category === 'infrastructure' || phase.category === 'security';
}