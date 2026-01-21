/**
 * TestMetrics Model - T036
 * CVPlus Level 2 Recovery System
 */

export interface TestMetrics {
  testRunId: string;
  moduleId: string;
  status: TestStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  testConfig: TestConfiguration;
  suiteResults: TestSuiteResult[];
  coverage: TestCoverage;
  performance: TestPerformanceMetrics;
  quality: TestQualityMetrics;
  errors: TestError[];
  warnings: TestWarning[];
  summary: TestSummary;
  environment: TestEnvironment;
}

export type TestStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'partial'
  | 'skipped'
  | 'timeout'
  | 'cancelled';

export interface TestConfiguration {
  framework: 'vitest' | 'jest' | 'mocha' | 'jasmine';
  coverage: boolean;
  watch: boolean;
  parallel: boolean;
  maxWorkers: number;
  timeout: number;
  retries: number;
  pattern: string;
  environment: 'node' | 'jsdom' | 'happy-dom';
  setupFiles: string[];
  teardownFiles: string[];
}

export interface TestSuiteResult {
  suiteName: string;
  filePath: string;
  status: TestStatus;
  startTime: string;
  endTime: string;
  duration: number;
  tests: TestCaseResult[];
  hooks: HookResult[];
  coverage?: FileCoverage;
}

export interface TestCaseResult {
  testName: string;
  fullName: string;
  status: TestStatus;
  duration: number;
  error?: TestError;
  retries: number;
  tags: string[];
  assertions: AssertionResult[];
}

export interface HookResult {
  type: 'beforeAll' | 'afterAll' | 'beforeEach' | 'afterEach';
  status: TestStatus;
  duration: number;
  error?: TestError;
}

export interface AssertionResult {
  passed: boolean;
  expected?: any;
  actual?: any;
  message?: string;
  stack?: string;
}

export interface TestCoverage {
  lines: CoverageMetrics;
  functions: CoverageMetrics;
  branches: CoverageMetrics;
  statements: CoverageMetrics;
  files: FileCoverage[];
  threshold: CoverageThreshold;
  uncovered: UncoveredCode;
}

export interface CoverageMetrics {
  total: number;
  covered: number;
  skipped: number;
  percentage: number;
}

export interface FileCoverage {
  filePath: string;
  lines: CoverageMetrics;
  functions: CoverageMetrics;
  branches: CoverageMetrics;
  statements: CoverageMetrics;
  uncoveredLines: number[];
  uncoveredFunctions: string[];
  uncoveredBranches: BranchCoverage[];
}

export interface BranchCoverage {
  line: number;
  type: 'if' | 'switch' | 'conditional' | 'logical';
  covered: boolean[];
}

export interface CoverageThreshold {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  global: number;
}

export interface UncoveredCode {
  criticalPaths: string[];
  complexFunctions: string[];
  errorHandling: string[];
  edgeCases: string[];
}

export interface TestPerformanceMetrics {
  totalTime: number;
  setupTime: number;
  executionTime: number;
  teardownTime: number;
  memoryUsage: MemoryUsage;
  cpuUsage: number;
  parallelization: ParallelizationMetrics;
  slowestTests: SlowTest[];
  bottlenecks: PerformanceBottleneck[];
}

export interface SlowTest {
  testName: string;
  filePath: string;
  duration: number;
  threshold: number;
  reason?: string;
}

export interface PerformanceBottleneck {
  type: 'setup' | 'test' | 'teardown' | 'io' | 'computation';
  location: string;
  impact: number;
  suggestion: string;
}

export interface TestQualityMetrics {
  totalTests: number;
  unitTests: number;
  integrationTests: number;
  e2eTests: number;
  complexity: TestComplexityMetrics;
  maintainability: TestMaintainabilityMetrics;
  reliability: TestReliabilityMetrics;
  antiPatterns: TestAntiPattern[];
}

export interface TestComplexityMetrics {
  averageAssertions: number;
  maxAssertions: number;
  averageSetupComplexity: number;
  nestedSuites: number;
  conditionalTests: number;
}

export interface TestMaintainabilityMetrics {
  duplicatedCode: number;
  testDataComplexity: number;
  setupReusability: number;
  helperFunctions: number;
  magicNumbers: number;
}

export interface TestReliabilityMetrics {
  flakyTests: FlakyTest[];
  dependentTests: string[];
  timeoutTests: string[];
  resourceLeaks: string[];
  externalDependencies: string[];
}

export interface FlakyTest {
  testName: string;
  filePath: string;
  failureRate: number;
  lastFailures: string[];
  possibleCauses: string[];
}

export interface TestAntiPattern {
  type: 'multiple-assertions' | 'testing-implementation' | 'empty-test' | 'skip-without-reason' | 'long-test' | 'unclear-naming';
  location: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface TestError {
  errorId: string;
  type: 'assertion' | 'timeout' | 'setup' | 'teardown' | 'system';
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  expected?: any;
  actual?: any;
  diff?: string;
}

export interface TestWarning {
  warningId: string;
  type: 'deprecation' | 'performance' | 'coverage' | 'quality';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  flakyTests: number;
  passRate: number;
  coverageRate: number;
  qualityScore: number;
  performanceScore: number;
  recommendation: string;
}

export interface TestEnvironment {
  nodeVersion: string;
  testFramework: string;
  testFrameworkVersion: string;
  platform: string;
  arch: string;
  memory: number;
  cpu: number;
  ci: boolean;
  parallel: boolean;
  workers: number;
}

export interface TestTrend {
  period: 'daily' | 'weekly' | 'monthly';
  metrics: TestTrendMetric[];
  insights: TestInsight[];
}

export interface TestTrendMetric {
  date: string;
  totalTests: number;
  passRate: number;
  coverageRate: number;
  averageDuration: number;
  qualityScore: number;
}

export interface TestInsight {
  type: 'improvement' | 'regression' | 'stability' | 'alert';
  metric: string;
  change: number;
  description: string;
  recommendation?: string;
}

export function createTestMetrics(moduleId: string, testRunId?: string): TestMetrics {
  return {
    testRunId: testRunId || `test-${Date.now()}`,
    moduleId,
    status: 'pending',
    startTime: new Date().toISOString(),
    testConfig: {
      framework: 'vitest',
      coverage: true,
      watch: false,
      parallel: true,
      maxWorkers: 4,
      timeout: 30000,
      retries: 0,
      pattern: '**/*.test.{ts,js}',
      environment: 'node',
      setupFiles: [],
      teardownFiles: []
    },
    suiteResults: [],
    coverage: {
      lines: { total: 0, covered: 0, skipped: 0, percentage: 0 },
      functions: { total: 0, covered: 0, skipped: 0, percentage: 0 },
      branches: { total: 0, covered: 0, skipped: 0, percentage: 0 },
      statements: { total: 0, covered: 0, skipped: 0, percentage: 0 },
      files: [],
      threshold: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        global: 80
      },
      uncovered: {
        criticalPaths: [],
        complexFunctions: [],
        errorHandling: [],
        edgeCases: []
      }
    },
    performance: {
      totalTime: 0,
      setupTime: 0,
      executionTime: 0,
      teardownTime: 0,
      memoryUsage: {
        peak: 0,
        average: 0,
        initial: 0,
        final: 0,
        heapUsed: 0,
        heapTotal: 0
      },
      cpuUsage: 0,
      parallelization: {
        workers: 1,
        tasksParallel: 0,
        tasksSequential: 0,
        efficiency: 0,
        loadBalance: 0
      },
      slowestTests: [],
      bottlenecks: []
    },
    quality: {
      totalTests: 0,
      unitTests: 0,
      integrationTests: 0,
      e2eTests: 0,
      complexity: {
        averageAssertions: 0,
        maxAssertions: 0,
        averageSetupComplexity: 0,
        nestedSuites: 0,
        conditionalTests: 0
      },
      maintainability: {
        duplicatedCode: 0,
        testDataComplexity: 0,
        setupReusability: 0,
        helperFunctions: 0,
        magicNumbers: 0
      },
      reliability: {
        flakyTests: [],
        dependentTests: [],
        timeoutTests: [],
        resourceLeaks: [],
        externalDependencies: []
      },
      antiPatterns: []
    },
    errors: [],
    warnings: [],
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      flakyTests: 0,
      passRate: 0,
      coverageRate: 0,
      qualityScore: 0,
      performanceScore: 0,
      recommendation: ''
    },
    environment: {
      nodeVersion: process.version,
      testFramework: 'vitest',
      testFrameworkVersion: '1.0.0',
      platform: process.platform,
      arch: process.arch,
      memory: 0,
      cpu: 0,
      ci: false,
      parallel: true,
      workers: 4
    }
  };
}