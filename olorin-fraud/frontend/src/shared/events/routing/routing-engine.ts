/**
 * Routing Engine Module for Event Routing
 * Core routing execution engine for rule matching, condition evaluation, and event emission
 */
import type { EventBusManager } from '../eventBus';
import type { RoutingRule, TargetEvent, RoutingContext, RoutingCondition, RoutingMetrics } from './types';
import { DataTransform } from './data-transform';

const ALL_EVENT_TYPES = [
  'investigation:started', 'investigation:completed', 'investigation:risk:calculated',
  'investigation:progress:updated', 'investigation:tool:executed', 'agent:execution:started',
  'agent:execution:completed', 'agent:performance:updated', 'agent:anomaly:detected',
  'rag:query:executed', 'rag:knowledge:updated', 'rag:insight:generated', 'viz:graph:updated',
  'viz:map:location:added', 'viz:chart:data:updated', 'report:generated', 'report:export:started',
  'report:export:completed', 'ui:navigation:changed', 'ui:notification:show', 'ui:theme:changed',
  'design:tokens:updated', 'design:component:generated', 'design:figma:synced',
  'service:health:check', 'service:error'
];

/** RoutingEngine handles core routing logic and rule execution */
export class RoutingEngine {
  constructor(
    private eventBus: EventBusManager,
    private dataTransform: DataTransform,
    private metrics: Map<string, RoutingMetrics>
  ) {}

  /** Find applicable rules for given context */
  public findApplicableRules(context: RoutingContext, rules: Map<string, RoutingRule>): RoutingRule[] {
    return Array.from(rules.values()).filter(rule => {
      if (!rule.enabled) return false;
      if (rule.sourceEvent !== context.sourceEvent) return false;
      if (rule.sourceService !== '*' && rule.sourceService !== context.sourceService) return false;
      return this.evaluateConditions(rule.conditions, context);
    });
  }

  /** Execute routing rule with data transformation and metrics tracking */
  public async executeRule(rule: RoutingRule, context: RoutingContext): Promise<void> {
    const startTime = Date.now();
    const metrics = this.metrics.get(rule.id)!;

    try {
      metrics.executionCount++;
      metrics.lastExecuted = new Date();

      let transformedData = context.eventData;
      if (rule.transform) {
        transformedData = this.dataTransform.transform(rule.transform, context.eventData);
      }

      for (const target of rule.targetEvents) {
        if (!this.evaluateConditions(target.conditions, context)) continue;

        try {
          if (target.delay) {
            setTimeout(() => this.emitTargetEvent(target, transformedData, context), target.delay);
          } else {
            this.emitTargetEvent(target, transformedData, context);
          }
        } catch (error) {
          if (target.required) throw error;
          console.warn(`Optional target event failed: ${target.event} -> ${target.service}`, error);
        }
      }

      metrics.successCount++;
      const latency = Date.now() - startTime;
      metrics.averageLatency =
        (metrics.averageLatency * (metrics.successCount - 1) + latency) / metrics.successCount;

    } catch (error) {
      metrics.failureCount++;
      this.recordError(rule.id, error as Error, context);
      throw error;
    }
  }

  /** Emit target event with routing metadata enrichment */
  public emitTargetEvent(target: TargetEvent, data: any, context: RoutingContext): void {
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

    this.eventBus.emit(target.event as any, enrichedData);
    console.log(`🎯 Routed: ${context.sourceEvent} → ${target.event} (${target.service})`);
  }

  /** Evaluate all routing conditions for context */
  public evaluateConditions(
    conditions: RoutingCondition[] | undefined,
    context: RoutingContext
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const value = this.extractValue(condition.field, condition.type, context);
      return this.dataTransform.evaluateCondition(condition.operator, value, condition.value);
    });
  }

  /** Extract value from routing context based on condition type */
  private extractValue(field: string, type: string, context: RoutingContext): any {
    switch (type) {
      case 'data': return this.dataTransform.getNestedValue(context.eventData, field);
      case 'metadata': return this.dataTransform.getNestedValue(context.metadata, field);
      case 'service': return context.sourceService;
      case 'timestamp': return context.timestamp;
      default: return undefined;
    }
  }

  /** Setup event listeners for all microservice events */
  public setupEventListeners(routeEventCallback: (context: RoutingContext) => void): void {
    ALL_EVENT_TYPES.forEach(eventType => {
      this.eventBus.subscribe(eventType, (data) => {
        routeEventCallback(this.createContext(eventType, this.extractServiceFromEvent(eventType), data));
      }, 'event-router');
    });
  }

  /** Setup listener for specific routing rule */
  public setupRuleListener(
    rule: RoutingRule,
    executeCallback: (rule: RoutingRule, context: RoutingContext) => void
  ): () => void {
    return this.eventBus.subscribe(rule.sourceEvent as any, (data) => {
      if (!rule.enabled) return;
      executeCallback(rule, this.createContext(
        rule.sourceEvent,
        rule.sourceService,
        data,
        rule.metadata || {}
      ));
    }, `rule-${rule.id}`);
  }

  /** Create routing context from event data */
  private createContext(
    sourceEvent: string,
    sourceService: string,
    eventData: any,
    metadata: Record<string, any> = {}
  ): RoutingContext {
    return {
      sourceEvent,
      sourceService,
      eventData,
      metadata,
      timestamp: new Date(),
      correlationId: this.generateCorrelationId()
    };
  }

  /** Extract service name from event type using prefix matching */
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

  /** Generate unique correlation ID for event tracing */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /** Record routing error in metrics (maintains last 10 errors per rule) */
  private recordError(ruleId: string, error: Error, context: RoutingContext): void {
    const metrics = this.metrics.get(ruleId);
    if (metrics) {
      metrics.errors.push({
        timestamp: new Date(),
        error: error.message,
        eventData: context.eventData
      });
      if (metrics.errors.length > 10) {
        metrics.errors = metrics.errors.slice(-10);
      }
    }
  }
}
