/**
 * Radar Adapters
 * Feature: 007-progress-wizard-page (T046)
 *
 * Transforms InvestigationProgress to RadarVisualizationState format.
 * Extracts top 10 anomalies and maps agents to radar rings.
 */

import { InvestigationProgress } from '../../../../shared/types/investigation';
import { RadarVisualizationState, RadarAgentRing, RadarAnomaly, SeverityLevel } from '../../../../shared/types/radar.types';
import { extractAnomalies } from './anomalyExtractors';
import { buildAgentStatuses, progressHasAgentStatuses } from './agentBuilders';
import { AGENT_DISPLAY_NAMES, AGENT_COLORS, ALL_AGENT_TYPES, getAgentDisplayName } from '../../constants/agentConfig';
import { RADAR_CENTER } from '../../../../shared/utils/radarGeometry';

// Code loaded - anomaly colors match agent colors

/**
 * Maps agent index to radar ring radius
 * 6 concentric rings from center outward
 */
function getAgentRadius(agentIndex: number): number {
  const baseRadius = 60;  // Center offset
  const ringSpacing = 40; // Space between rings
  return baseRadius + (agentIndex * ringSpacing);
}

/**
 * Maps AnomalyDetection to RadarAnomaly format
 */
function mapAnomalyToRadar(anomaly: any, agentIndex: number, toolIndex: number, agentColor: string): RadarAnomaly {
  const severity = anomaly.severity as SeverityLevel;
  const radius = getAgentRadius(agentIndex);
  const angle = (toolIndex / 20) * Math.PI * 2; // 20 tools per ring distributed evenly

  return {
    id: anomaly.id,
    type: anomaly.type,
    riskLevel: anomaly.severityScore,
    severity,
    detected: anomaly.detectedAt.getTime(),
    detectedBy: {
      agent: anomaly.detectingAgent,
      tool: anomaly.detectingTool,
      agentIndex,
      toolIndex
    },
    position: {
      x: RADAR_CENTER + Math.cos(angle) * radius,
      y: RADAR_CENTER + Math.sin(angle) * radius,
      stackIndex: 0
    },
    color: agentColor, // Use agent color instead of severity color
    llmThoughts: anomaly.description,
    rawData: anomaly.supportingEvidence
  };
}

/**
 * Helper function to get default color for agent index
 */
function getDefaultColorForIndex(index: number): string {
  const defaultColors = [
    '#A855F7',  // Purple (corporate accent)
    '#C084FC',  // Light purple
    '#10B981',  // Green
    '#F59E0B',  // Amber
    '#818CF8',  // Purple-blue
    '#9333EA'   // Dark purple
  ];
  return defaultColors[index % defaultColors.length];
}

/**
 * Adapts InvestigationProgress to RadarVisualizationState
 *
 * @param progress - Olorin investigation progress (may include domainFindings)
 * @param isPolling - Current polling state
 * @returns RadarVisualizationState for radar visualization
 */
export function adaptToRadarView(
  progress: (InvestigationProgress & { domainFindings?: Record<string, any> }) | null,
  isPolling: boolean
): RadarVisualizationState {
  console.log('🚨🚨🚨 [adaptToRadarView] CALLED WITH:', {
    hasProgress: !!progress,
    progressStatus: progress?.status,
    lifecycleStage: progress?.lifecycleStage,
    isPolling,
    progressId: progress?.id,
    hasDomainFindings: !!(progress as any)?.domainFindings,
    domainFindingsCount: (progress as any)?.domainFindings ? Object.keys((progress as any).domainFindings).length : 0,
    domainFindingsKeys: (progress as any)?.domainFindings ? Object.keys((progress as any).domainFindings) : [],
    toolExecutionsCount: progress?.toolExecutions?.length || 0,
    toolExecutionsSample: progress?.toolExecutions?.slice(0, 2)
  });

  // CRITICAL: Always create all 6 agents even when progress is null
  // This ensures the radar displays the agent circles immediately
  // Build agents dynamically from API data or use defaults from config
  const defaultAgents: RadarAgentRing[] = ALL_AGENT_TYPES.map((agentType, index) => ({
    agentIndex: index,
    name: getAgentDisplayName(agentType),
    status: 'pending',
    radius: getAgentRadius(index),
    color: getDefaultColorForIndex(index),
    tools: [],
    anomalyCount: 0,
    executionTime: 0,
    riskScore: 0
  }));

  if (!progress) {
    // Return default state with all 6 agents but scanning disabled
    return {
      agents: defaultAgents,
      anomalies: [],
      stats: {
        activeAgents: 0,
        activeTools: 0,
        totalAnomalies: 0,
        criticalThreats: 0,
        averageRiskLevel: 0,
        scanTime: 0,
        totalScans: 0,
        systemUptime: 100,
        runningAgents: 0
      },
      uiState: {
        // Keep scanning disabled when no progress data
        isScanning: false,
        selectedAnomaly: null,
        hoveredTool: null,
        showLabels: true,
        filterRiskLevel: null
      },
      metadata: {
        investigationId: '',
        entityId: '',
        entityType: '',
        startTime: Date.now(),
        status: 'initializing'
      }
    };
  }

  // Get agent statuses - ALWAYS ensure all 6 agents are created
  const hasAgentStatuses = progressHasAgentStatuses(progress);
  console.log('🚨🚨🚨 [adaptToRadarView] Agent status check:', {
    hasAgentStatuses,
    agentStatusesLength: progress.agentStatuses?.length || 0,
    toolExecutionsLength: progress.toolExecutions?.length || 0
  });

  // CRITICAL: Always build agent statuses to ensure all 6 agents are displayed
  // Even with empty tool executions, this will create all 6 agents with 'pending' status
  // Pass domainFindings to use risk scores from domain findings
  const domainFindings = (progress as any).domainFindings;
  const agentStatuses = hasAgentStatuses && progress.agentStatuses.length > 0
    ? progress.agentStatuses
    : buildAgentStatuses(progress.toolExecutions || [], domainFindings);

  console.log('🚨🚨🚨 [adaptToRadarView] Final agent statuses:', {
    count: agentStatuses.length,
    names: agentStatuses.map(a => a.agentName),
    statuses: agentStatuses.map(a => ({ name: a.agentName, status: a.status }))
  });

  // Extract top 10 anomalies
  const anomalyDetections = extractAnomalies(progress);

  // Map tool executions to agents for radar display
  const toolsByAgent = (progress.toolExecutions || []).reduce((acc, tool) => {
    const agentType = tool.agentType || 'unknown';
    if (!acc[agentType]) {
      acc[agentType] = [];
    }
    acc[agentType].push(tool);
    return acc;
  }, {} as Record<string, typeof progress.toolExecutions>);

  // Map agents to radar rings - ENSURE ALL 6 AGENTS ARE CREATED
  const agents: RadarAgentRing[] = agentStatuses.length > 0
    ? agentStatuses.map((agent, index) => {
        // Get color based on the agent type - use a more flexible mapping
        const agentTypeName = agent.agentName.split(' ')[0]; // Get first word like "Device", "Location", etc.
        const agentColor = AGENT_COLORS[agentTypeName] || AGENT_COLORS[agent.agentType];

        // Map tools for this agent
        const agentTools = toolsByAgent[agent.agentType] || [];
        const totalToolsForAgent = agentTools.length;
        const tools: RadarToolTick[] = agentTools.map((tool, toolIndex) => {
          // Calculate angle for tool position on radar ring
          const angle = (toolIndex / Math.max(totalToolsForAgent, 1)) * Math.PI * 2;
          const radius = getAgentRadius(index);
          const position = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
          };
          
          // Find anomalies for this tool
          const toolAnomalies = anomalyDetections.filter(
            a => a.detectingTool === tool.toolName && a.detectingAgent === agent.agentType
          );
          
          return {
            toolName: tool.toolName || 'unknown',
            name: tool.toolName || 'unknown', // Alias for component compatibility
            agentIndex: index,
            toolIndex,
            angle,
            status: (tool.status || 'pending') as any,
            position,
            anomalies: toolAnomalies,
            anomalyCount: toolAnomalies.length, // For component compatibility
            executionTime: tool.executionTimeMs, // For component compatibility
            progress: tool.status === 'completed' ? 100 : tool.status === 'running' ? 50 : 0
          } as any; // Type assertion to allow name/anomalyCount/executionTime
        });

        const ring: RadarAgentRing = {
          agentIndex: index,
          name: agent.agentName,
          status: agent.status || 'pending',
          radius: getAgentRadius(index),
          color: agentColor?.primary || getDefaultColorForIndex(index),
          tools: tools, // Map tools from toolExecutions
          anomalyCount: anomalyDetections.filter(a => a.detectingAgent === agent.agentType).length,
          executionTime: agent.averageExecutionTimeMs || 0,
          riskScore: agent.riskScore || 0
        };

        console.log(`🚨 Agent ${index}:`, {
          name: ring.name,
          status: ring.status,
          radius: ring.radius,
          color: ring.color,
          toolsCount: tools.length,
          riskScore: ring.riskScore
        });

        return ring;
      })
    : defaultAgents; // Use default agents if no agent statuses available

  console.log('🚨🚨🚨 [adaptToRadarView] Created radar rings:', {
    count: agents.length,
    expectedCount: 6,
    allAgentsCreated: agents.length === 6,
    agentDetails: agents.map(a => ({ name: a.name, status: a.status, color: a.color }))
  });

  // Map anomalies to radar format
  const anomalies: RadarAnomaly[] = anomalyDetections.map((anomaly, idx) => {
    // Case-insensitive match: agentType is lowercase, detectingAgent is capitalized
    const agentIndex = agentStatuses.findIndex(a =>
      a.agentType.toLowerCase() === anomaly.detectingAgent.toLowerCase()
    );

    // Get agent color from the agents array (which has colors assigned)
    const finalAgentIndex = agentIndex >= 0 ? agentIndex : 0;
    const agentColor = agents[finalAgentIndex]?.color || getDefaultColorForIndex(finalAgentIndex);

    console.log(`🎯 [radarAdapters] Mapping anomaly ${idx}:`, {
      detectingAgent: anomaly.detectingAgent,
      matchedAgentIndex: agentIndex,
      matchedAgentType: agentIndex >= 0 ? agentStatuses[agentIndex].agentType : 'NOT_FOUND',
      agentColor,
      allAgentTypes: agentStatuses.map(a => a.agentType)
    });

    return mapAnomalyToRadar(anomaly, finalAgentIndex, idx, agentColor);
  });

  // Calculate statistics
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
  const avgRisk = anomalies.length > 0
    ? anomalies.reduce((sum, a) => sum + a.riskLevel, 0) / anomalies.length
    : 0;

  // Count running agents - also during initialization phase
  const runningAgents = agentStatuses.filter(a => a.status === 'running' || a.status === 'pending').length;

  const radarState = {
    agents,
    anomalies,
    stats: {
      activeAgents: agentStatuses.filter(a => a.status === 'running').length,
      activeTools: progress.toolExecutions.filter(t => t.status === 'running').length,
      totalAnomalies: anomalies.length,
      criticalThreats: criticalAnomalies,
      averageRiskLevel: Math.round(avgRisk),
      scanTime: progress.startedAt 
        ? Math.floor((Date.now() - progress.startedAt.getTime()) / 1000)
        : 0,
      totalScans: progress.completedTools,
      systemUptime: 100, // Calculated from polling state
      runningAgents // Add this for ProgressPage
    },
    uiState: {
      // Enable scanning when investigation is in progress
      // Disable scanning when investigation is completed
      // Check both status and lifecycle_stage for compatibility
      isScanning: (progress.status === 'running' ||
                   progress.status === 'initializing' ||
                   progress.lifecycleStage === 'in_progress') &&
                  progress.status !== 'completed' &&
                  progress.lifecycleStage !== 'completed' &&
                  runningAgents > 0,
      selectedAnomaly: null,
      hoveredTool: null,
      showLabels: true,
      filterRiskLevel: null
    },
    metadata: {
      investigationId: progress.investigationId,
      // Extract entity from the first entity in the progress data
      entityId: progress.entities && progress.entities.length > 0 
        ? progress.entities[0].id 
        : progress.id,
      entityType: progress.entities && progress.entities.length > 0
        ? progress.entities[0].type
        : 'investigation',
      startTime: progress.startedAt?.getTime() || Date.now(),
      // Set status to 'active' when running or in_progress
      status: (progress.status === 'running' ||
               progress.status === 'initializing' ||
               progress.lifecycleStage === 'in_progress') ? 'active' :
              progress.status === 'completed' ? 'completed' : 'initializing'
    }
  };

  console.log('🚨🚨🚨 [adaptToRadarView] FINAL radar state:', {
    agentCount: radarState.agents.length,
    agents: radarState.agents.map(a => ({ name: a.name, radius: a.radius, status: a.status })),
    anomalyCount: radarState.anomalies.length,
    isScanning: radarState.uiState.isScanning,
    metadataStatus: radarState.metadata.status,
    progressStatus: progress.status,
    lifecycleStage: progress.lifecycleStage
  });

  return radarState;
}
