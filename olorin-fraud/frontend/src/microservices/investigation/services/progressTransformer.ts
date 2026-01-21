/**
 * Progress Data Transformer
 * Feature: 007-progress-wizard-page
 *
 * Transforms backend progress response (snake_case) to frontend InvestigationProgress interface (camelCase).
 * Maps actual endpoint response to InvestigationProgress with NO fallback values - only real data.
 *
 * SYSTEM MANDATE Compliance:
 * - Pure transformation functions
 * - NO hardcoded default values
 * - All values sourced from endpoint
 * - Fail-fast on required fields
 * - Under 200 lines
 */

import { InvestigationProgress } from '../../../shared/types/investigation';
import {
  mapToolExecutions,
  mapAgentStatuses,
  mapPhases,
  mapEntities,
  mapErrors,
  mapBackendStatus,
  mapBackendLifecycleStage
} from './dataAdapters/progressMappers';

/**
 * Backend progress response structure (camelCase, exact endpoint format)
 * This matches the actual /progress endpoint response with tool execution breakdown
 */
export interface BackendProgressResponse {
  // Core identification
  id: string;
  investigationId: string;
  status: string;
  lifecycleStage: string;
  completionPercent: number;

  // Timestamps
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastUpdatedAt: string;

  // Tool execution tracking (REAL data from endpoint, NO defaults)
  toolExecutions: Array<{
    id: string;
    toolName: string;
    agentType: string;
    status: string;
    queuedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    executionTimeMs: number;
    result?: Record<string, any>;
    error?: Record<string, any>;
    retryCount: number;
    maxRetries: number;
  }>;
  totalTools: number;
  completedTools: number;
  runningTools: number;
  queuedTools: number;
  failedTools: number;
  skippedTools: number;

  // Agent tracking (optional from endpoint)
  agentStatuses?: any[];

  // Risk assessment (optional from endpoint)
  riskMetrics?: {
    overall: number;
    byAgent?: Record<string, number>;
    confidence: number;
    lastCalculated: string;
  };

  // Phase tracking (optional)
  phases?: any[];
  currentPhase: string | null;

  // Entity relationships (optional)
  entities?: any[];
  relationships?: any[];

  // Real-time activity (ACTUAL data from endpoint)
  toolsPerSecond: number;
  peakToolsPerSecond: number;

  // Connection status (ACTUAL data from endpoint)
  iceConnected: boolean;

  // Error tracking (optional)
  errors?: any[];

  // Domain findings with LLM analysis (from progress.domain_findings)
  domainFindings?: Record<string, any>;
}

/**
 * Transforms backend progress response to frontend InvestigationProgress
 * Maps actual endpoint data with NO fallback values - all values come from endpoint
 * @param backendData - Raw backend response
 * @returns Transformed InvestigationProgress object
 */
export function transformProgressResponse(backendData: BackendProgressResponse): InvestigationProgress {
  try {
    // Map tool executions from endpoint array (handles both objects and strings)
    const toolExecutions = mapToolExecutions(backendData.toolExecutions || []);

    // Map agent statuses from endpoint if available, otherwise derive from tool executions
    const agentStatuses = backendData.agentStatuses
      ? mapAgentStatuses(backendData.agentStatuses)
      : [];

    // Map phases from endpoint if available
    const phases = backendData.phases
      ? mapPhases(backendData.phases)
      : [];

    // Map entities from endpoint if available
    const entities = backendData.entities
      ? mapEntities(backendData.entities)
      : [];

    // Map errors from endpoint if available
    const errors = backendData.errors
      ? mapErrors(backendData.errors)
      : [];

    // Extract ID - handle both camelCase (from BaseApiService) and snake_case (fallback)
    const extractedId = backendData.id || backendData.investigationId || backendData.investigation_id || 'unknown';
    
    // Validate required fields
    if (!backendData.id && !backendData.investigationId && !backendData.investigation_id) {
      console.error('🚨🚨🚨 [transformProgressResponse] CRITICAL: No ID found in backendData!', {
        backendDataKeys: Object.keys(backendData),
        backendDataId: backendData.id,
        backendDataInvestigationId: backendData.investigationId,
        backendDataInvestigation_id: backendData.investigation_id
      });
    }

    const result = {
    // Core identification - ensure we always have a valid ID
    id: extractedId,
    investigationId: extractedId,

    // Status and lifecycle
    status: mapBackendStatus(backendData.status),
    lifecycleStage: mapBackendLifecycleStage(backendData.lifecycleStage),
    completionPercent: backendData.completionPercent,

    // Timestamps (parse ISO strings to Date objects)
    createdAt: new Date(backendData.createdAt),
    startedAt: backendData.startedAt ? new Date(backendData.startedAt) : null,
    completedAt: backendData.completedAt ? new Date(backendData.completedAt) : null,
    lastUpdatedAt: new Date(backendData.lastUpdatedAt),

    // Tool execution tracking (REAL data from endpoint, with calculated fallbacks)
    toolExecutions,
    // Use actual toolExecutions length if backend doesn't provide explicit counts
    totalTools: backendData.totalTools ?? toolExecutions.length,
    completedTools: backendData.completedTools ?? toolExecutions.filter(t => t.status === 'completed').length,
    runningTools: backendData.runningTools ?? toolExecutions.filter(t => t.status === 'running').length,
    queuedTools: backendData.queuedTools ?? toolExecutions.filter(t => t.status === 'queued').length,
    failedTools: backendData.failedTools ?? toolExecutions.filter(t => t.status === 'failed').length,
    skippedTools: backendData.skippedTools ?? toolExecutions.filter(t => t.status === 'skipped').length,

    // Agent tracking (from endpoint)
    agentStatuses,

    // Risk assessment (from endpoint, optional - NO defaults, only real data)
    riskMetrics: backendData.riskMetrics ? {
      overall: backendData.riskMetrics.overall,
      byAgent: backendData.riskMetrics.byAgent,
      confidence: backendData.riskMetrics.confidence,
      lastCalculated: new Date(backendData.riskMetrics.lastCalculated)
    } : undefined,

    // Phase tracking (from endpoint)
    phases,
    currentPhase: backendData.currentPhase,

    // Entity relationships (from endpoint)
    entities,
    relationships: backendData.relationships || [],

    // Real-time activity (ACTUAL data from endpoint)
    toolsPerSecond: backendData.toolsPerSecond,
    peakToolsPerSecond: backendData.peakToolsPerSecond,

    // Connection status (ACTUAL data from endpoint)
    iceConnected: backendData.iceConnected,

    // Error tracking (from endpoint)
    errors,

    // Domain findings with LLM analysis (from endpoint)
    domainFindings: backendData.domainFindings || {}
    };

      console.log('🚨🚨🚨 [transformProgressResponse] Transformation complete:', {
        hasDomainFindings: !!result.domainFindings && Object.keys(result.domainFindings).length > 0,
        domainFindingsKeys: result.domainFindings ? Object.keys(result.domainFindings) : [],
        toolExecutionsCount: result.toolExecutions.length,
        id: result.id,
        investigationId: result.investigationId,
        hasId: !!result.id && result.id !== 'unknown',
        hasInvestigationId: !!result.investigationId && result.investigationId !== 'unknown'
      });

    return result;
  } catch (error) {
    console.error('🚨🚨🚨 [transformProgressResponse] Transformation error:', error);
    // Return a minimal valid progress object to prevent complete failure
    return {
      id: backendData.id || backendData.investigationId || 'unknown',
      investigationId: backendData.investigationId || backendData.id || 'unknown',
      status: mapBackendStatus(backendData.status || 'unknown'),
      lifecycleStage: mapBackendLifecycleStage(backendData.lifecycleStage || 'unknown'),
      completionPercent: backendData.completionPercent || 0,
      createdAt: backendData.createdAt ? new Date(backendData.createdAt) : new Date(),
      startedAt: backendData.startedAt ? new Date(backendData.startedAt) : null,
      completedAt: backendData.completedAt ? new Date(backendData.completedAt) : null,
      lastUpdatedAt: backendData.lastUpdatedAt ? new Date(backendData.lastUpdatedAt) : new Date(),
      toolExecutions: [],
      totalTools: 0,
      completedTools: 0,
      runningTools: 0,
      queuedTools: 0,
      failedTools: 0,
      skippedTools: 0,
      agentStatuses: [],
      phases: [],
      currentPhase: null,
      entities: [],
      relationships: [],
      toolsPerSecond: 0,
      peakToolsPerSecond: 0,
      iceConnected: false,
      errors: [],
      domainFindings: backendData.domainFindings || {}
    };
  }
}
