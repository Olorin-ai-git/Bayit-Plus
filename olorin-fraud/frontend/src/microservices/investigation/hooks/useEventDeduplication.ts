/**
 * Event Deduplication Hook
 * Task: T041 - Phase 5 User Story 1
 * Feature: 001-investigation-state-management
 *
 * Deduplicates events by ID while maintaining chronological order.
 * Ensures UI displays unique events without duplicates from polling.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Configuration-driven behavior
 * - Proper TypeScript types
 * - No mocks/stubs
 *
 * Reference: /specs/001-investigation-state-management/quickstart.md
 */

import { useMemo } from 'react';

/**
 * Event interface - minimal required fields
 */
export interface DeduplicatableEvent {
  id: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Deduplicates events by ID while preserving chronological order
 *
 * @param events - Array of events to deduplicate
 * @returns Deduplicated events array
 */
export function useEventDeduplication<T extends DeduplicatableEvent>(
  events: T[]
): T[] {
  return useMemo(() => {
    if (!events || events.length === 0) {
      return [];
    }

    // Use Map to deduplicate by ID (keeps last occurrence)
    const eventMap = new Map<string, T>();

    events.forEach(event => {
      if (event.id) {
        eventMap.set(event.id, event);
      }
    });

    // Convert back to array maintaining order
    const deduplicated = Array.from(eventMap.values());

    // Sort by timestamp if available to ensure chronological order
    if (deduplicated.length > 0 && deduplicated[0].timestamp) {
      deduplicated.sort((a, b) => {
        const timeA = new Date(a.timestamp!).getTime();
        const timeB = new Date(b.timestamp!).getTime();
        return timeA - timeB;
      });
    }

    return deduplicated;
  }, [events]);
}

/**
 * Deduplicates events and tracks new additions
 *
 * @param events - Array of events to deduplicate
 * @param previousEventIds - Set of previously seen event IDs
 * @returns Object with deduplicated events and new event IDs
 */
export function useEventDeduplicationWithTracking<T extends DeduplicatableEvent>(
  events: T[],
  previousEventIds: Set<string>
): {
  deduplicatedEvents: T[];
  newEvents: T[];
  allEventIds: Set<string>;
} {
  return useMemo(() => {
    if (!events || events.length === 0) {
      return {
        deduplicatedEvents: [],
        newEvents: [],
        allEventIds: new Set<string>()
      };
    }

    const eventMap = new Map<string, T>();
    const newEvents: T[] = [];
    const allEventIds = new Set<string>();

    events.forEach(event => {
      if (event.id) {
        eventMap.set(event.id, event);
        allEventIds.add(event.id);

        // Track new events
        if (!previousEventIds.has(event.id)) {
          newEvents.push(event);
        }
      }
    });

    const deduplicatedEvents = Array.from(eventMap.values());

    // Sort by timestamp
    if (deduplicatedEvents.length > 0 && deduplicatedEvents[0].timestamp) {
      deduplicatedEvents.sort((a, b) => {
        const timeA = new Date(a.timestamp!).getTime();
        const timeB = new Date(b.timestamp!).getTime();
        return timeA - timeB;
      });

      newEvents.sort((a, b) => {
        const timeA = new Date(a.timestamp!).getTime();
        const timeB = new Date(b.timestamp!).getTime();
        return timeA - timeB;
      });
    }

    return {
      deduplicatedEvents,
      newEvents,
      allEventIds
    };
  }, [events, previousEventIds]);
}
