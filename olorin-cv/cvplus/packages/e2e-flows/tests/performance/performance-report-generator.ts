/**
 * Performance Report Generator
 * Generates comprehensive HTML and JSON reports from performance test results
  */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PerformanceTestResult {
  testName: string;
  service: string;
  duration: number;
  memoryUsed: number;
  operationsPerSecond: number;
  errorRate: number;
  successRate: number;
  passed: boolean;
  timestamp: Date;
  details: Record<string, any>;
  violations: string[];
}

export interface PerformanceReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    overallSuccessRate: number;
    totalDuration: number;
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    averageOperationsPerSecond: number;
    reportGenerated: Date;
  };
  systemInfo: {
    platform: string;
    arch: string;
    nodeVersion: string;
    totalMemory: number;
    cpuCount: number;
  };
  testResults: PerformanceTestResult[];
  recommendations: string[];
  performanceTrends: {
    memoryTrend: 'stable' | 'increasing' | 'decreasing';
    performanceTrend: 'stable' | 'improving' | 'degrading';
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export class PerformanceReportGenerator {
  private results: PerformanceTestResult[] = [];
  private outputDir: string;

  constructor(outputDir: string = '/tmp/performance-reports') {
    this.outputDir = outputDir;
    this.ensureOutputDirectory();
  }

  /**
   * Add a performance test result
    */
  public addResult(result: PerformanceTestResult): void {
    this.results.push(result);
  }

  /**
   * Add multiple results from a service
    */
  public addServiceResults(serviceName: string, serviceResults: Record<string, any>): void {
    for (const [testName, testData] of Object.entries(serviceResults)) {
      if (testData && typeof testData === 'object') {
        const result: PerformanceTestResult = {
          testName,
          service: serviceName,
          duration: testData.duration || testData.metrics?.duration || 0,
          memoryUsed: testData.memoryUsed || testData.metrics?.memoryUsed || 0,
          operationsPerSecond: testData.operationsPerSecond || testData.throughput || 0,
          errorRate: testData.errorRate || 0,
          successRate: testData.successRate || testData.passed || 100,
          passed: testData.passed !== false,
          timestamp: new Date(),
          details: testData,
          violations: testData.violations || []
        };
        this.addResult(result);
      }
    }
  }

  /**
   * Generate complete performance report
    */
  public generateReport(): PerformanceReport {
    const summary = this.generateSummary();
    const systemInfo = this.getSystemInfo();
    const recommendations = this.generateRecommendations();
    const performanceTrends = this.analyzePerformanceTrends();

    return {
      summary,
      systemInfo,
      testResults: this.results,
      recommendations,
      performanceTrends
    };
  }

  /**
   * Save report to JSON file
    */
  public async saveJsonReport(filename?: string): Promise<string> {
    const report = this.generateReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilename = filename || `performance-report-${timestamp}.json`;
    const filepath = path.join(this.outputDir, reportFilename);

    await fs.promises.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`Performance report saved to: ${filepath}`);

    return filepath;
  }

  /**
   * Save report to HTML file
    */
  public async saveHtmlReport(filename?: string): Promise<string> {
    const report = this.generateReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilename = filename || `performance-report-${timestamp}.html`;
    const filepath = path.join(this.outputDir, reportFilename);

    const htmlContent = this.generateHtmlReport(report);
    await fs.promises.writeFile(filepath, htmlContent);
    console.log(`HTML performance report saved to: ${filepath}`);

    return filepath;
  }

  /**
   * Generate dashboard with all reports
    */
  public async generateDashboard(): Promise<string> {
    const report = this.generateReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dashboardFilename = `performance-dashboard-${timestamp}.html`;
    const filepath = path.join(this.outputDir, dashboardFilename);

    const dashboardContent = this.generateDashboard2(report);
    await fs.promises.writeFile(filepath, dashboardContent);
    console.log(`Performance dashboard saved to: ${filepath}`);

    return filepath;
  }

  private generateSummary() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const overallSuccessRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const durations = this.results.map(r => r.duration).filter(d => d > 0);
    const memoryUsages = this.results.map(r => r.memoryUsed).filter(m => m > 0);
    const operationsPerSecond = this.results.map(r => r.operationsPerSecond).filter(ops => ops > 0);

    return {
      totalTests,
      passedTests,
      failedTests,
      overallSuccessRate,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      averageMemoryUsage: memoryUsages.length > 0 ? memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length : 0,
      peakMemoryUsage: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
      averageOperationsPerSecond: operationsPerSecond.length > 0 ? operationsPerSecond.reduce((sum, ops) => sum + ops, 0) / operationsPerSecond.length : 0,
      reportGenerated: new Date()
    };
  }

  private getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      cpuCount: os.cpus().length
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.generateSummary();

    // Performance recommendations
    if (summary.overallSuccessRate < 90) {
      recommendations.push(`⚠️  Overall success rate is ${summary.overallSuccessRate.toFixed(1)}%. Consider investigating failed tests and optimizing bottlenecks.`);
    }

    if (summary.peakMemoryUsage > 1024 * 1024 * 1024) { // 1GB
      recommendations.push(`🔥 Peak memory usage is ${(summary.peakMemoryUsage / 1024 / 1024 / 1024).toFixed(2)}GB. Consider memory optimization.`);
    }

    if (summary.averageOperationsPerSecond < 1) {
      recommendations.push(`🐌 Average operations per second is ${summary.averageOperationsPerSecond.toFixed(2)}. Performance optimization needed.`);
    }

    // Service-specific recommendations
    const serviceGroups = this.groupResultsByService();

    for (const [serviceName, results] of Object.entries(serviceGroups)) {
      const serviceFailures = results.filter(r => !r.passed).length;
      const serviceSuccessRate = (results.length - serviceFailures) / results.length * 100;

      if (serviceSuccessRate < 85) {
        recommendations.push(`⚠️  ${serviceName} has ${serviceSuccessRate.toFixed(1)}% success rate. Requires attention.`);
      }

      const avgMemory = results.reduce((sum, r) => sum + r.memoryUsed, 0) / results.length;
      if (avgMemory > 500 * 1024 * 1024) { // 500MB
        recommendations.push(`📊 ${serviceName} average memory usage is ${(avgMemory / 1024 / 1024).toFixed(2)}MB. Consider memory optimization.`);
      }
    }

    // General recommendations
    recommendations.push('💡 Run performance tests regularly to track trends and catch regressions early.');
    recommendations.push('🔄 Consider implementing performance budgets in CI/CD pipeline.');
    recommendations.push('📈 Monitor production performance metrics to validate test results.');

    return recommendations;
  }

  private analyzePerformanceTrends() {
    // For this implementation, we'll do basic analysis
    // In production, you'd compare with historical data
    const summary = this.generateSummary();

    let memoryTrend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    let performanceTrend: 'stable' | 'improving' | 'degrading' = 'stable';
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Basic heuristics
    if (summary.peakMemoryUsage > 800 * 1024 * 1024) { // 800MB
      memoryTrend = 'increasing';
      riskLevel = 'medium';
    }

    if (summary.averageOperationsPerSecond < 0.5) {
      performanceTrend = 'degrading';
      riskLevel = 'high';
    } else if (summary.averageOperationsPerSecond > 10) {
      performanceTrend = 'improving';
    }

    if (summary.overallSuccessRate < 80) {
      riskLevel = 'high';
    } else if (summary.overallSuccessRate < 95) {
      riskLevel = 'medium';
    }

    return {
      memoryTrend,
      performanceTrend,
      riskLevel
    };
  }

  private groupResultsByService(): Record<string, PerformanceTestResult[]> {
    return this.results.reduce((groups, result) => {
      if (!groups[result.service]) {
        groups[result.service] = [];
      }
      groups[result.service].push(result);
      return groups;
    }, {} as Record<string, PerformanceTestResult[]>);
  }

  private generateHtmlReport(report: PerformanceReport): string {
    const serviceGroups = this.groupResultsByService();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Flows Performance Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f7fa;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .summary {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .summary h2 {
            color: #2c3e50;
            margin-top: 0;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #3498db;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .metric-label {
            color: #7f8c8d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .service-section {
            background: white;
            margin-bottom: 30px;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .service-header {
            background: #34495e;
            color: white;
            padding: 20px;
            font-size: 1.3em;
            font-weight: 500;
        }
        .test-results {
            padding: 20px;
        }
        .test-result {
            border: 1px solid #e9ecef;
            border-radius: 6px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        .test-header {
            padding: 15px;
            background: #f8f9fa;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-name {
            font-weight: 600;
            color: #2c3e50;
        }
        .test-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 500;
        }
        .status-passed {
            background: #d4edda;
            color: #155724;
        }
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        .test-details {
            padding: 15px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .detail-item {
            text-align: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .detail-value {
            font-size: 1.2em;
            font-weight: bold;
            color: #2c3e50;
        }
        .detail-label {
            font-size: 0.8em;
            color: #7f8c8d;
            margin-top: 5px;
        }
        .recommendations {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .recommendations h2 {
            color: #2c3e50;
            margin-top: 0;
            border-bottom: 2px solid #e74c3c;
            padding-bottom: 10px;
        }
        .recommendation {
            padding: 10px 15px;
            margin: 10px 0;
            border-left: 4px solid #f39c12;
            background: #fef9e7;
            border-radius: 4px;
        }
        .trends {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .trends h2 {
            color: #2c3e50;
            margin-top: 0;
            border-bottom: 2px solid #9b59b6;
            padding-bottom: 10px;
        }
        .trend-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #ecf0f1;
        }
        .trend-stable { color: #27ae60; }
        .trend-improving { color: #2ecc71; }
        .trend-degrading { color: #e74c3c; }
        .trend-increasing { color: #f39c12; }
        .trend-decreasing { color: #3498db; }
        .risk-low { color: #27ae60; }
        .risk-medium { color: #f39c12; }
        .risk-high { color: #e74c3c; }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #7f8c8d;
            font-size: 0.9em;
        }
        @media (max-width: 768px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            .test-details {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 E2E Flows Performance Report</h1>
        <p>Generated on ${report.summary.reportGenerated.toLocaleString()}</p>
    </div>

    <div class="summary">
        <h2>📊 Performance Summary</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${report.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.overallSuccessRate.toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(report.summary.totalDuration / 1000).toFixed(1)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(report.summary.peakMemoryUsage / 1024 / 1024).toFixed(1)}MB</div>
                <div class="metric-label">Peak Memory</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.averageOperationsPerSecond.toFixed(1)}</div>
                <div class="metric-label">Avg Ops/Sec</div>
            </div>
        </div>
    </div>

    ${Object.entries(serviceGroups).map(([serviceName, results]) => `
    <div class="service-section">
        <div class="service-header">
            📋 ${serviceName} Performance Results
        </div>
        <div class="test-results">
            ${results.map(result => `
            <div class="test-result">
                <div class="test-header">
                    <div class="test-name">${result.testName}</div>
                    <div class="test-status ${result.passed ? 'status-passed' : 'status-failed'}">
                        ${result.passed ? '✅ PASSED' : '❌ FAILED'}
                    </div>
                </div>
                <div class="test-details">
                    <div class="detail-item">
                        <div class="detail-value">${result.duration}ms</div>
                        <div class="detail-label">Duration</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-value">${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB</div>
                        <div class="detail-label">Memory Used</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-value">${result.operationsPerSecond.toFixed(1)}</div>
                        <div class="detail-label">Ops/Sec</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-value">${result.errorRate.toFixed(1)}%</div>
                        <div class="detail-label">Error Rate</div>
                    </div>
                </div>
                ${result.violations.length > 0 ? `
                <div style="padding: 15px; background: #f8d7da; color: #721c24; margin-top: 10px;">
                    <strong>⚠️ Violations:</strong>
                    <ul style="margin: 10px 0 0 20px;">
                        ${result.violations.map(v => `<li>${v}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
    </div>
    `).join('')}

    <div class="recommendations">
        <h2>💡 Recommendations</h2>
        ${report.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
    </div>

    <div class="trends">
        <h2>📈 Performance Trends</h2>
        <div class="trend-item">
            <span>Memory Trend:</span>
            <span class="trend-${report.performanceTrends.memoryTrend}">
                ${report.performanceTrends.memoryTrend.toUpperCase()}
            </span>
        </div>
        <div class="trend-item">
            <span>Performance Trend:</span>
            <span class="trend-${report.performanceTrends.performanceTrend}">
                ${report.performanceTrends.performanceTrend.toUpperCase()}
            </span>
        </div>
        <div class="trend-item">
            <span>Risk Level:</span>
            <span class="risk-${report.performanceTrends.riskLevel}">
                ${report.performanceTrends.riskLevel.toUpperCase()}
            </span>
        </div>
    </div>

    <div class="footer">
        <p>System: ${report.systemInfo.platform} ${report.systemInfo.arch} | Node.js ${report.systemInfo.nodeVersion}</p>
        <p>Hardware: ${os.cpus().length} CPUs, ${(report.systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(1)}GB RAM</p>
        <p>Generated by CVPlus E2E Flows Performance Testing Suite</p>
    </div>
</body>
</html>`;
  }

  private generateDashboard2(report: PerformanceReport): string {
    const serviceGroups = this.groupResultsByService();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVPlus E2E Flows - Performance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .dashboard {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 3em;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        .card h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.4em;
            font-weight: 600;
        }
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        .stat {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .stat-value {
            font-size: 2.2em;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #7f8c8d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .chart-container {
            position: relative;
            height: 300px;
        }
        .service-performance {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .performance-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .performance-table th,
        .performance-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        .performance-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 500;
        }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .recommendations {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .recommendation {
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #3498db;
            background: rgba(52, 152, 219, 0.1);
            border-radius: 5px;
        }
        @media (max-width: 768px) {
            .grid { grid-template-columns: 1fr; }
            .stat-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🚀 CVPlus E2E Performance Dashboard</h1>
            <p>Real-time performance insights • Generated ${report.summary.reportGenerated.toLocaleString()}</p>
        </div>

        <div class="grid">
            <div class="card">
                <h2>📊 Overall Performance</h2>
                <div class="stat-grid">
                    <div class="stat">
                        <div class="stat-value">${report.summary.totalTests}</div>
                        <div class="stat-label">Total Tests</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${report.summary.overallSuccessRate.toFixed(1)}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${(report.summary.totalDuration / 1000).toFixed(1)}s</div>
                        <div class="stat-label">Total Time</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${report.summary.averageOperationsPerSecond.toFixed(1)}</div>
                        <div class="stat-label">Avg Ops/Sec</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>🧠 Memory Performance</h2>
                <div class="chart-container">
                    <canvas id="memoryChart"></canvas>
                </div>
            </div>

            <div class="card">
                <h2>⚡ Response Times</h2>
                <div class="chart-container">
                    <canvas id="responseChart"></canvas>
                </div>
            </div>

            <div class="card">
                <h2>🎯 Success Rates by Service</h2>
                <div class="chart-container">
                    <canvas id="successChart"></canvas>
                </div>
            </div>
        </div>

        <div class="service-performance">
            <h2>📋 Detailed Test Results</h2>
            <table class="performance-table">
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Test Name</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Memory</th>
                        <th>Ops/Sec</th>
                        <th>Error Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.testResults.map(result => `
                    <tr>
                        <td><strong>${result.service}</strong></td>
                        <td>${result.testName}</td>
                        <td>
                            <span class="status-badge ${result.passed ? 'status-passed' : 'status-failed'}">
                                ${result.passed ? '✅ Passed' : '❌ Failed'}
                            </span>
                        </td>
                        <td>${result.duration}ms</td>
                        <td>${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB</td>
                        <td>${result.operationsPerSecond.toFixed(1)}</td>
                        <td>${result.errorRate.toFixed(1)}%</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="recommendations">
            <h2>💡 Performance Recommendations</h2>
            ${report.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
        </div>
    </div>

    <script>
        // Memory Performance Chart
        const memoryCtx = document.getElementById('memoryChart').getContext('2d');
        new Chart(memoryCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(serviceGroups))},
                datasets: [{
                    label: 'Average Memory (MB)',
                    data: ${JSON.stringify(Object.values(serviceGroups).map(results =>
                        results.reduce((sum, r) => sum + r.memoryUsed, 0) / results.length / 1024 / 1024
                    ))},
                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // Response Times Chart
        const responseCtx = document.getElementById('responseChart').getContext('2d');
        new Chart(responseCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(report.testResults.map((_, i) => `Test ${i + 1}`))},
                datasets: [{
                    label: 'Response Time (ms)',
                    data: ${JSON.stringify(report.testResults.map(r => r.duration))},
                    borderColor: 'rgba(231, 76, 60, 1)',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // Success Rate Chart
        const successCtx = document.getElementById('successChart').getContext('2d');
        new Chart(successCtx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(Object.keys(serviceGroups))},
                datasets: [{
                    data: ${JSON.stringify(Object.values(serviceGroups).map(results => {
                        const passed = results.filter(r => r.passed).length;
                        return (passed / results.length) * 100;
                    }))},
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(230, 126, 34, 0.8)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    </script>
</body>
</html>`;
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
}

export default PerformanceReportGenerator;