/**
 * ModuleState Data Model
 * Core entity for tracking individual Level 2 module health and recovery state
 */

export interface ModuleState {
  // Module identification
  moduleId: string;
  moduleName: string;
  moduleType: 'layer0' | 'layer1' | 'layer2';
  moduleCategory: ModuleCategory;

  // Module status
  status: ModuleStatus;
  healthScore: number; // 0-100 overall health score
  lastAssessment: string; // ISO 8601 timestamp

  // Build status
  buildStatus: BuildStatus;
  lastBuildTime?: string; // ISO 8601 timestamp
  buildDuration?: number; // Build duration in seconds
  buildErrors: BuildError[];
  buildWarnings: BuildWarning[];
  buildArtifacts: string[]; // Paths to build outputs

  // Test status
  testStatus: TestStatus;
  lastTestRun?: string; // ISO 8601 timestamp
  testDuration?: number; // Test execution duration in seconds
  testResults: TestResult[];
  testCoverage: TestCoverage;

  // Dependency status
  dependencyHealth: DependencyHealth;
  dependencies: ModuleDependency[];
  dependentModules: string[]; // Modules that depend on this module
  circularDependencies: string[]; // Circular dependency chains

  // Error tracking
  errorCount: number;
  warningCount: number;
  criticalErrors: CriticalError[];
  nonCriticalErrors: NonCriticalError[];
  warnings: ModuleWarning[];

  // Configuration status
  configurationValid: boolean;
  configurationErrors: ConfigurationError[];
  packageJsonValid: boolean;
  tsconfigValid: boolean;
  buildConfigValid: boolean;

  // Code quality metrics
  codeQualityScore: number; // 0-100
  lintErrors: number;
  lintWarnings: number;
  typeErrors: number;
  complexityScore: number; // Cyclomatic complexity
  maintainabilityIndex: number; // 0-100

  // Performance metrics
  bundleSize: number; // Bundle size in bytes
  buildPerformance: PerformanceMetrics;
  testPerformance: PerformanceMetrics;

  // Recovery status
  recoveryState: RecoveryState;
  recoveryHistory: RecoveryAttempt[];
  lastRecoveryAttempt?: string; // ISO 8601 timestamp

  // Metadata
  version: string;
  lastModified: string; // ISO 8601 timestamp
  modifiedBy: string;
  tags: string[];
  notes?: string;
}

export type ModuleStatus =
  | 'healthy'           // All systems operational, no issues
  | 'warning'           // Minor issues that don't affect functionality
  | 'critical'          // Major issues that affect functionality
  | 'failed'            // Module is non-functional
  | 'recovering'        // Currently undergoing recovery
  | 'unknown';          // Status cannot be determined

export type ModuleCategory =
  | 'core'              // Core infrastructure (core, shell, logging)
  | 'foundation'        // Foundation services (auth, i18n)
  | 'business'          // Business logic (cv-processing, multimedia, etc.)
  | 'integration'       // Integration and utilities
  | 'testing';          // Test and development tools

export type BuildStatus =
  | 'success'           // Build completed successfully
  | 'failed'            // Build failed with errors
  | 'building'          // Currently building
  | 'not_started'       // Build has not been initiated
  | 'cancelled';        // Build was cancelled

export type TestStatus =
  | 'passing'           // All tests pass
  | 'failing'           // Some tests fail
  | 'running'           // Tests currently executing
  | 'not_configured'    // Tests not set up
  | 'not_started'       // Tests not run yet
  | 'cancelled';        // Test execution was cancelled

export type DependencyHealth =
  | 'resolved'          // All dependencies resolved correctly
  | 'missing'           // Missing required dependencies
  | 'conflicted'        // Version conflicts in dependencies
  | 'circular'          // Circular dependency detected
  | 'outdated';         // Dependencies are outdated

export interface BuildError {
  errorId: string;
  errorType: 'compilation' | 'type' | 'lint' | 'configuration' | 'dependency';
  severity: 'error' | 'warning';
  message: string;
  file: string;
  line?: number;
  column?: number;
  code?: string;
  stack?: string;
  timestamp: string; // ISO 8601 timestamp
  resolved: boolean;
  resolutionNote?: string;
}

export interface BuildWarning {
  warningId: string;
  warningType: 'deprecation' | 'unused' | 'performance' | 'style' | 'configuration';
  message: string;
  file: string;
  line?: number;
  column?: number;
  code?: string;
  timestamp: string; // ISO 8601 timestamp
  acknowledged: boolean;
  suppressionReason?: string;
}

export interface TestResult {
  testSuite: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number; // Test execution time in milliseconds
  error?: string;
  output?: string;
  assertions: TestAssertion[];
  timestamp: string; // ISO 8601 timestamp
}

export interface TestAssertion {
  assertion: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  message?: string;
}

export interface TestCoverage {
  overall: number; // 0-100 percentage
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines: CoverageMetric;
  uncoveredFiles: string[];
  coverageThreshold: number; // Minimum required coverage
  meetsThreshold: boolean;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number; // 0-100
}

export interface ModuleDependency {
  dependencyName: string;
  dependencyType: 'production' | 'development' | 'peer' | 'optional';
  requiredVersion: string;
  installedVersion?: string;
  satisfied: boolean;
  source: 'npm' | 'workspace' | 'local' | 'git' | 'url';
  path?: string;
  issues: DependencyIssue[];
}

export interface DependencyIssue {
  issueType: 'missing' | 'version_mismatch' | 'security' | 'deprecated' | 'license';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  autoFixable: boolean;
}

export interface CriticalError {
  errorId: string;
  errorType: 'build_failure' | 'test_failure' | 'dependency_missing' | 'configuration_invalid';
  severity: 'critical';
  message: string;
  impact: 'blocks_build' | 'blocks_tests' | 'blocks_functionality' | 'blocks_deployment';
  firstOccurred: string; // ISO 8601 timestamp
  lastOccurred: string; // ISO 8601 timestamp
  occurrenceCount: number;
  resolved: boolean;
  resolutionTime?: string; // ISO 8601 timestamp
  resolutionMethod?: string;
  preventionStrategy?: string;
}

export interface NonCriticalError {
  errorId: string;
  errorType: 'lint_error' | 'type_warning' | 'performance_warning' | 'style_violation';
  severity: 'medium' | 'low';
  message: string;
  impact: 'code_quality' | 'maintainability' | 'performance' | 'style';
  firstOccurred: string; // ISO 8601 timestamp
  lastOccurred: string; // ISO 8601 timestamp
  occurrenceCount: number;
  acknowledged: boolean;
  suppressionReason?: string;
}

export interface ModuleWarning {
  warningId: string;
  warningType: 'deprecation' | 'unused_code' | 'performance' | 'security' | 'best_practice';
  severity: 'info' | 'low';
  message: string;
  recommendation: string;
  file: string;
  line?: number;
  autoFixable: boolean;
  timestamp: string; // ISO 8601 timestamp
  acknowledged: boolean;
}

export interface ConfigurationError {
  configFile: string;
  errorType: 'syntax' | 'validation' | 'missing_field' | 'invalid_value';
  field?: string;
  message: string;
  expectedValue?: any;
  actualValue?: any;
  autoFixable: boolean;
  fixSuggestion?: string;
}

export interface PerformanceMetrics {
  averageDuration: number; // Average duration in milliseconds
  minDuration: number; // Minimum duration in milliseconds
  maxDuration: number; // Maximum duration in milliseconds
  lastDuration: number; // Last execution duration in milliseconds
  trend: 'improving' | 'stable' | 'degrading';
  benchmarkComparison: number; // Comparison to baseline (-100 to +100)
}

export interface RecoveryState {
  recoveryNeeded: boolean;
  recoveryPriority: 'low' | 'medium' | 'high' | 'critical';
  recoveryStrategy: RecoveryStrategy;
  estimatedRecoveryTime: number; // Estimated time in seconds
  recoveryComplexity: 'simple' | 'moderate' | 'complex' | 'critical';
  blockedBy: string[]; // Dependencies that must be recovered first
  blocks: string[]; // Modules that are blocked by this module's issues
}

export type RecoveryStrategy =
  | 'repair'            // Fix existing issues
  | 'rebuild'           // Rebuild from scratch
  | 'reset'             // Reset to default configuration
  | 'replace'           // Replace with known good version
  | 'skip'              // Skip recovery (non-critical)
  | 'manual';           // Requires manual intervention

export interface RecoveryAttempt {
  attemptId: string;
  startTime: string; // ISO 8601 timestamp
  endTime?: string; // ISO 8601 timestamp
  duration?: number; // Duration in seconds
  strategy: RecoveryStrategy;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  healthBefore: number; // Health score before recovery
  healthAfter?: number; // Health score after recovery
  errorsFixed: number;
  warningsFixed: number;
  issuesIntroduced: number;
  rollbackRequired: boolean;
  notes?: string;
}

// Factory functions for creating module states
export const createModuleState = (moduleId: string, moduleCategory: ModuleCategory): ModuleState => {
  const now = new Date().toISOString();

  return {
    moduleId,
    moduleName: moduleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    moduleType: moduleCategory === 'core' ? 'layer0' : moduleCategory === 'foundation' ? 'layer1' : 'layer2',
    moduleCategory,
    status: 'unknown',
    healthScore: 0,
    lastAssessment: now,
    buildStatus: 'not_started',
    buildErrors: [],
    buildWarnings: [],
    buildArtifacts: [],
    testStatus: 'not_configured',
    testResults: [],
    testCoverage: {
      overall: 0,
      statements: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      lines: { total: 0, covered: 0, percentage: 0 },
      uncoveredFiles: [],
      coverageThreshold: 80,
      meetsThreshold: false
    },
    dependencyHealth: 'resolved',
    dependencies: [],
    dependentModules: [],
    circularDependencies: [],
    errorCount: 0,
    warningCount: 0,
    criticalErrors: [],
    nonCriticalErrors: [],
    warnings: [],
    configurationValid: false,
    configurationErrors: [],
    packageJsonValid: false,
    tsconfigValid: false,
    buildConfigValid: false,
    codeQualityScore: 0,
    lintErrors: 0,
    lintWarnings: 0,
    typeErrors: 0,
    complexityScore: 0,
    maintainabilityIndex: 0,
    bundleSize: 0,
    buildPerformance: {
      averageDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      lastDuration: 0,
      trend: 'stable',
      benchmarkComparison: 0
    },
    testPerformance: {
      averageDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      lastDuration: 0,
      trend: 'stable',
      benchmarkComparison: 0
    },
    recoveryState: {
      recoveryNeeded: false,
      recoveryPriority: 'low',
      recoveryStrategy: 'repair',
      estimatedRecoveryTime: 0,
      recoveryComplexity: 'simple',
      blockedBy: [],
      blocks: []
    },
    recoveryHistory: [],
    version: '1.0.0',
    lastModified: now,
    modifiedBy: 'system',
    tags: []
  };
};

export const calculateHealthScore = (moduleState: ModuleState): number => {
  let score = 100;

  // Build status impact
  switch (moduleState.buildStatus) {
    case 'failed':
      score -= 40;
      break;
    case 'not_started':
      score -= 20;
      break;
    case 'building':
      score -= 10;
      break;
  }

  // Test status impact
  switch (moduleState.testStatus) {
    case 'failing':
      score -= 30;
      break;
    case 'not_configured':
      score -= 15;
      break;
    case 'running':
      score -= 5;
      break;
  }

  // Dependency health impact
  switch (moduleState.dependencyHealth) {
    case 'missing':
      score -= 25;
      break;
    case 'conflicted':
      score -= 20;
      break;
    case 'circular':
      score -= 35;
      break;
    case 'outdated':
      score -= 10;
      break;
  }

  // Error impact
  score -= Math.min(moduleState.errorCount * 2, 20);
  score -= Math.min(moduleState.warningCount * 1, 10);
  score -= Math.min(moduleState.criticalErrors.length * 10, 30);

  // Configuration impact
  if (!moduleState.configurationValid) score -= 15;
  if (!moduleState.packageJsonValid) score -= 10;
  if (!moduleState.tsconfigValid) score -= 10;

  // Test coverage impact
  const coverageImpact = Math.max(0, (80 - moduleState.testCoverage.overall) * 0.5);
  score -= coverageImpact;

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const getModuleStatus = (healthScore: number): ModuleStatus => {
  if (healthScore >= 90) return 'healthy';
  if (healthScore >= 70) return 'warning';
  if (healthScore >= 40) return 'critical';
  if (healthScore > 0) return 'failed';
  return 'unknown';
};

export const getRecoveryPriority = (moduleState: ModuleState): RecoveryState['recoveryPriority'] => {
  if (moduleState.healthScore < 20) return 'critical';
  if (moduleState.healthScore < 40) return 'high';
  if (moduleState.healthScore < 70) return 'medium';
  return 'low';
};

export const getRecoveryStrategy = (moduleState: ModuleState): RecoveryStrategy => {
  // Critical errors require rebuilding
  if (moduleState.criticalErrors.length > 0) return 'rebuild';

  // Too many errors suggest rebuild
  if (moduleState.errorCount > 10) return 'rebuild';

  // Dependency issues often need repair
  if (moduleState.dependencyHealth !== 'resolved') return 'repair';

  // Configuration issues can usually be repaired
  if (!moduleState.configurationValid) return 'repair';

  // Build failures might need rebuild
  if (moduleState.buildStatus === 'failed') return 'rebuild';

  // Default to repair for other issues
  return 'repair';
};