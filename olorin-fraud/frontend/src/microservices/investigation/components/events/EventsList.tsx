/**
 * Events List Component
 * Feature: 008-live-investigation-updates (US2)
 *
 * Displays paginated investigation events with filtering and sorting.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InvestigationEvent } from '../../types/events';
import { eventApiService } from '../../services/eventApiService';
import { isTerminalStatus } from '../../constants/pollingConfig';
import './EventsList.css';

export interface EventsListProps {
  investigationId: string;
  autoLoad?: boolean;
  pageSize?: number;
  investigationStatus?: string;
}

/**
 * Events List Component
 *
 * Displays investigation events with:
 * - Cursor-based pagination
 * - Event filtering
 * - ETag caching
 * - Real-time updates
 */
export const EventsList: React.FC<EventsListProps> = ({
  investigationId,
  autoLoad = true,
  pageSize = 50,
  investigationStatus
}) => {
  const [events, setEvents] = useState<InvestigationEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [etag, setETag] = useState<string | null>(null);
  const [pollAfterSeconds, setPollAfterSeconds] = useState<number>(5);
  const [isReadyToPoll, setIsReadyToPoll] = useState<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const etagRef = useRef<string | null>(null);
  const investigationIdRef = useRef<string | null>(null);
  const loadEventsRef = useRef<((newCursor?: string, isPolling?: boolean) => Promise<void>) | null>(null);
  const isCallInProgressRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => {
    etagRef.current = etag;
  }, [etag]);

  useEffect(() => {
    investigationIdRef.current = investigationId;
  }, [investigationId]);

  // Load events - use refs to avoid dependency issues
  const loadEvents = useCallback(async (newCursor?: string, isPolling: boolean = false) => {
    const currentInvestigationId = investigationIdRef.current;
    const currentEtag = etagRef.current;

    if (!currentInvestigationId) {
      return;
    }

    // Prevent concurrent calls - if a call is already in progress, skip this one
    if (isCallInProgressRef.current) {
      console.log(`[EventsList] ⏸️ Call already in progress, skipping this request`);
      return;
    }

    // Mark call as in progress
    isCallInProgressRef.current = true;

    try {
      if (!isPolling) {
        setIsLoading(true);
      }
      setError(null);

      const response = await eventApiService.fetchEventsWithETag(
        currentInvestigationId,
        currentEtag || undefined,
        newCursor,
        pageSize
      );

      // 304 Not Modified - no new events
      if (response === null) {
        if (!isPolling) {
          setIsLoading(false);
        }
        return;
      }

      // Update state with new events
      if (newCursor) {
        // Pagination: append new events
        setEvents(prev => [...prev, ...response.items]);
      } else {
        // Initial load or refresh: replace events
        // For polling, merge with existing to avoid duplicates
        if (isPolling) {
          setEvents(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEvents = response.items.filter(e => !existingIds.has(e.id));
            return [...prev, ...newEvents];
          });
        } else {
          setEvents(response.items);
        }
      }

      setCursor(response.next_cursor);
      setHasMore(response.has_more);
      setETag(response.etag);
      setPollAfterSeconds(response.poll_after_seconds || 5);
      // Mark as ready to poll after first successful load
      if (!isPolling && !isReadyToPoll) {
        setIsReadyToPoll(true);
      }
      if (!isPolling) {
        setIsLoading(false);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load events');
      setError(error);
      if (!isPolling) {
        setIsLoading(false);
      }
    } finally {
      // Always clear the in-progress flag when done
      isCallInProgressRef.current = false;
    }
  }, [pageSize, isReadyToPoll]);

  // Keep loadEvents ref in sync - CRITICAL: Must happen before polling setup
  useEffect(() => {
    loadEventsRef.current = loadEvents;
    console.log(`[EventsList] loadEventsRef updated`);
  }, [loadEvents]);

  // Initial load
  useEffect(() => {
    if (autoLoad && investigationId) {
      loadEvents();
    }
  }, [autoLoad, investigationId, loadEvents]);

  // Set up polling for new events - use ref to avoid dependency on loadEvents
  useEffect(() => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      console.log(`[EventsList] Clearing existing polling interval`);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Stop polling if investigation has reached terminal status
    if (investigationStatus && isTerminalStatus(investigationStatus)) {
      console.log(`[EventsList] 🛑 Investigation in terminal status: ${investigationStatus}. Not starting polling.`);
      return;
    }

    // Only poll if autoLoad is enabled and we have an investigation ID
    if (!autoLoad || !investigationId) {
      console.log(`[EventsList] Skipping polling setup: autoLoad=${autoLoad}, investigationId=${investigationId}`);
      return;
    }

    // CRITICAL: Only start polling after initial load completes
    if (!isReadyToPoll) {
      console.log(`[EventsList] Not ready to poll yet. Waiting for initial load...`);
      return;
    }

    // CRITICAL: Ensure loadEventsRef is set
    if (!loadEventsRef.current) {
      console.warn(`[EventsList] loadEventsRef.current is null! Cannot start polling.`);
      return;
    }

    // Set up polling interval using poll_after_seconds from API response
    const intervalMs = pollAfterSeconds * 1000;
    console.log(`[EventsList] ✅ Setting up polling interval: ${intervalMs}ms (${pollAfterSeconds}s) for investigation ${investigationId}`);

    // Create polling function that uses refs
    const pollForEvents = () => {
      console.log(`[EventsList] 🔄 Polling for new events... (etag: ${etagRef.current})`);
      if (loadEventsRef.current) {
        loadEventsRef.current(undefined, true).catch(err => {
          console.error(`[EventsList] ❌ Polling error:`, err);
        });
      } else {
        console.warn(`[EventsList] ⚠️ loadEventsRef.current is null! Cannot poll.`);
      }
    };

    // Set up interval (don't call immediately - initial load already happened)
    pollingIntervalRef.current = setInterval(pollForEvents, intervalMs);
    console.log(`[EventsList] ✅ Polling interval set up with ID:`, pollingIntervalRef.current);

    // Cleanup on unmount or when dependencies change
    return () => {
      console.log(`[EventsList] 🛑 Cleaning up polling interval:`, pollingIntervalRef.current);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Clear in-progress flag on cleanup
      isCallInProgressRef.current = false;
    };
  }, [autoLoad, investigationId, pollAfterSeconds, isReadyToPoll, investigationStatus]);

  // Load next page
  const handleLoadMore = () => {
    if (cursor && !isLoading) {
      loadEvents(cursor);
    }
  };

  // Reload from beginning
  const handleRefresh = () => {
    setETag(null);
    setCursor(null);
    setIsReadyToPoll(false); // Reset polling readiness
    loadEvents();
  };

  return (
    <div className="events-list-container">
      {/* Header */}
      <div className="events-list-header">
        <h3>Event History</h3>
        <button
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh events"
        >
          ↻
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="events-list-error">
          <span className="error-icon">⚠</span>
          <span>{error.message}</span>
          <button onClick={handleRefresh} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Events List */}
      <div className="events-list-items">
        {events.length === 0 ? (
          <div className="events-list-empty">
            {isLoading ? 'Loading events...' : 'No events found'}
          </div>
        ) : (
          // Display events in reverse order (latest first)
          [...events].reverse().map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="events-list-footer">
          <button
            className="load-more-btn"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More Events'}
          </button>
        </div>
      )}

      {/* Event Count */}
      <div className="events-list-info">
        Showing {events.length} events {hasMore && '(more available)'}
      </div>
    </div>
  );
};

/**
 * Recursively renders JSON data in a tabular key-value format
 */
const JsonTable: React.FC<{ data: any; level?: number }> = ({ data, level = 0 }) => {
  if (data === null || data === undefined) {
    return <span className="json-null">null</span>;
  }

  if (typeof data !== 'object') {
    const stringValue = String(data);

    // Check if string contains newlines (multi-line formatted text)
    if (stringValue.includes('\n')) {
      return (
        <pre className="json-value-multiline">
          {stringValue}
        </pre>
      );
    }

    return <span className="json-value">{stringValue}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="json-empty">[]</span>;
    }

    // Check if all array items are primitives (not objects/arrays)
    const allPrimitives = data.every(item => typeof item !== 'object' || item === null);

    if (allPrimitives) {
      // Display simple arrays inline with commas
      return (
        <div className="json-array-inline">
          {data.map((item, index) => (
            <span key={index}>
              <span className="json-value">{String(item)}</span>
              {index < data.length - 1 && <span className="json-array-separator">, </span>}
            </span>
          ))}
        </div>
      );
    }

    // For complex arrays (containing objects/arrays), use nested table
    return (
      <table className="json-table json-table-nested">
        <thead>
          <tr>
            <th>Index</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td className="json-key">[{index}]</td>
              <td className="json-value-cell">
                <JsonTable data={item} level={level + 1} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <span className="json-empty">{'{}'}</span>;
  }

  return (
    <table className="json-table" style={{ marginLeft: level > 0 ? `${level * 10}px` : '0' }}>
      <thead>
        <tr>
          <th>Key</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key}>
            <td className="json-key">{key}</td>
            <td className="json-value-cell">
              <JsonTable data={value} level={level + 1} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/**
 * Event Card Component
 */
const EventCard: React.FC<{ event: InvestigationEvent }> = ({ event }) => {
  const timestamp = new Date(event.ts);
  const operationLabels: Record<string, string> = {
    CREATED: '✓ Created',
    UPDATED: '◷ Updated',
    DELETED: '✕ Deleted',
    STATE_CHANGE: '→ State Changed',
    SETTINGS_CHANGE: '⚙ Settings Changed'
  };

  const actorLabels: Record<string, string> = {
    USER: '👤',
    SYSTEM: '⚙',
    WEBHOOK: '🔗',
    POLLING: '↻'
  };

  return (
    <div className="event-card">
      <div className="event-time">
        {timestamp.toLocaleString()}
      </div>
      <div className="event-header">
        <span className="event-operation">{operationLabels[event.op] || event.op}</span>
        <span className="event-actor" title={event.actor.id}>
          {actorLabels[event.actor.type] || event.actor.type}
        </span>
      </div>
      {event.payload && Object.keys(event.payload).length > 0 && (
        <div className="event-payload">
          <JsonTable data={event.payload} />
        </div>
      )}
    </div>
  );
};

EventsList.displayName = 'EventsList';

