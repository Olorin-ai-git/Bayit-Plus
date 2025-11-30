/**
 * Event Bus Subscription Hook
 *
 * React hook for subscribing to event bus events with automatic cleanup.
 * Type-safe event handling with support for multiple subscriptions.
 *
 * NO HARDCODED VALUES - Type-safe and configuration-driven.
 */

import { useEffect, useRef, useCallback } from 'react';
import { EventHandler } from '../../../shared/events/EventBus';
import { visualizationEventBusService } from '../services/eventBusService';
import {
  EVENT_NAMES,
  InvestigationRiskUpdatedEvent,
  InvestigationEntityDiscoveredEvent,
  InvestigationLocationDetectedEvent,
  InvestigationProgressUpdatedEvent,
  InvestigationLogEntryEvent,
  AgentHeartbeatEvent
} from '../types/events.types';

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions<T> {
  eventName: string;
  handler: EventHandler<T>;
  enabled?: boolean;
}

/**
 * Generic event bus subscription hook
 *
 * @param eventName - Name of the event to subscribe to
 * @param handler - Event handler function
 * @param enabled - Whether subscription is active (default: true)
 */
export function useEventBus<T>(
  eventName: string,
  handler: EventHandler<T>,
  enabled: boolean = true
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const stableHandler = (data: T) => handlerRef.current(data);
    let unsubscribe: (() => void) | undefined;

    switch (eventName) {
      case EVENT_NAMES.INVESTIGATION_RISK_UPDATED:
        unsubscribe = visualizationEventBusService.onInvestigationRiskUpdated(
          stableHandler as EventHandler<InvestigationRiskUpdatedEvent>
        );
        break;
      case EVENT_NAMES.INVESTIGATION_ENTITY_DISCOVERED:
        unsubscribe = visualizationEventBusService.onInvestigationEntityDiscovered(
          stableHandler as EventHandler<InvestigationEntityDiscoveredEvent>
        );
        break;
      case EVENT_NAMES.INVESTIGATION_LOCATION_DETECTED:
        unsubscribe = visualizationEventBusService.onInvestigationLocationDetected(
          stableHandler as EventHandler<InvestigationLocationDetectedEvent>
        );
        break;
      case EVENT_NAMES.INVESTIGATION_PROGRESS_UPDATED:
        unsubscribe = visualizationEventBusService.onInvestigationProgressUpdated(
          stableHandler as EventHandler<InvestigationProgressUpdatedEvent>
        );
        break;
      case EVENT_NAMES.INVESTIGATION_LOG_ENTRY:
        unsubscribe = visualizationEventBusService.onInvestigationLogEntry(
          stableHandler as EventHandler<InvestigationLogEntryEvent>
        );
        break;
      case EVENT_NAMES.AGENT_HEARTBEAT:
        unsubscribe = visualizationEventBusService.onAgentHeartbeat(
          stableHandler as EventHandler<AgentHeartbeatEvent>
        );
        break;
      default:
        console.warn(`[useEventBus] Unknown event name: ${eventName}`);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [eventName, enabled]);
}

/**
 * Hook for subscribing to risk updates
 */
export function useRiskUpdates(
  handler: EventHandler<InvestigationRiskUpdatedEvent>,
  enabled: boolean = true
): void {
  useEventBus(EVENT_NAMES.INVESTIGATION_RISK_UPDATED, handler, enabled);
}

/**
 * Hook for subscribing to entity discoveries
 */
export function useEntityDiscoveries(
  handler: EventHandler<InvestigationEntityDiscoveredEvent>,
  enabled: boolean = true
): void {
  useEventBus(EVENT_NAMES.INVESTIGATION_ENTITY_DISCOVERED, handler, enabled);
}

/**
 * Hook for subscribing to location detections
 */
export function useLocationDetections(
  handler: EventHandler<InvestigationLocationDetectedEvent>,
  enabled: boolean = true
): void {
  useEventBus(EVENT_NAMES.INVESTIGATION_LOCATION_DETECTED, handler, enabled);
}

/**
 * Hook for subscribing to progress updates
 */
export function useProgressUpdates(
  handler: EventHandler<InvestigationProgressUpdatedEvent>,
  enabled: boolean = true
): void {
  useEventBus(EVENT_NAMES.INVESTIGATION_PROGRESS_UPDATED, handler, enabled);
}

/**
 * Hook for subscribing to log entries
 */
export function useLogEntries(
  handler: EventHandler<InvestigationLogEntryEvent>,
  enabled: boolean = true
): void {
  useEventBus(EVENT_NAMES.INVESTIGATION_LOG_ENTRY, handler, enabled);
}

/**
 * Hook for subscribing to multiple events
 */
export function useMultipleEventBus<T extends Record<string, EventHandler>>(
  subscriptions: EventSubscriptionOptions<unknown>[],
  enabled: boolean = true
): void {
  const subscriptionsRef = useRef(subscriptions);

  useEffect(() => {
    subscriptionsRef.current = subscriptions;
  }, [subscriptions]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribers = subscriptionsRef.current.map((subscription) => {
      const { eventName, handler, enabled: subEnabled = true } = subscription;

      if (!subEnabled) return undefined;

      switch (eventName) {
        case EVENT_NAMES.INVESTIGATION_RISK_UPDATED:
          return visualizationEventBusService.onInvestigationRiskUpdated(
            handler as EventHandler<InvestigationRiskUpdatedEvent>
          );
        case EVENT_NAMES.INVESTIGATION_ENTITY_DISCOVERED:
          return visualizationEventBusService.onInvestigationEntityDiscovered(
            handler as EventHandler<InvestigationEntityDiscoveredEvent>
          );
        case EVENT_NAMES.INVESTIGATION_LOCATION_DETECTED:
          return visualizationEventBusService.onInvestigationLocationDetected(
            handler as EventHandler<InvestigationLocationDetectedEvent>
          );
        default:
          console.warn(`[useMultipleEventBus] Unknown event: ${eventName}`);
          return undefined;
      }
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub?.());
    };
  }, [enabled]);
}

export default useEventBus;
