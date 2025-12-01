/**
 * Investigation Progress Page
 * Features: 004-new-olorin-frontend, 006-hybrid-graph-integration, 007-progress-wizard-page
 * Enhancement: Phase 3 User Story 1 (T019) - Event-driven rehydration with cursor persistence
 */

import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useWizardStore } from '@shared/store/wizardStore';
import { useWizardNavigation } from '@shared/hooks/useWizardNavigation';
import { WizardStep } from '@shared/types/wizardState';
import { WizardProgressIndicator } from '@shared/components';
import { OlorinErrorBoundary } from '../components/progress/OlorinErrorBoundary';
import ProgressSkeleton from '@shared/components/ProgressSkeleton';
import SectionSkeleton from '@shared/components/SectionSkeleton';
import { useElapsedTime } from '../hooks/useElapsedTime';
import { useInvestigationMetrics } from '../hooks/useInvestigationMetrics';
import { useEffectiveData } from '../hooks/useEffectiveData';
import { useProgressDataSelection } from '../hooks/useProgressDataSelection';
import { useProgressLifecycle } from '../hooks/useProgressLifecycle';
import { useProgressAdapters } from '../hooks/useProgressAdapters';
import { useInvestigationLogs } from '../hooks/useInvestigationLogs';
import { useInvestigationPhases } from '../hooks/useInvestigationPhases';
import { useToolExecutions } from '../hooks/useToolExecutions';
import { useRelationshipTracking } from '../hooks/useRelationshipTracking';
import { useRadarVisualization } from '../hooks/useRadarVisualization';
import { useAgentRiskGauges } from '../hooks/useAgentRiskGauges';
import { useProgressSimulation } from '../hooks/useProgressSimulation';
import { useHybridGraphPolling } from '../hooks/useHybridGraphPolling';
import { useHybridGraphAdapter } from '../hooks/useHybridGraphAdapter';
import { useRadarStateAdapter } from '../hooks/useRadarStateAdapter';
import { useProgressData } from '../hooks/useProgressData';
import { useProgressRehydration } from '../hooks/useProgressRehydration';
import { useEventApplication } from '../hooks/useEventApplication';
import { NoInvestigationMessage } from '../components/NoInvestigationMessage';
import { ConnectionStatusHeader } from '../components/ConnectionStatusHeader';
import { investigationService } from '../services/investigationService';
import { useInvestigationReports } from '@microservices/reporting/hooks/useInvestigationReports';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  ConnectionStatusAlert, ActivityMonitorSection, RadarSection, EntityGraphSection,
  DetectionAndToolsSection, AgentRiskSection, ProgressDetailsSection, DomainFindingsSection,
  LiveLogSidebar
} from '../components/progress';
import { EventsList } from '../components/events/EventsList';

export const ProgressPage: React.FC = () => {
  const { investigationId } = useParams<{ investigationId?: string }>();
  const [searchParams] = useSearchParams();
  const urlInvestigationId = searchParams.get('id');
  const settings = useWizardStore((state) => state.settings);
  // Investigation data removed from store - fetched from API based on URL ?id=xxx
  // completedSteps removed - derived from investigation status if needed
  const { canGoPrevious, goPrevious, goToStep } = useWizardNavigation();

  // State to hold domain findings from events (real-time updates)
  const [eventDomainFindings, setEventDomainFindings] = React.useState<Record<string, any>>({});

  // State for live log sidebar expansion
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(false);

  // Report generation hook
  const { generateReport, isGenerating, error: reportError } = useInvestigationReports();
  const [reportSuccess, setReportSuccess] = React.useState<string | null>(null);

  // CRITICAL: URL parameter is the source of truth - prioritize it over store
  // Check both route params and query string for investigation ID
  const urlInvestigationIdFromRoute = investigationId; // From useParams (route param like /investigation/:investigationId)
  const urlInvestigationIdFromQuery = urlInvestigationId; // From query string (?id=...)
  
  // Priority: Query string > Route param
  // URL is the single source of truth (investigation removed from store)
  const effectiveUrlInvestigationId = urlInvestigationIdFromQuery || urlInvestigationIdFromRoute;

  const isHybridGraph = effectiveUrlInvestigationId?.startsWith('hg-') || false;
  // URL is the single source of truth - no fallback needed
  const structuredInvestigationId = effectiveUrlInvestigationId;

  const rehydrationState = useProgressRehydration(structuredInvestigationId, isHybridGraph);
  const snapshot = rehydrationState.snapshot.data;
  const events = rehydrationState.events.data;
  const displayProgress = rehydrationState.displayProgress;

  // Investigation removed from store - create minimal object from URL ID if needed
  const { effectiveInvestigation, effectiveSettings } = useEffectiveData(
    null, // investigation removed from store - fetched from API
    settings, 
    structuredInvestigationId
  );

  const {
    status: hybridStatus, isPolling: isHybridPolling, error: hybridError,
    startPolling: startHybridPolling, stopPolling: stopHybridPolling
  } = useHybridGraphPolling(structuredInvestigationId || '', isHybridGraph);

  const { progress: structuredProgress, isPolling: isStructuredPolling, error: structuredError
  } = useProgressData(structuredInvestigationId, !isHybridGraph && !!structuredInvestigationId);

  const isConnected = isHybridGraph ? isHybridPolling : isStructuredPolling;
  const connectionError = isHybridGraph ? hybridError : (structuredError?.message ?? null);

  const hybridGraphData = useHybridGraphAdapter(hybridStatus);
  const { logs: structuredLogs, addLog } = useInvestigationLogs(effectiveSettings, structuredProgress);
  const { phases: structuredPhases, currentPhaseId: structuredPhaseId, updatePhaseProgress } = useInvestigationPhases(effectiveSettings, addLog);
  const { toolExecutions: structuredToolExecutions, updateToolStatus } = useToolExecutions(effectiveSettings, addLog);
  const { relationships: structuredRelationships, addRelationship } = useRelationshipTracking(addLog);
  const { radarState, addAnomaly, toggleScanning, toggleLabels, handleAnomalySelected } = useRadarVisualization(effectiveSettings, effectiveInvestigation, structuredPhases);
  const { agentGauges: structuredAgentGauges, updateAgentMetrics } = useAgentRiskGauges(effectiveSettings);

  // Callback to update domain findings from events
  const updateDomainFindings = React.useCallback((domain: string, findings: any) => {
    console.log('🎯 [ProgressPage] Updating domain findings from event:', { domain, findings });
    setEventDomainFindings(prev => ({
      ...prev,
      [domain]: findings
    }));
  }, []);

  useEventApplication(events, { updatePhaseProgress, updateToolStatus, addLog, updateDomainFindings });

  // Merge event-based domain findings with polled progress data
  const mergedProgress = React.useMemo(() => {
    console.log('🎯 [ProgressPage] Computing mergedProgress:', {
      hasStructuredProgress: !!structuredProgress,
      structuredProgressId: structuredProgress?.id,
      eventDomainFindingsCount: Object.keys(eventDomainFindings).length,
      eventDomainFindingsKeys: Object.keys(eventDomainFindings)
    });

    if (!structuredProgress) {
      console.log('🎯 [ProgressPage] No structured progress, returning null');
      return null;
    }

    // If we have event domain findings, merge them with the progress data
    if (Object.keys(eventDomainFindings).length > 0) {
      console.log('🎯 [ProgressPage] Merging event domain findings with progress:', {
        eventDomainFindingsKeys: Object.keys(eventDomainFindings),
        eventDomainFindingsSample: Object.entries(eventDomainFindings).slice(0, 2),
        progressDomainFindingsKeys: Object.keys((structuredProgress as any).domainFindings || {}),
        progressDomainFindingsSample: (structuredProgress as any).domainFindings
          ? Object.entries((structuredProgress as any).domainFindings).slice(0, 2)
          : []
      });

      const merged = {
        ...structuredProgress,
        domainFindings: {
          ...(structuredProgress as any).domainFindings,
          ...eventDomainFindings
        }
      };

      console.log('🎯 [ProgressPage] Merged result:', {
        mergedDomainFindingsKeys: Object.keys((merged as any).domainFindings),
        mergedDomainFindingsSample: Object.entries((merged as any).domainFindings).slice(0, 2)
      });

      return merged;
    }

    console.log('🎯 [ProgressPage] No event domain findings to merge, returning structuredProgress as-is');
    return structuredProgress;
  }, [structuredProgress, eventDomainFindings]);

  const selectedData = useProgressDataSelection(
    isHybridGraph, hybridGraphData, structuredLogs, structuredPhases, structuredPhaseId,
    structuredToolExecutions, structuredRelationships, structuredAgentGauges
  );

  useProgressLifecycle(isHybridGraph, structuredInvestigationId || null, hybridStatus, {
    startHybridPolling, stopHybridPolling, updatePhaseProgress, updateToolStatus, addAnomaly, addRelationship, updateAgentMetrics
  });

  // Update phases from backend progress data
  useEffect(() => {
    if (!structuredProgress) return;
    if (structuredProgress.phases) {
      structuredProgress.phases.forEach((p) => updatePhaseProgress(p.id, p.completionPercent));
    }
    if (structuredProgress.toolExecutions) {
      structuredProgress.toolExecutions.forEach((e) => updateToolStatus(e.id, e.status as any));
    }
  }, [structuredProgress, updatePhaseProgress, updateToolStatus]);

  // Sync tool executions with agent gauges
  useEffect(() => {
    // Get tool executions from either structuredProgress or mergedProgress
    const toolExecs = (mergedProgress as any)?.toolExecutions || structuredToolExecutions;

    console.log('🔧 [ProgressPage] Tool execution sync debug:', {
      hasMergedProgress: !!(mergedProgress as any)?.toolExecutions,
      hasStructuredToolExecutions: !!structuredToolExecutions,
      toolExecsLength: toolExecs?.length || 0,
      toolExecsSample: toolExecs?.slice(0, 3),
      allToolExecs: toolExecs
    });

    if (!toolExecs || toolExecs.length === 0) return;

    // Map tool names/IDs to agent types
    const toolToAgentMap: Record<string, 'Device' | 'Location' | 'Network' | 'Risk' | 'Logs'> = {
      // Device analysis tools
      'device': 'Device',
      'device_analysis': 'Device',
      'device_fingerprint': 'Device',
      'device_intelligence': 'Device',

      // Location analysis tools
      'location': 'Location',
      'location_analysis': 'Location',
      'geolocation': 'Location',
      'location_intelligence': 'Location',

      // Network analysis tools
      'network': 'Network',
      'network_analysis': 'Network',
      'ip_analysis': 'Network',
      'network_intelligence': 'Network',

      // Logs analysis tools (including log aggregation platforms)
      'logs': 'Logs',
      'logs_analysis': 'Logs',
      'log_analyzer': 'Logs',
      'logs_intelligence': 'Logs',
      'snowflake': 'Logs',        // Snowflake query tool
      'splunk': 'Logs',            // Splunk query tool
      'sumologic': 'Logs',         // SumoLogic query tool
      'datadog': 'Logs',           // Datadog logs
      'elasticsearch': 'Logs',     // Elasticsearch logs
      'cloudwatch': 'Logs',        // AWS CloudWatch logs

      // Risk/behavior analysis tools
      'risk': 'Risk',
      'behavior': 'Risk',
      'behavior_analysis': 'Risk',
      'risk_assessment': 'Risk',
      'risk_intelligence': 'Risk'
    };

    // Count tools per agent
    const agentToolCounts: Record<string, number> = {
      'Device': 0,
      'Location': 0,
      'Network': 0,
      'Risk': 0,
      'Logs': 0
    };

    const unmatchedTools: string[] = [];

    toolExecs.forEach((toolExec: any) => {
      // Get agent_type directly from the backend data
      const agentType = toolExec.agent_type || toolExec.agentType;
      const toolName = toolExec.toolName || toolExec.tool_name || toolExec.id || '';

      console.log('🔍 [ProgressPage] Processing tool:', {
        agentType,
        toolName,
        toolExecKeys: Object.keys(toolExec)
      });

      if (agentType) {
        // Map backend agent_type names to our AgentType names
        // Backend uses lowercase: 'device', 'location', 'network', 'logs', 'behavior'
        // Frontend uses PascalCase: 'Device', 'Location', 'Network', 'Logs', 'Risk'
        const agentTypeMap: Record<string, 'Device' | 'Location' | 'Network' | 'Risk' | 'Logs'> = {
          'device': 'Device',
          'location': 'Location',
          'network': 'Network',
          'logs': 'Logs',
          'behavior': 'Risk',
          'risk': 'Risk'
        };

        const normalizedAgentType = agentTypeMap[agentType.toLowerCase()];
        if (normalizedAgentType) {
          agentToolCounts[normalizedAgentType]++;
          console.log(`✅ [ProgressPage] Assigned tool "${toolName}" to ${normalizedAgentType} agent (from agent_type: "${agentType}")`);
        } else {
          console.warn(`⚠️ [ProgressPage] Unknown agent_type: "${agentType}" for tool "${toolName}"`);
          unmatchedTools.push(`${toolName} (agent_type: ${agentType})`);
        }
      } else {
        console.warn(`⚠️ [ProgressPage] No agent_type for tool: "${toolName}"`);
        unmatchedTools.push(toolName);
      }
    });

    // Update each agent's toolsUsed count
    Object.entries(agentToolCounts).forEach(([agentType, count]) => {
      if (count > 0) {
        updateAgentMetrics(agentType as any, { toolsUsed: count });
      }
    });

    console.log('🔧 [ProgressPage] Updated agent tool counts:', agentToolCounts);
    if (unmatchedTools.length > 0) {
      console.warn('🔧 [ProgressPage] Unmatched tools:', unmatchedTools);
    }
  }, [mergedProgress, structuredToolExecutions, updateAgentMetrics]);

  // Update phases based on backend lifecycle_stage
  useEffect(() => {
    // Try to get lifecycle info from either merged progress or hybrid graph data
    const progressData = mergedProgress || (hybridStatus?.data?.progress);
    if (!progressData) return;

    const lifecycleStage = (progressData as any).lifecycleStage || (progressData as any).lifecycle_stage;
    const completionPercent = (progressData as any).completionPercent || (progressData as any).completion_percent || 0;

    if (!lifecycleStage) return;

    console.log('🎯 [ProgressPage] Updating phases from backend:', { lifecycleStage, completionPercent });

    // Map lifecycle_stage to phase updates with completion logic
    switch (lifecycleStage) {
      case 'initializing':
        updatePhaseProgress('initialization', 50);
        break;

      case 'in_progress':
        // Mark initialization as complete
        updatePhaseProgress('initialization', 100);
        // Update data collection with current progress
        updatePhaseProgress('data_collection', completionPercent);
        break;

      case 'phase_1_data_collection':
        updatePhaseProgress('initialization', 100);
        updatePhaseProgress('data_collection', 100);
        break;

      case 'phase_2_tool_execution':
        updatePhaseProgress('initialization', 100);
        updatePhaseProgress('data_collection', 100);
        updatePhaseProgress('tool_execution', completionPercent);
        break;

      case 'phase_3_analysis':
        updatePhaseProgress('initialization', 100);
        updatePhaseProgress('data_collection', 100);
        updatePhaseProgress('tool_execution', 100);
        updatePhaseProgress('analysis', completionPercent);
        break;

      case 'phase_4_finalization':
        updatePhaseProgress('initialization', 100);
        updatePhaseProgress('data_collection', 100);
        updatePhaseProgress('tool_execution', 100);
        updatePhaseProgress('analysis', 100);
        updatePhaseProgress('finalization', completionPercent);
        break;

      case 'completed':
        updatePhaseProgress('initialization', 100);
        updatePhaseProgress('data_collection', 100);
        updatePhaseProgress('tool_execution', 100);
        updatePhaseProgress('analysis', 100);
        updatePhaseProgress('finalization', 100);
        break;
    }
  }, [mergedProgress, hybridStatus, updatePhaseProgress]);

  // Enable RESULTS page when investigation completes (for structured investigations)
  // Completed steps removed from store - can be derived from investigation status if needed
  useEffect(() => {
    // Check if investigation is completed
    const progressData = mergedProgress || (hybridStatus?.data?.progress);
    if (!progressData) return;

    const lifecycleStage = (progressData as any).lifecycleStage || (progressData as any).lifecycle_stage;
    const status = (progressData as any).status;

    // Log completion status - navigation handled via URL
    if (lifecycleStage === 'completed' || status === 'completed') {
      console.log('🎯 [ProgressPage] Investigation completed');
    }
  }, [mergedProgress, hybridStatus]);

  useProgressSimulation(effectiveInvestigation, effectiveSettings, {
    updatePhaseProgress, updateToolStatus, addAnomaly, addRelationship, updateAgentMetrics
  }, selectedData.relationships, !isHybridGraph);

  // Call all hooks unconditionally to follow React Hook rules
  const radarStateAdapterResult = useRadarStateAdapter(isHybridGraph, radarState, hybridGraphData.radarAnomalies, selectedData.agentGauges);
  const adapters = useProgressAdapters(isHybridGraph, mergedProgress, isStructuredPolling, hybridGraphData, effectiveInvestigation, radarState, selectedData.agentGauges);
  
  // Select the appropriate adapter based on condition
  const radarStateAdapted = isHybridGraph
    ? radarStateAdapterResult
    : adapters.radarViewStructured;

  const elapsedTime = useElapsedTime(mergedProgress, effectiveInvestigation);
  const { entitiesCount, toolsCount, progressPercent } = useInvestigationMetrics(effectiveSettings, mergedProgress);

  if (!effectiveInvestigation || !structuredInvestigationId) {
    return <NoInvestigationMessage canGoPrevious={canGoPrevious} onGoBack={goPrevious} />;
  }

  // NON-BLOCKING: Page renders immediately with progressive loading states
  // Individual sections will show skeletons while their data loads

  const finalProgressPercent = displayProgress || progressPercent;

  // Check if investigation is completed
  const progressData = mergedProgress || (hybridStatus?.data?.progress);
  const lifecycleStage = (progressData as any)?.lifecycleStage || (progressData as any)?.lifecycle_stage;
  const status = (progressData as any)?.status;
  const isCompleted = lifecycleStage === 'completed' || status === 'completed' || status === 'COMPLETED';

  // Extract entity information from settings
  const entities = effectiveSettings?.entities || [];
  const primaryEntity = entities[0];
  const entityValue = primaryEntity?.entity_value || primaryEntity?.value || '';
  const entityType = primaryEntity?.entity_type || primaryEntity?.type || '';

  // Handler for generating report
  const handleGenerateReport = async () => {
    setReportSuccess(null);

    if (!isCompleted) {
      setReportSuccess('Cannot generate report: Investigation must be completed first.');
      return;
    }

    const result = await generateReport({
      investigation_id: structuredInvestigationId || '',
      title: `Investigation Report - ${entityValue || structuredInvestigationId}`,
    });

    if (result) {
      setReportSuccess(`Report generated successfully! File size: ${(result.file_size_bytes / 1024 / 1024).toFixed(2)} MB`);
    }
  };

  // Handler for generating confusion matrix
  const [isGeneratingMatrix, setIsGeneratingMatrix] = React.useState(false);
  const [matrixError, setMatrixError] = React.useState<string | null>(null);

  const handleGenerateMatrix = async () => {
    setReportSuccess(null);
    setMatrixError(null);
    setIsGeneratingMatrix(true);

    try {
      if (!structuredInvestigationId) return;
      
      const result = await investigationService.generateConfusionMatrix(structuredInvestigationId);
      
      if (result && result.url) {
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
        const downloadUrl = `${apiBaseUrl}${result.url}`;
        window.open(downloadUrl, '_blank');
        setReportSuccess('Confusion matrix generated and downloaded.');
      }
    } catch (err) {
      console.error('Failed to generate confusion matrix:', err);
      setMatrixError('Failed to generate confusion matrix. Please try again.');
    } finally {
      setIsGeneratingMatrix(false);
    }
  };

  // Handler for viewing analytics
  const handleViewAnalytics = () => {
    if (window.olorin?.navigate) {
      window.olorin.navigate(`/analytics?id=${structuredInvestigationId}`);
    } else {
      window.location.href = `/analytics?id=${structuredInvestigationId}`;
    }
  };

  // Handler for viewing report
  const handleViewReport = () => {
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
    const reportUrl = `${apiBaseUrl}/api/v1/reports/investigation/${structuredInvestigationId}/html`;
    window.open(reportUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-black max-h-screen overflow-hidden relative">
      {/* Live Log Sidebar */}
      <LiveLogSidebar
        logs={selectedData.logs}
        defaultExpanded={false}
        onExpansionChange={setIsSidebarExpanded}
      />

      {/* Main Content - Adjust padding when sidebar is expanded */}
      <div
        className="h-screen overflow-y-auto wizard-scrollable transition-all duration-300"
        style={{
          paddingRight: isSidebarExpanded ? '384px' : '0px' // 384px = w-96 sidebar width
        }}
      >
        <div className="w-full px-6 py-8">
        <div className="flex flex-col items-center justify-center mb-8 py-6">
          <h1 className="text-3xl font-bold text-corporate-textPrimary mb-2">Investigation Progress</h1>
          <p className="text-sm text-corporate-textSecondary font-mono mb-2">ID: {effectiveInvestigation?.id}</p>

          {/* Entity Information */}
          {entityValue && (
            <div className="flex items-center gap-4 text-sm text-corporate-textSecondary">
              <span>
                <span className="text-corporate-textTertiary">Entity:</span>{' '}
                <span className="font-medium text-corporate-accentPrimary">{entityValue}</span>
              </span>
              {entityType && (
                <span>
                  <span className="text-corporate-textTertiary">Type:</span>{' '}
                  <span className="font-medium text-corporate-accentPrimary">{entityType}</span>
                </span>
              )}
            </div>
          )}

          {/* Completion Action Buttons */}
          {isCompleted && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg bg-corporate-accentSecondary hover:bg-corporate-accentSecondaryHover text-white font-medium transition-all duration-200 shadow-lg hover:shadow-corporate-accentSecondary/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                {isGenerating && <Spinner size="sm" variant="white" />}
                {isGenerating ? 'Generating Report...' : 'Create Report'}
              </button>
              <button
                onClick={handleGenerateMatrix}
                disabled={isGeneratingMatrix}
                className="px-4 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-all duration-200 shadow-lg hover:shadow-corporate-accentPrimary/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                {isGeneratingMatrix && <Spinner size="sm" variant="white" />}
                {isGeneratingMatrix ? 'Generating...' : 'Confusion Matrix'}
              </button>
              <button
                onClick={handleViewAnalytics}
                className="px-4 py-2 rounded-lg bg-corporate-info hover:bg-corporate-info/90 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-corporate-info/50 hover:scale-105 active:scale-95"
              >
                Analytics
              </button>
            </div>
          )}

          {/* Success/Error Messages */}
          {reportSuccess && (
            <div className="mt-3 p-3 bg-green-900/20 border border-green-500 text-green-300 rounded-lg flex items-center justify-between max-w-xl">
              <span className="text-sm">{reportSuccess}</span>
              <button
                onClick={handleViewReport}
                className="ml-3 px-3 py-1 rounded bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-all duration-200"
              >
                View Report
              </button>
            </div>
          )}
          {reportError && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-500 text-red-300 rounded-lg max-w-xl">
              <span className="text-sm">{reportError}</span>
            </div>
          )}
          {matrixError && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-500 text-red-300 rounded-lg max-w-xl">
              <span className="text-sm">{matrixError}</span>
            </div>
          )}

          {rehydrationState.snapshot.error && (
            <p className="text-xs text-corporate-error mt-2">{rehydrationState.snapshot.error.message}</p>
          )}
        </div>
        <ConnectionStatusHeader {...adapters.connectionStatusProps} elapsedTime={elapsedTime}
          entitiesCount={entitiesCount} toolsCount={toolsCount} progressPercent={finalProgressPercent} />
        <ConnectionStatusAlert isConnected={isConnected} connectionError={connectionError} />
        <OlorinErrorBoundary serviceName="ActivityMonitor" fallbackMessage="Activity monitor unavailable">
          {rehydrationState.snapshot.loading ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Activity Monitor</h2>
              <SectionSkeleton rows={4} height="lg" />
            </div>
          ) : (
            <ActivityMonitorSection ekgMetrics={adapters.ekgMetrics} isConnected={isConnected} />
          )}
        </OlorinErrorBoundary>
        <OlorinErrorBoundary serviceName="RadarVisualization" fallbackMessage="Radar visualization unavailable">
          {rehydrationState.snapshot.loading ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Radar Visualization</h2>
              <SectionSkeleton rows={6} height="xl" />
            </div>
          ) : (
            <RadarSection radarState={radarStateAdapted} onAnomalySelected={handleAnomalySelected}
              onToggleScanning={toggleScanning} onToggleLabels={toggleLabels} />
          )}
        </OlorinErrorBoundary>
        <OlorinErrorBoundary serviceName="EntityGraph" fallbackMessage="Entity graph unavailable">
          {rehydrationState.snapshot.loading ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Entity Graph</h2>
              <SectionSkeleton rows={5} height="xl" />
            </div>
          ) : (
            <EntityGraphSection {...adapters.entityGraphProps} />
          )}
        </OlorinErrorBoundary>
        {rehydrationState.snapshot.loading ? (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Detection & Tools</h2>
            <SectionSkeleton rows={4} height="md" />
          </div>
        ) : (
          <DetectionAndToolsSection radarAnomalies={radarStateAdapted.anomalies} />
        )}
        <OlorinErrorBoundary serviceName="AgentRiskGauges" fallbackMessage="Agent risk gauges unavailable">
          {rehydrationState.snapshot.loading ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Agent Risk Assessment</h2>
              <SectionSkeleton rows={3} height="xl" />
            </div>
          ) : (
            <AgentRiskSection
              agentGauges={adapters.agentGaugesProps.agents}
              toolExecutions={mergedProgress?.toolExecutions || []}
              riskThresholds={adapters.agentGaugesProps.riskThresholds}
              pulseThreshold={adapters.agentGaugesProps.pulseThreshold}
              animationSpeed={adapters.agentGaugesProps.animationSpeed}
              colorScheme={adapters.agentGaugesProps.colorScheme} />
          )}
        </OlorinErrorBoundary>
        <OlorinErrorBoundary serviceName="DomainFindings" fallbackMessage="Domain findings unavailable">
          {rehydrationState.snapshot.loading ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Domain Findings</h2>
              <SectionSkeleton rows={5} height="md" />
            </div>
          ) : (
            <DomainFindingsSection
              domainFindings={(mergedProgress as any)?.domainFindings || {}}
            />
          )}
        </OlorinErrorBoundary>
        {rehydrationState.snapshot.loading ? (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Progress Details</h2>
            <SectionSkeleton rows={6} height="lg" />
          </div>
        ) : (
          <ProgressDetailsSection phases={selectedData.phases} currentPhaseId={selectedData.currentPhaseId}
            toolExecutions={selectedData.toolExecutions} logs={selectedData.logs} />
        )}
        <OlorinErrorBoundary serviceName="EventsFeed" fallbackMessage="Events feed unavailable">
          {rehydrationState.events.loading ? (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Investigation Events</h2>
              <SectionSkeleton rows={8} height="md" />
            </div>
          ) : (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-corporate-textPrimary mb-4">Investigation Events</h2>
              <EventsList
                investigationId={structuredInvestigationId || undefined}
                autoLoad={true}
                pageSize={50}
                investigationStatus={(() => {
                  const status = (mergedProgress as any)?.status ||
                    (mergedProgress as any)?.lifecycleStage ||
                    (hybridStatus?.data?.progress as any)?.status ||
                    (hybridStatus?.data?.progress as any)?.lifecycle_stage;
                  console.log('🎯 [ProgressPage] Passing investigation status to EventsList:', {
                    status,
                    mergedProgressStatus: (mergedProgress as any)?.status,
                    mergedProgressLifecycleStage: (mergedProgress as any)?.lifecycleStage,
                    hybridStatusStatus: (hybridStatus?.data?.progress as any)?.status,
                    hybridStatusLifecycleStage: (hybridStatus?.data?.progress as any)?.lifecycle_stage
                  });
                  return status;
                })()}
              />
            </div>
          )}
        </OlorinErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
