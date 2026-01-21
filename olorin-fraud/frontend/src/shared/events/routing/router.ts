/**
 * Event Router for Microservice Communication
 * Main router class that orchestrates event routing using modular components
 */

import type { EventBusManager } from '../eventBus';
import type { RoutingRule, RoutingMetrics, RoutingContext } from './types';
import { RoutingEngine } from './routing-engine';
import { DataTransform } from './data-transform';
import { createDefaultRules } from './default-rules';

/**
 * EventRouter manages event routing rules and execution
 * Singleton pattern ensures single routing instance across application
 */
export class EventRouter {
  private static instance: EventRouter;
  private eventBus: EventBusManager;
  private routingEngine: RoutingEngine;
  private dataTransform: DataTransform;
  private rules: Map<string, RoutingRule> = new Map();
  private metrics: Map<string, RoutingMetrics> = new Map();
  private subscriptions: Map<string, () => void> = new Map();

  private constructor() {
    const EventBusManagerModule = require('../eventBus');
    this.eventBus = EventBusManagerModule.EventBusManager.getInstance();
    this.dataTransform = new DataTransform();
    this.routingEngine = new RoutingEngine(this.eventBus, this.dataTransform, this.metrics);
    this.initializeDefaultRules();
    this.setupEventListeners();
  }

  /** Get singleton EventRouter instance */
  public static getInstance(): EventRouter {
    if (!EventRouter.instance) {
      EventRouter.instance = new EventRouter();
    }
    return EventRouter.instance;
  }

  /** Add routing rule with metrics initialization and listener setup */
  public addRule(rule: RoutingRule): void {
    this.rules.set(rule.id, rule);
    this.initializeMetrics(rule.id);
    this.setupRuleListener(rule);
    console.log(`📋 Routing rule added: ${rule.name} (${rule.sourceEvent})`);
  }

  /** Remove routing rule and cleanup metrics and subscriptions */
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

  /** Get specific routing rule by ID */
  public getRule(ruleId: string): RoutingRule | undefined {
    return this.rules.get(ruleId);
  }

  /** Get all routing rules */
  public getAllRules(): RoutingRule[] {
    return Array.from(this.rules.values());
  }

  /** Enable or disable routing rule */
  public setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} Routing rule ${enabled ? 'enabled' : 'disabled'}: ${rule.name}`);
    return true;
  }

  /** Get routing metrics for specific rule or all rules */
  public getMetrics(ruleId?: string): RoutingMetrics | RoutingMetrics[] | undefined {
    if (ruleId) {
      return this.metrics.get(ruleId);
    }
    return Array.from(this.metrics.values());
  }

  /** Clear metrics for specific rule or all rules */
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

  /** Route event manually through routing rules */
  public async routeEvent(context: RoutingContext): Promise<void> {
    const applicableRules = this.routingEngine.findApplicableRules(context, this.rules);

    for (const rule of applicableRules) {
      if (!rule.enabled) continue;

      try {
        await this.routingEngine.executeRule(rule, context);
      } catch (error) {
        console.error(`Failed to execute routing rule ${rule.id}:`, error);
      }
    }
  }

  /** Initialize default routing rules from configuration */
  private initializeDefaultRules(): void {
    const defaultRules = createDefaultRules();
    defaultRules.forEach(rule => this.addRule(rule));
    console.log(`🎯 Initialized ${defaultRules.length} default routing rules`);
  }

  /** Setup global event listeners for all microservice events */
  private setupEventListeners(): void {
    this.routingEngine.setupEventListeners((context) => {
      this.routeEvent(context);
    });
  }

  /** Setup listener for specific routing rule */
  private setupRuleListener(rule: RoutingRule): void {
    const unsubscribe = this.routingEngine.setupRuleListener(
      rule,
      async (rule, context) => {
        if (!rule.enabled) return;
        try {
          await this.routingEngine.executeRule(rule, context);
        } catch (error) {
          console.error(`Failed to execute routing rule ${rule.id}:`, error);
        }
      }
    );
    this.subscriptions.set(rule.id, unsubscribe);
  }

  /** Initialize metrics tracking for routing rule */
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
}
