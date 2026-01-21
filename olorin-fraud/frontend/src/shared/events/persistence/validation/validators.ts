/**
 * Event Persistence Validation Utilities
 * Validation functions for persisted events
 * Feature: Event persistence system
 */

import type { PersistedEvent, EventPriority } from '../types/persistence-types';

/**
 * Validate that an object is a valid PersistedEvent
 */
export function isValidPersistedEvent(event: any): event is PersistedEvent {
  return (
    event &&
    typeof event.id === 'string' &&
    typeof event.event === 'string' &&
    typeof event.service === 'string' &&
    isValidEventPriority(event.priority) &&
    event.timestamp instanceof Date &&
    typeof event.synchronized === 'boolean' &&
    typeof event.retryCount === 'number' &&
    typeof event.maxRetries === 'number'
  );
}

/**
 * Validate event priority
 */
export function isValidEventPriority(priority: any): priority is EventPriority {
  return ['low', 'medium', 'high', 'critical'].includes(priority);
}

/**
 * Validate event ID format
 */
export function isValidEventId(id: string): boolean {
  // Expected format: evt_{timestamp}_{random}
  return /^evt_\d+_[a-z0-9]+$/.test(id);
}

/**
 * Validate event name format
 */
export function isValidEventName(name: string): boolean {
  // Expected format: service:category:action
  return /^[a-z-]+:[a-z-]+:[a-z-]+$/.test(name);
}

/**
 * Validate timestamp is valid date
 */
export function isValidTimestamp(timestamp: any): timestamp is Date {
  return timestamp instanceof Date && !isNaN(timestamp.getTime());
}

/**
 * Validate retry count is non-negative
 */
export function isValidRetryCount(count: number): boolean {
  return Number.isInteger(count) && count >= 0;
}

/**
 * Validate max retries is positive
 */
export function isValidMaxRetries(max: number): boolean {
  return Number.isInteger(max) && max > 0;
}

/**
 * Validate service name format
 */
export function isValidServiceName(service: string): boolean {
  const validServices = [
    'investigation',
    'agent-analytics',
    'rag-intelligence',
    'visualization',
    'reporting',
    'core-ui',
    'design-system',
    'unknown',
  ];
  return validServices.includes(service);
}
