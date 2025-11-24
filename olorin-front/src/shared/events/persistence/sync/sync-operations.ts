/**
 * Event Persistence Sync Operations
 * Orchestrates batch synchronization of pending events
 * Feature: Event persistence system
 */

import type { PersistedEvent, SyncResult, PersistenceConfig } from '../types/persistence-types';
import { sortEventsByPriority, isEventExpired } from '../utils/persistence-utils';
import { synchronizeBatch } from './sync-manager';

/**
 * Synchronize list of pending events
 * Processes events in batches based on configuration
 */
export async function synchronizePendingEvents(
  pendingEvents: PersistedEvent[],
  config: PersistenceConfig,
  deleteExpiredCallback: (eventId: string) => void
): Promise<SyncResult> {
  const result: SyncResult = { synchronized: 0, failed: 0, skipped: 0, errors: [] };

  if (pendingEvents.length === 0) return result;

  console.log(`🔄 Synchronizing ${pendingEvents.length} pending events`);

  const sortedEvents = sortEventsByPriority(pendingEvents);

  // Process in batches
  for (let i = 0; i < sortedEvents.length; i += config.batchSize) {
    const batch = sortedEvents.slice(i, i + config.batchSize);
    const batchResults = await synchronizeBatch(batch);

    result.synchronized += batchResults.synchronized;
    result.failed += batchResults.failed;
    result.skipped += batchResults.skipped;
    result.errors.push(...batchResults.errors);

    // Remove skipped (expired) events
    batch.forEach((event) => {
      if (isEventExpired(event)) {
        deleteExpiredCallback(event.id);
      }
    });
  }

  console.log(
    `✅ Synchronization complete: ${result.synchronized} succeeded, ${result.failed} failed`
  );

  return result;
}
