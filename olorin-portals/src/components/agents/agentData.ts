/**
 * Agent Data
 *
 * Information about the 6 specialized AI agents in the Olorin platform.
 */

import { AgentInfo } from './AgentCard';

export const AGENTS: AgentInfo[] = [
  {
    id: 'device',
    name: 'Device Agent',
    icon: '🖥️',
    description: 'Analyzes device fingerprints, browser patterns, and hardware characteristics to detect spoofing and manipulation.',
    capabilities: [
      'Fingerprint Analysis',
      'Browser Consistency',
      'Hardware Detection',
      'Emulator Detection',
      'Canvas/WebGL Analysis',
    ],
    dataSources: ['Device Fingerprints', 'Browser Headers', 'WebGL Data', 'Canvas Data'],
    toolCount: 15,
    color: '#8b5cf6',
  },
  {
    id: 'location',
    name: 'Location Agent',
    icon: '📍',
    description: 'Detects geographic anomalies including impossible travel, VPN usage, and location spoofing patterns.',
    capabilities: [
      'Impossible Travel',
      'VPN Detection',
      'Proxy Detection',
      'Geo-IP Analysis',
      'Location Spoofing',
    ],
    dataSources: ['IP Geolocation', 'GPS Data', 'Cell Tower Data', 'Timezone Analysis'],
    toolCount: 12,
    color: '#06b6d4',
  },
  {
    id: 'network',
    name: 'Network Agent',
    icon: '🌐',
    description: 'Analyzes network patterns, ISP reputation, and connection characteristics to identify suspicious behavior.',
    capabilities: [
      'ISP Analysis',
      'IP Reputation',
      'Connection Patterns',
      'Tor Detection',
      'Datacenter Detection',
    ],
    dataSources: ['IP Intelligence', 'ISP Data', 'ASN Database', 'Threat Feeds'],
    toolCount: 18,
    color: '#10b981',
  },
  {
    id: 'logs',
    name: 'Logs Agent',
    icon: '📋',
    description: 'Correlates activity logs to detect behavioral anomalies, unauthorized access, and suspicious patterns.',
    capabilities: [
      'Behavior Analysis',
      'Anomaly Detection',
      'Access Patterns',
      'Session Analysis',
      'API Correlation',
    ],
    dataSources: ['Splunk Logs', 'Auth Logs', 'API Logs', 'Session Data'],
    toolCount: 20,
    color: '#f59e0b',
  },
  {
    id: 'authentication',
    name: 'Authentication Agent',
    icon: '🔐',
    description: 'Monitors authentication patterns, MFA events, and credential usage to detect account compromise.',
    capabilities: [
      'Login Analysis',
      'MFA Verification',
      'Credential Patterns',
      'Brute Force Detection',
      'Session Hijacking',
    ],
    dataSources: ['Auth Events', 'MFA Logs', 'Password Events', 'Session Tokens'],
    toolCount: 14,
    color: '#ef4444',
  },
  {
    id: 'risk_aggregation',
    name: 'Risk Aggregation Agent',
    icon: '⚡',
    description: 'Synthesizes findings from all domain agents into a unified risk assessment with confidence scores.',
    capabilities: [
      'Multi-Domain Fusion',
      'Risk Scoring',
      'Confidence Calculation',
      'Priority Ranking',
      'Remediation Actions',
    ],
    dataSources: ['All Agent Outputs', 'Historical Patterns', 'Risk Models', 'ML Scores'],
    toolCount: 10,
    color: '#a855f7',
  },
];

export const TOTAL_TOOLS = AGENTS.reduce((sum, agent) => sum + agent.toolCount, 0);
