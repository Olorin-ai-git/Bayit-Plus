import { TestLogger } from './test-logger';
import { fetchEvents, BackoffConfig } from './http-client';

/**
 * Events Validation Helpers
 *
 * Extracted helper functions for events verification tests.
 */

/**
 * Verify events maintain append-only ordering
 */
export async function verifyEventsAppendOnly(
  backendBaseUrl: string,
  investigationId: string,
  config: BackoffConfig,
  logger?: TestLogger,
  pollCount: number = 5,
  intervalMs: number = 1000
): Promise<{ valid: boolean; uniqueEvents: number; eventCounts: number[] }> {
  let previousEventCount = 0;
  let previousTimestamp = '';
  const allEvents = new Set<string>();
  const eventCounts: number[] = [];

  for (let i = 0; i < pollCount; i++) {
    const eventsResponse = await fetchEvents(
      { backendBaseUrl },
      investigationId,
      undefined,
      undefined,
      config,
      logger
    );

    const currentEventCount = eventsResponse?.items?.length || 0;
    eventCounts.push(currentEventCount);

    if (currentEventCount < previousEventCount) {
      logger?.error('Event count decreased', {
        current: currentEventCount,
        previous: previousEventCount,
      });
      return {
        valid: false,
        uniqueEvents: allEvents.size,
        eventCounts,
      };
    }

    if (eventsResponse?.items) {
      for (const event of eventsResponse.items) {
        const eventKey = `${event.ts}_${event.op}`;
        if (allEvents.has(eventKey)) {
          logger?.error('Duplicate event detected', {
            op: event.op,
            ts: event.ts,
          });
          return {
            valid: false,
            uniqueEvents: allEvents.size,
            eventCounts,
          };
        }
        allEvents.add(eventKey);

        if (previousTimestamp) {
          const currentTime = new Date(event.ts).getTime();
          const prevTime = new Date(previousTimestamp).getTime();
          if (currentTime < prevTime) {
            logger?.error('Event timestamp ordering violated', {
              current: event.ts,
              previous: previousTimestamp,
            });
            return {
              valid: false,
              uniqueEvents: allEvents.size,
              eventCounts,
            };
          }
        }
        previousTimestamp = event.ts;
      }
    }

    previousEventCount = currentEventCount;

    if (i < pollCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  logger?.success('Events append-only verified', {
    uniqueEvents: allEvents.size,
    eventCounts,
  });

  return {
    valid: true,
    uniqueEvents: allEvents.size,
    eventCounts,
  };
}

/**
 * Verify combined progress and events polling
 */
export async function verifyCombinedPolling(
  backendBaseUrl: string,
  investigationId: string,
  config: BackoffConfig,
  logger?: TestLogger,
  pollCount: number = 3,
  intervalMs: number = 1000
): Promise<{ valid: boolean; pollCount: number }> {
  for (let i = 0; i < pollCount; i++) {
    try {
      const progressPromise = fetch(
        `${backendBaseUrl}/api/investigations/${investigationId}/progress`
      );
      const eventsPromise = fetch(
        `${backendBaseUrl}/api/investigations/${investigationId}/events`
      );

      const [progressRes, eventsRes] = await Promise.all([progressPromise, eventsPromise]);

      if (!progressRes.ok || !eventsRes.ok) {
        logger?.error('Combined polling failed', {
          progressStatus: progressRes.status,
          eventsStatus: eventsRes.status,
        });
        return { valid: false, pollCount: i + 1 };
      }

      logger?.success(`Combined poll ${i + 1} completed`, {
        progressOk: progressRes.ok,
        eventsOk: eventsRes.ok,
      });

      if (i < pollCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      logger?.error('Combined polling error', {
        error: String(error),
      });
      return { valid: false, pollCount: i + 1 };
    }
  }

  return { valid: true, pollCount };
}
