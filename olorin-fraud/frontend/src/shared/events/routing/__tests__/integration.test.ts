/**
 * Integration Tests for Event Routing System
 * Validates all modules work together correctly
 */

import { EventRouter } from '../index';
import type { RoutingRule, RoutingContext } from '../index';

describe('Event Routing System Integration', () => {
  let router: EventRouter;

  beforeEach(() => {
    router = EventRouter.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = EventRouter.getInstance();
      const instance2 = EventRouter.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Rule Management', () => {
    const testRule: RoutingRule = {
      id: 'test-rule-1',
      name: 'Test Rule',
      description: 'Test routing rule',
      sourceEvent: 'test:event',
      sourceService: 'test',
      targetEvents: [{
        event: 'test:target',
        service: 'test-target',
        required: true
      }],
      priority: 'medium',
      enabled: true
    };

    it('should add routing rule successfully', () => {
      router.addRule(testRule);
      const retrieved = router.getRule(testRule.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(testRule.id);
    });

    it('should get all routing rules', () => {
      const allRules = router.getAllRules();
      expect(Array.isArray(allRules)).toBe(true);
      expect(allRules.length).toBeGreaterThan(0);
    });

    it('should enable and disable routing rule', () => {
      router.addRule(testRule);
      const result1 = router.setRuleEnabled(testRule.id, false);
      expect(result1).toBe(true);

      const rule = router.getRule(testRule.id);
      expect(rule?.enabled).toBe(false);

      const result2 = router.setRuleEnabled(testRule.id, true);
      expect(result2).toBe(true);
    });

    it('should remove routing rule successfully', () => {
      router.addRule(testRule);
      const removed = router.removeRule(testRule.id);
      expect(removed).toBe(true);

      const retrieved = router.getRule(testRule.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Metrics Tracking', () => {
    it('should get metrics for all rules', () => {
      const metrics = router.getMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should clear metrics successfully', () => {
      router.clearMetrics();
      const metrics = router.getMetrics() as any[];
      metrics.forEach(metric => {
        expect(metric.executionCount).toBe(0);
        expect(metric.successCount).toBe(0);
        expect(metric.failureCount).toBe(0);
      });
    });
  });

  describe('Event Routing', () => {
    it('should route event through context', async () => {
      const context: RoutingContext = {
        sourceEvent: 'test:event',
        sourceService: 'test',
        eventData: { test: 'data' },
        metadata: {},
        timestamp: new Date(),
        correlationId: 'test-corr-123'
      };

      await expect(router.routeEvent(context)).resolves.not.toThrow();
    });
  });
});
