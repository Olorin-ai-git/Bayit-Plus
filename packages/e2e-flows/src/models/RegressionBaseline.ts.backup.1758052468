/**
 * RegressionBaseline entity model
 * Historical test results used for comparative analysis and change detection.
 */

export interface BaselineMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
    max: number;
    min: number;
  };
  throughput: {
    requestsPerSecond: number;
    maxConcurrent: number;
  };
  resources: {
    memoryUsageMB: number;
    cpuUsagePercent: number;
    diskUsageMB: number;
    networkKbps: number;
  };
  reliability: {
    successRate: number;
    errorRate: number;
    timeoutRate: number;
  };
  customMetrics: Record<string, number>;
}

export interface BaselineResults {
  status: 'passed' | 'failed' | 'mixed';
  passedTests: number;
  failedTests: number;
  totalTests: number;
  criticalFailures: number;
  outcomes: BaselineOutcome[];
  artifacts: BaselineArtifact[];
}

export interface BaselineOutcome {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  expectedValue: any;
  actualValue: any;
  variance: number;
}

export interface BaselineArtifact {
  type: 'report' | 'log' | 'screenshot' | 'profile';
  name: string;
  path: string;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
}

export interface ToleranceConfig {
  performance: {
    responseTime: number; // percentage variance allowed
    throughput: number;   // percentage variance allowed
    memoryUsage: number;  // percentage variance allowed
    cpuUsage: number;     // percentage variance allowed
  };
  reliability: {
    successRate: number;  // percentage points allowed
    errorRate: number;    // percentage points allowed
  };
  functional: {
    allowNewPassing: boolean;
    allowNewFailing: boolean;
    criticalTestTolerance: number;
  };
  custom: Record<string, number>;
}

export interface ComparisonRule {
  metric: string;
  operator: 'equals' | 'greater' | 'less' | 'between' | 'not_equals';
  threshold: number | [number, number];
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  enabled: boolean;
}

export interface RegressionBaseline {
  id: string;
  scenarioId: string;
  version: string;
  metrics: BaselineMetrics;
  results: BaselineResults;
  environment: string;
  createdAt: Date;
  isActive: boolean;
  tolerance: ToleranceConfig;
  comparisonRules: ComparisonRule[];
}

export class RegressionBaselineModel implements RegressionBaseline {
  public readonly id: string;
  public readonly scenarioId: string;
  public version: string;
  public metrics: BaselineMetrics;
  public results: BaselineResults;
  public readonly environment: string;
  public readonly createdAt: Date;
  public isActive: boolean;
  public tolerance: ToleranceConfig;
  public comparisonRules: ComparisonRule[];

  constructor(data: Omit<RegressionBaseline, 'createdAt'>) {
    this.id = data.id;
    this.scenarioId = data.scenarioId;
    this.version = data.version;
    this.metrics = data.metrics;
    this.results = data.results;
    this.environment = data.environment;
    this.isActive = data.isActive;
    this.tolerance = data.tolerance;
    this.comparisonRules = data.comparisonRules;
    this.createdAt = new Date();

    this.validate();
  }

  public validate(): void {
    if (!this.scenarioId?.trim()) {
      throw new Error('Scenario ID is required');
    }

    if (!this.isValidSemanticVersion(this.version)) {
      throw new Error('Version must be valid semantic version (e.g., 1.0.0)');
    }

    this.validateToleranceRanges();
    this.validateComparisonRules();
    this.validateMetricsConsistency();
  }

  private isValidSemanticVersion(version: string): boolean {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  private validateToleranceRanges(): void {
    const { performance, reliability } = this.tolerance;

    // Validate performance tolerances (0-100%)
    const perfFields = ['responseTime', 'throughput', 'memoryUsage', 'cpuUsage'];
    for (const field of perfFields) {
      const value = (performance as any)[field];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new Error(`Performance tolerance ${field} must be between 0% and 100%`);
      }
    }

    // Validate reliability tolerances (0-100 percentage points)
    const relFields = ['successRate', 'errorRate'];
    for (const field of relFields) {
      const value = (reliability as any)[field];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new Error(`Reliability tolerance ${field} must be between 0 and 100 percentage points`);
      }
    }

    // Validate functional tolerances
    const criticalTolerance = this.tolerance.functional.criticalTestTolerance;
    if (typeof criticalTolerance !== 'number' || criticalTolerance < 0) {
      throw new Error('Critical test tolerance must be a positive number');
    }

    // Validate custom tolerances
    for (const [key, value] of Object.entries(this.tolerance.custom)) {
      if (typeof value !== 'number' || value < 0) {
        throw new Error(`Custom tolerance ${key} must be a positive number`);
      }
    }
  }

  private validateComparisonRules(): void {
    const validOperators = ['equals', 'greater', 'less', 'between', 'not_equals'];
    const validSeverities = ['info', 'warning', 'error', 'critical'];

    for (const rule of this.comparisonRules) {
      if (!rule.metric?.trim()) {
        throw new Error('Comparison rule metric is required');
      }

      if (!validOperators.includes(rule.operator)) {
        throw new Error(`Invalid comparison operator: ${rule.operator}`);
      }

      if (!validSeverities.includes(rule.severity)) {
        throw new Error(`Invalid severity: ${rule.severity}`);
      }

      if (!rule.description?.trim()) {
        throw new Error('Comparison rule description is required');
      }

      // Validate threshold based on operator
      if (rule.operator === 'between') {
        if (!Array.isArray(rule.threshold) || rule.threshold.length !== 2) {
          throw new Error('Between operator requires threshold array with two values');
        }
        if (rule.threshold[0] >= rule.threshold[1]) {
          throw new Error('Between threshold: first value must be less than second value');
        }
      } else {
        if (typeof rule.threshold !== 'number') {
          throw new Error(`Operator ${rule.operator} requires numeric threshold`);
        }
      }
    }

    // Check for logically consistent rules
    const criticalRules = this.comparisonRules.filter(rule => rule.severity === 'critical');
    if (criticalRules.length === 0) {
      throw new Error('At least one critical comparison rule is required');
    }
  }

  private validateMetricsConsistency(): void {
    const { metrics, results } = this;

    // Validate response time metrics consistency
    const rt = metrics.responseTime;
    if (rt.min > rt.average || rt.average > rt.max) {
      throw new Error('Response time metrics are inconsistent: min <= average <= max required');
    }

    if (rt.p50 > rt.p95 || rt.p95 > rt.p99) {
      throw new Error('Response time percentiles are inconsistent: p50 <= p95 <= p99 required');
    }

    // Validate success/error rate consistency
    const reliability = metrics.reliability;
    if (Math.abs(reliability.successRate + reliability.errorRate + reliability.timeoutRate - 100) > 0.01) {
      throw new Error('Success rate + error rate + timeout rate must equal 100%');
    }

    // Validate test counts consistency
    if (results.passedTests + results.failedTests !== results.totalTests) {
      throw new Error('Passed tests + failed tests must equal total tests');
    }

    if (results.totalTests === 0) {
      throw new Error('Baseline must contain at least one test result');
    }

    // Validate outcomes consistency
    const outcomesPassed = results.outcomes.filter(o => o.status === 'passed').length;
    const outcomesFailed = results.outcomes.filter(o => o.status === 'failed').length;

    if (outcomesPassed !== results.passedTests || outcomesFailed !== results.failedTests) {
      throw new Error('Outcome counts must match passed/failed test counts');
    }
  }

  public compare(currentMetrics: BaselineMetrics, currentResults: BaselineResults): ComparisonResult {
    const violations: RuleViolation[] = [];

    // Apply comparison rules
    for (const rule of this.comparisonRules.filter(r => r.enabled)) {
      const violation = this.evaluateRule(rule, currentMetrics, currentResults);
      if (violation) {
        violations.push(violation);
      }
    }

    // Check tolerance violations
    const toleranceViolations = this.checkToleranceViolations(currentMetrics, currentResults);
    violations.push(...toleranceViolations);

    return {
      passed: violations.filter(v => v.severity === 'critical' || v.severity === 'error').length === 0,
      violations,
      summary: this.generateComparisonSummary(currentMetrics, currentResults, violations)
    };
  }

  private evaluateRule(rule: ComparisonRule, metrics: BaselineMetrics, results: BaselineResults): RuleViolation | null {
    const currentValue = this.getMetricValue(rule.metric, metrics, results);
    const baselineValue = this.getMetricValue(rule.metric, this.metrics, this.results);

    if (currentValue === null || baselineValue === null) {
      return null; // Metric not found
    }

    let violated = false;

    switch (rule.operator) {
      case 'equals':
        violated = currentValue !== rule.threshold;
        break;
      case 'greater':
        violated = currentValue <= (rule.threshold as number);
        break;
      case 'less':
        violated = currentValue >= (rule.threshold as number);
        break;
      case 'between':
        const [min, max] = rule.threshold as [number, number];
        violated = currentValue < min || currentValue > max;
        break;
      case 'not_equals':
        violated = currentValue === rule.threshold;
        break;
    }

    if (violated) {
      return {
        rule,
        currentValue,
        baselineValue,
        severity: rule.severity,
        message: `${rule.description}: current=${currentValue}, baseline=${baselineValue}, threshold=${rule.threshold}`
      };
    }

    return null;
  }

  private checkToleranceViolations(metrics: BaselineMetrics, _results: BaselineResults): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // Check performance tolerances
    const perfChecks = [
      { metric: 'responseTime.average', current: metrics.responseTime.average, baseline: this.metrics.responseTime.average, tolerance: this.tolerance.performance.responseTime },
      { metric: 'throughput.requestsPerSecond', current: metrics.throughput.requestsPerSecond, baseline: this.metrics.throughput.requestsPerSecond, tolerance: this.tolerance.performance.throughput },
      { metric: 'resources.memoryUsageMB', current: metrics.resources.memoryUsageMB, baseline: this.metrics.resources.memoryUsageMB, tolerance: this.tolerance.performance.memoryUsage },
      { metric: 'resources.cpuUsagePercent', current: metrics.resources.cpuUsagePercent, baseline: this.metrics.resources.cpuUsagePercent, tolerance: this.tolerance.performance.cpuUsage }
    ];

    for (const check of perfChecks) {
      const variance = Math.abs((check.current - check.baseline) / check.baseline) * 100;
      if (variance > check.tolerance) {
        violations.push({
          rule: null,
          currentValue: check.current,
          baselineValue: check.baseline,
          severity: 'warning',
          message: `${check.metric} variance ${variance.toFixed(2)}% exceeds tolerance ${check.tolerance}%`
        });
      }
    }

    return violations;
  }

  private getMetricValue(metric: string, metrics: BaselineMetrics, results: BaselineResults): number | null {
    const parts = metric.split('.');
    let value: any = { ...metrics, ...results };

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return typeof value === 'number' ? value : null;
  }

  private generateComparisonSummary(metrics: BaselineMetrics, results: BaselineResults, violations: RuleViolation[]): ComparisonSummary {
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const errorViolations = violations.filter(v => v.severity === 'error').length;
    const warningViolations = violations.filter(v => v.severity === 'warning').length;

    return {
      totalViolations: violations.length,
      criticalViolations,
      errorViolations,
      warningViolations,
      performanceDelta: {
        responseTime: ((metrics.responseTime.average - this.metrics.responseTime.average) / this.metrics.responseTime.average) * 100,
        throughput: ((metrics.throughput.requestsPerSecond - this.metrics.throughput.requestsPerSecond) / this.metrics.throughput.requestsPerSecond) * 100,
        successRate: results.passedTests / results.totalTests * 100 - this.results.passedTests / this.results.totalTests * 100
      }
    };
  }

  public activate(): void {
    this.isActive = true;
  }

  public deactivate(): void {
    this.isActive = false;
  }

  public addComparisonRule(rule: ComparisonRule): void {
    // Check for duplicate metric rules
    if (this.comparisonRules.some(r => r.metric === rule.metric && r.operator === rule.operator)) {
      throw new Error(`Comparison rule for ${rule.metric} with ${rule.operator} already exists`);
    }

    this.comparisonRules.push(rule);
    this.validate();
  }

  public removeComparisonRule(metric: string, operator: string): void {
    const initialLength = this.comparisonRules.length;
    this.comparisonRules = this.comparisonRules.filter(rule => !(rule.metric === metric && rule.operator === operator));

    if (this.comparisonRules.length === initialLength) {
      throw new Error(`Comparison rule for ${metric} with ${operator} not found`);
    }

    this.validate();
  }

  public updateTolerance(updates: Partial<ToleranceConfig>): void {
    this.tolerance = { ...this.tolerance, ...updates };
    this.validate();
  }

  public toJSON(): RegressionBaseline {
    return {
      id: this.id,
      scenarioId: this.scenarioId,
      version: this.version,
      metrics: this.metrics,
      results: this.results,
      environment: this.environment,
      createdAt: this.createdAt,
      isActive: this.isActive,
      tolerance: this.tolerance,
      comparisonRules: this.comparisonRules
    };
  }

  public static fromJSON(data: any): RegressionBaselineModel {
    const baseline = new RegressionBaselineModel({
      id: data.id,
      scenarioId: data.scenarioId,
      version: data.version,
      metrics: data.metrics,
      results: data.results,
      environment: data.environment,
      isActive: data.isActive,
      tolerance: data.tolerance,
      comparisonRules: data.comparisonRules
    });

    if (data.createdAt) {
      (baseline as any).createdAt = new Date(data.createdAt);
    }

    return baseline;
  }
}

// Supporting interfaces for comparison results
export interface RuleViolation {
  rule: ComparisonRule | null;
  currentValue: number;
  baselineValue: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
}

export interface ComparisonResult {
  passed: boolean;
  violations: RuleViolation[];
  summary: ComparisonSummary;
}

export interface ComparisonSummary {
  totalViolations: number;
  criticalViolations: number;
  errorViolations: number;
  warningViolations: number;
  performanceDelta: {
    responseTime: number;
    throughput: number;
    successRate: number;
  };
}

export default RegressionBaselineModel;