/**
 * TestCoverage Model - T037
 * CVPlus Level 2 Recovery System
 */

export interface TestCoverage {
  coverageId: string;
  moduleId: string;
  testRunId: string;
  timestamp: string;
  overall: CoverageMetrics;
  lines: CoverageMetrics;
  functions: CoverageMetrics;
  branches: CoverageMetrics;
  statements: CoverageMetrics;
  files: FileCoverage[];
  directories: DirectoryCoverage[];
  thresholds: CoverageThresholds;
  uncovered: UncoveredAnalysis;
  trends: CoverageTrends;
  quality: CoverageQuality;
}

export interface CoverageMetrics {
  total: number;
  covered: number;
  skipped: number;
  percentage: number;
  delta?: number; // Change from previous run
}

export interface FileCoverage {
  filePath: string;
  relativePath: string;
  size: number;
  lines: DetailedCoverageMetrics;
  functions: DetailedCoverageMetrics;
  branches: DetailedCoverageMetrics;
  statements: DetailedCoverageMetrics;
  complexity: number;
  maintainabilityIndex: number;
  lastModified: string;
  criticality: 'high' | 'medium' | 'low';
}

export interface DetailedCoverageMetrics extends CoverageMetrics {
  uncoveredRanges: CoverageRange[];
  hitCounts: Map<number, number>;
  executionPaths: ExecutionPath[];
}

export interface CoverageRange {
  start: Position;
  end: Position;
  type: 'line' | 'function' | 'branch' | 'statement';
  reason?: string;
}

export interface Position {
  line: number;
  column: number;
}

export interface ExecutionPath {
  pathId: string;
  conditions: PathCondition[];
  covered: boolean;
  complexity: number;
  frequency?: number;
}

export interface PathCondition {
  line: number;
  condition: string;
  result: boolean | 'unknown';
}

export interface DirectoryCoverage {
  directoryPath: string;
  fileCount: number;
  lines: CoverageMetrics;
  functions: CoverageMetrics;
  branches: CoverageMetrics;
  statements: CoverageMetrics;
  averageCoverage: number;
  worstFile?: string;
  bestFile?: string;
}

export interface CoverageThresholds {
  global: ThresholdConfig;
  perFile: ThresholdConfig;
  perDirectory: Record<string, ThresholdConfig>;
  enforced: boolean;
  violations: ThresholdViolation[];
}

export interface ThresholdConfig {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  combined: number;
}

export interface ThresholdViolation {
  type: 'global' | 'file' | 'directory';
  target: string;
  metric: 'lines' | 'functions' | 'branches' | 'statements' | 'combined';
  actual: number;
  required: number;
  severity: 'error' | 'warning';
}

export interface UncoveredAnalysis {
  criticalPaths: CriticalPath[];
  errorHandling: ErrorHandlingCoverage[];
  edgeCases: EdgeCaseCoverage[];
  deadCode: DeadCodeAnalysis[];
  recommendations: CoverageRecommendation[];
}

export interface CriticalPath {
  pathId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  description: string;
  businessImpact: 'high' | 'medium' | 'low';
  testSuggestion: string;
}

export interface ErrorHandlingCoverage {
  filePath: string;
  line: number;
  errorType: string;
  covered: boolean;
  testScenario?: string;
}

export interface EdgeCaseCoverage {
  filePath: string;
  line: number;
  caseType: string;
  covered: boolean;
  inputValues?: any[];
}

export interface DeadCodeAnalysis {
  filePath: string;
  startLine: number;
  endLine: number;
  reason: 'unreachable' | 'unused' | 'deprecated';
  confidence: number;
  suggestion: 'remove' | 'test' | 'refactor';
}

export interface CoverageRecommendation {
  type: 'missing-test' | 'improve-test' | 'remove-code' | 'refactor';
  priority: 'high' | 'medium' | 'low';
  description: string;
  filePath?: string;
  line?: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  impact: string;
}

export interface CoverageTrends {
  history: CoverageSnapshot[];
  trend: 'improving' | 'stable' | 'declining';
  velocity: number; // Rate of change per day
  predictions: CoveragePrediction[];
}

export interface CoverageSnapshot {
  timestamp: string;
  overall: number;
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  testCount: number;
  changedFiles: string[];
}

export interface CoveragePrediction {
  targetDate: string;
  predictedCoverage: number;
  confidence: number;
  assumptions: string[];
}

export interface CoverageQuality {
  score: number; // 0-100
  factors: QualityFactor[];
  antiPatterns: CoverageAntiPattern[];
  testEffectiveness: TestEffectiveness;
  suggestions: QualityImprovement[];
}

export interface QualityFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
  impact: 'positive' | 'negative';
}

export interface CoverageAntiPattern {
  type: 'false-positive' | 'shallow-test' | 'over-mocking' | 'integration-gap' | 'flaky-coverage';
  location: string;
  description: string;
  impact: string;
  fix: string;
}

export interface TestEffectiveness {
  mutationScore?: number;
  faultDetection: number;
  regressionPrevention: number;
  changeDetection: number;
  businessLogicCoverage: number;
}

export interface QualityImprovement {
  action: string;
  effort: 'low' | 'medium' | 'high';
  benefit: 'low' | 'medium' | 'high';
  priority: number;
  description: string;
}

export interface CoverageReport {
  summary: CoverageSummary;
  details: TestCoverage;
  visualizations: CoverageVisualization[];
  export: CoverageExport;
}

export interface CoverageSummary {
  moduleId: string;
  timestamp: string;
  overallPercentage: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  passesThreshold: boolean;
  keyMetrics: KeyMetric[];
  highlights: string[];
  concerns: string[];
}

export interface KeyMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  context: string;
}

export interface CoverageVisualization {
  type: 'heatmap' | 'treemap' | 'timeline' | 'sunburst';
  data: any;
  options: any;
  description: string;
}

export interface CoverageExport {
  formats: CoverageFormat[];
  urls: ExportUrl[];
  metadata: ExportMetadata;
}

export interface CoverageFormat {
  format: 'html' | 'xml' | 'json' | 'lcov' | 'cobertura';
  size: number;
  generated: string;
  url: string;
}

export interface ExportUrl {
  type: 'download' | 'view' | 'share';
  url: string;
  expires?: string;
}

export interface ExportMetadata {
  generator: string;
  version: string;
  timestamp: string;
  moduleInfo: {
    name: string;
    version: string;
    path: string;
  };
}

export function createTestCoverage(
  moduleId: string,
  testRunId: string,
  coverageId?: string
): TestCoverage {
  return {
    coverageId: coverageId || `coverage-${Date.now()}`,
    moduleId,
    testRunId,
    timestamp: new Date().toISOString(),
    overall: { total: 0, covered: 0, skipped: 0, percentage: 0 },
    lines: { total: 0, covered: 0, skipped: 0, percentage: 0 },
    functions: { total: 0, covered: 0, skipped: 0, percentage: 0 },
    branches: { total: 0, covered: 0, skipped: 0, percentage: 0 },
    statements: { total: 0, covered: 0, skipped: 0, percentage: 0 },
    files: [],
    directories: [],
    thresholds: {
      global: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        combined: 80
      },
      perFile: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
        combined: 70
      },
      perDirectory: {},
      enforced: true,
      violations: []
    },
    uncovered: {
      criticalPaths: [],
      errorHandling: [],
      edgeCases: [],
      deadCode: [],
      recommendations: []
    },
    trends: {
      history: [],
      trend: 'stable',
      velocity: 0,
      predictions: []
    },
    quality: {
      score: 0,
      factors: [],
      antiPatterns: [],
      testEffectiveness: {
        faultDetection: 0,
        regressionPrevention: 0,
        changeDetection: 0,
        businessLogicCoverage: 0
      },
      suggestions: []
    }
  };
}

export function calculateCoverageScore(coverage: TestCoverage): number {
  const weights = {
    lines: 0.3,
    functions: 0.25,
    branches: 0.25,
    statements: 0.2
  };

  return Math.round(
    coverage.lines.percentage * weights.lines +
    coverage.functions.percentage * weights.functions +
    coverage.branches.percentage * weights.branches +
    coverage.statements.percentage * weights.statements
  );
}

export function getCoverageStatus(coverage: TestCoverage): 'excellent' | 'good' | 'fair' | 'poor' {
  const score = calculateCoverageScore(coverage);

  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'fair';
  return 'poor';
}