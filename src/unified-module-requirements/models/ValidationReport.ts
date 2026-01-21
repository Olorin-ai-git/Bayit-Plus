import { ValidationReport, ValidationResult, ValidationStatus, RuleSeverity } from './types';

export class ValidationReportBuilder {
  private moduleId: string = '';
  private reportId: string = '';
  private results: ValidationResult[] = [];
  private validator: string = 'CVPlus Module Validator';
  private environment: string = 'development';
  private configuration: Record<string, any> = {};

  setModuleId(moduleId: string): ValidationReportBuilder {
    this.moduleId = moduleId;
    return this;
  }

  setReportId(reportId: string): ValidationReportBuilder {
    this.reportId = reportId;
    return this;
  }

  addResult(result: ValidationResult): ValidationReportBuilder {
    this.results.push(result);
    return this;
  }

  addResults(results: ValidationResult[]): ValidationReportBuilder {
    this.results.push(...results);
    return this;
  }

  setValidator(validator: string): ValidationReportBuilder {
    this.validator = validator;
    return this;
  }

  setEnvironment(environment: string): ValidationReportBuilder {
    this.environment = environment;
    return this;
  }

  setConfiguration(configuration: Record<string, any>): ValidationReportBuilder {
    this.configuration = configuration;
    return this;
  }

  build(): ValidationReport {
    const summary = this.calculateSummary();
    const overallScore = this.calculateOverallScore();
    const status = this.determineOverallStatus();
    const recommendations = this.generateRecommendations();

    return {
      moduleId: this.moduleId,
      reportId: this.reportId || this.generateReportId(),
      timestamp: new Date(),
      overallScore,
      status,
      results: this.results,
      summary,
      recommendations,
      validator: this.validator,
      context: {
        environment: this.environment,
        configuration: this.configuration
      }
    };
  }

  private calculateSummary() {
    const totalRules = this.results.length;
    const passedRules = this.results.filter(r => r.status === ValidationStatus.PASS).length;
    const failedRules = this.results.filter(r => r.status === ValidationStatus.FAIL).length;
    const warningRules = this.results.filter(r => r.status === ValidationStatus.WARNING).length;

    return {
      totalRules,
      passedRules,
      failedRules,
      warningRules
    };
  }

  private calculateOverallScore(): number {
    if (this.results.length === 0) return 0;

    const weights = {
      [RuleSeverity.CRITICAL]: 4,
      [RuleSeverity.ERROR]: 3,
      [RuleSeverity.WARNING]: 2,
      [RuleSeverity.AUTO_FIX]: 1
    };

    let totalWeight = 0;
    let earnedWeight = 0;

    for (const result of this.results) {
      const weight = weights[result.severity] || 1;
      totalWeight += weight;

      if (result.status === ValidationStatus.PASS) {
        earnedWeight += weight;
      } else if (result.status === ValidationStatus.WARNING) {
        earnedWeight += weight * 0.5; // Partial credit for warnings
      }
    }

    return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  }

  private determineOverallStatus(): ValidationStatus {
    const hasCriticalFailures = this.results.some(
      r => r.status === ValidationStatus.FAIL && r.severity === RuleSeverity.CRITICAL
    );
    const hasErrorFailures = this.results.some(
      r => r.status === ValidationStatus.FAIL && r.severity === RuleSeverity.ERROR
    );
    const hasWarnings = this.results.some(
      r => r.status === ValidationStatus.WARNING
    );

    if (hasCriticalFailures) return ValidationStatus.FAIL;
    if (hasErrorFailures) return ValidationStatus.ERROR;
    if (hasWarnings) return ValidationStatus.WARNING;
    return ValidationStatus.PASS;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Critical issues first
    const criticalFailures = this.results.filter(
      r => r.status === ValidationStatus.FAIL && r.severity === RuleSeverity.CRITICAL
    );
    if (criticalFailures.length > 0) {
      recommendations.push(`Address ${criticalFailures.length} critical issue(s) immediately - these prevent module deployment`);
    }

    // Error issues
    const errorFailures = this.results.filter(
      r => r.status === ValidationStatus.FAIL && r.severity === RuleSeverity.ERROR
    );
    if (errorFailures.length > 0) {
      recommendations.push(`Fix ${errorFailures.length} error(s) before promoting to production`);
    }

    // Auto-fixable issues
    const autoFixableIssues = this.results.filter(
      r => r.status !== ValidationStatus.PASS && r.severity === RuleSeverity.AUTO_FIX
    );
    if (autoFixableIssues.length > 0) {
      recommendations.push(`Run auto-fix tools to resolve ${autoFixableIssues.length} automatically fixable issue(s)`);
    }

    // File-specific recommendations
    const fileIssues = this.groupIssuesByFile();
    const problematicFiles = Object.keys(fileIssues).filter(file => fileIssues[file].length > 3);
    if (problematicFiles.length > 0) {
      recommendations.push(`Review and refactor files with multiple issues: ${problematicFiles.slice(0, 3).join(', ')}`);
    }

    // Score-based recommendations
    const score = this.calculateOverallScore();
    if (score < 60) {
      recommendations.push('Module requires significant improvements to meet quality standards');
    } else if (score < 80) {
      recommendations.push('Module is approaching quality standards - address remaining issues for full compliance');
    } else if (score >= 95) {
      recommendations.push('Excellent module quality - consider this module as a template for others');
    }

    return recommendations.length > 0 ? recommendations : ['Module validation completed successfully'];
  }

  private groupIssuesByFile(): Record<string, ValidationResult[]> {
    const fileGroups: Record<string, ValidationResult[]> = {};

    for (const result of this.results) {
      if (result.file) {
        if (!fileGroups[result.file]) {
          fileGroups[result.file] = [];
        }
        fileGroups[result.file].push(result);
      }
    }

    return fileGroups;
  }

  private generateReportId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `report-${timestamp}-${random}`;
  }
}

export class ValidationReportAnalyzer {
  static compareReports(current: ValidationReport, previous: ValidationReport): {
    scoreChange: number;
    newIssues: ValidationResult[];
    resolvedIssues: ValidationResult[];
    regressions: ValidationResult[];
    improvements: string[];
  } {
    const scoreChange = current.overallScore - previous.overallScore;

    // Find new issues (rules that failed in current but weren't in previous)
    const previousRuleIds = new Set(previous.results.map(r => r.ruleId));
    const newIssues = current.results.filter(
      r => r.status !== ValidationStatus.PASS && !previousRuleIds.has(r.ruleId)
    );

    // Find resolved issues (rules that failed in previous but pass in current)
    const currentPassingRules = new Set(
      current.results.filter(r => r.status === ValidationStatus.PASS).map(r => r.ruleId)
    );
    const resolvedIssues = previous.results.filter(
      r => r.status !== ValidationStatus.PASS && currentPassingRules.has(r.ruleId)
    );

    // Find regressions (rules that passed in previous but fail in current)
    const previousPassingRules = new Set(
      previous.results.filter(r => r.status === ValidationStatus.PASS).map(r => r.ruleId)
    );
    const regressions = current.results.filter(
      r => r.status !== ValidationStatus.PASS && previousPassingRules.has(r.ruleId)
    );

    // Generate improvement suggestions
    const improvements: string[] = [];
    if (scoreChange > 0) {
      improvements.push(`Overall score improved by ${scoreChange} points`);
    }
    if (resolvedIssues.length > 0) {
      improvements.push(`Resolved ${resolvedIssues.length} previous issue(s)`);
    }
    if (regressions.length > 0) {
      improvements.push(`⚠️ ${regressions.length} regression(s) detected - investigate recent changes`);
    }
    if (newIssues.length > 0) {
      improvements.push(`${newIssues.length} new issue(s) introduced`);
    }

    return {
      scoreChange,
      newIssues,
      resolvedIssues,
      regressions,
      improvements
    };
  }

  static generateTrend(reports: ValidationReport[]): {
    scoreHistory: { timestamp: Date; score: number }[];
    trend: 'improving' | 'declining' | 'stable';
    averageScore: number;
    issueTypes: Record<string, number>;
  } {
    const scoreHistory = reports.map(r => ({
      timestamp: r.timestamp,
      score: r.overallScore
    }));

    // Calculate trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (reports.length >= 3) {
      const recent = reports.slice(-3);
      const scores = recent.map(r => r.overallScore);
      const avgRecent = scores.reduce((a, b) => a + b, 0) / scores.length;
      const avgEarlier = reports.slice(0, -3).reduce((sum, r) => sum + r.overallScore, 0) / Math.max(1, reports.length - 3);

      if (avgRecent > avgEarlier + 5) trend = 'improving';
      else if (avgRecent < avgEarlier - 5) trend = 'declining';
    }

    const averageScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length;

    // Count issue types across all reports
    const issueTypes: Record<string, number> = {};
    for (const report of reports) {
      for (const result of report.results) {
        if (result.status !== ValidationStatus.PASS) {
          issueTypes[result.ruleId] = (issueTypes[result.ruleId] || 0) + 1;
        }
      }
    }

    return {
      scoreHistory,
      trend,
      averageScore,
      issueTypes
    };
  }
}

export { ValidationReport, ValidationResult, ValidationStatus, RuleSeverity };