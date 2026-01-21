/**
 * Investigation Tool Categories
 * Feature: 006-hybrid-graph-integration
 *
 * Defines all available investigation tools organized by category.
 */

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
}

export interface ToolCategory {
  category: string;
  title: string;
  tools: ToolDefinition[];
}

export const toolCategories: ToolCategory[] = [
  {
    category: 'device',
    title: 'Device Analysis',
    tools: [
      { id: 'check_device_fingerprint', name: 'Device Fingerprint', description: 'Check device fingerprint consistency' },
      { id: 'analyze_device_patterns', name: 'Device Patterns', description: 'Analyze historical device usage patterns' },
    ],
  },
  {
    category: 'location',
    title: 'Location Analysis',
    tools: [
      { id: 'verify_geo_location', name: 'Geo Location', description: 'Verify geographic location accuracy' },
      { id: 'analyze_location_patterns', name: 'Location Patterns', description: 'Analyze location access patterns' },
    ],
  },
  {
    category: 'network',
    title: 'Network Analysis',
    tools: [
      { id: 'analyze_network_patterns', name: 'Network Patterns', description: 'Analyze network behavior patterns' },
      { id: 'check_ip_reputation', name: 'IP Reputation', description: 'Check IP address reputation' },
    ],
  },
  {
    category: 'logs',
    title: 'Log Analysis',
    tools: [
      { id: 'analyze_log_patterns', name: 'Log Patterns', description: 'Analyze application log patterns' },
      { id: 'detect_log_anomalies', name: 'Log Anomalies', description: 'Detect anomalies in log data' },
    ],
  },
  {
    category: 'behavior',
    title: 'Behavior Analysis',
    tools: [
      { id: 'assess_behavior_patterns', name: 'Behavior Patterns', description: 'Assess user behavior patterns' },
      { id: 'detect_behavior_anomalies', name: 'Behavior Anomalies', description: 'Detect behavioral anomalies' },
    ],
  },
  {
    category: 'risk',
    title: 'Risk Assessment',
    tools: [
      { id: 'calculate_risk_score', name: 'Risk Score', description: 'Calculate overall risk score' },
      { id: 'aggregate_risk_factors', name: 'Risk Aggregation', description: 'Aggregate risk factors' },
    ],
  },
];
