/**
 * Progress Rehydration Hook
 * Feature: Phase 3 - User Story 1 (T019 Enhancement)
 *
 * Orchestrates snapshot fetching, cursor management, and event application.
 * Provides rehydration state and error handling for Progress Page.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Configuration-driven behavior
 * - Complete error handling
 * - Performance target: <700ms P95 full rehydration
 */

import { useState, useEffect } from 'react';
import { useInvestigationSnapshot } from './useInvestigationSnapshot';
import { useCursorStorage } from './useCursorStorage';
import { useEventFetch, InvestigationEvent } from './useEventFetch';

/**
 * Hook return type (NON-BLOCKING)
 * Returns individual loading states for progressive rendering
 */
export interface UseProgressRehydrationResult {
  snapshot: {
    data: any;
    loading: boolean;
    error: Error | null;
  };
  events: {
    data: InvestigationEvent[];
    loading: boolean;
    error: Error | null;
  };
  displayProgress: number;
  isFullyLoaded: boolean;
}

/**
 * Custom hook for Progress Page rehydration
 *
 * @param investigationId - Investigation ID
 * @param isHybridGraph - Whether this is a hybrid graph investigation
 * @returns Rehydration state and data
 */
export function useProgressRehydration(
  investigationId: string | undefined,
  isHybridGraph: boolean
): UseProgressRehydrationResult {
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<Error | null>(null);

  // Snapshot hook (T016) - loads immediately, non-blocking
  const { loading: snapshotLoading, snapshot, error: snapshotError } = useInvestigationSnapshot(investigationId);

  // Cursor storage hook (T017)
  const { cursor, saveCursor } = useCursorStorage(investigationId);

  // Event fetch hook (T018)
  const {
    events,
    nextCursor,
    error: fetchError,
    fetchEvents
  } = useEventFetch(investigationId);

  // Fetch events in background (non-blocking)
  useEffect(() => {
    const loadEvents = async () => {
      if (!investigationId || isHybridGraph || !snapshot) return;

      try {
        setEventsLoading(true);
        setEventsError(null);

        // Fetch events since cursor
        await fetchEvents(cursor);

        // Save new cursor if available
        if (nextCursor) {
          saveCursor(nextCursor);
        }

        setEventsLoading(false);
      } catch (err) {
        setEventsError(err instanceof Error ? err : new Error('Failed to load events'));
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, [investigationId, isHybridGraph, snapshot, cursor, fetchEvents, nextCursor, saveCursor]);

  // Extract numeric progress value, handling both direct number and nested object cases
  let numericProgress = 0;
  if (snapshot?.progress) {
    if (typeof snapshot.progress === 'number') {
      numericProgress = snapshot.progress;
    } else if (typeof snapshot.progress === 'object' && snapshot.progress.percentComplete) {
      numericProgress = Math.round(snapshot.progress.percentComplete);
    } else if (typeof snapshot.progress === 'object' && snapshot.progress.progressPercentage) {
      numericProgress = Math.round(snapshot.progress.progressPercentage);
    }
  }

  // Determine if fully loaded (both snapshot and events)
  const isFullyLoaded = !snapshotLoading && !eventsLoading && !!snapshot;

  return {
    snapshot: {
      data: snapshot,
      loading: snapshotLoading,
      error: snapshotError
    },
    events: {
      data: events,
      loading: eventsLoading,
      error: eventsError || fetchError
    },
    displayProgress: numericProgress,
    isFullyLoaded
  };
}
