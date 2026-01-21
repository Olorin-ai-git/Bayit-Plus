/**
 * Event Bus Integration for Analytics Microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { eventBus, EventHandler } from '../../../shared/events/EventBus';

export interface AnalyticsNavigateEvent {
  investigationId?: string;
  filters?: Record<string, any>;
}

export interface AnalyticsFilterChangedEvent {
  filters: Record<string, any>;
  source: 'analytics' | 'investigation' | 'visualization';
}

export class AnalyticsEventBusService {
  private static instance: AnalyticsEventBusService;

  private constructor() {}

  public static getInstance(): AnalyticsEventBusService {
    if (!AnalyticsEventBusService.instance) {
      AnalyticsEventBusService.instance = new AnalyticsEventBusService();
    }
    return AnalyticsEventBusService.instance;
  }

  public onNavigate(
    handler: EventHandler<AnalyticsNavigateEvent>
  ): { unsubscribe: () => void } {
    return eventBus.on('analytics:navigate', handler);
  }

  public onFilterChanged(
    handler: EventHandler<AnalyticsFilterChangedEvent>
  ): { unsubscribe: () => void } {
    return eventBus.on('analytics:filter-changed', handler);
  }

  public publishNavigate(event: AnalyticsNavigateEvent): void {
    eventBus.emit('analytics:navigate', event);
  }

  public publishFilterChanged(event: AnalyticsFilterChangedEvent): void {
    eventBus.emit('analytics:filter-changed', event);
  }

  public publishDeepLink(filters: Record<string, any>): void {
    eventBus.emit('analytics:deep-link', { filters, source: 'analytics' });
  }

  public cleanup(): void {
    eventBus.removeAllListeners();
  }
}

export const analyticsEventBus = AnalyticsEventBusService.getInstance();
export const analyticsEventBusService = AnalyticsEventBusService.getInstance();

