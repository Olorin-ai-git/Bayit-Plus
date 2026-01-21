/**
 * RecoverySession Data Model
 * Core entity for tracking Level 2 module recovery sessions
 */

export interface RecoverySession {
  // Session identification
  id: string;
  workspacePath: string;
  sessionType: 'manual' | 'automated' | 'scheduled';

  // Session lifecycle
  status: RecoverySessionStatus;
  startTime: string; // ISO 8601 timestamp
  endTime?: string; // ISO 8601 timestamp
  duration?: number; // Duration in seconds

  // Recovery plan
  recoveryPlan: RecoveryPlan;
  currentPhase: number;
  currentTask?: string;

  // Progress tracking
  overallProgress: number; // 0-100 percentage
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;

  // Health metrics
  initialHealthScore: number; // 0-100
  currentHealthScore: number; // 0-100
  targetHealthScore: number; // 0-100
  healthImprovement: number; // 0-100

  // Error tracking
  totalErrorsAtStart: number;
  errorsResolved: number;
  errorsRemaining: number;

  // Session configuration
  configuration: RecoveryConfiguration;

  // Metadata
  createdBy: string;
  lastModified: string; // ISO 8601 timestamp
  modifiedBy: string;
  tags: string[];
  notes?: string;
}

export type RecoverySessionStatus =
  | 'initializing'
  | 'analyzing'
  | 'planning'
  | 'executing'
  | 'paused'
  | 'interrupted'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface RecoveryPlan {
  // Plan identification
  planId: string;
  planVersion: string;
  planType: 'comprehensive' | 'targeted' | 'emergency' | 'maintenance';

  // Phase structure
  phases: RecoveryPhase[];
  totalPhases: number;
  estimatedDuration: number; // Total estimated duration in seconds

  // Dependencies
  dependencies: PlanDependency[];

  // Execution strategy
  executionStrategy: 'sequential' | 'parallel' | 'hybrid';
  maxConcurrency?: number;

  // Recovery scope
  targetModules: string[];
  excludedModules: string[];
  recoveryScope: 'workspace' | 'modules' | 'dependencies' | 'all';

  // Success criteria
  successCriteria: SuccessCriteria;

  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  mitigationStrategies: string[];
}

export interface RecoveryPhase {
  // Phase identification
  phaseId: number;
  phaseName: string;
  phaseDescription: string;
  phaseType: 'stabilization' | 'analysis' | 'implementation' | 'validation' | 'monitoring';

  // Phase lifecycle
  status: PhaseStatus;
  startTime?: string; // ISO 8601 timestamp
  endTime?: string; // ISO 8601 timestamp
  duration?: number; // Duration in seconds
  estimatedDuration: number; // Estimated duration in seconds

  // Phase tasks
  tasks: RecoveryTask[];
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;

  // Phase dependencies
  dependsOn: number[]; // Array of phase IDs
  blockedBy: number[]; // Array of phase IDs that block this phase

  // Phase results
  healthImprovement: number; // Health improvement achieved by this phase
  errorsResolved: number; // Errors resolved in this phase
  artifacts: PhaseArtifact[]; // Files, configs, reports generated

  // Phase configuration
  parallelExecution: boolean;
  maxTaskConcurrency: number;
  rollbackCapable: boolean;

  // Validation
  validationRequired: boolean;
  validationCriteria: string[];
  validationResults?: PhaseValidationResult[];
}

export type PhaseStatus =
  | 'pending'
  | 'ready'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'rolled_back';

export interface RecoveryTask {
  // Task identification
  taskId: string;
  taskName: string;
  taskDescription: string;
  taskType: 'analysis' | 'repair' | 'build' | 'test' | 'validation' | 'configuration';

  // Task lifecycle
  status: TaskStatus;
  startTime?: string; // ISO 8601 timestamp
  endTime?: string; // ISO 8601 timestamp
  duration?: number; // Duration in seconds
  estimatedDuration: number; // Estimated duration in seconds

  // Task scope
  targetModules: string[];
  targetFiles: string[];
  targetConfigurations: string[];

  // Task execution
  command?: string; // Shell command to execute
  script?: string; // Script path to run
  function?: string; // Function to call
  parameters: Record<string, any>; // Task parameters

  // Task dependencies
  dependsOn: string[]; // Array of task IDs
  blockedBy: string[]; // Array of task IDs that block this task

  // Task results
  exitCode?: number;
  output?: string;
  errorOutput?: string;
  artifacts: string[]; // Generated files or outputs

  // Task validation
  validationRequired: boolean;
  validationCriteria: string[];
  validationResults?: TaskValidationResult[];

  // Retry configuration
  retryable: boolean;
  maxRetries: number;
  retryCount: number;
  retryDelay: number; // Delay between retries in seconds
}

export type TaskStatus =
  | 'pending'
  | 'ready'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'retrying'
  | 'cancelled';

export interface RecoveryConfiguration {
  // Execution settings
  executionMode: 'interactive' | 'automated' | 'batch';
  confirmationRequired: boolean;
  autoRollbackOnFailure: boolean;
  maxExecutionTime: number; // Maximum execution time in seconds

  // Backup settings
  createBackups: boolean;
  backupPath: string;
  maxBackups: number;
  compressBackups: boolean;

  // Resource limits
  maxCpuUsage: number; // Maximum CPU usage percentage
  maxMemoryUsage: number; // Maximum memory usage in MB
  maxDiskSpace: number; // Maximum disk space usage in MB
  maxConcurrentOperations: number;

  // Notification settings
  enableNotifications: boolean;
  notificationLevel: 'all' | 'errors' | 'critical';
  notificationChannels: string[];

  // Logging settings
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logPath: string;
  maxLogSize: number; // Maximum log size in MB
  logRetention: number; // Log retention in days

  // Validation settings
  strictValidation: boolean;
  skipNonCriticalValidation: boolean;
  validationTimeout: number; // Validation timeout in seconds
}

export interface PlanDependency {
  dependencyType: 'module' | 'service' | 'external' | 'configuration';
  dependencyName: string;
  version?: string;
  required: boolean;
  description: string;
  validationMethod: string;
}

export interface SuccessCriteria {
  // Health criteria
  minimumHealthScore: number; // 0-100
  maximumErrors: number;
  maximumWarnings: number;

  // Build criteria
  allModulesBuildSuccessfully: boolean;
  allTestsPass: boolean;
  typeCheckingPasses: boolean;
  lintingPasses: boolean;

  // Performance criteria
  maxBuildTime: number; // Maximum build time in seconds
  maxTestTime: number; // Maximum test execution time in seconds
  maxResourceUsage: number; // Maximum resource usage percentage

  // Quality criteria
  minimumTestCoverage: number; // 0-100 percentage
  minimumCodeQuality: number; // 0-100 score
  noSecurityVulnerabilities: boolean;

  // Integration criteria
  allDependenciesResolved: boolean;
  noCyclicDependencies: boolean;
  allExportsValid: boolean;
  allImportsValid: boolean;
}

export interface PhaseArtifact {
  artifactType: 'file' | 'directory' | 'report' | 'configuration' | 'backup';
  artifactPath: string;
  artifactName: string;
  artifactDescription: string;
  createdTime: string; // ISO 8601 timestamp
  size: number; // Size in bytes
  checksum: string; // File checksum for integrity
}

export interface PhaseValidationResult {
  validationName: string;
  validationStatus: 'passed' | 'failed' | 'warning';
  validationMessage: string;
  validationDetails: Record<string, any>;
  validationTime: string; // ISO 8601 timestamp
}

export interface TaskValidationResult {
  validationName: string;
  validationStatus: 'passed' | 'failed' | 'warning';
  validationMessage: string;
  validationDetails: Record<string, any>;
  validationTime: string; // ISO 8601 timestamp
}

// Factory functions for creating recovery sessions
export const createRecoverySession = (
  workspacePath: string,
  sessionType: RecoverySession['sessionType'] = 'manual'
): RecoverySession => {
  const now = new Date().toISOString();
  const sessionId = `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: sessionId,
    workspacePath,
    sessionType,
    status: 'initializing',
    startTime: now,
    recoveryPlan: createDefaultRecoveryPlan(),
    currentPhase: 1,
    overallProgress: 0,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    initialHealthScore: 0,
    currentHealthScore: 0,
    targetHealthScore: 85,
    healthImprovement: 0,
    totalErrorsAtStart: 0,
    errorsResolved: 0,
    errorsRemaining: 0,
    configuration: createDefaultConfiguration(),
    createdBy: 'system',
    lastModified: now,
    modifiedBy: 'system',
    tags: []
  };
};

export const createDefaultRecoveryPlan = (): RecoveryPlan => {
  return {
    planId: `plan-${Date.now()}`,
    planVersion: '1.0.0',
    planType: 'comprehensive',
    phases: [],
    totalPhases: 4,
    estimatedDuration: 7200, // 2 hours
    dependencies: [],
    executionStrategy: 'sequential',
    targetModules: [],
    excludedModules: [],
    recoveryScope: 'all',
    successCriteria: {
      minimumHealthScore: 85,
      maximumErrors: 0,
      maximumWarnings: 5,
      allModulesBuildSuccessfully: true,
      allTestsPass: true,
      typeCheckingPasses: true,
      lintingPasses: true,
      maxBuildTime: 300,
      maxTestTime: 600,
      maxResourceUsage: 80,
      minimumTestCoverage: 80,
      minimumCodeQuality: 80,
      noSecurityVulnerabilities: true,
      allDependenciesResolved: true,
      noCyclicDependencies: true,
      allExportsValid: true,
      allImportsValid: true
    },
    riskLevel: 'medium',
    riskFactors: [],
    mitigationStrategies: []
  };
};

export const createDefaultConfiguration = (): RecoveryConfiguration => {
  return {
    executionMode: 'automated',
    confirmationRequired: false,
    autoRollbackOnFailure: true,
    maxExecutionTime: 14400, // 4 hours
    createBackups: true,
    backupPath: '/tmp/cvplus-recovery-backups',
    maxBackups: 10,
    compressBackups: true,
    maxCpuUsage: 80,
    maxMemoryUsage: 4096, // 4GB
    maxDiskSpace: 10240, // 10GB
    maxConcurrentOperations: 4,
    enableNotifications: true,
    notificationLevel: 'errors',
    notificationChannels: ['console'],
    logLevel: 'info',
    logPath: '/tmp/cvplus-recovery.log',
    maxLogSize: 100, // 100MB
    logRetention: 7, // 7 days
    strictValidation: true,
    skipNonCriticalValidation: false,
    validationTimeout: 300 // 5 minutes
  };
};