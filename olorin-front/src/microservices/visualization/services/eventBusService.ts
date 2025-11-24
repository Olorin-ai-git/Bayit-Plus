/**
 * Event Bus Service Integration for Visualization Microservice
 *
 * Type-safe wrapper around EventBus singleton for visualization-specific events.
 * Provides helper functions for publishing and subscribing to visualization events.
 */

import { eventBus, EventHandler } from '../../../shared/events/EventBus';
import {
  EVENT_NAMES,
  InvestigationRiskUpdatedEvent,
  InvestigationRiskUpdatedEventSchema,
  InvestigationEntityDiscoveredEvent,
  InvestigationEntityDiscoveredEventSchema,
  InvestigationLocationDetectedEvent,
  InvestigationLocationDetectedEventSchema,
  InvestigationProgressUpdatedEvent,
  InvestigationProgressUpdatedEventSchema,
  InvestigationLogEntryEvent,
  InvestigationLogEntryEventSchema,
  VizNodeSelectedEvent,
  VizNodeSelectedEventSchema,
  VizLocationClickedEvent,
  VizLocationClickedEventSchema,
  VizTimelineFilteredEvent,
  VizTimelineFilteredEventSchema
} from '../types/events.types';

/**
 * Visualization Event Bus Service
 * Centralized event management for visualization microservice
 */
export class VisualizationEventBusService {
  private static instance: VisualizationEventBusService;

  private constructor() {}

  public static getInstance(): VisualizationEventBusService {
    if (!VisualizationEventBusService.instance) {
      VisualizationEventBusService.instance = new VisualizationEventBusService();
    }
    return VisualizationEventBusService.instance;
  }

  // Subscribe to consumed events (from other microservices)

  public onInvestigationRiskUpdated(
    handler: EventHandler<InvestigationRiskUpdatedEvent>
  ): () => void {
    const validatingHandler = this.createValidatingHandler(
      InvestigationRiskUpdatedEventSchema,
      handler
    );
    return eventBus.on(EVENT_NAMES.INVESTIGATION_RISK_UPDATED, validatingHandler).unsubscribe;
  }

  public onInvestigationEntityDiscovered(
    handler: EventHandler<InvestigationEntityDiscoveredEvent>
  ): () => void {
    const validatingHandler = this.createValidatingHandler(
      InvestigationEntityDiscoveredEventSchema,
      handler
    );
    return eventBus.on(EVENT_NAMES.INVESTIGATION_ENTITY_DISCOVERED, validatingHandler).unsubscribe;
  }

  public onInvestigationLocationDetected(
    handler: EventHandler<InvestigationLocationDetectedEvent>
  ): () => void {
    const validatingHandler = this.createValidatingHandler(
      InvestigationLocationDetectedEventSchema,
      handler
    );
    return eventBus.on(EVENT_NAMES.INVESTIGATION_LOCATION_DETECTED, validatingHandler).unsubscribe;
  }

  public onInvestigationProgressUpdated(
    handler: EventHandler<InvestigationProgressUpdatedEvent>
  ): () => void {
    const validatingHandler = this.createValidatingHandler(
      InvestigationProgressUpdatedEventSchema,
      handler
    );
    return eventBus.on(EVENT_NAMES.INVESTIGATION_PROGRESS_UPDATED, validatingHandler).unsubscribe;
  }

  public onInvestigationLogEntry(
    handler: EventHandler<InvestigationLogEntryEvent>
  ): () => void {
    const validatingHandler = this.createValidatingHandler(
      InvestigationLogEntryEventSchema,
      handler
    );
    return eventBus.on(EVENT_NAMES.INVESTIGATION_LOG_ENTRY, validatingHandler).unsubscribe;
  }

  // Publish visualization events (to other microservices)

  public publishNodeSelected(event: VizNodeSelectedEvent): void {
    const validated = VizNodeSelectedEventSchema.parse(event);
    eventBus.emit(EVENT_NAMES.VIZ_NODE_SELECTED, validated);
  }

  public publishLocationClicked(event: VizLocationClickedEvent): void {
    const validated = VizLocationClickedEventSchema.parse(event);
    eventBus.emit(EVENT_NAMES.VIZ_LOCATION_CLICKED, validated);
  }

  public publishTimelineFiltered(event: VizTimelineFilteredEvent): void {
    const validated = VizTimelineFilteredEventSchema.parse(event);
    eventBus.emit(EVENT_NAMES.VIZ_TIMELINE_FILTERED, validated);
  }

  // Helper: Create event with current timestamp
  public createEvent<T>(eventName: string, data: T): { event: string; timestamp: string; data: T } {
    return {
      event: eventName,
      timestamp: new Date().toISOString(),
      data
    };
  }

  // Helper: Create validating handler
  private createValidatingHandler<T>(
    schema: { parse: (data: unknown) => T },
    handler: EventHandler<T>
  ): EventHandler {
    return (data: unknown) => {
      try {
        const validated = schema.parse(data);
        return handler(validated);
      } catch (error) {
        console.error('[VisualizationEventBusService] Validation error:', error);
        throw error;
      }
    };
  }

  // Utility: Unsubscribe all handlers
  public cleanup(): void {
    eventBus.removeAllListeners();
  }
}

// Singleton instance export
export const visualizationEventBusService = VisualizationEventBusService.getInstance();

// Convenience functions for common operations

export const subscribeToRiskUpdates = (
  handler: EventHandler<InvestigationRiskUpdatedEvent>
): (() => void) => {
  return visualizationEventBusService.onInvestigationRiskUpdated(handler);
};

export const subscribeToEntityDiscoveries = (
  handler: EventHandler<InvestigationEntityDiscoveredEvent>
): (() => void) => {
  return visualizationEventBusService.onInvestigationEntityDiscovered(handler);
};

export const subscribeToLocationDetections = (
  handler: EventHandler<InvestigationLocationDetectedEvent>
): (() => void) => {
  return visualizationEventBusService.onInvestigationLocationDetected(handler);
};

export const publishNodeSelection = (
  investigationId: string,
  nodeId: string,
  nodeType: 'account' | 'device' | 'location' | 'transaction' | 'person',
  metadata?: Record<string, unknown>
): void => {
  const event = visualizationEventBusService.createEvent(EVENT_NAMES.VIZ_NODE_SELECTED, {
    investigationId,
    nodeId,
    nodeType,
    metadata
  }) as VizNodeSelectedEvent;

  visualizationEventBusService.publishNodeSelected(event);
};

export const publishLocationClick = (
  investigationId: string,
  locationId: string,
  locationType: 'customer' | 'business' | 'device' | 'transaction' | 'risk',
  coordinates: { latitude: number; longitude: number }
): void => {
  const event = visualizationEventBusService.createEvent(EVENT_NAMES.VIZ_LOCATION_CLICKED, {
    investigationId,
    locationId,
    locationType,
    coordinates
  }) as VizLocationClickedEvent;

  visualizationEventBusService.publishLocationClicked(event);
};

export default visualizationEventBusService;
