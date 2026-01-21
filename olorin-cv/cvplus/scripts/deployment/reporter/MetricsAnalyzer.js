/**
 * Deployment Metrics Analyzer
 */

class MetricsAnalyzer {
  constructor(deploymentData) {
    this.deploymentData = deploymentData;
    this.metrics = {};
  }

  async analyzeMetrics() {
    console.log('  📈 Analyzing deployment metrics...');
    
    this.metrics = {
      summary: this.calculateSummaryMetrics(),
      performance: this.analyzePerformance(),
      reliability: this.analyzeReliability(),
      quality: this.analyzeQuality(),
      trends: this.analyzeTrends()
    };
    
    console.log('    ✅ Metrics analysis complete');
    return this.metrics;
  }

  calculateSummaryMetrics() {
    const logData = this.deploymentData.log || {};
    
    return {
      totalEvents: logData.events?.length || 0,
      totalErrors: logData.errors?.length || 0,
      totalWarnings: logData.warnings?.length || 0,
      duration: logData.duration || 0,
      status: logData.errors?.length > 0 ? 'failed' : 'success',
      timestamp: new Date().toISOString()
    };
  }

  analyzePerformance() {
    const duration = this.deploymentData.log?.duration || 0;
    
    // Convert duration to minutes for readability
    const durationMinutes = duration / (1000 * 60);
    
    let performanceRating = 'good';
    if (durationMinutes > 10) performanceRating = 'poor';
    else if (durationMinutes > 5) performanceRating = 'fair';
    
    return {
      deploymentDuration: duration,
      durationMinutes: Math.round(durationMinutes * 100) / 100,
      performanceRating,
      bottlenecks: this.identifyBottlenecks()
    };
  }

  analyzeReliability() {
    const errors = this.deploymentData.log?.errors || [];
    const warnings = this.deploymentData.log?.warnings || [];
    const events = this.deploymentData.log?.events || [];
    
    const totalOperations = errors.length + warnings.length + events.length;
    const successRate = totalOperations > 0 ? 
      ((totalOperations - errors.length) / totalOperations) * 100 : 100;
    
    let reliabilityScore = 'excellent';
    if (successRate < 90) reliabilityScore = 'poor';
    else if (successRate < 95) reliabilityScore = 'fair';
    else if (successRate < 99) reliabilityScore = 'good';
    
    return {
      successRate: Math.round(successRate * 100) / 100,
      reliabilityScore,
      criticalErrors: errors.filter(e => e.message.includes('CRITICAL')).length,
      recoverableErrors: errors.filter(e => !e.message.includes('CRITICAL')).length
    };
  }

  analyzeQuality() {
    const warnings = this.deploymentData.log?.warnings || [];
    const components = this.deploymentData.components || {};
    
    // Calculate quality score based on warnings and component health
    let qualityScore = 100;
    qualityScore -= warnings.length * 2; // Deduct 2 points per warning
    qualityScore = Math.max(0, Math.min(100, qualityScore));
    
    let qualityRating = 'excellent';
    if (qualityScore < 70) qualityRating = 'poor';
    else if (qualityScore < 80) qualityRating = 'fair';
    else if (qualityScore < 90) qualityRating = 'good';
    
    return {
      qualityScore,
      qualityRating,
      warningCount: warnings.length,
      componentHealth: this.assessComponentHealth(components)
    };
  }

  analyzeTrends() {
    // Simplified trend analysis - would be enhanced with historical data
    return {
      deploymentFrequency: 'stable',
      errorTrend: 'stable',
      performanceTrend: 'stable',
      lastAnalysis: new Date().toISOString()
    };
  }

  identifyBottlenecks() {
    const events = this.deploymentData.log?.events || [];
    const bottlenecks = [];
    
    // Look for operations that might be slow
    const slowOperations = events.filter(event => 
      event.message.includes('timeout') || 
      event.message.includes('slow') ||
      event.message.includes('retrying')
    );
    
    if (slowOperations.length > 0) {
      bottlenecks.push({
        type: 'slow_operations',
        count: slowOperations.length,
        description: 'Multiple slow operations detected'
      });
    }
    
    return bottlenecks;
  }

  assessComponentHealth(components) {
    const health = {};
    
    for (const [name, component] of Object.entries(components)) {
      if (component.error) {
        health[name] = 'unhealthy';
      } else if (component.files > 0) {
        health[name] = 'healthy';
      } else {
        health[name] = 'unknown';
      }
    }
    
    return health;
  }
}

module.exports = MetricsAnalyzer;