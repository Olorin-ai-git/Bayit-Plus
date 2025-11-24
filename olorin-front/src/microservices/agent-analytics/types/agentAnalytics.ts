export interface AgentMetrics {
  id: string;
  agentName: string;
<<<<<<< HEAD
  agentType: 'autonomous' | 'manual' | 'hybrid';
=======
  agentType: 'structured' | 'manual' | 'hybrid';
>>>>>>> 001-modify-analyzer-method
  status: 'active' | 'inactive' | 'error' | 'maintenance';

  // Performance metrics
  performance: {
    totalInvestigations: number;
    completedInvestigations: number;
    successRate: number;
    averageCompletionTime: number; // minutes
    averageAccuracy: number; // percentage
    errorRate: number; // percentage
    lastActivity: string;
  };

  // Usage metrics
  usage: {
    totalCalls: number;
    callsToday: number;
    callsThisWeek: number;
    callsThisMonth: number;
    averageCallsPerDay: number;
    peakUsageHour: number;
    peakUsageDay: string;
  };

  // Cost metrics
  cost: {
    totalCost: number;
    costToday: number;
    costThisWeek: number;
    costThisMonth: number;
    averageCostPerCall: number;
    costPerInvestigation: number;
    modelCosts: Record<string, number>;
  };

  // Quality metrics
  quality: {
    userSatisfactionScore: number; // 1-5 scale
    falsePositiveRate: number;
    falseNegativeRate: number;
    precision: number;
    recall: number;
    f1Score: number;
    confidenceScore: number;
  };

  // Model usage
  models: {
    modelName: string;
    provider: 'openai' | 'anthropic' | 'google' | 'local';
    version: string;
    usageCount: number;
    averageResponseTime: number;
    cost: number;
    errorRate: number;
  }[];

  // Trends
  trends: {
    period: 'hour' | 'day' | 'week' | 'month';
    performanceTrend: number; // percentage change
    usageTrend: number;
    costTrend: number;
    qualityTrend: number;
  };
}

export interface AgentAlert {
  id: string;
  agentId: string;
  agentName: string;
  type: 'performance' | 'cost' | 'error' | 'quality' | 'usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface AgentPerformanceData {
  timestamp: string;
  successRate: number;
  completionTime: number;
  accuracy: number;
  errorRate: number;
  callCount: number;
  cost: number;
  userSatisfaction: number;
}

export interface ModelUsageData {
  modelName: string;
  provider: string;
  totalCalls: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  usage: {
    timestamp: string;
    calls: number;
    cost: number;
    responseTime: number;
    errors: number;
  }[];
}

export interface CostBreakdown {
  category: 'model_usage' | 'api_calls' | 'compute' | 'storage' | 'bandwidth';
  subcategory: string;
  cost: number;
  percentage: number;
  trend: number; // percentage change
}

export interface UsagePattern {
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  callCount: number;
  averageResponseTime: number;
  successRate: number;
}

export interface AgentComparison {
  agentId: string;
  agentName: string;
  metric: string;
  value: number;
  rank: number;
  change: number; // percentage change
}

export interface AnalyticsFilter {
  agentIds?: string[];
  agentTypes?: string[];
  dateRange: {
    start: string;
    end: string;
  };
  metrics?: string[];
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface AnalyticsSummary {
  totalAgents: number;
  activeAgents: number;
  totalInvestigations: number;
  totalCost: number;
  averageSuccessRate: number;
  totalErrors: number;
  costTrend: number;
  performanceTrend: number;
  usageTrend: number;
  topPerformingAgent: {
    id: string;
    name: string;
    successRate: number;
  };
  costliestAgent: {
    id: string;
    name: string;
    cost: number;
  };
  mostUsedModel: {
    name: string;
    provider: string;
    usage: number;
  };
}

export interface AgentConfiguration {
  id: string;
  name: string;
<<<<<<< HEAD
  type: 'autonomous' | 'manual' | 'hybrid';
=======
  type: 'structured' | 'manual' | 'hybrid';
>>>>>>> 001-modify-analyzer-method
  enabled: boolean;
  maxConcurrentInvestigations: number;
  timeoutMinutes: number;
  retryAttempts: number;

  // Thresholds for alerts
  thresholds: {
    successRate: number;
    responseTime: number;
    errorRate: number;
    dailyCost: number;
    userSatisfaction: number;
  };

  // Model preferences
  models: {
    primary: string;
    fallback?: string;
    temperature: number;
    maxTokens: number;
    topP: number;
  };

  // Integration settings
  integrations: {
    splunk: boolean;
    datadog: boolean;
    grafana: boolean;
    slack: boolean;
    email: boolean;
  };
}

export interface AnalyticsExport {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  data: AgentMetrics[] | AgentPerformanceData[] | ModelUsageData[];
  filters: AnalyticsFilter;
  generatedAt: string;
  generatedBy: string;
}

export interface RealtimeMetrics {
  timestamp: string;
  activeAgents: number;
  currentInvestigations: number;
  queuedInvestigations: number;
  systemLoad: number;
  responseTime: number;
  errorRate: number;
  throughput: number; // investigations per hour
}