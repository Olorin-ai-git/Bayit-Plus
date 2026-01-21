/**
 * Default Routing Rules for Event Routing System
 * Provides pre-configured routing rules for Olorin microservices
 */

import type { RoutingRule } from './types';

/**
 * Create default routing rules for all microservices
 * Defines standard event routing patterns across the application
 */
export function createDefaultRules(): RoutingRule[] {
  return [
    // Investigation Service Rules
    {
      id: 'investigation-to-visualization',
      name: 'Investigation Data to Visualization',
      description: 'Route investigation risk calculations to visualization service',
      sourceEvent: 'investigation:risk:calculated',
      sourceService: 'investigation',
      targetEvents: [
        {
          event: 'viz:graph:updated',
          service: 'visualization',
          required: true
        }
      ],
      priority: 'medium',
      enabled: true,
      transform: {
        type: 'map',
        mapping: {
          'investigationId': 'investigationId',
          'score': 'riskScore',
          'factors': 'riskFactors'
        }
      }
    },

    {
      id: 'investigation-to-report',
      name: 'Investigation Completion to Reporting',
      description: 'Generate reports when investigations are completed',
      sourceEvent: 'investigation:completed',
      sourceService: 'investigation',
      targetEvents: [
        {
          event: 'report:generated',
          service: 'reporting',
          required: true,
          delay: 1000
        }
      ],
      priority: 'medium',
      enabled: true
    },

    // Agent Analytics Service Rules
    {
      id: 'agent-to-rag',
      name: 'Agent Analytics to RAG Intelligence',
      description: 'Route agent performance data to RAG for pattern analysis',
      sourceEvent: 'agent:performance:updated',
      sourceService: 'agent-analytics',
      targetEvents: [
        {
          event: 'rag:query:executed',
          service: 'rag-intelligence',
          required: true
        }
      ],
      conditions: [
        {
          field: 'metrics.errorRate',
          operator: 'greater_than',
          value: 10,
          type: 'data'
        }
      ],
      priority: 'medium',
      enabled: true
    },

    // RAG Intelligence Service Rules
    {
      id: 'rag-insights-to-viz',
      name: 'RAG Insights to Visualization',
      description: 'Visualize RAG-generated insights',
      sourceEvent: 'rag:insight:generated',
      sourceService: 'rag-intelligence',
      targetEvents: [
        {
          event: 'viz:chart:data:updated',
          service: 'visualization',
          required: true
        }
      ],
      priority: 'low',
      enabled: true
    },

    // Design System Service Rules
    {
      id: 'design-tokens-broadcast',
      name: 'Design Tokens Update Broadcast',
      description: 'Broadcast design token updates to all services',
      sourceEvent: 'design:tokens:updated',
      sourceService: 'design-system',
      targetEvents: [
        {
          event: 'ui:theme:changed',
          service: 'core-ui',
          required: true
        },
        {
          event: 'viz:theme:updated',
          service: 'visualization',
          required: false
        }
      ],
      priority: 'low',
      enabled: true
    },

    // Cross-Service Rules (Service Health Monitoring)
    {
      id: 'service-health-aggregation',
      name: 'Service Health Aggregation',
      description: 'Aggregate service health updates for monitoring',
      sourceEvent: 'service:health:check',
      sourceService: '*',
      targetEvents: [
        {
          event: 'ui:notification:show',
          service: 'core-ui',
          required: false
        }
      ],
      conditions: [
        {
          field: 'status.status',
          operator: 'not_equals',
          value: 'healthy',
          type: 'data'
        }
      ],
      priority: 'high',
      enabled: true
    },

    // Cross-Service Rules (Error Handling)
    {
      id: 'error-notification-routing',
      name: 'Error Notification Routing',
      description: 'Route service errors to UI for user notification',
      sourceEvent: 'service:error',
      sourceService: '*',
      targetEvents: [
        {
          event: 'ui:notification:show',
          service: 'core-ui',
          required: true
        }
      ],
      priority: 'critical',
      enabled: true,
      transform: {
        type: 'map',
        mapping: {
          'service': 'errorSource',
          'error.message': 'errorMessage'
        }
      }
    }
  ];
}
