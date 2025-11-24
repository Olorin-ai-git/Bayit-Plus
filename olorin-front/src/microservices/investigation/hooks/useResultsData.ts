import { useMemo } from 'react';
import type {
  AgentRiskGaugeState,
  AgentType,
  RiskConfiguration
} from '../../../shared/types/AgentRiskGauges';
import { DEFAULT_RISK_CONFIG, AGENT_COLORS } from '../../../shared/types/AgentRiskGauges';
import type { TimelineEvent, NetworkNode, NetworkEdge } from '../../../shared/components';

export const useResultsData = (
  overallRiskScore: number,
  entities: any[],
  findings: any[],
  recommendations: any[]
) => {
  // Memoize the current time to prevent infinite re-renders
  const now = useMemo(() => Date.now(), []);

  const agentGauges: AgentRiskGaugeState[] = useMemo(() => [
    {
      agentType: 'Risk' as AgentType,
      riskScore: overallRiskScore,
      toolsUsed: 18,
      status: 'completed',
      colorScheme: AGENT_COLORS.Risk,
      executionTime: 45000,
      findingsCount: 8,
      severeMode: false,
      startedAt: now - 45000,
      completedAt: now,
      agentName: 'Risk Assessment Agent'
    },
    {
      agentType: 'Device' as AgentType,
      riskScore: 82,
      toolsUsed: 12,
      status: 'completed',
      colorScheme: AGENT_COLORS.Device,
      executionTime: 38000,
      findingsCount: 5,
      severeMode: false,
      startedAt: now - 38000,
      completedAt: now,
      agentName: 'Device Fingerprint Agent'
    },
    {
      agentType: 'Location' as AgentType,
      riskScore: 65,
      toolsUsed: 15,
      status: 'completed',
      colorScheme: AGENT_COLORS.Location,
      executionTime: 32000,
      findingsCount: 3,
      severeMode: false,
      startedAt: now - 32000,
      completedAt: now,
      agentName: 'Geolocation Analysis Agent'
    },
    {
      agentType: 'Network' as AgentType,
      riskScore: 48,
      toolsUsed: 20,
      status: 'completed',
      colorScheme: AGENT_COLORS.Network,
      executionTime: 42000,
      findingsCount: 2,
      severeMode: false,
      startedAt: now - 42000,
      completedAt: now,
      agentName: 'Network Topology Agent'
    },
    {
      agentType: 'Logs' as AgentType,
      riskScore: 55,
      toolsUsed: 22,
      status: 'completed',
      colorScheme: AGENT_COLORS.Logs,
      executionTime: 50000,
      findingsCount: 4,
      severeMode: false,
      startedAt: now - 50000,
      completedAt: now,
      agentName: 'Log Pattern Analysis Agent'
    }
  ], [overallRiskScore, now]);

  const timelineEvents: TimelineEvent[] = useMemo(() => [
    {
      id: 'E001',
      timestamp: new Date(now - 3600000).toISOString(),
      type: 'critical',
      title: 'Suspicious login detected',
      description: 'Login from unusual geographic location',
      metadata: { ip_address: '203.0.113.45', location: 'Unknown Region' }
    },
    {
      id: 'E002',
      timestamp: new Date(now - 7200000).toISOString(),
      type: 'warning' as const,
      title: 'Device fingerprint match',
      description: 'Multiple accounts using same device',
      metadata: { device_id: 'DEV-12345', account_count: 5 }
    }
  ], [now]);

  const networkNodes: NetworkNode[] = useMemo(() => [
    { id: 'N1', label: entities[0]?.value || 'Entity 1', type: 'user', riskScore: 73 },
    { id: 'N2', label: '203.0.113.45', type: 'ip', riskScore: 85 },
    { id: 'N3', label: 'DEV-12345', type: 'device', riskScore: 65 }
  ], [entities]);

  const networkEdges: NetworkEdge[] = useMemo(() => [
    { source: 'N1', target: 'N2', type: 'login', weight: 5 },
    { source: 'N1', target: 'N3', type: 'device_used', weight: 8 }
  ], []);

  const results = useMemo(() => [
    {
      id: 'RES001',
      title: 'Account Takeover Risk',
      description: 'High probability of account compromise based on behavioral analysis',
      riskScore: 85,
      category: 'Security',
      findings: ['Unusual login location', 'Multiple failed attempts', 'Device mismatch'],
      timestamp: new Date(now).toISOString()
    }
  ], [now]);

  return useMemo(() => ({
    agentGauges,
    timelineEvents,
    networkNodes,
    networkEdges,
    results,
    riskConfig: DEFAULT_RISK_CONFIG
  }), [agentGauges, timelineEvents, networkNodes, networkEdges, results]);
};
