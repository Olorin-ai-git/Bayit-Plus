/**
 * Event Persistence Filter & Statistics
 * Filtering and statistics functions for persisted events
 * Feature: Event persistence system
 */

import type {
  PersistedEvent,
  EventFilter,
  StorageStats,
  EventPriority,
} from '../types/persistence-types';
import { getEventsStorageSize } from '../utils/persistence-utils';

/**
 * Filter events based on criteria
 */
export function filterEvents(
  events: PersistedEvent[],
  filter?: EventFilter
): PersistedEvent[] {
  if (!filter) {
    return events.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  const filtered = events.filter((event) => {
    if (filter.services && !filter.services.includes(event.service)) {
      return false;
    }
    if (filter.priorities && !filter.priorities.includes(event.priority)) {
      return false;
    }
    if (
      filter.synchronized !== undefined &&
      event.synchronized !== filter.synchronized
    ) {
      return false;
    }
    if (filter.dateRange) {
      const eventTime = event.timestamp.getTime();
      const start = filter.dateRange.start.getTime();
      const end = filter.dateRange.end.getTime();
      if (eventTime < start || eventTime > end) {
        return false;
      }
    }
    return true;
  });

  return filtered.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

/**
 * Calculate storage statistics for events
 */
export function calculateStats(events: PersistedEvent[]): StorageStats {
  const pendingEvents = events.filter((e) => !e.synchronized);
  const synchronizedEvents = events.filter((e) => e.synchronized);

  const priorityBreakdown: Record<EventPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const serviceBreakdown: Record<string, number> = {};

  events.forEach((event) => {
    priorityBreakdown[event.priority]++;
    serviceBreakdown[event.service] = (serviceBreakdown[event.service] || 0) + 1;
  });

  const timestamps = events.map((e) => e.timestamp);
  const oldestEvent =
    timestamps.length > 0
      ? new Date(Math.min(...timestamps.map((t) => t.getTime())))
      : undefined;
  const newestEvent =
    timestamps.length > 0
      ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
      : undefined;

  return {
    totalEvents: events.length,
    pendingEvents: pendingEvents.length,
    synchronizedEvents: synchronizedEvents.length,
    storageSize: getEventsStorageSize(events),
    oldestEvent,
    newestEvent,
    priorityBreakdown,
    serviceBreakdown,
  };
}
