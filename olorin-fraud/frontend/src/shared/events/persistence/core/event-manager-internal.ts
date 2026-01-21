/**
 * Event Persistence Manager - Internal Helpers
 * Internal methods for network listeners, event interception, and auto-sync
 * Feature: Event persistence system
 */

import type { PersistedEvent, PersistenceConfig } from '../types/persistence-types';
import { EventBusManager } from '../../eventBus';
import { getCriticalEvents } from '../config/persistence-config';
import { extractServiceFromEvent } from '../utils/persistence-utils';

/**
 * Setup network status listeners
 * Handles online/offline events for automatic synchronization
 */
export function setupNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): void {
  window.addEventListener('online', () => {
    console.log('🌐 Back online - starting event synchronization');
    onOnline();
  });

  window.addEventListener('offline', () => {
    console.log('📴 Gone offline - events will be queued');
    onOffline();
  });
}

/**
 * Setup event bus interception for critical events
 * Automatically persists critical events when offline
 */
export function setupEventInterception(
  eventBus: EventBusManager,
  isOnline: boolean,
  persistCallback: (
    event: string,
    data: any,
    service: string,
    priority: 'high'
  ) => void
): void {
  const criticalEvents = getCriticalEvents();

  criticalEvents.forEach((event) => {
    eventBus.subscribe(
      event,
      (data) => {
        if (!isOnline) {
          persistCallback(event, data, extractServiceFromEvent(event), 'high');
        }
      },
      'event-persistence'
    );
  });
}

/**
 * Start automatic synchronization interval
 * Periodically syncs pending events and clears expired events
 */
export function startAutoSyncInterval(
  config: PersistenceConfig,
  syncCallback: () => Promise<void>,
  clearExpiredCallback: () => void,
  hasPendingEvents: () => boolean,
  isOnline: () => boolean
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    if (isOnline() && hasPendingEvents()) {
      syncCallback();
    }
    clearExpiredCallback();
  }, config.retryInterval);
}

/**
 * Stop automatic synchronization interval
 */
export function stopAutoSyncInterval(
  interval: ReturnType<typeof setInterval> | null
): void {
  if (interval) {
    clearInterval(interval);
  }
}
