/**
 * Analytics System
 * Central export point for all analytics and reporting functionality
 */

export * from './RecoveryAnalytics';
export * from './ReportGenerator';

// Re-export key types for convenience
export type {
  RecoveryAnalyticsData,
  RecoveryMetrics,
  RecoveryInsight,
  RecoveryTrend,
  ModuleRecoveryProfile,
  SystemRecoveryReport,
  RecoveryPrediction
} from './RecoveryAnalytics';

export type {
  ReportTemplate,
  ReportSection,
  ReportStyling,
  ComprehensiveReport,
  ReportSummary,
  GeneratedReportSection,
  ChartData,
  TableData,
  ReportMetadata
} from './ReportGenerator';

// Analytics constants
export const ANALYTICS_CATEGORIES = {
  SUCCESS_FACTOR: 'success_factor',
  FAILURE_CAUSE: 'failure_cause',
  OPTIMIZATION: 'optimization',
  RISK: 'risk',
  TREND: 'trend'
} as const;

export const INSIGHT_SEVERITIES = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
} as const;

export const RECOVERY_STRATEGIES = {
  REPAIR: 'repair',
  REBUILD: 'rebuild',
  RESET: 'reset'
} as const;

export const REPORT_FORMATS = {
  HTML: 'html',
  PDF: 'pdf',
  JSON: 'json',
  CSV: 'csv',
  MARKDOWN: 'markdown'
} as const;

export const CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  PIE: 'pie',
  AREA: 'area',
  SCATTER: 'scatter',
  HEATMAP: 'heatmap'
} as const;

// Utility functions for analytics
export const calculateSuccessRate = (successful: number, total: number): number => {
  return total > 0 ? (successful / total) * 100 : 0;
};

export const calculateAverageMetric = (values: number[]): number => {
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
};

export const getPercentileValue = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
};

export const categorizeHealthScore = (score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' => {
  if (score >= 95) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)}${units[unitIndex]}`;
};

// Analytics aggregation functions
export const aggregateRecoveryMetrics = (
  operations: Array<{
    success: boolean;
    duration: number;
    healthImprovement: number;
    strategy: string;
  }>
): {
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  averageHealthImprovement: number;
  strategyBreakdown: Record<string, { count: number; successRate: number }>;
  performanceTrend: 'improving' | 'declining' | 'stable';
} => {
  const total = operations.length;
  const successful = operations.filter(op => op.success).length;
  const successRate = calculateSuccessRate(successful, total);

  const durations = operations.map(op => op.duration);
  const improvements = operations.filter(op => op.success).map(op => op.healthImprovement);

  const averageDuration = calculateAverageMetric(durations);
  const averageHealthImprovement = calculateAverageMetric(improvements);

  // Strategy breakdown
  const strategyBreakdown: Record<string, { count: number; successRate: number }> = {};
  const strategies = [...new Set(operations.map(op => op.strategy))];

  strategies.forEach(strategy => {
    const strategyOps = operations.filter(op => op.strategy === strategy);
    const strategySuccessful = strategyOps.filter(op => op.success).length;

    strategyBreakdown[strategy] = {
      count: strategyOps.length,
      successRate: calculateSuccessRate(strategySuccessful, strategyOps.length)
    };
  });

  // Performance trend analysis (simplified)
  const recentOps = operations.slice(-Math.min(10, total));
  const earlierOps = operations.slice(0, Math.min(10, total));

  const recentSuccessRate = calculateSuccessRate(
    recentOps.filter(op => op.success).length,
    recentOps.length
  );
  const earlierSuccessRate = calculateSuccessRate(
    earlierOps.filter(op => op.success).length,
    earlierOps.length
  );

  let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable';
  const trendThreshold = 5; // 5% threshold for trend detection

  if (recentSuccessRate - earlierSuccessRate > trendThreshold) {
    performanceTrend = 'improving';
  } else if (earlierSuccessRate - recentSuccessRate > trendThreshold) {
    performanceTrend = 'declining';
  }

  return {
    totalOperations: total,
    successRate,
    averageDuration,
    averageHealthImprovement,
    strategyBreakdown,
    performanceTrend
  };
};

export const generateInsightSummary = (
  insights: Array<{
    type: string;
    severity: string;
    title: string;
    confidence: number;
  }>
): {
  totalInsights: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  highConfidenceInsights: number;
  actionableInsights: number;
} => {
  const totalInsights = insights.length;

  const bySeverity = insights.reduce((acc, insight) => {
    acc[insight.severity] = (acc[insight.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byType = insights.reduce((acc, insight) => {
    acc[insight.type] = (acc[insight.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const highConfidenceInsights = insights.filter(i => i.confidence > 0.8).length;
  const actionableInsights = insights.filter(i =>
    i.type === 'optimization' || i.type === 'failure_cause'
  ).length;

  return {
    totalInsights,
    bySeverity,
    byType,
    highConfidenceInsights,
    actionableInsights
  };
};

// Level 2 modules for CVPlus architecture
export const LEVEL_2_MODULES = [
  'auth',
  'i18n',
  'cv-processing',
  'multimedia',
  'analytics',
  'premium',
  'public-profiles',
  'recommendations',
  'admin',
  'workflow',
  'payments'
] as const;

export type Level2Module = typeof LEVEL_2_MODULES[number];

// Module priority mapping for analytics (higher number = higher priority)
export const MODULE_ANALYTICS_PRIORITIES = {
  'auth': 100,           // Authentication is most critical
  'payments': 95,        // Payment processing is high priority
  'cv-processing': 90,   // Core business functionality
  'admin': 85,          // Administrative functions
  'analytics': 80,      // Data and insights (self-referential)
  'multimedia': 75,     // Media processing
  'recommendations': 70, // AI recommendations
  'public-profiles': 65, // Public features
  'workflow': 60,       // Job management
  'premium': 55,        // Premium features
  'i18n': 50           // Internationalization
} as const;

export const getModuleAnalyticsPriority = (moduleId: string): number => {
  return MODULE_ANALYTICS_PRIORITIES[moduleId as keyof typeof MODULE_ANALYTICS_PRIORITIES] || 50;
};

// Analytics factory functions
export const createRecoveryAnalytics = (workspacePath: string) => {
  const { RecoveryAnalytics } = require('./RecoveryAnalytics');
  return new RecoveryAnalytics(workspacePath);
};

export const createReportGenerator = (workspacePath: string) => {
  const { ReportGenerator } = require('./ReportGenerator');
  return new ReportGenerator(workspacePath);
};

// Configuration templates
export const DEFAULT_ANALYTICS_CONFIG = {
  enableRealTimeTracking: true,
  retentionPeriodDays: 90,
  aggregationInterval: 3600000, // 1 hour in milliseconds
  insightGenerationThreshold: 5, // minimum operations for insight generation
  confidenceThreshold: 0.7, // minimum confidence for actionable insights
  trendAnalysisWindow: 30, // days for trend analysis
  predictionAccuracyThreshold: 0.8
};

export const DEFAULT_REPORT_CONFIG = {
  defaultFormat: 'html' as const,
  includeCharts: true,
  includeTables: true,
  includeTimeline: true,
  includeHeatmaps: true,
  maxDataPoints: 10000,
  chartColorScheme: 'professional',
  exportFormats: ['html', 'json', 'markdown'] as const
};

// Analytics event types
export const ANALYTICS_EVENTS = {
  OPERATION_RECORDED: 'operation-recorded',
  INSIGHT_GENERATED: 'insight-generated',
  PROFILE_UPDATED: 'profile-updated',
  REPORT_GENERATED: 'report-generated',
  PREDICTION_MADE: 'prediction-made',
  TREND_DETECTED: 'trend-detected',
  ANOMALY_DETECTED: 'anomaly-detected'
} as const;

// Validation helpers
export const validateAnalyticsData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.operationId || typeof data.operationId !== 'string') {
    errors.push('operationId is required and must be a string');
  }

  if (!data.moduleId || typeof data.moduleId !== 'string') {
    errors.push('moduleId is required and must be a string');
  }

  if (!data.strategy || !['repair', 'rebuild', 'reset'].includes(data.strategy)) {
    errors.push('strategy must be one of: repair, rebuild, reset');
  }

  if (typeof data.success !== 'boolean') {
    errors.push('success must be a boolean');
  }

  if (typeof data.duration !== 'number' || data.duration < 0) {
    errors.push('duration must be a non-negative number');
  }

  if (typeof data.healthImprovement !== 'number') {
    errors.push('healthImprovement must be a number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateReportTemplate = (template: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!template.id || typeof template.id !== 'string') {
    errors.push('template.id is required and must be a string');
  }

  if (!template.name || typeof template.name !== 'string') {
    errors.push('template.name is required and must be a string');
  }

  if (!template.format || !['html', 'pdf', 'json', 'csv', 'markdown'].includes(template.format)) {
    errors.push('template.format must be one of: html, pdf, json, csv, markdown');
  }

  if (!Array.isArray(template.sections)) {
    errors.push('template.sections must be an array');
  } else {
    template.sections.forEach((section: any, index: number) => {
      if (!section.id) {
        errors.push(`template.sections[${index}].id is required`);
      }
      if (!section.title) {
        errors.push(`template.sections[${index}].title is required`);
      }
      if (!section.type) {
        errors.push(`template.sections[${index}].type is required`);
      }
      if (typeof section.order !== 'number') {
        errors.push(`template.sections[${index}].order must be a number`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Performance tracking
export const trackPerformance = <T>(
  operation: string,
  fn: () => T | Promise<T>
): T | Promise<T> => {
  const startTime = Date.now();

  const finish = (result: T) => {
    const endTime = Date.now();
    console.log(`📊 Analytics operation '${operation}' completed in ${endTime - startTime}ms`);
    return result;
  };

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result.then(finish).catch(error => {
        const endTime = Date.now();
        console.error(`❌ Analytics operation '${operation}' failed after ${endTime - startTime}ms:`, error);
        throw error;
      });
    }

    return finish(result);
  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ Analytics operation '${operation}' failed after ${endTime - startTime}ms:`, error);
    throw error;
  }
};