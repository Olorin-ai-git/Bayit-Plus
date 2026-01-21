import { Page } from '@playwright/test';
import { TestLogger } from '../utils/test-logger';
import { InvestigationSnapshot, ProgressData, EventsResponse, InvestigationLogs } from './types';
import {
  getAuthHeaders,
  getConfig,
  fetchProgress,
  fetchEvents,
  fetchInvestigationLogs,
  checkHealth,
} from './http-client';

export async function getProgress(
  config: { backendBaseUrl: string },
  investigationId: string,
  options?: { logger?: TestLogger }
): Promise<ProgressData> {
  return fetchProgress(config, investigationId, options?.logger);
}

export async function getEvents(
  config: { backendBaseUrl: string },
  investigationId: string,
  options?: { logger?: TestLogger; since?: string; limit?: number }
): Promise<EventsResponse> {
  return fetchEvents(config, investigationId, options?.since, options?.limit, options?.logger);
}

export async function getInvestigationLogs(
  config: { backendBaseUrl: string },
  investigationId: string,
  options?: { logger?: TestLogger }
): Promise<InvestigationLogs> {
  return fetchInvestigationLogs(config, investigationId, options?.logger);
}

export async function waitForProgress(
  config: { backendBaseUrl: string },
  investigationId: string,
  predicate: (data: ProgressData) => boolean,
  options?: { logger?: TestLogger; timeoutMs?: number; pollIntervalMs?: number }
): Promise<ProgressData> {
  const logger = options?.logger;
  const timeoutMs = options?.timeoutMs || 300000;
  const pollIntervalMs = options?.pollIntervalMs || 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const progress = await fetchProgress(config, investigationId, logger);
      if (predicate(progress)) {
        logger?.debug('Progress condition met', {
          stage: progress.lifecycle_stage,
          percent: progress.completion_percent,
        });
        return progress;
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    } catch (error) {
      logger?.warn('Error waiting for progress', { error: String(error) });
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  throw new Error(`Timeout waiting for progress after ${timeoutMs}ms`);
}

export async function waitForEvent(
  config: { backendBaseUrl: string },
  investigationId: string,
  predicate: (event: any) => boolean,
  options?: { logger?: TestLogger; timeoutMs?: number; pollIntervalMs?: number }
): Promise<any> {
  const logger = options?.logger;
  const timeoutMs = options?.timeoutMs || 300000;
  const pollIntervalMs = options?.pollIntervalMs || 1000;
  const startTime = Date.now();
  let cursor: string | undefined;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const eventsResponse = await fetchEvents(config, investigationId, cursor, undefined, logger);
      const matchedEvent = eventsResponse.items.find(predicate);
      if (matchedEvent) {
        logger?.debug('Event found', { eventType: matchedEvent.type });
        return matchedEvent;
      }
      cursor = eventsResponse.next_cursor;
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    } catch (error) {
      logger?.warn('Error waiting for event', { error: String(error) });
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  throw new Error(`Timeout waiting for event after ${timeoutMs}ms`);
}

export async function checkServerHealth(
  config: { backendBaseUrl: string },
  options?: { logger?: TestLogger; timeoutMs?: number }
): Promise<boolean> {
  return checkHealth(config, options?.timeoutMs, options?.logger);
}
