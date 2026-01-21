/**
 * Deployment Recommendations Generator
 */

class RecommendationsGenerator {
  constructor(deploymentData, metrics) {
    this.deploymentData = deploymentData;
    this.metrics = metrics;
    this.recommendations = [];
  }

  async generateRecommendations() {
    console.log('  💡 Generating recommendations...');
    
    this.analyzePerformanceIssues();
    this.analyzeReliabilityIssues();
    this.analyzeQualityIssues();
    this.generateOptimizations();
    
    // Sort by priority
    this.recommendations.sort((a, b) => this.getPriorityValue(a.priority) - this.getPriorityValue(b.priority));
    
    console.log(`    ✅ Generated ${this.recommendations.length} recommendations`);
    return this.recommendations;
  }

  analyzePerformanceIssues() {
    const performance = this.metrics.performance || {};
    
    if (performance.durationMinutes > 10) {
      this.addRecommendation({
        category: 'performance',
        priority: 'high',
        title: 'Deployment Duration Too Long',
        description: `Deployment took ${performance.durationMinutes} minutes, which is above the recommended 10-minute threshold.`,
        actionItems: [
          'Review deployment bottlenecks',
          'Consider parallel deployment strategies',
          'Optimize build processes',
          'Review dependency installation times'
        ],
        impact: 'Reduces deployment time and improves developer productivity'
      });
    }
    
    if (performance.bottlenecks && performance.bottlenecks.length > 0) {
      this.addRecommendation({
        category: 'performance',
        priority: 'medium',
        title: 'Performance Bottlenecks Detected',
        description: `Found ${performance.bottlenecks.length} performance bottlenecks during deployment.`,
        actionItems: [
          'Investigate slow operations',
          'Optimize resource allocation',
          'Consider caching strategies'
        ],
        impact: 'Improves deployment reliability and speed'
      });
    }
  }

  analyzeReliabilityIssues() {
    const reliability = this.metrics.reliability || {};
    const errors = this.deploymentData.log?.errors || [];
    
    if (reliability.successRate < 95) {
      this.addRecommendation({
        category: 'reliability',
        priority: 'high',
        title: 'Low Deployment Success Rate',
        description: `Success rate is ${reliability.successRate}%, below the recommended 95% threshold.`,
        actionItems: [
          'Review and fix deployment errors',
          'Implement better error handling',
          'Add deployment validation steps',
          'Consider rollback mechanisms'
        ],
        impact: 'Increases deployment reliability and reduces failures'
      });
    }
    
    if (errors.length > 0) {
      this.addRecommendation({
        category: 'reliability',
        priority: 'medium',
        title: 'Deployment Errors Need Attention',
        description: `Found ${errors.length} errors during deployment.`,
        actionItems: [
          'Review error logs in detail',
          'Fix underlying issues',
          'Improve error monitoring'
        ],
        impact: 'Prevents future deployment failures'
      });
    }
  }

  analyzeQualityIssues() {
    const quality = this.metrics.quality || {};
    const warnings = this.deploymentData.log?.warnings || [];
    
    if (quality.qualityScore < 80) {
      this.addRecommendation({
        category: 'quality',
        priority: 'medium',
        title: 'Code Quality Concerns',
        description: `Quality score is ${quality.qualityScore}/100, indicating potential issues.`,
        actionItems: [
          'Address code quality warnings',
          'Run linting and formatting tools',
          'Review code standards compliance'
        ],
        impact: 'Improves code maintainability and reduces bugs'
      });
    }
    
    if (warnings.length > 5) {
      this.addRecommendation({
        category: 'quality',
        priority: 'low',
        title: 'Multiple Warnings Detected',
        description: `Found ${warnings.length} warnings during deployment.`,
        actionItems: [
          'Review and address warnings',
          'Update dependencies if needed',
          'Clean up deprecated code'
        ],
        impact: 'Prevents warnings from becoming errors'
      });
    }
  }

  generateOptimizations() {
    // General optimization recommendations
    this.addRecommendation({
      category: 'optimization',
      priority: 'low',
      title: 'Consider Deployment Optimizations',
      description: 'Regular optimization can improve deployment efficiency.',
      actionItems: [
        'Review deployment scripts regularly',
        'Update deployment tools',
        'Monitor deployment metrics over time',
        'Consider CI/CD improvements'
      ],
      impact: 'Maintains optimal deployment performance'
    });
  }

  addRecommendation(recommendation) {
    this.recommendations.push({
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...recommendation
    });
  }

  getPriorityValue(priority) {
    const priorityMap = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4
    };
    return priorityMap[priority] || 5;
  }
}

module.exports = RecommendationsGenerator;