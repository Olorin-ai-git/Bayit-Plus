/**
 * ModuleRecoveryState Model - T030
 * CVPlus Level 2 Recovery System
 *
 * Represents the current recovery state of a Level 2 module
 */

export interface ModuleRecoveryState {
  /** Unique identifier for the module */
  moduleId: string;

  /** Current health status of the module */
  healthStatus: 'healthy' | 'degraded' | 'critical' | 'offline';

  /** Overall health score (0-100) */
  healthScore: number;

  /** Current recovery phase the module is in */
  currentPhase?: string;

  /** Recovery strategy being applied */
  recoveryStrategy: 'repair' | 'rebuild' | 'reset';

  /** Timestamp when recovery state was last updated */
  lastUpdated: string;

  /** User who initiated the recovery */
  recoveredBy?: string;

  /** Dependencies that must be resolved before recovery */
  dependencies: ModuleDependency[];

  /** Current build metrics */
  buildMetrics?: BuildMetrics;

  /** Current test metrics */
  testMetrics?: TestMetrics;

  /** Configuration status */
  configurationStatus: ConfigurationStatus;

  /** Active recovery sessions */
  activeSessions: RecoverySession[];

  /** Recovery history */
  recoveryHistory: RecoveryHistoryEntry[];

  /** Validation results */
  validationResults: ValidationResult[];

  /** Estimated time to full recovery */
  estimatedRecoveryTime?: number;

  /** Recovery progress percentage (0-100) */
  recoveryProgress: number;

  /** Current issues affecting the module */
  issues: ModuleIssue[];

  /** Recovery metadata */
  metadata: {
    /** Module version */
    version: string;
    /** Package name */
    packageName: string;
    /** Source path */
    sourcePath: string;
    /** Build output path */
    outputPath?: string;
    /** Test suite path */
    testPath?: string;
    /** Configuration files */
    configFiles: string[];
    /** Last successful build timestamp */
    lastSuccessfulBuild?: string;
    /** Last successful test run timestamp */
    lastSuccessfulTest?: string;
  };
}

export interface ModuleDependency {
  /** Dependency module ID */
  moduleId: string;
  /** Dependency type */
  type: 'build' | 'runtime' | 'test' | 'dev';
  /** Whether dependency is required for recovery */
  required: boolean;
  /** Current status of the dependency */
  status: 'resolved' | 'missing' | 'version-mismatch' | 'circular';
  /** Version requirement */
  versionRequirement?: string;
  /** Actual version found */
  actualVersion?: string;
}

export interface BuildMetrics {
  /** Unique build identifier */
  buildId: string;
  /** Build status */
  status: 'success' | 'failed' | 'in-progress' | 'cancelled';
  /** Build start time */
  startTime: string;
  /** Build end time */
  endTime?: string;
  /** Build duration in milliseconds */
  duration?: number;
  /** Number of files processed */
  filesProcessed: number;
  /** Number of errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Build output size in bytes */
  outputSize?: number;
  /** TypeScript compilation metrics */
  compilation?: {
    typeCheckTime: number;
    emitTime: number;
    filesWithErrors: number;
  };
  /** Build artifacts generated */
  artifacts: string[];
}

export interface TestMetrics {
  /** Unique test run identifier */
  testRunId: string;
  /** Test status */
  status: 'passed' | 'failed' | 'running' | 'skipped';
  /** Test start time */
  startTime: string;
  /** Test end time */
  endTime?: string;
  /** Test duration in milliseconds */
  duration?: number;
  /** Total number of tests */
  totalTests: number;
  /** Number of passed tests */
  passedTests: number;
  /** Number of failed tests */
  failedTests: number;
  /** Number of skipped tests */
  skippedTests: number;
  /** Test coverage metrics */
  coverage: TestCoverage;
  /** Performance metrics */
  performance: {
    averageTestTime: number;
    slowestTest: {
      name: string;
      duration: number;
    };
  };
}

export interface TestCoverage {
  /** Line coverage percentage */
  lines: number;
  /** Function coverage percentage */
  functions: number;
  /** Branch coverage percentage */
  branches: number;
  /** Statement coverage percentage */
  statements: number;
  /** Covered files count */
  coveredFiles: number;
  /** Total files count */
  totalFiles: number;
  /** Uncovered lines */
  uncoveredLines: number[];
}

export interface ConfigurationStatus {
  /** Package.json validation status */
  packageJson: 'valid' | 'invalid' | 'missing';
  /** TypeScript configuration status */
  tsConfig: 'valid' | 'invalid' | 'missing';
  /** Build configuration status */
  buildConfig: 'valid' | 'invalid' | 'missing';
  /** Test configuration status */
  testConfig: 'valid' | 'invalid' | 'missing';
  /** ESLint configuration status */
  eslintConfig?: 'valid' | 'invalid' | 'missing';
  /** Git configuration status */
  gitConfig: 'valid' | 'invalid';
  /** Environment variables status */
  envConfig: 'valid' | 'invalid' | 'missing';
}

export interface RecoverySession {
  /** Unique session identifier */
  sessionId: string;
  /** Session start time */
  startTime: string;
  /** Session end time */
  endTime?: string;
  /** Recovery phase being executed */
  phase: string;
  /** Session status */
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  /** User who initiated the session */
  initiatedBy: string;
  /** Session progress percentage */
  progress: number;
  /** Current step being executed */
  currentStep?: string;
  /** Session logs */
  logs: string[];
}

export interface RecoveryHistoryEntry {
  /** Entry timestamp */
  timestamp: string;
  /** Type of recovery action */
  action: 'repair' | 'rebuild' | 'reset' | 'validate' | 'configure';
  /** Recovery phase */
  phase: string;
  /** Action result */
  result: 'success' | 'failed' | 'partial';
  /** Duration in milliseconds */
  duration: number;
  /** User who performed the action */
  performedBy: string;
  /** Action details */
  details: string;
  /** Before/after metrics */
  metrics?: {
    before: {
      healthScore: number;
      buildStatus: string;
      testStatus: string;
    };
    after: {
      healthScore: number;
      buildStatus: string;
      testStatus: string;
    };
  };
}

export interface ValidationResult {
  /** Validation gate identifier */
  gateId: string;
  /** Validation status */
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  /** Validation score (0-100) */
  score: number;
  /** Validation timestamp */
  timestamp: string;
  /** Validation duration */
  duration: number;
  /** Detailed validation results */
  details: {
    /** Criteria checked */
    criteria: string[];
    /** Failed criteria */
    failedCriteria: string[];
    /** Warnings */
    warnings: string[];
    /** Recommendations */
    recommendations: string[];
  };
}

export interface ModuleIssue {
  /** Issue identifier */
  issueId: string;
  /** Issue severity */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Issue category */
  category: 'build' | 'test' | 'dependency' | 'configuration' | 'security' | 'performance';
  /** Issue title */
  title: string;
  /** Issue description */
  description: string;
  /** Affected files */
  affectedFiles: string[];
  /** Issue status */
  status: 'open' | 'in-progress' | 'resolved' | 'ignored';
  /** Issue detection timestamp */
  detectedAt: string;
  /** Issue resolution timestamp */
  resolvedAt?: string;
  /** Suggested fix */
  suggestedFix?: string;
  /** Auto-fixable flag */
  autoFixable: boolean;
}

/**
 * Factory function to create a new ModuleRecoveryState
 */
export function createModuleRecoveryState(moduleId: string): ModuleRecoveryState {
  return {
    moduleId,
    healthStatus: 'offline',
    healthScore: 0,
    recoveryStrategy: 'repair',
    lastUpdated: new Date().toISOString(),
    dependencies: [],
    configurationStatus: {
      packageJson: 'missing',
      tsConfig: 'missing',
      buildConfig: 'missing',
      testConfig: 'missing',
      gitConfig: 'invalid',
      envConfig: 'missing'
    },
    activeSessions: [],
    recoveryHistory: [],
    validationResults: [],
    recoveryProgress: 0,
    issues: [],
    metadata: {
      version: '1.0.0',
      packageName: `@cvplus/${moduleId}`,
      sourcePath: `packages/${moduleId}/src`,
      configFiles: []
    }
  };
}

/**
 * Type guards for ModuleRecoveryState
 */
export function isHealthy(state: ModuleRecoveryState): boolean {
  return state.healthStatus === 'healthy' && state.healthScore >= 90;
}

export function isCritical(state: ModuleRecoveryState): boolean {
  return state.healthStatus === 'critical' || state.healthScore < 30;
}

export function hasActiveRecovery(state: ModuleRecoveryState): boolean {
  return state.activeSessions.some(session => session.status === 'active');
}

export function getLastRecoveryAction(state: ModuleRecoveryState): RecoveryHistoryEntry | null {
  return state.recoveryHistory.length > 0
    ? state.recoveryHistory[state.recoveryHistory.length - 1]
    : null;
}