#!/usr/bin/env node

/**
 * Deployment Reporter and Summary System - Refactored
 * Comprehensive reporting and metrics collection for deployments
 */

const DataCollector = require('../reporter/DataCollector');
const MetricsAnalyzer = require('../reporter/MetricsAnalyzer');
const RecommendationsGenerator = require('../reporter/RecommendationsGenerator');
const ReportGenerator = require('../reporter/ReportGenerator');

class DeploymentReporter {
  constructor(projectRoot, logFile, reportFile) {
    this.projectRoot = projectRoot;
    this.logFile = logFile;
    this.reportFile = reportFile;
    
    // Initialize modular components
    this.dataCollector = new DataCollector(projectRoot, logFile);
    this.deploymentData = {};
    this.metrics = {};
    this.recommendations = [];
  }

  async generateReport() {
    console.log('📊 Generating comprehensive deployment report...');
    
    try {
      // Collect deployment data
      this.deploymentData = await this.dataCollector.collectDeploymentData();
      
      // Analyze metrics
      const metricsAnalyzer = new MetricsAnalyzer(this.deploymentData);
      this.metrics = await metricsAnalyzer.analyzeMetrics();
      
      // Generate recommendations
      const recommendationsGenerator = new RecommendationsGenerator(this.deploymentData, this.metrics);
      this.recommendations = await recommendationsGenerator.generateRecommendations();
      
      // Create reports
      const reportGenerator = new ReportGenerator(
        this.deploymentData, 
        this.metrics, 
        this.recommendations, 
        this.reportFile
      );
      
      await reportGenerator.createDetailedReport();
      await reportGenerator.createSummaryReport();
      
      console.log('✅ Deployment report generated successfully');
      return {
        status: 'success',
        reportFile: this.reportFile,
        summaryFile: this.reportFile.replace('.json', '-summary.json'),
        metrics: this.metrics.summary,
        recommendationCount: this.recommendations.length
      };
    } catch (error) {
      console.log(`❌ Report generation failed: ${error.message}`);
      throw error;
    }
  }

  // Backward compatibility methods
  async getDeploymentSummary() {
    if (!this.metrics.summary) {
      throw new Error('No metrics available. Run generateReport() first.');
    }
    
    return {
      status: this.metrics.summary.status,
      duration: this.metrics.performance?.durationMinutes || 0,
      errors: this.metrics.summary.totalErrors || 0,
      warnings: this.metrics.summary.totalWarnings || 0,
      recommendations: this.recommendations.length
    };
  }

  async exportMetrics() {
    return {
      deployment: this.deploymentData,
      metrics: this.metrics,
      recommendations: this.recommendations,
      timestamp: new Date().toISOString()
    };
  }
}

// CLI interface
if (require.main === module) {
  const [projectRoot, logFile, reportFile] = process.argv.slice(2);
  
  if (!projectRoot || !logFile || !reportFile) {
    console.error('Usage: node deployment-reporter.js <projectRoot> <logFile> <reportFile>');
    process.exit(1);
  }
  
  const reporter = new DeploymentReporter(projectRoot, logFile, reportFile);
  
  reporter.generateReport()
    .then((result) => {
      console.log('📊 Report Generation Complete');
      console.log(`📄 Detailed Report: ${result.reportFile}`);
      console.log(`📋 Summary Report: ${result.summaryFile}`);
      console.log(`⚡ ${result.recommendationCount} recommendations generated`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Report generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = DeploymentReporter;