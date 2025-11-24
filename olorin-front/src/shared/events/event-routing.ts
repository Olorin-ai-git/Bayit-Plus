/**
 * Event Routing Rules for Olorin Microservices
 * Defines how events flow between the 8 microservices with intelligent routing
 */

import { EventBusManager } from './eventBus';
// WebSocketManager removed per spec 005 - using polling instead

export interface RoutingRule {
  id: string;
  name: string;
  description: string;
  sourceEvent: string;
  sourceService: string;
  targetEvents: TargetEvent[];
  conditions?: RoutingCondition[];
  transform?: EventTransform;
  priority: RoutePriority;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface TargetEvent {
  event: string;
  service: string;
  required: boolean;
  delay?: number;
  conditions?: RoutingCondition[];
}

export interface RoutingCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  type: 'data' | 'metadata' | 'service' | 'timestamp';
}

export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';

export interface EventTransform {
  type: 'map' | 'filter' | 'aggregate' | 'split';
  mapping?: Record<string, string>;
  filter?: RoutingCondition[];
  aggregation?: AggregationConfig;
  splitField?: string;
}

export interface AggregationConfig {
  groupBy: string;
  aggregateFields: { field: string; operation: 'sum' | 'avg' | 'count' | 'max' | 'min' }[];
  windowSize?: number;
}

export type RoutePriority = 'low' | 'medium' | 'high' | 'critical';

export interface RoutingMetrics {
  ruleId: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  lastExecuted?: Date;
  errors: RoutingError[];
}

export interface RoutingError {
  timestamp: Date;
  error: string;
  eventData: any;
  targetService?: string;
}

export interface RoutingContext {
  sourceEvent: string;
  sourceService: string;
  eventData: any;
  metadata: Record<string, any>;
  timestamp: Date;
  correlationId: string;
}

/**
 * Event Router for microservice communication
 */
export class EventRouter {
  private static instance: EventRouter;
  private eventBus: EventBusManager;
  // webSocketManager removed per spec 005 - using polling instead
  private rules: Map<string, RoutingRule> = new Map();
  private metrics: Map<string, RoutingMetrics> = new Map();
  private subscriptions: Map<string, () => void> = new Map();

  private constructor() {
    this.eventBus = EventBusManager.getInstance();
    // webSocketManager initialization removed per spec 005
    this.initializeDefaultRules();
    this.setupEventListeners();
  }

  public static getInstance(): EventRouter {
    if (!EventRouter.instance) {
      EventRouter.instance = new EventRouter();
    }
    return EventRouter.instance;
  }

  /**
   * Add routing rule
   */
  public addRule(rule: RoutingRule): void {
    this.rules.set(rule.id, rule);
    this.initializeMetrics(rule.id);
    this.setupRuleListener(rule);
    console.log(`📋 Routing rule added: ${rule.name} (${rule.sourceEvent})`);
  }

  /**
   * Remove routing rule
   */
  public removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    this.rules.delete(ruleId);
    this.metrics.delete(ruleId);

    const unsubscribe = this.subscriptions.get(ruleId);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(ruleId);
    }

    console.log(`🗑️ Routing rule removed: ${ruleId}`);
    return true;
  }

  /**
   * Get routing rule
   */
  public getRule(ruleId: string): RoutingRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all routing rules
   */
  public getAllRules(): RoutingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enable/disable routing rule
   */
  public setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} Routing rule ${enabled ? 'enabled' : 'disabled'}: ${rule.name}`);
    return true;
  }

  /**
   * Get routing metrics
   */
  public getMetrics(ruleId?: string): RoutingMetrics | RoutingMetrics[] {
    if (ruleId) {
      return this.metrics.get(ruleId);
    }
    return Array.from(this.metrics.values());
  }

  /**
   * Clear routing metrics
   */
  public clearMetrics(ruleId?: string): void {
    if (ruleId) {
      const metrics = this.metrics.get(ruleId);
      if (metrics) {
        metrics.executionCount = 0;
        metrics.successCount = 0;
        metrics.failureCount = 0;
        metrics.averageLatency = 0;
        metrics.errors = [];
        metrics.lastExecuted = undefined;
      }
    } else {
      this.metrics.forEach(metrics => {
        metrics.executionCount = 0;
        metrics.successCount = 0;
        metrics.failureCount = 0;
        metrics.averageLatency = 0;
        metrics.errors = [];
        metrics.lastExecuted = undefined;
      });
    }
  }

  /**
   * Route event manually
   */
  public async routeEvent(context: RoutingContext): Promise<void> {
    const applicableRules = this.findApplicableRules(context);

    for (const rule of applicableRules) {
      if (!rule.enabled) continue;

      try {
        await this.executeRule(rule, context);
      } catch (error) {
        console.error(`Failed to execute routing rule ${rule.id}:`, error);
        this.recordError(rule.id, error as Error, context);
      }
    }
  }

  /**
   * Private: Initialize default routing rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: RoutingRule[] = [
      // Investigation → Visualization Updates (unified investigation service)
      {
        id: 'investigation-to-visualization',
        name: 'Investigation Data to Visualization',
        description: 'Route investigation updates to visualization service',
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

      // Agent Analytics → RAG Intelligence
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

      // Investigation Completion → Reporting (unified investigation service)
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

      // RAG Insights → Visualization
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

      // Design System → All Services
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

      // Service Health Monitoring
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

      // Cross-Service Error Handling
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

    defaultRules.forEach(rule => this.addRule(rule));
    console.log(`🎯 Initialized ${defaultRules.length} default routing rules`);
  }

  /**
   * Private: Setup event listeners for routing
   */
  private setupEventListeners(): void {
    // Listen to all events and check for applicable routing rules
    const allEventTypes = [
      'investigation:started',
      'investigation:completed',
      'investigation:risk:calculated',
      'investigation:progress:updated',
      'investigation:tool:executed',
      'agent:execution:started',
      'agent:execution:completed',
      'agent:performance:updated',
      'agent:anomaly:detected',
      'rag:query:executed',
      'rag:knowledge:updated',
      'rag:insight:generated',
      'viz:graph:updated',
      'viz:map:location:added',
      'viz:chart:data:updated',
      'report:generated',
      'report:export:started',
      'report:export:completed',
      'ui:navigation:changed',
      'ui:notification:show',
      'ui:theme:changed',
      'design:tokens:updated',
      'design:component:generated',
      'design:figma:synced',
      'service:health:check',
      'service:error'
    ];

    allEventTypes.forEach(eventType => {
      this.eventBus.subscribe(eventType, (data) => {
        const context: RoutingContext = {
          sourceEvent: eventType,
          sourceService: this.extractServiceFromEvent(eventType),
          eventData: data,
          metadata: {},
          timestamp: new Date(),
          correlationId: this.generateCorrelationId()
        };

        this.routeEvent(context);
      }, 'event-router');
    });
  }

  /**
   * Private: Setup listener for specific rule
   */
  private setupRuleListener(rule: RoutingRule): void {
    const unsubscribe = this.eventBus.subscribe(rule.sourceEvent as any, (data) => {
      if (!rule.enabled) return;

      const context: RoutingContext = {
        sourceEvent: rule.sourceEvent,
        sourceService: rule.sourceService,
        eventData: data,
        metadata: rule.metadata || {},
        timestamp: new Date(),
        correlationId: this.generateCorrelationId()
      };

      this.executeRule(rule, context);
    }, `rule-${rule.id}`);

    this.subscriptions.set(rule.id, unsubscribe);
  }

  /**
   * Private: Find applicable rules for context
   */
  private findApplicableRules(context: RoutingContext): RoutingRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      if (!rule.enabled) return false;
      if (rule.sourceEvent !== context.sourceEvent) return false;
      if (rule.sourceService !== '*' && rule.sourceService !== context.sourceService) return false;

      return this.evaluateConditions(rule.conditions, context);
    });
  }

  /**
   * Private: Execute routing rule
   */
  private async executeRule(rule: RoutingRule, context: RoutingContext): Promise<void> {
    const startTime = Date.now();
    const metrics = this.metrics.get(rule.id)!;

    try {
      metrics.executionCount++;
      metrics.lastExecuted = new Date();

      // Transform data if needed
      let transformedData = context.eventData;
      if (rule.transform) {
        transformedData = this.transformData(rule.transform, context.eventData);
      }

      // Execute target events
      for (const target of rule.targetEvents) {
        if (!this.evaluateConditions(target.conditions, context)) {
          continue;
        }

        try {
          if (target.delay) {
            setTimeout(() => {
              this.emitTargetEvent(target, transformedData, context);
            }, target.delay);
          } else {
            this.emitTargetEvent(target, transformedData, context);
          }
        } catch (error) {
          if (target.required) {
            throw error;
          }
          console.warn(`Optional target event failed: ${target.event} -> ${target.service}`, error);
        }
      }

      metrics.successCount++;
      const latency = Date.now() - startTime;
      metrics.averageLatency = (metrics.averageLatency * (metrics.successCount - 1) + latency) / metrics.successCount;

    } catch (error) {
      metrics.failureCount++;
      this.recordError(rule.id, error as Error, context);
      throw error;
    }
  }

  /**
   * Private: Emit target event
   */
  private emitTargetEvent(target: TargetEvent, data: any, context: RoutingContext): void {
    // Add routing metadata
    const enrichedData = {
      ...data,
      _routing: {
        correlationId: context.correlationId,
        sourceEvent: context.sourceEvent,
        sourceService: context.sourceService,
        targetService: target.service,
        timestamp: new Date()
      }
    };

    // Emit to event bus
    this.eventBus.emit(target.event as any, enrichedData);

    // Polling-based message delivery per spec 005 (WebSocket removed)
    // Messages are now delivered via HTTP polling endpoints instead of WebSocket
    console.log(`🎯 Routed: ${context.sourceEvent} → ${target.event} (${target.service})`);
  }

  /**
   * Private: Evaluate routing conditions
   */
  private evaluateConditions(conditions: RoutingCondition[] | undefined, context: RoutingContext): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const value = this.extractValue(condition.field, condition.type, context);
      return this.evaluateCondition(condition.operator, value, condition.value);
    });
  }

  /**
   * Private: Extract value for condition evaluation
   */
  private extractValue(field: string, type: string, context: RoutingContext): any {
    switch (type) {
      case 'data':
        return this.getNestedValue(context.eventData, field);
      case 'metadata':
        return this.getNestedValue(context.metadata, field);
      case 'service':
        return context.sourceService;
      case 'timestamp':
        return context.timestamp;
      default:
        return undefined;
    }
  }

  /**
   * Private: Get nested object value
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Private: Evaluate single condition
   */
  private evaluateCondition(operator: ConditionOperator, actual: any, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'exists':
        return actual !== undefined && actual !== null;
      case 'not_exists':
        return actual === undefined || actual === null;
      default:
        return false;
    }
  }

  /**
   * Private: Transform event data
   */
  private transformData(transform: EventTransform, data: any): any {
    switch (transform.type) {
      case 'map':
        return this.mapData(data, transform.mapping || {});
      case 'filter':
        return this.filterData(data, transform.filter || []);
      case 'aggregate':
        return this.aggregateData(data, transform.aggregation!);
      case 'split':
        return this.splitData(data, transform.splitField!);
      default:
        return data;
    }
  }

  /**
   * Private: Map data fields
   */
  private mapData(data: any, mapping: Record<string, string>): any {
    const result: any = { ...data };

    Object.entries(mapping).forEach(([sourcePath, targetPath]) => {
      const value = this.getNestedValue(data, sourcePath);
      if (value !== undefined) {
        this.setNestedValue(result, targetPath, value);
      }
    });

    return result;
  }

  /**
   * Private: Filter data
   */
  private filterData(data: any, filters: RoutingCondition[]): any {
    // For objects, filter properties; for arrays, filter elements
    if (Array.isArray(data)) {
      return data.filter(item =>
        filters.every(filter =>
          this.evaluateCondition(filter.operator, this.getNestedValue(item, filter.field), filter.value)
        )
      );
    }
    return data; // For non-arrays, return as-is
  }

  /**
   * Private: Aggregate data
   */
  private aggregateData(data: any, config: AggregationConfig): any {
    // Simplified aggregation - in real implementation would be more sophisticated
    return {
      groupBy: config.groupBy,
      aggregatedFields: config.aggregateFields,
      originalData: data
    };
  }

  /**
   * Private: Split data
   */
  private splitData(data: any, field: string): any[] {
    const value = this.getNestedValue(data, field);
    if (Array.isArray(value)) {
      return value.map(item => ({ ...data, [field]: item }));
    }
    return [data];
  }

  /**
   * Private: Set nested object value
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Private: Initialize metrics for rule
   */
  private initializeMetrics(ruleId: string): void {
    this.metrics.set(ruleId, {
      ruleId,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageLatency: 0,
      errors: []
    });
  }

  /**
   * Private: Record routing error
   */
  private recordError(ruleId: string, error: Error, context: RoutingContext): void {
    const metrics = this.metrics.get(ruleId);
    if (metrics) {
      metrics.errors.push({
        timestamp: new Date(),
        error: error.message,
        eventData: context.eventData
      });

      // Keep only last 10 errors
      if (metrics.errors.length > 10) {
        metrics.errors = metrics.errors.slice(-10);
      }
    }
  }

  /**
   * Private: Extract service name from event
   */
  private extractServiceFromEvent(event: string): string {
    if (event.startsWith('investigation:')) return 'investigation';
    if (event.startsWith('agent:')) return 'agent-analytics';
    if (event.startsWith('rag:')) return 'rag-intelligence';
    if (event.startsWith('viz:')) return 'visualization';
    if (event.startsWith('report:')) return 'reporting';
    if (event.startsWith('ui:')) return 'core-ui';
    if (event.startsWith('design:')) return 'design-system';
    if (event.startsWith('service:')) return 'system';
    return 'unknown';
  }

  /**
   * Private: Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create and initialize event router
 */
export function createEventRouter(): EventRouter {
  return EventRouter.getInstance();
}

/**
 * Utility functions for routing rules
 */
export const RoutingUtils = {
  /**
   * Create simple routing rule
   */
  createSimpleRule(
    id: string,
    name: string,
    sourceEvent: string,
    sourceService: string,
    targetEvent: string,
    targetService: string
  ): RoutingRule {
    return {
      id,
      name,
      description: `Route ${sourceEvent} to ${targetEvent}`,
      sourceEvent,
      sourceService,
      targetEvents: [{
        event: targetEvent,
        service: targetService,
        required: true
      }],
      priority: 'medium',
      enabled: true
    };
  },

  /**
   * Create conditional routing rule
   */
  createConditionalRule(
    id: string,
    name: string,
    sourceEvent: string,
    sourceService: string,
    targetEvent: string,
    targetService: string,
    conditions: RoutingCondition[]
  ): RoutingRule {
    return {
      id,
      name,
      description: `Conditionally route ${sourceEvent} to ${targetEvent}`,
      sourceEvent,
      sourceService,
      targetEvents: [{
        event: targetEvent,
        service: targetService,
        required: true
      }],
      conditions,
      priority: 'medium',
      enabled: true
    };
  },

  /**
   * Validate routing rule
   */
  validateRule(rule: RoutingRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.id) errors.push('Rule ID is required');
    if (!rule.name) errors.push('Rule name is required');
    if (!rule.sourceEvent) errors.push('Source event is required');
    if (!rule.sourceService) errors.push('Source service is required');
    if (!rule.targetEvents || rule.targetEvents.length === 0) {
      errors.push('At least one target event is required');
    }

    rule.targetEvents?.forEach((target, index) => {
      if (!target.event) errors.push(`Target event ${index + 1}: event is required`);
      if (!target.service) errors.push(`Target event ${index + 1}: service is required`);
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

export default EventRouter;