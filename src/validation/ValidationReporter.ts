/**
 * Validation Reporter
 * Generates comprehensive validation reports and analytics
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  ValidationReport,
  ValidationSummary,
  ValidationSuiteResult,
  ModuleValidationResult,
  ValidationRecommendation,
  ValidationMetadata,
  ValidationIssue,
  ValidationSeverity,
  ValidationCategory,
  VALIDATION_SEVERITIES,
  VALIDATION_CATEGORIES,
  getValidationStatus,
  getScoreColor
} from './index';

export interface ReportOptions {
  format: 'json' | 'html' | 'markdown' | 'csv';
  includeDetails: boolean;
  includeRecommendations: boolean;
  includeMetadata: boolean;
  outputPath?: string;
  templatePath?: string;
}

export interface ValidationTrend {
  timestamp: string;
  overallScore: number;
  moduleScores: Record<string, number>;
  criticalIssues: number;
  resolvedIssues: number;
}

export interface DashboardData {
  summary: ValidationSummary;
  trends: ValidationTrend[];
  topIssues: ValidationIssue[];
  moduleHealth: Array<{
    moduleId: string;
    healthScore: number;
    status: string;
    lastValidated: string;
    issueCount: number;
  }>;
  recommendations: ValidationRecommendation[];
}

export class ValidationReporter {
  private reportsPath: string;

  constructor(private workspacePath: string) {
    this.reportsPath = join(workspacePath, 'reports', 'validation');
    this.ensureReportsDirectory();
  }

  async generateReport(
    report: ValidationReport,
    options: ReportOptions = {
      format: 'json',
      includeDetails: true,
      includeRecommendations: true,
      includeMetadata: true
    }
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `validation-report-${timestamp}`;

    let outputPath = options.outputPath || this.reportsPath;
    let content: string;

    switch (options.format) {
      case 'json':
        content = this.generateJsonReport(report, options);
        outputPath = join(outputPath, `${fileName}.json`);
        break;

      case 'html':
        content = await this.generateHtmlReport(report, options);
        outputPath = join(outputPath, `${fileName}.html`);
        break;

      case 'markdown':
        content = this.generateMarkdownReport(report, options);
        outputPath = join(outputPath, `${fileName}.md`);
        break;

      case 'csv':
        content = this.generateCsvReport(report, options);
        outputPath = join(outputPath, `${fileName}.csv`);
        break;

      default:
        throw new Error(`Unsupported report format: ${options.format}`);
    }

    // Ensure output directory exists
    const outputDir = join(outputPath, '..');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputPath, content, 'utf8');
    return outputPath;
  }

  async generateDashboard(reports: ValidationReport[]): Promise<DashboardData> {
    const latestReport = reports[reports.length - 1];

    const trends: ValidationTrend[] = reports.map(report => ({
      timestamp: report.metadata.startTime,
      overallScore: report.summary.overallScore,
      moduleScores: report.moduleResults.reduce((acc, module) => {
        acc[module.moduleId] = module.healthScore;
        return acc;
      }, {} as Record<string, number>),
      criticalIssues: report.summary.criticalIssues,
      resolvedIssues: this.calculateResolvedIssues(report, reports)
    }));

    const topIssues = this.extractTopIssues(latestReport);
    const moduleHealth = this.calculateModuleHealth(latestReport);

    return {
      summary: latestReport.summary,
      trends,
      topIssues,
      moduleHealth,
      recommendations: latestReport.recommendations
    };
  }

  private generateJsonReport(report: ValidationReport, options: ReportOptions): string {
    const reportData: any = {
      summary: report.summary,
      suiteResults: report.suiteResults
    };

    if (options.includeDetails) {
      reportData.moduleResults = report.moduleResults;
    }

    if (options.includeRecommendations) {
      reportData.recommendations = report.recommendations;
    }

    if (options.includeMetadata) {
      reportData.metadata = report.metadata;
    }

    return JSON.stringify(reportData, null, 2);
  }

  private async generateHtmlReport(report: ValidationReport, options: ReportOptions): Promise<string> {
    const template = options.templatePath ?
      await this.loadTemplate(options.templatePath) :
      this.getDefaultHtmlTemplate();

    const data = {
      report,
      timestamp: new Date().toISOString(),
      scoreColor: getScoreColor(report.summary.overallScore),
      statusBadge: this.getStatusBadge(report.summary.overallStatus),
      moduleCards: this.generateModuleCards(report.moduleResults),
      recommendationsList: this.generateRecommendationsList(report.recommendations),
      issuesList: this.generateIssuesList(report),
      chartData: this.generateChartData(report)
    };

    return this.renderTemplate(template, data);
  }

  private generateMarkdownReport(report: ValidationReport, options: ReportOptions): string {
    let content = `# Validation Report\n\n`;
    content += `**Generated:** ${new Date().toISOString()}\n`;
    content += `**Workspace:** ${report.metadata.workspacePath}\n\n`;

    // Summary
    content += `## Summary\n\n`;
    content += `| Metric | Value |\n`;
    content += `|--------|-------|\n`;
    content += `| Overall Score | ${report.summary.overallScore}/100 |\n`;
    content += `| Status | ${report.summary.overallStatus.toUpperCase()} |\n`;
    content += `| Total Rules | ${report.summary.totalRules} |\n`;
    content += `| Passed | ${report.summary.passedRules} |\n`;
    content += `| Failed | ${report.summary.failedRules} |\n`;
    content += `| Critical Issues | ${report.summary.criticalIssues} |\n`;
    content += `| Execution Time | ${report.summary.executionTime}ms |\n\n`;

    // Module Results
    if (options.includeDetails && report.moduleResults.length > 0) {
      content += `## Module Results\n\n`;
      for (const module of report.moduleResults) {
        content += `### ${module.moduleId}\n\n`;
        content += `- **Health Score:** ${module.healthScore}/100\n`;
        content += `- **Status:** ${module.status.toUpperCase()}\n`;
        content += `- **Issues:** ${module.issues.length}\n\n`;

        if (module.issues.length > 0) {
          content += `#### Issues\n\n`;
          for (const issue of module.issues) {
            content += `- **${issue.severity.toUpperCase()}:** ${issue.message}\n`;
            if (issue.recommendations.length > 0) {
              content += `  - Recommendations: ${issue.recommendations.join(', ')}\n`;
            }
          }
          content += `\n`;
        }
      }
    }

    // Recommendations
    if (options.includeRecommendations && report.recommendations.length > 0) {
      content += `## Recommendations\n\n`;
      const groupedRecs = this.groupRecommendationsByPriority(report.recommendations);

      for (const [priority, recs] of Object.entries(groupedRecs)) {
        if (recs.length > 0) {
          content += `### ${priority.toUpperCase()} Priority\n\n`;
          for (const rec of recs) {
            content += `#### ${rec.title}\n\n`;
            content += `${rec.description}\n\n`;
            content += `**Action Items:**\n`;
            for (const item of rec.actionItems) {
              content += `- ${item}\n`;
            }
            content += `\n**Affected Modules:** ${rec.affectedModules.join(', ')}\n`;
            content += `**Estimated Effort:** ${rec.estimatedEffort}\n\n`;
          }
        }
      }
    }

    return content;
  }

  private generateCsvReport(report: ValidationReport, options: ReportOptions): string {
    const headers = [
      'Module',
      'Rule ID',
      'Rule Name',
      'Category',
      'Severity',
      'Status',
      'Message',
      'Execution Time'
    ];

    const rows: string[][] = [headers];

    for (const suiteResult of report.suiteResults) {
      for (const ruleResult of suiteResult.ruleResults) {
        const moduleResults = report.moduleResults || [];
        for (const moduleResult of moduleResults) {
          rows.push([
            moduleResult.moduleId,
            '', // Rule ID not available in current structure
            suiteResult.suiteName,
            '', // Category not available in current structure
            '', // Severity not available in current structure
            ruleResult.passed ? 'PASSED' : 'FAILED',
            ruleResult.message,
            ruleResult.executionTime.toString()
          ]);
        }
      }
    }

    return rows.map(row =>
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  private getDefaultHtmlTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validation Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .score {
            font-size: 48px;
            font-weight: bold;
            color: {{scoreColor}};
        }
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-healthy { background: #d4edda; color: #155724; }
        .status-warning { background: #fff3cd; color: #856404; }
        .status-critical { background: #f8d7da; color: #721c24; }
        .status-failed { background: #f5c6cb; color: #721c24; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .card {
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 20px;
        }
        .card h3 {
            margin-top: 0;
            color: #333;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .recommendation {
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 10px 0;
        }
        .issue {
            padding: 10px;
            margin: 5px 0;
            border-radius: 4px;
        }
        .issue-critical { background: #f8d7da; border-left: 4px solid #dc3545; }
        .issue-high { background: #fff3cd; border-left: 4px solid #ffc107; }
        .issue-medium { background: #e7f3ff; border-left: 4px solid #17a2b8; }
        .issue-low { background: #f8f9fa; border-left: 4px solid #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Validation Report</h1>
            <p>Generated: {{timestamp}}</p>
            <div class="score">{{report.summary.overallScore}}/100</div>
            <div class="{{statusBadge.class}}">{{statusBadge.text}}</div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>Summary</h3>
                <div class="metric">
                    <span>Total Rules</span>
                    <strong>{{report.summary.totalRules}}</strong>
                </div>
                <div class="metric">
                    <span>Passed</span>
                    <strong>{{report.summary.passedRules}}</strong>
                </div>
                <div class="metric">
                    <span>Failed</span>
                    <strong>{{report.summary.failedRules}}</strong>
                </div>
                <div class="metric">
                    <span>Critical Issues</span>
                    <strong>{{report.summary.criticalIssues}}</strong>
                </div>
                <div class="metric">
                    <span>Execution Time</span>
                    <strong>{{report.summary.executionTime}}ms</strong>
                </div>
            </div>

            {{moduleCards}}
        </div>

        {{recommendationsList}}
        {{issuesList}}
    </div>
</body>
</html>
    `;
  }

  private renderTemplate(template: string, data: any): string {
    let rendered = template;

    // Simple template rendering - replace {{key}} with values
    const replaceValue = (obj: any, path: string[]): any => {
      return path.reduce((current, key) => current?.[key], obj);
    };

    // Find all template variables
    const variables = template.match(/\{\{([^}]+)\}\}/g) || [];

    for (const variable of variables) {
      const key = variable.slice(2, -2).trim();
      const keyParts = key.split('.');
      const value = replaceValue(data, keyParts);

      if (value !== undefined) {
        rendered = rendered.replace(variable, String(value));
      }
    }

    return rendered;
  }

  private getStatusBadge(status: string): { class: string; text: string } {
    const statusMap: Record<string, { class: string; text: string }> = {
      healthy: { class: 'status-badge status-healthy', text: 'Healthy' },
      warning: { class: 'status-badge status-warning', text: 'Warning' },
      critical: { class: 'status-badge status-critical', text: 'Critical' },
      failed: { class: 'status-badge status-failed', text: 'Failed' }
    };

    return statusMap[status] || { class: 'status-badge', text: status };
  }

  private generateModuleCards(moduleResults: ModuleValidationResult[]): string {
    return moduleResults.map(module => `
      <div class="card">
        <h3>${module.moduleId}</h3>
        <div class="metric">
          <span>Health Score</span>
          <strong>${module.healthScore}/100</strong>
        </div>
        <div class="metric">
          <span>Status</span>
          <strong>${module.status.toUpperCase()}</strong>
        </div>
        <div class="metric">
          <span>Issues</span>
          <strong>${module.issues.length}</strong>
        </div>
      </div>
    `).join('');
  }

  private generateRecommendationsList(recommendations: ValidationRecommendation[]): string {
    if (recommendations.length === 0) return '';

    let html = '<h2>Recommendations</h2>';

    for (const rec of recommendations) {
      html += `
        <div class="recommendation">
          <h4>${rec.title}</h4>
          <p>${rec.description}</p>
          <ul>
            ${rec.actionItems.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <small>Priority: ${rec.priority} | Effort: ${rec.estimatedEffort}</small>
        </div>
      `;
    }

    return html;
  }

  private generateIssuesList(report: ValidationReport): string {
    const allIssues: (ValidationIssue & { moduleId: string })[] = [];

    for (const module of report.moduleResults) {
      for (const issue of module.issues) {
        allIssues.push({ ...issue, moduleId: module.moduleId });
      }
    }

    if (allIssues.length === 0) return '';

    let html = '<h2>Issues</h2>';

    for (const issue of allIssues) {
      html += `
        <div class="issue issue-${issue.severity}">
          <strong>${issue.moduleId}:</strong> ${issue.message}
          ${issue.recommendations.length > 0 ?
            `<br><small>Recommendations: ${issue.recommendations.join(', ')}</small>` : ''}
        </div>
      `;
    }

    return html;
  }

  private generateChartData(report: ValidationReport): any {
    return {
      scoresByModule: report.moduleResults.map(m => ({
        module: m.moduleId,
        score: m.healthScore
      })),
      issuesByCategory: this.getIssuesByCategory(report),
      issuesBySeverity: this.getIssuesBySeverity(report)
    };
  }

  private getIssuesByCategory(report: ValidationReport): Record<string, number> {
    const categories: Record<string, number> = {};

    for (const module of report.moduleResults) {
      for (const issue of module.issues) {
        categories[issue.category] = (categories[issue.category] || 0) + 1;
      }
    }

    return categories;
  }

  private getIssuesBySeverity(report: ValidationReport): Record<string, number> {
    const severities: Record<string, number> = {};

    for (const module of report.moduleResults) {
      for (const issue of module.issues) {
        severities[issue.severity] = (severities[issue.severity] || 0) + 1;
      }
    }

    return severities;
  }

  private groupRecommendationsByPriority(recommendations: ValidationRecommendation[]): Record<string, ValidationRecommendation[]> {
    return recommendations.reduce((groups, rec) => {
      groups[rec.priority] = groups[rec.priority] || [];
      groups[rec.priority].push(rec);
      return groups;
    }, {} as Record<string, ValidationRecommendation[]>);
  }

  private extractTopIssues(report: ValidationReport): ValidationIssue[] {
    const allIssues: ValidationIssue[] = [];

    for (const module of report.moduleResults) {
      allIssues.push(...module.issues);
    }

    // Sort by severity weight and return top 10
    return allIssues
      .sort((a, b) => VALIDATION_SEVERITIES[b.severity].weight - VALIDATION_SEVERITIES[a.severity].weight)
      .slice(0, 10);
  }

  private calculateModuleHealth(report: ValidationReport): Array<{
    moduleId: string;
    healthScore: number;
    status: string;
    lastValidated: string;
    issueCount: number;
  }> {
    return report.moduleResults.map(module => ({
      moduleId: module.moduleId,
      healthScore: module.healthScore,
      status: module.status,
      lastValidated: report.metadata.startTime,
      issueCount: module.issues.length
    }));
  }

  private calculateResolvedIssues(currentReport: ValidationReport, allReports: ValidationReport[]): number {
    if (allReports.length < 2) return 0;

    const previousReport = allReports[allReports.length - 2];
    const previousIssueCount = previousReport.summary.failedRules;
    const currentIssueCount = currentReport.summary.failedRules;

    return Math.max(0, previousIssueCount - currentIssueCount);
  }

  private ensureReportsDirectory(): void {
    if (!existsSync(this.reportsPath)) {
      mkdirSync(this.reportsPath, { recursive: true });
    }
  }

  private async loadTemplate(templatePath: string): Promise<string> {
    const fs = require('fs').promises;
    return await fs.readFile(templatePath, 'utf8');
  }
}