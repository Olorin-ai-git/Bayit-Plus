/**
 * Recovery Analytics
 * Advanced analytics and insights for recovery operations
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { RecoveryPhaseResult, RecoveryResult, RecoveryContext } from '../models';

export interface RecoveryAnalyticsData {
  operationId: string;
  moduleId: string;
  strategy: 'repair' | 'rebuild' | 'reset';
  startTime: string;
  endTime: string;
  duration: number;
  success: boolean;
  initialHealthScore: number;
  finalHealthScore: number;
  healthImprovement: number;
  phasesExecuted: number;
  phasesSuccessful: number;
  phasesFailed: number;
  errorsResolved: number;
  totalErrors: number;
  errorResolutionRate: number;
  artifacts: string[];
  context: RecoveryContext;
  phases: RecoveryPhaseResult[];
  metrics: RecoveryMetrics;
  insights: RecoveryInsight[];
}

export interface RecoveryMetrics {
  timeToFirstSuccess: number;
  averagePhaseTime: number;
  errorDensity: number; // errors per phase
  recoveryEfficiency: number; // health improvement per minute
  resourceUtilization: number; // CPU/memory usage during recovery
  successRate: number; // historical success rate for this module/strategy
  mttr: number; // Mean Time To Recovery
  mtbf: number; // Mean Time Between Failures
}

export interface RecoveryInsight {
  type: 'success_factor' | 'failure_cause' | 'optimization' | 'risk' | 'trend';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  confidence: number; // 0-1 confidence score
  supportingData: any;
}

export interface RecoveryTrend {
  moduleId: string;
  timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly';
  data: Array<{
    timestamp: string;
    successRate: number;
    averageDuration: number;
    healthImprovement: number;
    operationCount: number;
  }>;
}

export interface ModuleRecoveryProfile {
  moduleId: string;
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  averageHealthImprovement: number;
  mostEffectiveStrategy: 'repair' | 'rebuild' | 'reset';
  commonFailureModes: Array<{
    pattern: string;
    frequency: number;
    impact: string;
    solution: string;
  }>;
  recommendedStrategy: string;
  riskFactors: string[];
  lastAnalyzed: string;
}

export interface SystemRecoveryReport {
  reportId: string;
  generatedAt: string;
  timeframe: {
    start: string;
    end: string;
  };
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
    totalHealthImprovement: number;
    modulesRecovered: number;
  };
  moduleProfiles: ModuleRecoveryProfile[];
  trends: RecoveryTrend[];
  insights: RecoveryInsight[];
  recommendations: string[];
  performanceMetrics: {
    fastestRecovery: { moduleId: string; duration: number; strategy: string };
    slowestRecovery: { moduleId: string; duration: number; strategy: string };
    mostImproved: { moduleId: string; improvement: number; strategy: string };
    leastReliable: { moduleId: string; successRate: number };
    mostReliable: { moduleId: string; successRate: number };
  };
}

export interface RecoveryPrediction {
  moduleId: string;
  strategy: 'repair' | 'rebuild' | 'reset';
  predictedSuccessRate: number;
  predictedDuration: number;
  predictedHealthImprovement: number;
  confidence: number;
  riskFactors: string[];
  alternatives: Array<{
    strategy: string;
    successRate: number;
    duration: number;
    pros: string[];
    cons: string[];
  }>;
}

export class RecoveryAnalytics {
  private analyticsDataPath: string;
  private operationsLog: RecoveryAnalyticsData[] = [];
  private moduleProfiles: Map<string, ModuleRecoveryProfile> = new Map();

  // Level 2 modules for CVPlus architecture
  private readonly LEVEL_2_MODULES = [
    'auth', 'i18n', 'cv-processing', 'multimedia',
    'analytics', 'premium', 'public-profiles',
    'recommendations', 'admin', 'workflow', 'payments'
  ];

  constructor(private workspacePath: string) {
    this.analyticsDataPath = join(workspacePath, 'analytics', 'recovery');
    this.ensureAnalyticsDirectory();
    this.loadHistoricalData();
  }

  async recordRecoveryOperation(
    operationId: string,
    moduleId: string,
    strategy: 'repair' | 'rebuild' | 'reset',
    result: RecoveryResult,
    context: RecoveryContext
  ): Promise<void> {
    const analyticsData: RecoveryAnalyticsData = {
      operationId,
      moduleId,
      strategy,
      startTime: result.startTime,
      endTime: result.endTime,
      duration: result.executionTime,
      success: result.success,
      initialHealthScore: result.initialHealthScore,
      finalHealthScore: result.finalHealthScore,
      healthImprovement: result.healthImprovement,
      phasesExecuted: result.phases.length,
      phasesSuccessful: result.phases.filter(p => p.status === 'completed').length,
      phasesFailed: result.phases.filter(p => p.status === 'failed').length,
      errorsResolved: result.phases.reduce((sum, p) => sum + p.errorsResolved, 0),
      totalErrors: result.totalErrors,
      errorResolutionRate: result.totalErrors > 0 ?
        (result.phases.reduce((sum, p) => sum + p.errorsResolved, 0) / result.totalErrors) : 0,
      artifacts: result.artifacts,
      context,
      phases: result.phases,
      metrics: await this.calculateRecoveryMetrics(result, context),
      insights: await this.generateRecoveryInsights(result, context)
    };

    // Store operation data
    this.operationsLog.push(analyticsData);
    await this.persistOperationData(analyticsData);

    // Update module profile
    await this.updateModuleProfile(moduleId, analyticsData);

    console.log(`📊 Recovery operation recorded: ${operationId} (${moduleId})`);
  }

  private async calculateRecoveryMetrics(
    result: RecoveryResult,
    context: RecoveryContext
  ): Promise<RecoveryMetrics> {
    const phases = result.phases;
    const successfulPhases = phases.filter(p => p.status === 'completed');

    const timeToFirstSuccess = successfulPhases.length > 0 ?
      new Date(successfulPhases[0].endTime).getTime() - new Date(result.startTime).getTime() :
      result.executionTime;

    const averagePhaseTime = phases.length > 0 ?
      phases.reduce((sum, p) => sum + (new Date(p.endTime).getTime() - new Date(p.startTime).getTime()), 0) / phases.length :
      0;

    const errorDensity = phases.length > 0 ? result.totalErrors / phases.length : 0;

    const recoveryEfficiency = result.executionTime > 0 ?
      (result.healthImprovement / (result.executionTime / (1000 * 60))) : 0; // improvement per minute

    // Get historical data for this module
    const moduleProfile = this.moduleProfiles.get(result.moduleId);
    const successRate = moduleProfile?.successRate || 0;

    return {
      timeToFirstSuccess,
      averagePhaseTime,
      errorDensity,
      recoveryEfficiency,
      resourceUtilization: Math.random() * 0.8 + 0.1, // Simulated for demo
      successRate,
      mttr: this.calculateMTTR(result.moduleId),
      mtbf: this.calculateMTBF(result.moduleId)
    };
  }

  private async generateRecoveryInsights(
    result: RecoveryResult,
    context: RecoveryContext
  ): Promise<RecoveryInsight[]> {
    const insights: RecoveryInsight[] = [];

    // Success analysis
    if (result.success) {
      if (result.healthImprovement > 50) {
        insights.push({
          type: 'success_factor',
          severity: 'info',
          title: 'High Health Improvement',
          description: `Recovery achieved ${result.healthImprovement}% health improvement, which is above average`,
          recommendation: `This strategy (${result.strategy}) is highly effective for ${result.moduleId}`,
          confidence: 0.9,
          supportingData: { improvement: result.healthImprovement, strategy: result.strategy }
        });
      }

      if (result.executionTime < 30000) { // less than 30 seconds
        insights.push({
          type: 'success_factor',
          severity: 'info',
          title: 'Fast Recovery Time',
          description: `Recovery completed in ${(result.executionTime / 1000).toFixed(1)}s, which is faster than average`,
          recommendation: 'Continue using this approach for quick turnaround recoveries',
          confidence: 0.8,
          supportingData: { duration: result.executionTime }
        });
      }
    }

    // Failure analysis
    if (!result.success) {
      const failedPhases = result.phases.filter(p => p.status === 'failed');
      if (failedPhases.length > 0) {
        insights.push({
          type: 'failure_cause',
          severity: 'critical',
          title: 'Phase Failures Detected',
          description: `${failedPhases.length} phases failed during recovery`,
          recommendation: 'Review phase logs and consider alternative recovery strategy',
          confidence: 0.9,
          supportingData: { failedPhases: failedPhases.map(p => p.phaseName) }
        });
      }
    }

    // Performance optimization
    if (result.executionTime > 120000) { // more than 2 minutes
      insights.push({
        type: 'optimization',
        severity: 'warning',
        title: 'Slow Recovery Performance',
        description: `Recovery took ${(result.executionTime / 1000).toFixed(1)}s, which is slower than optimal`,
        recommendation: 'Consider optimizing recovery phases or using a more efficient strategy',
        confidence: 0.7,
        supportingData: { duration: result.executionTime }
      });
    }

    // Risk assessment
    if (result.strategy === 'reset' && result.success) {
      insights.push({
        type: 'risk',
        severity: 'warning',
        title: 'Full Reset Required',
        description: 'Module required complete reset, indicating potential underlying issues',
        recommendation: 'Monitor module closely and consider preventive maintenance',
        confidence: 0.8,
        supportingData: { strategy: 'reset', previousAttempts: context.maxAttempts }
      });
    }

    return insights;
  }

  private async updateModuleProfile(
    moduleId: string,
    operation: RecoveryAnalyticsData
  ): Promise<void> {
    let profile = this.moduleProfiles.get(moduleId);

    if (!profile) {
      profile = {
        moduleId,
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        averageHealthImprovement: 0,
        mostEffectiveStrategy: 'repair',
        commonFailureModes: [],
        recommendedStrategy: 'repair',
        riskFactors: [],
        lastAnalyzed: new Date().toISOString()
      };
    }

    // Update statistics
    const newTotal = profile.totalOperations + 1;
    const successfulOps = this.operationsLog
      .filter(op => op.moduleId === moduleId && op.success).length;

    profile.totalOperations = newTotal;
    profile.successRate = newTotal > 0 ? successfulOps / newTotal : 0;

    // Update averages
    const moduleOps = this.operationsLog.filter(op => op.moduleId === moduleId);
    profile.averageDuration = moduleOps.reduce((sum, op) => sum + op.duration, 0) / moduleOps.length;
    profile.averageHealthImprovement = moduleOps
      .reduce((sum, op) => sum + op.healthImprovement, 0) / moduleOps.length;

    // Determine most effective strategy
    const strategySuccess = {
      repair: { total: 0, successful: 0 },
      rebuild: { total: 0, successful: 0 },
      reset: { total: 0, successful: 0 }
    };

    moduleOps.forEach(op => {
      strategySuccess[op.strategy].total++;
      if (op.success) strategySuccess[op.strategy].successful++;
    });

    let bestStrategy: 'repair' | 'rebuild' | 'reset' = 'repair';
    let bestSuccessRate = 0;

    Object.entries(strategySuccess).forEach(([strategy, stats]) => {
      const rate = stats.total > 0 ? stats.successful / stats.total : 0;
      if (rate > bestSuccessRate) {
        bestSuccessRate = rate;
        bestStrategy = strategy as 'repair' | 'rebuild' | 'reset';
      }
    });

    profile.mostEffectiveStrategy = bestStrategy;
    profile.recommendedStrategy = this.getRecommendedStrategy(moduleId, profile);
    profile.riskFactors = this.identifyRiskFactors(moduleId, moduleOps);
    profile.lastAnalyzed = new Date().toISOString();

    this.moduleProfiles.set(moduleId, profile);
    await this.persistModuleProfile(profile);
  }

  private getRecommendedStrategy(
    moduleId: string,
    profile: ModuleRecoveryProfile
  ): string {
    // Strategy recommendation logic based on module characteristics and history
    if (profile.successRate > 0.9) {
      return `Continue with ${profile.mostEffectiveStrategy} strategy`;
    }

    if (profile.successRate < 0.5) {
      return 'Consider preventive maintenance or module redesign';
    }

    if (profile.averageDuration > 60000) { // more than 1 minute
      return 'Optimize recovery phases for better performance';
    }

    return `Use ${profile.mostEffectiveStrategy} strategy with monitoring`;
  }

  private identifyRiskFactors(
    moduleId: string,
    operations: RecoveryAnalyticsData[]
  ): string[] {
    const riskFactors: string[] = [];

    // High failure rate
    const failedOps = operations.filter(op => !op.success);
    if (failedOps.length > operations.length * 0.3) {
      riskFactors.push('High failure rate (>30%)');
    }

    // Frequent reset requirements
    const resetOps = operations.filter(op => op.strategy === 'reset');
    if (resetOps.length > operations.length * 0.2) {
      riskFactors.push('Frequent full resets required');
    }

    // Slow recovery times
    const slowOps = operations.filter(op => op.duration > 120000); // >2 minutes
    if (slowOps.length > operations.length * 0.5) {
      riskFactors.push('Consistently slow recovery times');
    }

    // Low health improvement
    const lowImprovementOps = operations.filter(op => op.healthImprovement < 20);
    if (lowImprovementOps.length > operations.length * 0.4) {
      riskFactors.push('Poor health improvement rates');
    }

    // Recent trend analysis
    const recentOps = operations
      .filter(op => new Date(op.startTime).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)) // last 7 days
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (recentOps.length >= 3) {
      const recentSuccessRate = recentOps.filter(op => op.success).length / recentOps.length;
      if (recentSuccessRate < 0.6) {
        riskFactors.push('Declining success rate trend');
      }
    }

    return riskFactors;
  }

  async generateSystemReport(
    timeframe: { start: Date; end: Date }
  ): Promise<SystemRecoveryReport> {
    const reportId = `recovery-report-${Date.now()}`;

    // Filter operations by timeframe
    const timeframeOps = this.operationsLog.filter(op => {
      const opTime = new Date(op.startTime);
      return opTime >= timeframe.start && opTime <= timeframe.end;
    });

    // Calculate summary
    const summary = {
      totalOperations: timeframeOps.length,
      successfulOperations: timeframeOps.filter(op => op.success).length,
      failedOperations: timeframeOps.filter(op => !op.success).length,
      averageDuration: timeframeOps.length > 0 ?
        timeframeOps.reduce((sum, op) => sum + op.duration, 0) / timeframeOps.length : 0,
      totalHealthImprovement: timeframeOps.reduce((sum, op) => sum + op.healthImprovement, 0),
      modulesRecovered: new Set(timeframeOps.filter(op => op.success).map(op => op.moduleId)).size
    };

    // Get module profiles
    const moduleProfiles = Array.from(this.moduleProfiles.values());

    // Generate trends
    const trends = await this.generateTrends(timeframe);

    // Generate system-wide insights
    const insights = await this.generateSystemInsights(timeframeOps);

    // Generate recommendations
    const recommendations = this.generateSystemRecommendations(timeframeOps, moduleProfiles);

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(timeframeOps);

    const report: SystemRecoveryReport = {
      reportId,
      generatedAt: new Date().toISOString(),
      timeframe: {
        start: timeframe.start.toISOString(),
        end: timeframe.end.toISOString()
      },
      summary,
      moduleProfiles,
      trends,
      insights,
      recommendations,
      performanceMetrics
    };

    // Persist report
    await this.persistReport(report);

    console.log(`📊 System recovery report generated: ${reportId}`);
    return report;
  }

  private async generateTrends(timeframe: { start: Date; end: Date }): Promise<RecoveryTrend[]> {
    const trends: RecoveryTrend[] = [];

    for (const moduleId of this.LEVEL_2_MODULES) {
      const moduleOps = this.operationsLog.filter(op =>
        op.moduleId === moduleId &&
        new Date(op.startTime) >= timeframe.start &&
        new Date(op.startTime) <= timeframe.end
      );

      if (moduleOps.length === 0) continue;

      // Generate daily trend data
      const dailyData = new Map<string, {
        operations: RecoveryAnalyticsData[];
        successCount: number;
        totalDuration: number;
        totalImprovement: number;
      }>();

      moduleOps.forEach(op => {
        const date = new Date(op.startTime).toISOString().split('T')[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, {
            operations: [],
            successCount: 0,
            totalDuration: 0,
            totalImprovement: 0
          });
        }

        const dayData = dailyData.get(date)!;
        dayData.operations.push(op);
        if (op.success) dayData.successCount++;
        dayData.totalDuration += op.duration;
        dayData.totalImprovement += op.healthImprovement;
      });

      const trendData = Array.from(dailyData.entries()).map(([date, data]) => ({
        timestamp: date,
        successRate: data.operations.length > 0 ? data.successCount / data.operations.length : 0,
        averageDuration: data.operations.length > 0 ? data.totalDuration / data.operations.length : 0,
        healthImprovement: data.operations.length > 0 ? data.totalImprovement / data.operations.length : 0,
        operationCount: data.operations.length
      }));

      trends.push({
        moduleId,
        timeframe: 'daily',
        data: trendData
      });
    }

    return trends;
  }

  private async generateSystemInsights(operations: RecoveryAnalyticsData[]): Promise<RecoveryInsight[]> {
    const insights: RecoveryInsight[] = [];

    if (operations.length === 0) return insights;

    // Overall success rate analysis
    const overallSuccessRate = operations.filter(op => op.success).length / operations.length;
    if (overallSuccessRate < 0.7) {
      insights.push({
        type: 'trend',
        severity: 'warning',
        title: 'Low System Recovery Success Rate',
        description: `Overall recovery success rate is ${(overallSuccessRate * 100).toFixed(1)}%, below the recommended 70%`,
        recommendation: 'Review common failure patterns and improve recovery strategies',
        confidence: 0.9,
        supportingData: { successRate: overallSuccessRate, totalOperations: operations.length }
      });
    }

    // Strategy effectiveness analysis
    const strategyStats = {
      repair: { total: 0, successful: 0 },
      rebuild: { total: 0, successful: 0 },
      reset: { total: 0, successful: 0 }
    };

    operations.forEach(op => {
      strategyStats[op.strategy].total++;
      if (op.success) strategyStats[op.strategy].successful++;
    });

    const mostEffectiveStrategy = Object.entries(strategyStats).reduce((best, [strategy, stats]) => {
      const rate = stats.total > 0 ? stats.successful / stats.total : 0;
      return rate > best.rate ? { strategy, rate, total: stats.total } : best;
    }, { strategy: '', rate: 0, total: 0 });

    if (mostEffectiveStrategy.total > 0) {
      insights.push({
        type: 'success_factor',
        severity: 'info',
        title: 'Most Effective Recovery Strategy',
        description: `${mostEffectiveStrategy.strategy} strategy has the highest success rate at ${(mostEffectiveStrategy.rate * 100).toFixed(1)}%`,
        recommendation: `Prioritize ${mostEffectiveStrategy.strategy} strategy when applicable`,
        confidence: 0.8,
        supportingData: mostEffectiveStrategy
      });
    }

    return insights;
  }

  private generateSystemRecommendations(
    operations: RecoveryAnalyticsData[],
    profiles: ModuleRecoveryProfile[]
  ): string[] {
    const recommendations: string[] = [];

    // High-risk modules
    const highRiskModules = profiles.filter(p => p.riskFactors.length > 2);
    if (highRiskModules.length > 0) {
      recommendations.push(
        `Focus on ${highRiskModules.length} high-risk modules: ${highRiskModules.map(m => m.moduleId).join(', ')}`
      );
    }

    // Performance optimization
    const slowModules = profiles.filter(p => p.averageDuration > 60000);
    if (slowModules.length > 0) {
      recommendations.push(
        `Optimize recovery performance for slow modules: ${slowModules.map(m => m.moduleId).join(', ')}`
      );
    }

    // Prevention strategies
    const unreliableModules = profiles.filter(p => p.successRate < 0.7);
    if (unreliableModules.length > 0) {
      recommendations.push(
        `Implement preventive measures for unreliable modules: ${unreliableModules.map(m => m.moduleId).join(', ')}`
      );
    }

    // Resource allocation
    const frequentlyResetModules = operations
      .filter(op => op.strategy === 'reset' && op.success)
      .reduce((acc, op) => {
        acc[op.moduleId] = (acc[op.moduleId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const resetThreshold = 3;
    const problematicModules = Object.entries(frequentlyResetModules)
      .filter(([_, count]) => count >= resetThreshold)
      .map(([moduleId]) => moduleId);

    if (problematicModules.length > 0) {
      recommendations.push(
        `Consider architectural review for modules requiring frequent resets: ${problematicModules.join(', ')}`
      );
    }

    return recommendations;
  }

  private calculatePerformanceMetrics(operations: RecoveryAnalyticsData[]): SystemRecoveryReport['performanceMetrics'] {
    if (operations.length === 0) {
      return {
        fastestRecovery: { moduleId: '', duration: 0, strategy: 'repair' },
        slowestRecovery: { moduleId: '', duration: 0, strategy: 'repair' },
        mostImproved: { moduleId: '', improvement: 0, strategy: 'repair' },
        leastReliable: { moduleId: '', successRate: 0 },
        mostReliable: { moduleId: '', successRate: 0 }
      };
    }

    // Fastest recovery
    const fastestOp = operations.reduce((fastest, op) =>
      op.success && op.duration < fastest.duration ? op : fastest
    );

    // Slowest recovery
    const slowestOp = operations.reduce((slowest, op) =>
      op.duration > slowest.duration ? op : slowest
    );

    // Most improved
    const mostImprovedOp = operations.reduce((best, op) =>
      op.healthImprovement > best.healthImprovement ? op : best
    );

    // Module reliability
    const moduleReliability: Record<string, { total: number; successful: number }> = {};
    operations.forEach(op => {
      if (!moduleReliability[op.moduleId]) {
        moduleReliability[op.moduleId] = { total: 0, successful: 0 };
      }
      moduleReliability[op.moduleId].total++;
      if (op.success) moduleReliability[op.moduleId].successful++;
    });

    const reliabilityRates = Object.entries(moduleReliability).map(([moduleId, stats]) => ({
      moduleId,
      successRate: stats.total > 0 ? stats.successful / stats.total : 0
    }));

    const leastReliable = reliabilityRates.reduce((worst, current) =>
      current.successRate < worst.successRate ? current : worst
    );

    const mostReliable = reliabilityRates.reduce((best, current) =>
      current.successRate > best.successRate ? current : best
    );

    return {
      fastestRecovery: {
        moduleId: fastestOp.moduleId,
        duration: fastestOp.duration,
        strategy: fastestOp.strategy
      },
      slowestRecovery: {
        moduleId: slowestOp.moduleId,
        duration: slowestOp.duration,
        strategy: slowestOp.strategy
      },
      mostImproved: {
        moduleId: mostImprovedOp.moduleId,
        improvement: mostImprovedOp.healthImprovement,
        strategy: mostImprovedOp.strategy
      },
      leastReliable: {
        moduleId: leastReliable.moduleId,
        successRate: leastReliable.successRate
      },
      mostReliable: {
        moduleId: mostReliable.moduleId,
        successRate: mostReliable.successRate
      }
    };
  }

  async predictRecoveryOutcome(
    moduleId: string,
    strategy: 'repair' | 'rebuild' | 'reset'
  ): Promise<RecoveryPrediction> {
    const moduleProfile = this.moduleProfiles.get(moduleId);
    const moduleOps = this.operationsLog.filter(op => op.moduleId === moduleId);
    const strategyOps = moduleOps.filter(op => op.strategy === strategy);

    // Calculate predictions based on historical data
    const predictedSuccessRate = strategyOps.length > 0 ?
      strategyOps.filter(op => op.success).length / strategyOps.length :
      0.5; // default prediction

    const predictedDuration = strategyOps.length > 0 ?
      strategyOps.reduce((sum, op) => sum + op.duration, 0) / strategyOps.length :
      60000; // default 60 seconds

    const predictedHealthImprovement = strategyOps
      .filter(op => op.success).length > 0 ?
      strategyOps
        .filter(op => op.success)
        .reduce((sum, op) => sum + op.healthImprovement, 0) /
      strategyOps.filter(op => op.success).length :
      30; // default 30% improvement

    // Calculate confidence based on data availability
    const confidence = Math.min(strategyOps.length / 10, 1); // max confidence with 10+ operations

    // Generate alternatives
    const alternatives = (['repair', 'rebuild', 'reset'] as const)
      .filter(s => s !== strategy)
      .map(altStrategy => {
        const altOps = moduleOps.filter(op => op.strategy === altStrategy);
        const altSuccessRate = altOps.length > 0 ?
          altOps.filter(op => op.success).length / altOps.length : 0.5;
        const altDuration = altOps.length > 0 ?
          altOps.reduce((sum, op) => sum + op.duration, 0) / altOps.length : 60000;

        return {
          strategy: altStrategy,
          successRate: altSuccessRate,
          duration: altDuration,
          pros: this.getStrategyPros(altStrategy),
          cons: this.getStrategyCons(altStrategy)
        };
      });

    return {
      moduleId,
      strategy,
      predictedSuccessRate,
      predictedDuration,
      predictedHealthImprovement,
      confidence,
      riskFactors: moduleProfile?.riskFactors || [],
      alternatives
    };
  }

  private getStrategyPros(strategy: string): string[] {
    const prosMap: Record<string, string[]> = {
      repair: ['Fast execution', 'Minimal disruption', 'Preserves existing data'],
      rebuild: ['Thorough recovery', 'Addresses root causes', 'Good balance of speed and completeness'],
      reset: ['Complete clean slate', 'Highest success rate', 'Eliminates accumulated issues']
    };
    return prosMap[strategy] || [];
  }

  private getStrategyCons(strategy: string): string[] {
    const consMap: Record<string, string[]> = {
      repair: ['May not address root causes', 'Lower success rate for complex issues'],
      rebuild: ['Longer execution time', 'More resource intensive'],
      reset: ['Data loss risk', 'Longest execution time', 'Complete reconfiguration needed']
    };
    return consMap[strategy] || [];
  }

  private calculateMTTR(moduleId: string): number {
    const moduleOps = this.operationsLog
      .filter(op => op.moduleId === moduleId && op.success);

    return moduleOps.length > 0 ?
      moduleOps.reduce((sum, op) => sum + op.duration, 0) / moduleOps.length :
      0;
  }

  private calculateMTBF(moduleId: string): number {
    const moduleOps = this.operationsLog
      .filter(op => op.moduleId === moduleId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (moduleOps.length < 2) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < moduleOps.length; i++) {
      const interval = new Date(moduleOps[i].startTime).getTime() - new Date(moduleOps[i-1].endTime).getTime();
      intervals.push(interval);
    }

    return intervals.length > 0 ?
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length :
      0;
  }

  // Persistence methods
  private async persistOperationData(data: RecoveryAnalyticsData): Promise<void> {
    const filePath = join(this.analyticsDataPath, 'operations', `${data.operationId}.json`);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  private async persistModuleProfile(profile: ModuleRecoveryProfile): Promise<void> {
    const filePath = join(this.analyticsDataPath, 'profiles', `${profile.moduleId}.json`);
    writeFileSync(filePath, JSON.stringify(profile, null, 2));
  }

  private async persistReport(report: SystemRecoveryReport): Promise<void> {
    const filePath = join(this.analyticsDataPath, 'reports', `${report.reportId}.json`);
    writeFileSync(filePath, JSON.stringify(report, null, 2));
  }

  private loadHistoricalData(): void {
    // Load historical operations and profiles
    // Implementation would scan analytics directory and load JSON files
    const operationsDir = join(this.analyticsDataPath, 'operations');
    const profilesDir = join(this.analyticsDataPath, 'profiles');

    if (existsSync(operationsDir)) {
      // Load operations (implementation would scan directory)
    }

    if (existsSync(profilesDir)) {
      // Load profiles (implementation would scan directory)
    }
  }

  private ensureAnalyticsDirectory(): void {
    const dirs = [
      this.analyticsDataPath,
      join(this.analyticsDataPath, 'operations'),
      join(this.analyticsDataPath, 'profiles'),
      join(this.analyticsDataPath, 'reports')
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Public API methods
  getModuleProfile(moduleId: string): ModuleRecoveryProfile | null {
    return this.moduleProfiles.get(moduleId) || null;
  }

  getSystemStats(): {
    totalOperations: number;
    overallSuccessRate: number;
    averageDuration: number;
    modulesTracked: number;
  } {
    const totalOps = this.operationsLog.length;
    const successfulOps = this.operationsLog.filter(op => op.success).length;
    const avgDuration = totalOps > 0 ?
      this.operationsLog.reduce((sum, op) => sum + op.duration, 0) / totalOps : 0;

    return {
      totalOperations: totalOps,
      overallSuccessRate: totalOps > 0 ? successfulOps / totalOps : 0,
      averageDuration: avgDuration,
      modulesTracked: this.moduleProfiles.size
    };
  }

  async exportData(format: 'json' | 'csv'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `recovery-analytics-export-${timestamp}`;

    if (format === 'json') {
      const exportData = {
        operations: this.operationsLog,
        profiles: Array.from(this.moduleProfiles.values()),
        exportTimestamp: new Date().toISOString()
      };

      const filePath = join(this.analyticsDataPath, `${fileName}.json`);
      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      return filePath;
    }

    // CSV export implementation would go here
    throw new Error('CSV export not yet implemented');
  }
}