/**
 * Mock Agents and Tools Data
 * Feature: 004-new-olorin-frontend
 *
 * Mock data for development and testing of the Olorin-style tools and agents matrix.
 * This data represents the investigation agents and their compatible tools.
 */

import {
  AgentName,
  AgentConfig,
  EnhancedTool,
  ToolType,
  ToolPriority,
  ToolCapability
} from '@shared/types/agent.types';

/**
 * Mock agent configurations
 */
export const mockAgents: AgentConfig[] = [
  {
    name: AgentName.DEVICE_ANALYSIS,
    displayName: 'Device Analysis',
    description: 'Analyzes device fingerprints, characteristics, and behavioral patterns to detect device-based fraud',
    icon: '📱',
    enabled: true,
    compatibleTools: [
      'device_fingerprint',
      'device_reputation',
      'device_velocity',
      'browser_analysis',
      'device_history'
    ],
    recommendedTools: ['device_fingerprint', 'device_reputation', 'device_velocity'],
    executionOrder: 1
  },
  {
    name: AgentName.LOCATION_ANALYSIS,
    displayName: 'Location Analysis',
    description: 'Validates geographic location data, detects VPNs and proxies, and identifies location anomalies',
    icon: '🌍',
    enabled: true,
    compatibleTools: [
      'geolocation',
      'ip_reputation',
      'vpn_detection',
      'proxy_detection',
      'location_velocity'
    ],
    recommendedTools: ['geolocation', 'ip_reputation', 'vpn_detection'],
    executionOrder: 2
  },
  {
    name: AgentName.NETWORK_ANALYSIS,
    displayName: 'Network Analysis',
    description: 'Examines network patterns, builds relationship graphs, and identifies suspicious connection clusters',
    icon: '🕸️',
    enabled: true,
    compatibleTools: [
      'network_graph',
      'connection_analysis',
      'cluster_detection',
      'pattern_matching'
    ],
    recommendedTools: ['network_graph', 'connection_analysis'],
    executionOrder: 3
  },
  {
    name: AgentName.BEHAVIOR_ANALYSIS,
    displayName: 'Behavior Analysis',
    description: 'Analyzes user behavior patterns, detects anomalies, and identifies suspicious activity sequences',
    icon: '👤',
    enabled: true,
    compatibleTools: [
      'behavior_pattern',
      'anomaly_detection',
      'session_analysis',
      'activity_timeline'
    ],
    recommendedTools: ['behavior_pattern', 'anomaly_detection'],
    executionOrder: 4
  },
  {
    name: AgentName.LOGS_ANALYSIS,
    displayName: 'Logs Analysis',
    description: 'Searches and analyzes log data from multiple sources to identify security events and patterns',
    icon: '📋',
    enabled: true,
    compatibleTools: ['splunk_logs', 'elasticsearch_logs', 'log_correlation', 'event_timeline'],
    recommendedTools: ['splunk_logs', 'log_correlation'],
    executionOrder: 5
  },
  {
    name: AgentName.RISK_ASSESSMENT,
    displayName: 'Risk Assessment',
    description: 'Aggregates findings from all agents and calculates comprehensive risk scores with confidence levels',
    icon: '⚠️',
    enabled: true,
    compatibleTools: ['risk_scoring', 'confidence_calculation', 'threat_intelligence'],
    recommendedTools: ['risk_scoring', 'confidence_calculation'],
    executionOrder: 6
  }
];

/**
 * Mock tool capabilities
 */
const deviceCapabilities: ToolCapability[] = [
  { name: 'Fingerprinting', description: 'Device fingerprint analysis', icon: '🔍' },
  { name: 'Reputation Check', description: 'Device reputation scoring', icon: '⭐' },
  { name: 'History Tracking', description: 'Device usage history', icon: '📊' }
];

const locationCapabilities: ToolCapability[] = [
  { name: 'Geolocation', description: 'GPS and IP-based location', icon: '📍' },
  { name: 'Proxy Detection', description: 'VPN and proxy identification', icon: '🛡️' },
  { name: 'Velocity Check', description: 'Impossible travel detection', icon: '⚡' }
];

const networkCapabilities: ToolCapability[] = [
  { name: 'Graph Building', description: 'Network relationship mapping', icon: '🕸️' },
  { name: 'Cluster Analysis', description: 'Connection pattern detection', icon: '🔗' },
  { name: 'Anomaly Detection', description: 'Unusual network behavior', icon: '⚠️' }
];

const behaviorCapabilities: ToolCapability[] = [
  { name: 'Pattern Recognition', description: 'User behavior analysis', icon: '🎯' },
  { name: 'Anomaly Detection', description: 'Unusual activity detection', icon: '🚨' },
  { name: 'Session Tracking', description: 'User session analysis', icon: '⏱️' }
];

const logsCapabilities: ToolCapability[] = [
  { name: 'Log Search', description: 'Full-text log searching', icon: '🔎' },
  { name: 'Correlation', description: 'Event correlation analysis', icon: '🔗' },
  { name: 'Timeline', description: 'Event timeline construction', icon: '📅' }
];

/**
 * Mock enhanced tools with Olorin-style metadata
 */
export const mockEnhancedTools: EnhancedTool[] = [
  // Device Analysis Tools
  {
    id: 'device_fingerprint',
    name: 'device_fingerprint',
    displayName: 'Device Fingerprint',
    description: 'Analyzes device characteristics including browser, OS, screen resolution, and hardware identifiers',
    category: 'Device Analysis',
    toolType: ToolType.OLORIN_TOOL,
    priority: ToolPriority.HIGH,
    enabled: false,
    icon: '🔍',
    capabilities: deviceCapabilities,
    agentCompatibility: [AgentName.DEVICE_ANALYSIS],
    executionTimeEstimateMs: 2000,
    requiresConfiguration: false
  },
  {
    id: 'device_reputation',
    name: 'device_reputation',
    displayName: 'Device Reputation',
    description: 'Checks device reputation scores and history across threat intelligence databases',
    category: 'Device Analysis',
    toolType: ToolType.OLORIN_TOOL,
    priority: ToolPriority.HIGH,
    enabled: false,
    icon: '⭐',
    capabilities: deviceCapabilities.slice(1),
    agentCompatibility: [AgentName.DEVICE_ANALYSIS],
    executionTimeEstimateMs: 1500,
    requiresConfiguration: false
  },
  {
    id: 'device_velocity',
    name: 'device_velocity',
    displayName: 'Device Velocity',
    description: 'Detects impossible device usage patterns based on time and location',
    category: 'Device Analysis',
    toolType: ToolType.EXTERNAL_TOOL,
    priority: ToolPriority.MEDIUM,
    enabled: false,
    icon: '⚡',
    capabilities: [deviceCapabilities[2]].filter((c): c is ToolCapability => c !== undefined),
    agentCompatibility: [AgentName.DEVICE_ANALYSIS],
    executionTimeEstimateMs: 3000,
    requiresConfiguration: false
  },
  {
    id: 'browser_analysis',
    name: 'browser_analysis',
    displayName: 'Browser Analysis',
    description: 'Analyzes browser fingerprints, plugins, and behavioral characteristics',
    category: 'Device Analysis',
    toolType: ToolType.MCP_TOOL,
    priority: ToolPriority.MEDIUM,
    enabled: false,
    icon: '🌐',
    capabilities: [deviceCapabilities[0]].filter((c): c is ToolCapability => c !== undefined),
    agentCompatibility: [AgentName.DEVICE_ANALYSIS],
    executionTimeEstimateMs: 2500,
    requiresConfiguration: false
  },

  // Location Analysis Tools
  {
    id: 'geolocation',
    name: 'geolocation',
    displayName: 'Geolocation',
    description: 'Validates geographic location data using GPS, IP geolocation, and cell tower triangulation',
    category: 'Location Analysis',
    toolType: ToolType.OLORIN_TOOL,
    priority: ToolPriority.HIGH,
    enabled: false,
    icon: '📍',
    capabilities: locationCapabilities,
    agentCompatibility: [AgentName.LOCATION_ANALYSIS],
    executionTimeEstimateMs: 2000,
    requiresConfiguration: false
  },
  {
    id: 'ip_reputation',
    name: 'ip_reputation',
    displayName: 'IP Reputation',
    description: 'Checks IP address reputation and detects VPNs, proxies, and Tor exit nodes',
    category: 'Location Analysis',
    toolType: ToolType.OLORIN_TOOL,
    priority: ToolPriority.HIGH,
    enabled: false,
    icon: '🛡️',
    capabilities: locationCapabilities.slice(1),
    agentCompatibility: [AgentName.LOCATION_ANALYSIS],
    executionTimeEstimateMs: 1500,
    requiresConfiguration: false
  },
  {
    id: 'vpn_detection',
    name: 'vpn_detection',
    displayName: 'VPN Detection',
    description: 'Identifies VPN usage and proxy connections with high accuracy',
    category: 'Location Analysis',
    toolType: ToolType.EXTERNAL_TOOL,
    priority: ToolPriority.HIGH,
    enabled: false,
    icon: '🔒',
    capabilities: [locationCapabilities[1]!],
    agentCompatibility: [AgentName.LOCATION_ANALYSIS],
    executionTimeEstimateMs: 2500,
    requiresConfiguration: false
  },

  // Network Analysis Tools
  {
    id: 'network_graph',
    name: 'network_graph',
    displayName: 'Network Graph',
    description: 'Builds network relationship graphs to identify suspicious connection clusters',
    category: 'Network Analysis',
    toolType: ToolType.OLORIN_TOOL,
    priority: ToolPriority.MEDIUM,
    enabled: false,
    icon: '🕸️',
    capabilities: networkCapabilities,
    agentCompatibility: [AgentName.NETWORK_ANALYSIS],
    executionTimeEstimateMs: 4000,
    requiresConfiguration: false
  },
  {
    id: 'connection_analysis',
    name: 'connection_analysis',
    displayName: 'Connection Analysis',
    description: 'Analyzes network connections and identifies unusual patterns',
    category: 'Network Analysis',
    toolType: ToolType.MCP_TOOL,
    priority: ToolPriority.MEDIUM,
    enabled: false,
    icon: '🔗',
    capabilities: networkCapabilities.slice(1),
    agentCompatibility: [AgentName.NETWORK_ANALYSIS],
    executionTimeEstimateMs: 3000,
    requiresConfiguration: false
  },

  // Behavior Analysis Tools
  {
    id: 'behavior_pattern',
    name: 'behavior_pattern',
    displayName: 'Behavior Pattern',
    description: 'Analyzes user behavior patterns and detects anomalies using machine learning',
    category: 'Behavior Analysis',
    toolType: ToolType.OLORIN_TOOL,
    priority: ToolPriority.HIGH,
    enabled: false,
    icon: '🎯',
    capabilities: behaviorCapabilities,
    agentCompatibility: [AgentName.BEHAVIOR_ANALYSIS],
    executionTimeEstimateMs: 3500,
    requiresConfiguration: false
  },
  {
    id: 'anomaly_detection',
    name: 'anomaly_detection',
    displayName: 'Anomaly Detection',
    description: 'Detects unusual activity sequences and suspicious behavior patterns',
    category: 'Behavior Analysis',
    toolType: ToolType.OLORIN_TOOL,
    priority: ToolPriority.HIGH,
    enabled: false,
    icon: '🚨',
    capabilities: behaviorCapabilities.slice(1),
    agentCompatibility: [AgentName.BEHAVIOR_ANALYSIS],
    executionTimeEstimateMs: 3000,
    requiresConfiguration: false
  },

  // Logs Analysis Tools
  {
    id: 'splunk_logs',
    name: 'splunk_logs',
    displayName: 'Splunk Logs',
    description: 'Searches and analyzes Splunk log data for security events and patterns',
    category: 'Logs Analysis',
    toolType: ToolType.OLORIN_TOOL,
    priority: ToolPriority.HIGH,
    enabled: false,
    icon: '📋',
    capabilities: logsCapabilities,
    agentCompatibility: [AgentName.LOGS_ANALYSIS],
    executionTimeEstimateMs: 5000,
    requiresConfiguration: false
  },
  {
    id: 'log_correlation',
    name: 'log_correlation',
    displayName: 'Log Correlation',
    description: 'Correlates events across multiple log sources to identify attack patterns',
    category: 'Logs Analysis',
    toolType: ToolType.MCP_TOOL,
    priority: ToolPriority.MEDIUM,
    enabled: false,
    icon: '🔗',
    capabilities: logsCapabilities.slice(1),
    agentCompatibility: [AgentName.LOGS_ANALYSIS],
    executionTimeEstimateMs: 4000,
    requiresConfiguration: false
  },

  // Risk Assessment Tools
  {
    id: 'risk_scoring',
    name: 'risk_scoring',
    displayName: 'Risk Scoring',
    description: 'Calculates comprehensive risk scores based on all investigation findings',
    category: 'Risk Assessment',
    toolType: ToolType.OLORIN_TOOL,
    priority: ToolPriority.HIGH,
    enabled: false,
    icon: '⚠️',
    capabilities: [
      { name: 'Score Calculation', description: 'Risk score computation', icon: '🔢' },
      { name: 'Confidence Level', description: 'Assessment confidence', icon: '📊' }
    ],
    agentCompatibility: [AgentName.RISK_ASSESSMENT],
    executionTimeEstimateMs: 2000,
    requiresConfiguration: false
  }
];

/**
 * Helper function to get mock tools by agent
 */
export function getMockToolsForAgent(agentName: AgentName): EnhancedTool[] {
  return mockEnhancedTools.filter(
    (tool) =>
      !tool.agentCompatibility ||
      tool.agentCompatibility.length === 0 ||
      tool.agentCompatibility.includes(agentName)
  );
}

/**
 * Helper function to get recommended tools for agent
 */
export function getRecommendedMockTools(agentName: AgentName): string[] {
  const agent = mockAgents.find((a) => a.name === agentName);
  return agent?.recommendedTools || [];
}
