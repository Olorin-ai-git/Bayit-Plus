/**
 * WorkspaceHealth Data Model
 * Core entity for tracking overall workspace health and recovery metrics
 */

import { ModuleState, ModuleStatus } from './ModuleState';

export interface WorkspaceHealth {
  // Workspace identification
  workspaceId: string;
  workspacePath: string;
  workspaceName: string;

  // Overall health metrics
  overallHealthScore: number; // 0-100 weighted average of all modules
  healthStatus: WorkspaceHealthStatus;
  lastHealthCheck: string; // ISO 8601 timestamp

  // Module summary
  moduleSummary: ModuleSummary;
  moduleStates: Record<string, ModuleState>; // moduleId -> ModuleState

  // Layer health breakdown
  layerHealth: LayerHealth;

  // Dependency analysis
  dependencyGraph: DependencyGraph;
  dependencyIssues: DependencyIssue[];

  // Build system health
  buildSystemHealth: BuildSystemHealth;

  // Test system health
  testSystemHealth: TestSystemHealth;

  // Configuration health
  configurationHealth: ConfigurationHealth;

  // Performance metrics
  performanceMetrics: WorkspacePerformanceMetrics;

  // Risk assessment
  riskAssessment: RiskAssessment;

  // Recovery readiness
  recoveryReadiness: RecoveryReadiness;

  // Historical trends
  healthTrend: HealthTrend;
  historicalData: HealthSnapshot[];

  // Metadata
  lastUpdated: string; // ISO 8601 timestamp
  updatedBy: string;
  assessmentVersion: string;
}

export type WorkspaceHealthStatus =
  | 'excellent'     // 90-100: All systems optimal
  | 'good'          // 70-89: Minor issues, generally healthy
  | 'fair'          // 50-69: Moderate issues, requires attention
  | 'poor'          // 30-49: Significant issues, needs intervention
  | 'critical'      // 10-29: Major problems, urgent action required
  | 'failed';       // 0-9: System is non-functional

export interface ModuleSummary {
  totalModules: number;
  healthyModules: number;
  warningModules: number;
  criticalModules: number;
  failedModules: number;
  recoveringModules: number;
  unknownModules: number;

  // Health distribution
  healthDistribution: HealthDistribution;

  // Module priorities
  highPriorityModules: string[]; // Modules requiring immediate attention
  mediumPriorityModules: string[];
  lowPriorityModules: string[];

  // Recovery estimates
  estimatedRecoveryTime: number; // Total estimated time in seconds
  parallelRecoveryPossible: boolean;
  parallelRecoveryTime: number; // Time if recovered in parallel
}

export interface HealthDistribution {
  excellent: number; // 90-100
  good: number;      // 70-89
  fair: number;      // 50-69
  poor: number;      // 30-49
  critical: number;  // 10-29
  failed: number;    // 0-9
}

export interface LayerHealth {
  layer0: LayerHealthMetrics; // Core infrastructure
  layer1: LayerHealthMetrics; // Foundation services
  layer2: LayerHealthMetrics; // Business logic modules

  // Inter-layer dependencies
  layerDependencyIssues: LayerDependencyIssue[];
  layerIsolationValid: boolean;
}

export interface LayerHealthMetrics {
  layerName: string;
  modules: string[];
  averageHealthScore: number;
  healthStatus: WorkspaceHealthStatus;
  criticalIssues: number;
  blockedModules: string[];
  blockingModules: string[];
  layerStable: boolean;
}

export interface LayerDependencyIssue {
  fromLayer: 'layer0' | 'layer1' | 'layer2';
  toLayer: 'layer0' | 'layer1' | 'layer2';
  issueType: 'upward_dependency' | 'circular_dependency' | 'missing_dependency';
  affectedModules: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  circularDependencies: CircularDependency[];
  orphanedNodes: string[];
  dependencyDepth: Record<string, number>;
  criticalPath: string[];
}

export interface DependencyNode {
  nodeId: string;
  nodeType: 'module' | 'external' | 'workspace';
  layer: 'layer0' | 'layer1' | 'layer2' | 'external';
  status: 'healthy' | 'warning' | 'critical' | 'failed';
  dependencyCount: number;
  dependentCount: number;
}

export interface DependencyEdge {
  fromNode: string;
  toNode: string;
  dependencyType: 'build' | 'runtime' | 'development' | 'peer';
  strength: 'weak' | 'strong' | 'critical';
  satisfied: boolean;
  issues: string[];
}

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  impactedModules: string[];
  resolutionStrategy: string;
  autoResolvable: boolean;
}

export interface DependencyIssue {
  issueId: string;
  issueType: 'missing' | 'version_conflict' | 'circular' | 'security' | 'deprecated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedModules: string[];
  description: string;
  resolution: string;
  autoFixable: boolean;
  estimatedFixTime: number; // Time in seconds
}

export interface BuildSystemHealth {
  buildSystemStatus: 'healthy' | 'degraded' | 'critical' | 'failed';
  buildToolsValid: boolean;
  buildConfigurationValid: boolean;

  // Build performance
  averageBuildTime: number; // Average across all modules
  slowestBuild: { moduleId: string; duration: number };
  fastestBuild: { moduleId: string; duration: number };
  buildTimeVariance: number;

  // Build reliability
  buildSuccessRate: number; // 0-100 percentage
  recentBuildFailures: number;
  buildStability: 'stable' | 'unstable' | 'critical';

  // Build resource usage
  resourceUsage: ResourceUsageMetrics;
  resourceEfficiency: number; // 0-100 score

  // Common build issues
  commonBuildErrors: CommonIssue[];
  buildBottlenecks: string[];
}

export interface TestSystemHealth {
  testSystemStatus: 'healthy' | 'degraded' | 'critical' | 'failed';
  testFrameworksValid: boolean;
  testConfigurationValid: boolean;

  // Test coverage
  overallTestCoverage: number; // 0-100 percentage
  coverageByModule: Record<string, number>;
  coverageThreshold: number;
  modulesMeetingThreshold: number;

  // Test performance
  averageTestTime: number; // Average across all modules
  slowestTests: { moduleId: string; duration: number }[];
  testTimeVariance: number;
  parallelTestCapability: boolean;

  // Test reliability
  testSuccessRate: number; // 0-100 percentage
  flakyTests: FlakyTest[];
  testStability: 'stable' | 'unstable' | 'critical';

  // Test quality
  testQualityScore: number; // 0-100 score
  missingTestSuites: string[];
  outdatedTests: string[];
}

export interface ConfigurationHealth {
  configurationStatus: 'valid' | 'warnings' | 'errors' | 'critical';

  // Configuration files
  packageJsonValid: boolean;
  tsconfigValid: boolean;
  workspaceConfigValid: boolean;
  buildConfigsValid: boolean;

  // Configuration consistency
  configurationConsistent: boolean;
  configurationConflicts: ConfigurationConflict[];

  // Environment configuration
  environmentVariablesValid: boolean;
  secretsConfigured: boolean;
  pathsConfigured: boolean;

  // Tool configurations
  toolConfigurationsValid: Record<string, boolean>;
  outdatedConfigurations: string[];
}

export interface ConfigurationConflict {
  conflictType: 'version_mismatch' | 'path_conflict' | 'setting_override' | 'missing_config';
  affectedFiles: string[];
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution: string;
  autoResolvable: boolean;
}

export interface WorkspacePerformanceMetrics {
  // Overall performance
  overallPerformanceScore: number; // 0-100 composite score
  performanceStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

  // Build performance
  buildPerformance: PerformanceCategory;

  // Test performance
  testPerformance: PerformanceCategory;

  // Development experience
  developmentExperience: DeveloperExperienceMetrics;

  // Resource utilization
  resourceUtilization: ResourceUtilizationMetrics;
}

export interface PerformanceCategory {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  benchmarkComparison: number; // -100 to +100 vs baseline
  trend: 'improving' | 'stable' | 'degrading';
  bottlenecks: string[];
  optimizationOpportunities: string[];
}

export interface DeveloperExperienceMetrics {
  // Development workflow
  hotReloadTime: number; // Time for changes to reflect
  codeIntelligenceAccuracy: number; // 0-100 for IDE features
  debuggingEffectiveness: number; // 0-100 score

  // Error reporting
  errorClarityScore: number; // 0-100 for error message quality
  errorRecoveryTime: number; // Average time to fix errors

  // Documentation quality
  documentationScore: number; // 0-100 for docs quality
  onboardingExperience: number; // 0-100 for new developer experience
}

export interface ResourceUtilizationMetrics {
  cpuUtilization: ResourceMetric;
  memoryUtilization: ResourceMetric;
  diskUtilization: ResourceMetric;
  networkUtilization: ResourceMetric;
  efficiency: number; // 0-100 overall efficiency score
}

export interface ResourceMetric {
  average: number;
  peak: number;
  efficiency: number; // 0-100 score
  trend: 'improving' | 'stable' | 'degrading';
}

export interface ResourceUsageMetrics {
  cpuUsage: number; // 0-100 percentage
  memoryUsage: number; // MB
  diskSpace: number; // MB
  networkIO: number; // MB/s
  peakResourceUsage: number; // 0-100 percentage
}

export interface RiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100 composite risk score

  // Risk categories
  technicalRisks: Risk[];
  operationalRisks: Risk[];
  securityRisks: Risk[];
  performanceRisks: Risk[];

  // Risk mitigation
  mitigationStrategies: MitigationStrategy[];
  immediateActions: string[];
  preventiveMeasures: string[];
}

export interface Risk {
  riskId: string;
  riskType: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedModules: string[];
  mitigationRequired: boolean;
  timeToMitigate: number; // Estimated time in seconds
}

export interface MitigationStrategy {
  strategyId: string;
  riskIds: string[];
  strategy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  effectiveness: number; // 0-100 expected effectiveness
  implementationTime: number; // Estimated time in seconds
}

export interface RecoveryReadiness {
  recoveryReadinessScore: number; // 0-100 readiness score
  readinessStatus: 'ready' | 'partial' | 'not_ready';

  // Prerequisites
  backupsAvailable: boolean;
  dependenciesMaped: boolean;
  recoveryPlansExist: boolean;
  toolsAvailable: boolean;

  // Estimated recovery
  estimatedRecoveryTime: number; // Total time in seconds
  recoveryComplexity: 'simple' | 'moderate' | 'complex' | 'critical';
  parallelRecoveryPossible: boolean;

  // Recovery blockers
  recoveryBlockers: RecoveryBlocker[];
  prerequisiteActions: string[];
}

export interface RecoveryBlocker {
  blockerId: string;
  blockerType: 'dependency' | 'resource' | 'configuration' | 'external';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedModules: string[];
  resolutionRequired: boolean;
  estimatedResolutionTime: number; // Time in seconds
}

export interface HealthTrend {
  trendPeriod: 'hour' | 'day' | 'week' | 'month';
  overallTrend: 'improving' | 'stable' | 'degrading';
  healthScoreChange: number; // Change over trend period

  // Trend details
  buildTrend: 'improving' | 'stable' | 'degrading';
  testTrend: 'improving' | 'stable' | 'degrading';
  dependencyTrend: 'improving' | 'stable' | 'degrading';
  performanceTrend: 'improving' | 'stable' | 'degrading';

  // Predictions
  predictedHealthScore: number; // Predicted score for next period
  riskTrajectory: 'decreasing' | 'stable' | 'increasing';
  interventionRecommended: boolean;
}

export interface HealthSnapshot {
  timestamp: string; // ISO 8601 timestamp
  overallHealthScore: number;
  healthStatus: WorkspaceHealthStatus;
  moduleCount: number;
  criticalIssues: number;
  buildSuccessRate: number;
  testSuccessRate: number;
  performanceScore: number;
  riskScore: number;
}

export interface CommonIssue {
  issueType: string;
  frequency: number;
  description: string;
  affectedModules: string[];
  solution: string;
  preventionStrategy: string;
}

export interface FlakyTest {
  testName: string;
  moduleId: string;
  flakinessScore: number; // 0-100, higher is more flaky
  failureRate: number; // 0-100 percentage
  lastFailure: string; // ISO 8601 timestamp
  typicalError: string;
}

// Factory function for creating workspace health
export const createWorkspaceHealth = (
  workspacePath: string,
  moduleStates: Record<string, ModuleState>
): WorkspaceHealth => {
  const now = new Date().toISOString();
  const workspaceId = `workspace-${Date.now()}`;
  const workspaceName = workspacePath.split('/').pop() || 'unknown';

  const overallHealthScore = calculateOverallHealthScore(moduleStates);
  const healthStatus = getWorkspaceHealthStatus(overallHealthScore);

  return {
    workspaceId,
    workspacePath,
    workspaceName,
    overallHealthScore,
    healthStatus,
    lastHealthCheck: now,
    moduleSummary: calculateModuleSummary(moduleStates),
    moduleStates,
    layerHealth: calculateLayerHealth(moduleStates),
    dependencyGraph: analyzeDependencyGraph(moduleStates),
    dependencyIssues: extractDependencyIssues(moduleStates),
    buildSystemHealth: assessBuildSystemHealth(moduleStates),
    testSystemHealth: assessTestSystemHealth(moduleStates),
    configurationHealth: assessConfigurationHealth(moduleStates),
    performanceMetrics: calculatePerformanceMetrics(moduleStates),
    riskAssessment: assessRisks(moduleStates),
    recoveryReadiness: assessRecoveryReadiness(moduleStates),
    healthTrend: {
      trendPeriod: 'day',
      overallTrend: 'stable',
      healthScoreChange: 0,
      buildTrend: 'stable',
      testTrend: 'stable',
      dependencyTrend: 'stable',
      performanceTrend: 'stable',
      predictedHealthScore: overallHealthScore,
      riskTrajectory: 'stable',
      interventionRecommended: overallHealthScore < 70
    },
    historicalData: [],
    lastUpdated: now,
    updatedBy: 'system',
    assessmentVersion: '1.0.0'
  };
};

export const calculateOverallHealthScore = (moduleStates: Record<string, ModuleState>): number => {
  const modules = Object.values(moduleStates);
  if (modules.length === 0) return 0;

  // Weighted average based on module importance
  const weights = {
    'layer0': 3, // Core modules are most important
    'layer1': 2, // Foundation modules are important
    'layer2': 1  // Business modules are standard importance
  };

  let totalScore = 0;
  let totalWeight = 0;

  modules.forEach(module => {
    const weight = weights[module.moduleType] || 1;
    totalScore += module.healthScore * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
};

export const getWorkspaceHealthStatus = (healthScore: number): WorkspaceHealthStatus => {
  if (healthScore >= 90) return 'excellent';
  if (healthScore >= 70) return 'good';
  if (healthScore >= 50) return 'fair';
  if (healthScore >= 30) return 'poor';
  if (healthScore >= 10) return 'critical';
  return 'failed';
};

// Additional helper functions would be implemented here
export const calculateModuleSummary = (moduleStates: Record<string, ModuleState>): ModuleSummary => {
  const modules = Object.values(moduleStates);
  const summary: ModuleSummary = {
    totalModules: modules.length,
    healthyModules: 0,
    warningModules: 0,
    criticalModules: 0,
    failedModules: 0,
    recoveringModules: 0,
    unknownModules: 0,
    healthDistribution: {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      critical: 0,
      failed: 0
    },
    highPriorityModules: [],
    mediumPriorityModules: [],
    lowPriorityModules: [],
    estimatedRecoveryTime: 0,
    parallelRecoveryPossible: true,
    parallelRecoveryTime: 0
  };

  modules.forEach(module => {
    // Count by status
    switch (module.status) {
      case 'healthy': summary.healthyModules++; break;
      case 'warning': summary.warningModules++; break;
      case 'critical': summary.criticalModules++; break;
      case 'failed': summary.failedModules++; break;
      case 'recovering': summary.recoveringModules++; break;
      default: summary.unknownModules++; break;
    }

    // Count by health distribution
    if (module.healthScore >= 90) summary.healthDistribution.excellent++;
    else if (module.healthScore >= 70) summary.healthDistribution.good++;
    else if (module.healthScore >= 50) summary.healthDistribution.fair++;
    else if (module.healthScore >= 30) summary.healthDistribution.poor++;
    else if (module.healthScore >= 10) summary.healthDistribution.critical++;
    else summary.healthDistribution.failed++;

    // Categorize by priority
    if (module.recoveryState.recoveryPriority === 'critical' || module.recoveryState.recoveryPriority === 'high') {
      summary.highPriorityModules.push(module.moduleId);
    } else if (module.recoveryState.recoveryPriority === 'medium') {
      summary.mediumPriorityModules.push(module.moduleId);
    } else {
      summary.lowPriorityModules.push(module.moduleId);
    }

    summary.estimatedRecoveryTime += module.recoveryState.estimatedRecoveryTime;
  });

  // Calculate parallel recovery time (longest single recovery)
  summary.parallelRecoveryTime = Math.max(...modules.map(m => m.recoveryState.estimatedRecoveryTime), 0);

  return summary;
};

// Placeholder implementations for other helper functions
export const calculateLayerHealth = (moduleStates: Record<string, ModuleState>): LayerHealth => {
  // Implementation would analyze modules by layer
  return {
    layer0: { layerName: 'Core', modules: [], averageHealthScore: 0, healthStatus: 'fair', criticalIssues: 0, blockedModules: [], blockingModules: [], layerStable: false },
    layer1: { layerName: 'Foundation', modules: [], averageHealthScore: 0, healthStatus: 'fair', criticalIssues: 0, blockedModules: [], blockingModules: [], layerStable: false },
    layer2: { layerName: 'Business', modules: [], averageHealthScore: 0, healthStatus: 'fair', criticalIssues: 0, blockedModules: [], blockingModules: [], layerStable: false },
    layerDependencyIssues: [],
    layerIsolationValid: true
  };
};

export const analyzeDependencyGraph = (moduleStates: Record<string, ModuleState>): DependencyGraph => {
  return {
    nodes: [],
    edges: [],
    circularDependencies: [],
    orphanedNodes: [],
    dependencyDepth: {},
    criticalPath: []
  };
};

export const extractDependencyIssues = (moduleStates: Record<string, ModuleState>): DependencyIssue[] => {
  return [];
};

export const assessBuildSystemHealth = (moduleStates: Record<string, ModuleState>): BuildSystemHealth => {
  return {
    buildSystemStatus: 'healthy',
    buildToolsValid: true,
    buildConfigurationValid: true,
    averageBuildTime: 0,
    slowestBuild: { moduleId: '', duration: 0 },
    fastestBuild: { moduleId: '', duration: 0 },
    buildTimeVariance: 0,
    buildSuccessRate: 0,
    recentBuildFailures: 0,
    buildStability: 'stable',
    resourceUsage: { cpuUsage: 0, memoryUsage: 0, diskSpace: 0, networkIO: 0, peakResourceUsage: 0 },
    resourceEfficiency: 0,
    commonBuildErrors: [],
    buildBottlenecks: []
  };
};

export const assessTestSystemHealth = (moduleStates: Record<string, ModuleState>): TestSystemHealth => {
  return {
    testSystemStatus: 'healthy',
    testFrameworksValid: true,
    testConfigurationValid: true,
    overallTestCoverage: 0,
    coverageByModule: {},
    coverageThreshold: 80,
    modulesMeetingThreshold: 0,
    averageTestTime: 0,
    slowestTests: [],
    testTimeVariance: 0,
    parallelTestCapability: true,
    testSuccessRate: 0,
    flakyTests: [],
    testStability: 'stable',
    testQualityScore: 0,
    missingTestSuites: [],
    outdatedTests: []
  };
};

export const assessConfigurationHealth = (moduleStates: Record<string, ModuleState>): ConfigurationHealth => {
  return {
    configurationStatus: 'valid',
    packageJsonValid: true,
    tsconfigValid: true,
    workspaceConfigValid: true,
    buildConfigsValid: true,
    configurationConsistent: true,
    configurationConflicts: [],
    environmentVariablesValid: true,
    secretsConfigured: true,
    pathsConfigured: true,
    toolConfigurationsValid: {},
    outdatedConfigurations: []
  };
};

export const calculatePerformanceMetrics = (moduleStates: Record<string, ModuleState>): WorkspacePerformanceMetrics => {
  return {
    overallPerformanceScore: 0,
    performanceStatus: 'fair',
    buildPerformance: { score: 0, status: 'fair', benchmarkComparison: 0, trend: 'stable', bottlenecks: [], optimizationOpportunities: [] },
    testPerformance: { score: 0, status: 'fair', benchmarkComparison: 0, trend: 'stable', bottlenecks: [], optimizationOpportunities: [] },
    developmentExperience: { hotReloadTime: 0, codeIntelligenceAccuracy: 0, debuggingEffectiveness: 0, errorClarityScore: 0, errorRecoveryTime: 0, documentationScore: 0, onboardingExperience: 0 },
    resourceUtilization: {
      cpuUtilization: { average: 0, peak: 0, efficiency: 0, trend: 'stable' },
      memoryUtilization: { average: 0, peak: 0, efficiency: 0, trend: 'stable' },
      diskUtilization: { average: 0, peak: 0, efficiency: 0, trend: 'stable' },
      networkUtilization: { average: 0, peak: 0, efficiency: 0, trend: 'stable' },
      efficiency: 0
    }
  };
};

export const assessRisks = (moduleStates: Record<string, ModuleState>): RiskAssessment => {
  return {
    overallRiskLevel: 'medium',
    riskScore: 0,
    technicalRisks: [],
    operationalRisks: [],
    securityRisks: [],
    performanceRisks: [],
    mitigationStrategies: [],
    immediateActions: [],
    preventiveMeasures: []
  };
};

export const assessRecoveryReadiness = (moduleStates: Record<string, ModuleState>): RecoveryReadiness => {
  return {
    recoveryReadinessScore: 0,
    readinessStatus: 'partial',
    backupsAvailable: false,
    dependenciesMaped: false,
    recoveryPlansExist: false,
    toolsAvailable: false,
    estimatedRecoveryTime: 0,
    recoveryComplexity: 'moderate',
    parallelRecoveryPossible: true,
    recoveryBlockers: [],
    prerequisiteActions: []
  };
};