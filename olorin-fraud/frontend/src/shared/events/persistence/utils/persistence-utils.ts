/**
 * Event Persistence Utility Functions
 * Utility functions for event persistence operations
 * Feature: Event persistence system
 */

import type { PersistedEvent, EventPriority, StorageUsage } from '../types/persistence-types';
import { getStorageSizeLimit } from '../config/persistence-config';

/**
 * Check if browser supports offline functionality
 */
export function supportsOffline(): boolean {
  return 'navigator' in window && 'onLine' in navigator && 'localStorage' in window;
}

/**
 * Get network status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Estimate storage usage
 */
export function getStorageUsage(): StorageUsage {
  try {
    const test = 'storage-test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);

    const used = JSON.stringify(localStorage).length;
    const available = getStorageSizeLimit() - used;

    return { used, available };
  } catch {
    return { used: 0, available: 0 };
  }
}

/**
 * Clear all Olorin persistence data
 */
export function clearAllPersistedData(): void {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('olorin-')) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Extract service name from event name
 */
export function extractServiceFromEvent(event: string): string {
  if (event.startsWith('investigation:')) return 'investigation';
  if (event.startsWith('agent:')) return 'agent-analytics';
  if (event.startsWith('rag:')) return 'rag-intelligence';
  if (event.startsWith('viz:')) return 'visualization';
  if (event.startsWith('report:')) return 'reporting';
  if (event.startsWith('ui:')) return 'core-ui';
  if (event.startsWith('design:')) return 'design-system';
  return 'unknown';
}

/**
 * Generate unique event ID
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sort events by priority and timestamp
 */
export function sortEventsByPriority(events: PersistedEvent[]): PersistedEvent[] {
  const priorityOrder: Record<EventPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return events.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.timestamp.getTime() - b.timestamp.getTime();
  });
}

/**
 * Get storage size for events
 */
export function getEventsStorageSize(events: PersistedEvent[]): number {
  try {
    const data = JSON.stringify(events);
    return new Blob([data]).size;
  } catch {
    return 0;
  }
}

/**
 * Check if event is expired
 */
export function isEventExpired(event: PersistedEvent): boolean {
  if (!event.expiry) return false;
  return event.expiry < new Date();
}

/**
 * Check if event should be retried
 */
export function canRetryEvent(event: PersistedEvent): boolean {
  return event.retryCount < event.maxRetries && !isEventExpired(event);
}

/**
 * Utility functions collection
 */
export const EventPersistenceUtils = {
  supportsOffline,
  isOnline,
  getStorageUsage,
  clearAllPersistedData,
  extractServiceFromEvent,
  generateEventId,
  deepClone,
  sortEventsByPriority,
  getEventsStorageSize,
  isEventExpired,
  canRetryEvent,
};
