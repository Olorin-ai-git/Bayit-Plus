/**
 * Report Generator
 * Generates comprehensive reports for recovery operations and system health
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { RecoveryAnalyticsData, SystemRecoveryReport, ModuleRecoveryProfile } from './RecoveryAnalytics';
import { HealthStatus, MonitoringReport } from '../monitoring/HealthMonitor';
import { ValidationReport } from '../validation/index';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'html' | 'pdf' | 'json' | 'csv' | 'markdown';
  sections: ReportSection[];
  styling?: ReportStyling;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'chart' | 'table' | 'text' | 'metrics' | 'timeline' | 'heatmap';
  dataSource: string;
  config: Record<string, any>;
  order: number;
}

export interface ReportStyling {
  theme: 'light' | 'dark' | 'professional' | 'modern';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl?: string;
}

export interface ComprehensiveReport {
  id: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  timeframe: { start: string; end: string };
  author: string;
  version: string;
  summary: ReportSummary;
  sections: GeneratedReportSection[];
  metadata: ReportMetadata;
}

export interface ReportSummary {
  keyMetrics: Array<{
    name: string;
    value: string | number;
    trend: 'up' | 'down' | 'stable';
    status: 'good' | 'warning' | 'critical';
  }>;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

export interface GeneratedReportSection {
  id: string;
  title: string;
  type: string;
  content: any;
  charts?: ChartData[];
  tables?: TableData[];
  visualizations?: any[];
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap';
  data: any;
  config: any;
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: any[][];
  config?: {
    sortable?: boolean;
    searchable?: boolean;
    pagination?: boolean;
  };
}

export interface ReportMetadata {
  dataSourcesUsed: string[];
  reportTemplate: string;
  generationTime: number;
  totalDataPoints: number;
  filters: Record<string, any>;
  exportFormat: string;
}

export class ReportGenerator {
  private reportsPath: string;
  private templatesPath: string;
  private templates: Map<string, ReportTemplate> = new Map();

  constructor(private workspacePath: string) {
    this.reportsPath = join(workspacePath, 'reports');
    this.templatesPath = join(workspacePath, 'reports', 'templates');
    this.ensureReportDirectories();
    this.loadReportTemplates();
  }

  async generateComprehensiveReport(
    templateId: string,
    data: {
      recoveryAnalytics?: SystemRecoveryReport;
      healthStatus?: MonitoringReport;
      validationReport?: ValidationReport;
      moduleProfiles?: ModuleRecoveryProfile[];
    },
    options: {
      timeframe: { start: Date; end: Date };
      title?: string;
      subtitle?: string;
      author?: string;
      filters?: Record<string, any>;
    }
  ): Promise<string> {
    const startTime = Date.now();
    const template = this.templates.get(templateId);

    if (!template) {
      throw new Error(`Report template not found: ${templateId}`);
    }

    const reportId = `report-${templateId}-${Date.now()}`;
    const title = options.title || `${template.name} Report`;
    const subtitle = options.subtitle || `Generated on ${new Date().toLocaleDateString()}`;

    // Generate report summary
    const summary = await this.generateReportSummary(data, options);

    // Generate report sections
    const sections = await this.generateReportSections(template.sections, data, options);

    // Create comprehensive report
    const report: ComprehensiveReport = {
      id: reportId,
      title,
      subtitle,
      generatedAt: new Date().toISOString(),
      timeframe: {
        start: options.timeframe.start.toISOString(),
        end: options.timeframe.end.toISOString()
      },
      author: options.author || 'CVPlus Recovery System',
      version: '1.0.0',
      summary,
      sections,
      metadata: {
        dataSourcesUsed: this.getDataSources(data),
        reportTemplate: templateId,
        generationTime: Date.now() - startTime,
        totalDataPoints: this.countDataPoints(data),
        filters: options.filters || {},
        exportFormat: template.format
      }
    };

    // Export report in specified format
    const filePath = await this.exportReport(report, template);

    console.log(`📊 Comprehensive report generated: ${filePath}`);
    return filePath;
  }

  private async generateReportSummary(
    data: any,
    options: any
  ): Promise<ReportSummary> {
    const keyMetrics: ReportSummary['keyMetrics'] = [];
    const highlights: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Extract key metrics from different data sources
    if (data.recoveryAnalytics) {
      const analytics = data.recoveryAnalytics as SystemRecoveryReport;

      keyMetrics.push({
        name: 'Recovery Success Rate',
        value: `${((analytics.summary.successfulOperations / analytics.summary.totalOperations) * 100).toFixed(1)}%`,
        trend: 'stable', // Would calculate based on historical data
        status: analytics.summary.successfulOperations / analytics.summary.totalOperations > 0.8 ? 'good' : 'warning'
      });

      keyMetrics.push({
        name: 'Average Recovery Time',
        value: `${(analytics.summary.averageDuration / 1000).toFixed(1)}s`,
        trend: 'stable',
        status: analytics.summary.averageDuration < 60000 ? 'good' : 'warning'
      });

      keyMetrics.push({
        name: 'Modules Recovered',
        value: analytics.summary.modulesRecovered,
        trend: 'up',
        status: 'good'
      });

      // Add highlights
      if (analytics.summary.successfulOperations > 0) {
        highlights.push(`Successfully recovered ${analytics.summary.modulesRecovered} modules`);
      }

      if (analytics.performanceMetrics.fastestRecovery.duration < 30000) {
        highlights.push(`Fastest recovery: ${analytics.performanceMetrics.fastestRecovery.moduleId} in ${(analytics.performanceMetrics.fastestRecovery.duration / 1000).toFixed(1)}s`);
      }

      // Add concerns
      if (analytics.summary.failedOperations > analytics.summary.successfulOperations * 0.3) {
        concerns.push(`High failure rate: ${analytics.summary.failedOperations} failed operations`);
      }

      if (analytics.performanceMetrics.leastReliable.successRate < 0.5) {
        concerns.push(`Low reliability in ${analytics.performanceMetrics.leastReliable.moduleId}: ${(analytics.performanceMetrics.leastReliable.successRate * 100).toFixed(1)}% success rate`);
      }

      // Add recommendations
      recommendations.push(...analytics.recommendations);
    }

    if (data.healthStatus) {
      const health = data.healthStatus as MonitoringReport;

      keyMetrics.push({
        name: 'Overall System Health',
        value: `${health.overallHealth}/100`,
        trend: 'stable',
        status: health.overallHealth > 80 ? 'good' : health.overallHealth > 60 ? 'warning' : 'critical'
      });

      keyMetrics.push({
        name: 'Active Alerts',
        value: health.activeAlerts,
        trend: 'down',
        status: health.activeAlerts === 0 ? 'good' : health.activeAlerts < 5 ? 'warning' : 'critical'
      });

      // Add health-based highlights and concerns
      if (health.systemMetrics.healthyModules > health.systemMetrics.totalModules * 0.8) {
        highlights.push(`${health.systemMetrics.healthyModules}/${health.systemMetrics.totalModules} modules are healthy`);
      }

      if (health.systemMetrics.criticalModules > 0) {
        concerns.push(`${health.systemMetrics.criticalModules} modules in critical state`);
      }

      recommendations.push(...health.recommendations);
    }

    if (data.validationReport) {
      const validation = data.validationReport as ValidationReport;

      keyMetrics.push({
        name: 'Validation Score',
        value: `${validation.summary.overallScore}/100`,
        trend: 'stable',
        status: validation.summary.overallScore > 85 ? 'good' : validation.summary.overallScore > 70 ? 'warning' : 'critical'
      });

      keyMetrics.push({
        name: 'Tests Passed',
        value: `${validation.summary.passedRules}/${validation.summary.totalRules}`,
        trend: 'stable',
        status: validation.summary.passedRules / validation.summary.totalRules > 0.9 ? 'good' : 'warning'
      });

      if (validation.summary.criticalIssues === 0) {
        highlights.push('No critical validation issues found');
      } else {
        concerns.push(`${validation.summary.criticalIssues} critical validation issues detected`);
      }
    }

    return {
      keyMetrics,
      highlights,
      concerns,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };
  }

  private async generateReportSections(
    sectionTemplates: ReportSection[],
    data: any,
    options: any
  ): Promise<GeneratedReportSection[]> {
    const sections: GeneratedReportSection[] = [];

    // Sort sections by order
    const sortedSections = [...sectionTemplates].sort((a, b) => a.order - b.order);

    for (const template of sortedSections) {
      try {
        const section = await this.generateReportSection(template, data, options);
        sections.push(section);
      } catch (error) {
        console.error(`Failed to generate section ${template.id}:`, error);

        // Add error section
        sections.push({
          id: template.id,
          title: template.title,
          type: 'text',
          content: {
            text: `Error generating section: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }
    }

    return sections;
  }

  private async generateReportSection(
    template: ReportSection,
    data: any,
    options: any
  ): Promise<GeneratedReportSection> {
    switch (template.type) {
      case 'summary':
        return this.generateSummarySection(template, data, options);
      case 'chart':
        return this.generateChartSection(template, data, options);
      case 'table':
        return this.generateTableSection(template, data, options);
      case 'metrics':
        return this.generateMetricsSection(template, data, options);
      case 'timeline':
        return this.generateTimelineSection(template, data, options);
      case 'heatmap':
        return this.generateHeatmapSection(template, data, options);
      case 'text':
      default:
        return this.generateTextSection(template, data, options);
    }
  }

  private async generateSummarySection(
    template: ReportSection,
    data: any,
    options: any
  ): Promise<GeneratedReportSection> {
    const summary = data.recoveryAnalytics?.summary || data.healthStatus?.summary || {};

    return {
      id: template.id,
      title: template.title,
      type: 'summary',
      content: {
        overview: this.extractOverview(data),
        keyPoints: this.extractKeyPoints(data),
        metrics: this.extractSummaryMetrics(data)
      }
    };
  }

  private async generateChartSection(
    template: ReportSection,
    data: any,
    options: any
  ): Promise<GeneratedReportSection> {
    const charts: ChartData[] = [];

    // Recovery success rate over time
    if (data.recoveryAnalytics?.trends) {
      const trends = data.recoveryAnalytics.trends;

      charts.push({
        id: 'recovery-success-trend',
        title: 'Recovery Success Rate Trend',
        type: 'line',
        data: {
          labels: trends[0]?.data.map((d: any) => d.timestamp) || [],
          datasets: trends.map((trend: any) => ({
            label: trend.moduleId,
            data: trend.data.map((d: any) => d.successRate * 100),
            borderColor: this.getModuleColor(trend.moduleId),
            backgroundColor: this.getModuleColor(trend.moduleId) + '20'
          }))
        },
        config: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { callback: (value: any) => value + '%' }
            }
          }
        }
      });
    }

    // Health score distribution
    if (data.healthStatus?.moduleStatuses) {
      const healthScores = data.healthStatus.moduleStatuses.map((status: HealthStatus) => ({
        module: status.moduleId,
        score: status.healthScore
      }));

      charts.push({
        id: 'health-score-bar',
        title: 'Module Health Scores',
        type: 'bar',
        data: {
          labels: healthScores.map((h: any) => h.module),
          datasets: [{
            label: 'Health Score',
            data: healthScores.map((h: any) => h.score),
            backgroundColor: healthScores.map((h: any) => this.getHealthColor(h.score)),
            borderColor: healthScores.map((h: any) => this.getHealthColor(h.score)),
            borderWidth: 1
          }]
        },
        config: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    }

    return {
      id: template.id,
      title: template.title,
      type: 'chart',
      content: {},
      charts
    };
  }

  private async generateTableSection(
    template: ReportSection,
    data: any,
    options: any
  ): Promise<GeneratedReportSection> {
    const tables: TableData[] = [];

    // Module recovery profiles table
    if (data.moduleProfiles) {
      const profiles = data.moduleProfiles as ModuleRecoveryProfile[];

      tables.push({
        id: 'module-profiles',
        title: 'Module Recovery Profiles',
        headers: ['Module', 'Success Rate', 'Avg Duration', 'Health Improvement', 'Recommended Strategy', 'Risk Factors'],
        rows: profiles.map(profile => [
          profile.moduleId,
          `${(profile.successRate * 100).toFixed(1)}%`,
          `${(profile.averageDuration / 1000).toFixed(1)}s`,
          `${profile.averageHealthImprovement.toFixed(1)}%`,
          profile.recommendedStrategy,
          profile.riskFactors.length.toString()
        ]),
        config: {
          sortable: true,
          searchable: true,
          pagination: false
        }
      });
    }

    // Recent operations table
    if (data.recoveryAnalytics?.operations) {
      const operations = data.recoveryAnalytics.operations.slice(-20); // Last 20 operations

      tables.push({
        id: 'recent-operations',
        title: 'Recent Recovery Operations',
        headers: ['Time', 'Module', 'Strategy', 'Duration', 'Success', 'Health Improvement'],
        rows: operations.map((op: RecoveryAnalyticsData) => [
          new Date(op.startTime).toLocaleString(),
          op.moduleId,
          op.strategy,
          `${(op.duration / 1000).toFixed(1)}s`,
          op.success ? '✅' : '❌',
          `${op.healthImprovement}%`
        ]),
        config: {
          sortable: true,
          searchable: false,
          pagination: true
        }
      });
    }

    return {
      id: template.id,
      title: template.title,
      type: 'table',
      content: {},
      tables
    };
  }

  private async generateMetricsSection(
    template: ReportSection,
    data: any,
    options: any
  ): Promise<GeneratedReportSection> {
    const metrics: any[] = [];

    // System-wide metrics
    if (data.healthStatus) {
      const health = data.healthStatus as MonitoringReport;

      metrics.push(
        { label: 'Overall Health', value: `${health.overallHealth}/100`, status: this.getHealthStatus(health.overallHealth) },
        { label: 'Healthy Modules', value: health.systemMetrics.healthyModules, status: 'good' },
        { label: 'Degraded Modules', value: health.systemMetrics.degradedModules, status: 'warning' },
        { label: 'Critical Modules', value: health.systemMetrics.criticalModules, status: 'critical' },
        { label: 'Average Response Time', value: `${health.systemMetrics.averageResponseTime.toFixed(0)}ms`, status: 'good' }
      );
    }

    if (data.recoveryAnalytics) {
      const recovery = data.recoveryAnalytics as SystemRecoveryReport;

      metrics.push(
        { label: 'Total Operations', value: recovery.summary.totalOperations, status: 'good' },
        { label: 'Success Rate', value: `${((recovery.summary.successfulOperations / recovery.summary.totalOperations) * 100).toFixed(1)}%`, status: 'good' },
        { label: 'Avg Recovery Time', value: `${(recovery.summary.averageDuration / 1000).toFixed(1)}s`, status: 'good' },
        { label: 'Total Health Improvement', value: `${recovery.summary.totalHealthImprovement}%`, status: 'good' }
      );
    }

    return {
      id: template.id,
      title: template.title,
      type: 'metrics',
      content: {
        metrics,
        layout: 'grid' // or 'list'
      }
    };
  }

  private async generateTimelineSection(
    template: ReportSection,
    data: any,
    options: any
  ): Promise<GeneratedReportSection> {
    const timeline: any[] = [];

    // Create timeline from recovery operations
    if (data.recoveryAnalytics?.operations) {
      const operations = data.recoveryAnalytics.operations
        .sort((a: RecoveryAnalyticsData, b: RecoveryAnalyticsData) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
        .slice(0, 50); // Last 50 operations

      timeline.push(...operations.map((op: RecoveryAnalyticsData) => ({
        timestamp: op.startTime,
        title: `${op.moduleId} Recovery`,
        description: `${op.strategy} strategy - ${op.success ? 'Success' : 'Failed'}`,
        type: op.success ? 'success' : 'failure',
        details: {
          duration: op.duration,
          healthImprovement: op.healthImprovement,
          strategy: op.strategy
        }
      })));
    }

    return {
      id: template.id,
      title: template.title,
      type: 'timeline',
      content: {
        events: timeline,
        sortOrder: 'desc'
      }
    };
  }

  private async generateHeatmapSection(
    template: ReportSection,
    data: any,
    options: any
  ): Promise<GeneratedReportSection> {
    const heatmapData: any[] = [];

    // Module vs Strategy success rate heatmap
    if (data.moduleProfiles && data.recoveryAnalytics) {
      const modules = ['auth', 'i18n', 'cv-processing', 'multimedia', 'analytics', 'premium', 'public-profiles', 'recommendations', 'admin', 'workflow', 'payments'];
      const strategies = ['repair', 'rebuild', 'reset'];

      const operations = data.recoveryAnalytics.operations || [];

      for (const module of modules) {
        for (const strategy of strategies) {
          const strategyOps = operations.filter((op: RecoveryAnalyticsData) =>
            op.moduleId === module && op.strategy === strategy
          );

          const successRate = strategyOps.length > 0 ?
            strategyOps.filter((op: RecoveryAnalyticsData) => op.success).length / strategyOps.length :
            0;

          heatmapData.push({
            x: strategy,
            y: module,
            value: successRate,
            count: strategyOps.length
          });
        }
      }
    }

    return {
      id: template.id,
      title: template.title,
      type: 'heatmap',
      content: {
        data: heatmapData,
        colorScale: ['#ff4444', '#ffaa00', '#44ff44'], // red to green
        axes: {
          x: { title: 'Recovery Strategy' },
          y: { title: 'Module' }
        }
      }
    };
  }

  private async generateTextSection(
    template: ReportSection,
    data: any,
    options: any
  ): Promise<GeneratedReportSection> {
    let content = template.config.content || 'No content specified';

    // Simple template replacement
    if (data.recoveryAnalytics) {
      const analytics = data.recoveryAnalytics as SystemRecoveryReport;
      content = content.replace(/\{totalOperations\}/g, analytics.summary.totalOperations.toString());
      content = content.replace(/\{successRate\}/g, ((analytics.summary.successfulOperations / analytics.summary.totalOperations) * 100).toFixed(1));
    }

    return {
      id: template.id,
      title: template.title,
      type: 'text',
      content: {
        text: content,
        format: 'markdown'
      }
    };
  }

  private async exportReport(report: ComprehensiveReport, template: ReportTemplate): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${report.id}-${timestamp}`;

    switch (template.format) {
      case 'html':
        return this.exportHtmlReport(report, template, fileName);
      case 'json':
        return this.exportJsonReport(report, fileName);
      case 'markdown':
        return this.exportMarkdownReport(report, fileName);
      case 'csv':
        return this.exportCsvReport(report, fileName);
      default:
        throw new Error(`Unsupported export format: ${template.format}`);
    }
  }

  private async exportHtmlReport(
    report: ComprehensiveReport,
    template: ReportTemplate,
    fileName: string
  ): Promise<string> {
    const filePath = join(this.reportsPath, `${fileName}.html`);
    const html = this.generateHtmlReport(report, template);
    writeFileSync(filePath, html);
    return filePath;
  }

  private exportJsonReport(report: ComprehensiveReport, fileName: string): string {
    const filePath = join(this.reportsPath, `${fileName}.json`);
    writeFileSync(filePath, JSON.stringify(report, null, 2));
    return filePath;
  }

  private exportMarkdownReport(report: ComprehensiveReport, fileName: string): string {
    const filePath = join(this.reportsPath, `${fileName}.md`);
    const markdown = this.generateMarkdownReport(report);
    writeFileSync(filePath, markdown);
    return filePath;
  }

  private exportCsvReport(report: ComprehensiveReport, fileName: string): string {
    const filePath = join(this.reportsPath, `${fileName}.csv`);
    const csv = this.generateCsvReport(report);
    writeFileSync(filePath, csv);
    return filePath;
  }

  private generateHtmlReport(report: ComprehensiveReport, template: ReportTemplate): string {
    const styling = template.styling || {
      theme: 'professional',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      fontFamily: 'system-ui, sans-serif'
    };

    const css = this.generateReportStyles(styling);
    const sectionsHtml = report.sections.map(section => this.generateSectionHtml(section)).join('\n');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>${css}</style>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>${report.title}</h1>
            <p class="subtitle">${report.subtitle}</p>
            <div class="report-meta">
                <span>Generated: ${new Date(report.generatedAt).toLocaleString()}</span>
                <span>Author: ${report.author}</span>
                <span>Version: ${report.version}</span>
            </div>
        </header>

        <div class="report-summary">
            <h2>Executive Summary</h2>
            ${this.generateSummaryHtml(report.summary)}
        </div>

        <div class="report-content">
            ${sectionsHtml}
        </div>

        <footer class="report-footer">
            <p>Report generated by CVPlus Recovery System</p>
            <p>Generation time: ${report.metadata.generationTime}ms | Data points: ${report.metadata.totalDataPoints}</p>
        </footer>
    </div>

    ${this.generateChartScripts(report.sections)}
</body>
</html>`;
  }

  // Helper methods for HTML generation, styling, etc.
  private generateReportStyles(styling: ReportStyling): string {
    return `
        body {
            font-family: ${styling.fontFamily};
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            color: #334155;
        }
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .report-header {
            background: ${styling.primaryColor};
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .report-header h1 {
            margin: 0 0 0.5rem 0;
            font-size: 2.5rem;
        }
        .subtitle {
            margin: 0 0 1rem 0;
            opacity: 0.9;
        }
        .report-meta {
            display: flex;
            justify-content: center;
            gap: 2rem;
            font-size: 0.875rem;
            opacity: 0.8;
        }
        .report-summary, .report-content {
            padding: 2rem;
        }
        .section {
            margin-bottom: 3rem;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2rem;
        }
        .section:last-child {
            border-bottom: none;
        }
        .section h3 {
            color: ${styling.primaryColor};
            margin-bottom: 1rem;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        .metric-card {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 0.5rem;
            text-align: center;
        }
        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: ${styling.primaryColor};
        }
        .report-footer {
            background: #f1f5f9;
            padding: 1rem 2rem;
            text-align: center;
            font-size: 0.875rem;
            color: ${styling.secondaryColor};
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background: #f8fafc;
            font-weight: 600;
        }
        .chart-container {
            margin: 2rem 0;
            height: 400px;
        }
        .status-good { color: #059669; }
        .status-warning { color: #d97706; }
        .status-critical { color: #dc2626; }
    `;
  }

  private generateSummaryHtml(summary: ReportSummary): string {
    const metricsHtml = summary.keyMetrics.map(metric => `
        <div class="metric-card">
            <div class="metric-value status-${metric.status}">${metric.value}</div>
            <div>${metric.name}</div>
        </div>
    `).join('');

    const highlightsHtml = summary.highlights.length > 0 ? `
        <div class="highlights">
            <h4>Key Highlights</h4>
            <ul>
                ${summary.highlights.map(h => `<li>${h}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    const concernsHtml = summary.concerns.length > 0 ? `
        <div class="concerns">
            <h4>Areas of Concern</h4>
            <ul>
                ${summary.concerns.map(c => `<li class="status-warning">${c}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    return `
        <div class="metrics-grid">
            ${metricsHtml}
        </div>
        ${highlightsHtml}
        ${concernsHtml}
    `;
  }

  private generateSectionHtml(section: GeneratedReportSection): string {
    let content = `<div class="section"><h3>${section.title}</h3>`;

    // Add charts
    if (section.charts) {
      section.charts.forEach(chart => {
        content += `<div class="chart-container"><canvas id="${chart.id}"></canvas></div>`;
      });
    }

    // Add tables
    if (section.tables) {
      section.tables.forEach(table => {
        content += `
            <h4>${table.title}</h4>
            <table>
                <thead>
                    <tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${table.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        `;
      });
    }

    // Add other content based on section type
    if (section.content?.text) {
      content += `<div class="text-content">${section.content.text}</div>`;
    }

    if (section.content?.metrics) {
      const metricsHtml = section.content.metrics.map((metric: any) => `
          <div class="metric-card">
              <div class="metric-value status-${metric.status}">${metric.value}</div>
              <div>${metric.label}</div>
          </div>
      `).join('');
      content += `<div class="metrics-grid">${metricsHtml}</div>`;
    }

    content += '</div>';
    return content;
  }

  private generateChartScripts(sections: GeneratedReportSection[]): string {
    let scripts = '<script>';

    sections.forEach(section => {
      if (section.charts) {
        section.charts.forEach(chart => {
          scripts += `
            new Chart(document.getElementById('${chart.id}'), {
                type: '${chart.type}',
                data: ${JSON.stringify(chart.data)},
                options: ${JSON.stringify(chart.config)}
            });
          `;
        });
      }
    });

    scripts += '</script>';
    return scripts;
  }

  private generateMarkdownReport(report: ComprehensiveReport): string {
    let markdown = `# ${report.title}\n\n`;
    markdown += `${report.subtitle}\n\n`;
    markdown += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n`;
    markdown += `**Author:** ${report.author}\n`;
    markdown += `**Version:** ${report.version}\n\n`;

    // Add summary
    markdown += `## Executive Summary\n\n`;
    markdown += `### Key Metrics\n\n`;
    report.summary.keyMetrics.forEach(metric => {
      markdown += `- **${metric.name}**: ${metric.value}\n`;
    });

    if (report.summary.highlights.length > 0) {
      markdown += `\n### Highlights\n\n`;
      report.summary.highlights.forEach(highlight => {
        markdown += `- ${highlight}\n`;
      });
    }

    if (report.summary.concerns.length > 0) {
      markdown += `\n### Concerns\n\n`;
      report.summary.concerns.forEach(concern => {
        markdown += `- ⚠️ ${concern}\n`;
      });
    }

    // Add sections
    report.sections.forEach(section => {
      markdown += `\n## ${section.title}\n\n`;

      if (section.tables) {
        section.tables.forEach(table => {
          markdown += `### ${table.title}\n\n`;
          markdown += `| ${table.headers.join(' | ')} |\n`;
          markdown += `| ${table.headers.map(() => '---').join(' | ')} |\n`;
          table.rows.forEach(row => {
            markdown += `| ${row.join(' | ')} |\n`;
          });
          markdown += '\n';
        });
      }

      if (section.content?.text) {
        markdown += `${section.content.text}\n\n`;
      }
    });

    return markdown;
  }

  private generateCsvReport(report: ComprehensiveReport): string {
    // Simple CSV export of key metrics and data
    let csv = 'Section,Metric,Value,Status\n';

    report.summary.keyMetrics.forEach(metric => {
      csv += `Summary,"${metric.name}","${metric.value}","${metric.status}"\n`;
    });

    // Add data from tables
    report.sections.forEach(section => {
      if (section.tables) {
        section.tables.forEach(table => {
          table.rows.forEach(row => {
            csv += `"${section.title}","${table.title}","${row.join('|')}","data"\n`;
          });
        });
      }
    });

    return csv;
  }

  // Helper methods
  private extractOverview(data: any): string {
    if (data.recoveryAnalytics) {
      const analytics = data.recoveryAnalytics as SystemRecoveryReport;
      return `System performed ${analytics.summary.totalOperations} recovery operations with ${analytics.summary.successfulOperations} successful recoveries.`;
    }
    return 'System overview data not available.';
  }

  private extractKeyPoints(data: any): string[] {
    const points: string[] = [];

    if (data.recoveryAnalytics) {
      const analytics = data.recoveryAnalytics as SystemRecoveryReport;
      const successRate = (analytics.summary.successfulOperations / analytics.summary.totalOperations) * 100;
      points.push(`Recovery success rate: ${successRate.toFixed(1)}%`);
      points.push(`Average recovery time: ${(analytics.summary.averageDuration / 1000).toFixed(1)} seconds`);
    }

    if (data.healthStatus) {
      const health = data.healthStatus as MonitoringReport;
      points.push(`Overall system health: ${health.overallHealth}/100`);
      points.push(`Active alerts: ${health.activeAlerts}`);
    }

    return points;
  }

  private extractSummaryMetrics(data: any): Record<string, any> {
    const metrics: Record<string, any> = {};

    if (data.recoveryAnalytics) {
      const analytics = data.recoveryAnalytics as SystemRecoveryReport;
      metrics.recoveryOperations = analytics.summary.totalOperations;
      metrics.successRate = (analytics.summary.successfulOperations / analytics.summary.totalOperations) * 100;
    }

    if (data.healthStatus) {
      const health = data.healthStatus as MonitoringReport;
      metrics.systemHealth = health.overallHealth;
      metrics.healthyModules = health.systemMetrics.healthyModules;
    }

    return metrics;
  }

  private getDataSources(data: any): string[] {
    const sources: string[] = [];
    if (data.recoveryAnalytics) sources.push('Recovery Analytics');
    if (data.healthStatus) sources.push('Health Monitoring');
    if (data.validationReport) sources.push('Validation System');
    if (data.moduleProfiles) sources.push('Module Profiles');
    return sources;
  }

  private countDataPoints(data: any): number {
    let count = 0;
    if (data.recoveryAnalytics?.operations) count += data.recoveryAnalytics.operations.length;
    if (data.healthStatus?.moduleStatuses) count += data.healthStatus.moduleStatuses.length;
    if (data.validationReport?.suiteResults) count += data.validationReport.suiteResults.length;
    if (data.moduleProfiles) count += data.moduleProfiles.length;
    return count;
  }

  private getModuleColor(moduleId: string): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    const hash = moduleId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  private getHealthColor(score: number): string {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // yellow
    if (score >= 50) return '#f97316'; // orange
    return '#ef4444'; // red
  }

  private getHealthStatus(score: number): 'good' | 'warning' | 'critical' {
    if (score >= 80) return 'good';
    if (score >= 60) return 'warning';
    return 'critical';
  }

  private loadReportTemplates(): void {
    // Load default templates
    this.templates.set('comprehensive', {
      id: 'comprehensive',
      name: 'Comprehensive Recovery Report',
      description: 'Complete system recovery and health analysis',
      format: 'html',
      sections: [
        { id: 'summary', title: 'Executive Summary', type: 'summary', dataSource: 'all', config: {}, order: 1 },
        { id: 'metrics', title: 'Key Metrics', type: 'metrics', dataSource: 'all', config: {}, order: 2 },
        { id: 'charts', title: 'Performance Charts', type: 'chart', dataSource: 'analytics', config: {}, order: 3 },
        { id: 'profiles', title: 'Module Profiles', type: 'table', dataSource: 'profiles', config: {}, order: 4 },
        { id: 'timeline', title: 'Recovery Timeline', type: 'timeline', dataSource: 'operations', config: {}, order: 5 },
        { id: 'heatmap', title: 'Success Rate Heatmap', type: 'heatmap', dataSource: 'analytics', config: {}, order: 6 }
      ],
      styling: {
        theme: 'professional',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        fontFamily: 'system-ui, sans-serif'
      }
    });

    // Add more templates as needed
    this.templates.set('executive', {
      id: 'executive',
      name: 'Executive Summary Report',
      description: 'High-level overview for executives',
      format: 'html',
      sections: [
        { id: 'summary', title: 'Executive Summary', type: 'summary', dataSource: 'all', config: {}, order: 1 },
        { id: 'metrics', title: 'Key Performance Indicators', type: 'metrics', dataSource: 'all', config: {}, order: 2 },
        { id: 'charts', title: 'Trends Overview', type: 'chart', dataSource: 'analytics', config: {}, order: 3 }
      ],
      styling: {
        theme: 'modern',
        primaryColor: '#059669',
        secondaryColor: '#6b7280',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif'
      }
    });
  }

  private ensureReportDirectories(): void {
    const dirs = [
      this.reportsPath,
      this.templatesPath
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }
}