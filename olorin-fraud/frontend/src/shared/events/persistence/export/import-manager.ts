/**
 * Event Persistence Export/Import Manager
 * Handles CSV and JSON export/import operations
 * Feature: Event persistence system
 */

import type { PersistedEvent } from '../types/persistence-types';
import { isValidPersistedEvent } from '../validation/validators';

/**
 * Export events to CSV format
 */
export function exportToCSV(events: PersistedEvent[]): string {
  const headers = [
    'id',
    'event',
    'service',
    'priority',
    'timestamp',
    'synchronized',
    'retryCount',
  ];

  const rows = events.map((event) => [
    event.id,
    event.event,
    event.service,
    event.priority,
    event.timestamp.toISOString(),
    event.synchronized.toString(),
    event.retryCount.toString(),
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

/**
 * Export events to JSON format
 */
export function exportToJSON(events: PersistedEvent[]): string {
  return JSON.stringify(events, null, 2);
}

/**
 * Import events from CSV format
 */
export function importFromCSV(csv: string): PersistedEvent[] {
  const lines = csv.split('\n');
  const headers = lines[0].split(',');

  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(',');
      const event: Partial<PersistedEvent> = {};

      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'timestamp':
          case 'expiry':
            (event as any)[header] = new Date(value);
            break;
          case 'synchronized':
            (event as any)[header] = value === 'true';
            break;
          case 'retryCount':
          case 'maxRetries':
            (event as any)[header] = parseInt(value, 10);
            break;
          default:
            (event as any)[header] = value;
        }
      });

      return event as PersistedEvent;
    })
    .filter(isValidPersistedEvent);
}

/**
 * Import events from JSON format
 */
export function importFromJSON(json: string): PersistedEvent[] {
  try {
    const events = JSON.parse(json);

    if (!Array.isArray(events)) {
      throw new Error('Invalid JSON format - expected array of events');
    }

    return events.filter(isValidPersistedEvent);
  } catch (error) {
    console.error('Failed to import events from JSON:', error);
    throw error;
  }
}

/**
 * Export/Import utilities collection
 */
export const ExportImportManager = {
  exportToCSV,
  exportToJSON,
  importFromCSV,
  importFromJSON,
};
