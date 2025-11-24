/**
 * Event Persistence Storage Manager
 * Handles localStorage operations for persisted events
 * Feature: Event persistence system
 */

import { storage } from '../../../utils';
import type { PersistedEvent, PersistenceConfig } from '../types/persistence-types';

/**
 * Load persisted events from localStorage
 */
export function loadPersistedEvents(storageKey: string): PersistedEvent[] {
  try {
    const stored = storage.get<PersistedEvent[]>(storageKey, []);

    // Convert timestamp strings back to Date objects
    stored.forEach((event) => {
      event.timestamp = new Date(event.timestamp);
      if (event.expiry) {
        event.expiry = new Date(event.expiry);
      }
    });

    console.log(`📂 Loaded ${stored.length} persisted events`);
    return stored;
  } catch (error) {
    console.error('Failed to load persisted events:', error);
    return [];
  }
}

/**
 * Save events to localStorage
 */
export function saveEventsToStorage(
  storageKey: string,
  events: PersistedEvent[],
  maxEvents: number
): void {
  try {
    let eventsToSave = events;

    // Clean up storage if it exceeds max events
    if (events.length > maxEvents) {
      const sorted = events.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
      eventsToSave = sorted.slice(events.length - maxEvents);

      console.log(
        `🧹 Trimmed events from ${events.length} to ${eventsToSave.length} (max: ${maxEvents})`
      );
    }

    storage.set(storageKey, eventsToSave);
  } catch (error) {
    console.error('Failed to save persisted events:', error);
  }
}

/**
 * Clear all events from storage
 */
export function clearStorage(storageKey: string): void {
  try {
    storage.remove(storageKey);
    console.log(`🗑️ Cleared all events from storage`);
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}

/**
 * Get storage size for key
 */
export function getStorageSize(storageKey: string): number {
  try {
    const data = localStorage.getItem(storageKey);
    if (!data) return 0;
    return new Blob([data]).size;
  } catch {
    return 0;
  }
}

/**
 * Check if storage quota is exceeded
 */
export function isStorageQuotaExceeded(
  currentSize: number,
  maxSize: number
): boolean {
  return currentSize >= maxSize;
}

/**
 * Storage Manager utilities collection
 */
export const StorageManager = {
  loadPersistedEvents,
  saveEventsToStorage,
  clearStorage,
  getStorageSize,
  isStorageQuotaExceeded,
};
