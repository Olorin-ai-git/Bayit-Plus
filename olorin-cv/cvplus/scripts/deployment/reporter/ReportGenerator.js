/**
 * Deployment Report Generator
 */

const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
  constructor(deploymentData, metrics, recommendations, reportFile) {
    this.deploymentData = deploymentData;
    this.metrics = metrics;
    this.recommendations = recommendations;
    this.reportFile = reportFile;
  }

  async createDetailedReport() {
    console.log('  📄 Creating detailed report...');
    
    const report = {
      metadata: {
        reportType: 'detailed',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      deployment: this.deploymentData,
      metrics: this.metrics,
      recommendations: this.recommendations,
      summary: this.createExecutiveSummary()
    };
    
    await this.writeJsonReport(this.reportFile, report);
    console.log(`    ✅ Detailed report saved to ${this.reportFile}`);
    
    return report;
  }

  async createSummaryReport() {
    console.log('  📋 Creating summary report...');
    
    const summaryFile = this.reportFile.replace('.json', '-summary.json');
    const summary = {
      metadata: {
        reportType: 'summary',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      overview: this.createOverview(),
      keyMetrics: this.extractKeyMetrics(),
      topRecommendations: this.getTopRecommendations(),
      status: this.getOverallStatus()
    };
    
    await this.writeJsonReport(summaryFile, summary);
    console.log(`    ✅ Summary report saved to ${summaryFile}`);
    
    return summary;
  }

  createExecutiveSummary() {
    const summary = this.metrics.summary || {};
    const performance = this.metrics.performance || {};
    const reliability = this.metrics.reliability || {};
    
    return {
      deploymentStatus: summary.status || 'unknown',
      duration: performance.durationMinutes || 0,
      successRate: reliability.successRate || 0,
      totalIssues: summary.totalErrors + summary.totalWarnings,
      recommendationCount: this.recommendations.length,
      overallHealth: this.calculateOverallHealth()
    };
  }

  createOverview() {
    const project = this.deploymentData.project || {};
    const summary = this.metrics.summary || {};
    
    return {
      projectName: project.name || 'Unknown',
      projectVersion: project.version || '0.0.0',
      environment: project.environment || 'unknown',
      deploymentTime: project.timestamp,
      status: summary.status || 'unknown',
      duration: `${this.metrics.performance?.durationMinutes || 0} minutes`
    };
  }

  extractKeyMetrics() {
    return {
      performance: {
        deploymentDuration: this.metrics.performance?.durationMinutes || 0,
        rating: this.metrics.performance?.performanceRating || 'unknown'
      },
      reliability: {
        successRate: this.metrics.reliability?.successRate || 0,
        score: this.metrics.reliability?.reliabilityScore || 'unknown'
      },
      quality: {
        qualityScore: this.metrics.quality?.qualityScore || 0,
        rating: this.metrics.quality?.qualityRating || 'unknown'
      }
    };
  }

  getTopRecommendations() {
    return this.recommendations
      .filter(rec => rec.priority === 'critical' || rec.priority === 'high')
      .slice(0, 5)
      .map(rec => ({
        title: rec.title,
        priority: rec.priority,
        category: rec.category,
        description: rec.description
      }));
  }

  getOverallStatus() {
    const errors = this.metrics.summary?.totalErrors || 0;
    const warnings = this.metrics.summary?.totalWarnings || 0;
    const successRate = this.metrics.reliability?.successRate || 0;
    
    if (errors > 0 || successRate < 90) {
      return 'needs_attention';
    } else if (warnings > 5 || successRate < 95) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  calculateOverallHealth() {
    const performance = this.metrics.performance?.performanceRating || 'poor';
    const reliability = this.metrics.reliability?.reliabilityScore || 'poor';
    const quality = this.metrics.quality?.qualityRating || 'poor';
    
    const scores = { excellent: 4, good: 3, fair: 2, poor: 1 };
    const avgScore = (scores[performance] + scores[reliability] + scores[quality]) / 3;
    
    if (avgScore >= 3.5) return 'excellent';
    if (avgScore >= 2.5) return 'good';
    if (avgScore >= 1.5) return 'fair';
    return 'poor';
  }

  async writeJsonReport(filePath, data) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write formatted JSON
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error(`Failed to write report to ${filePath}:`, error);
      throw error;
    }
  }
}

module.exports = ReportGenerator;