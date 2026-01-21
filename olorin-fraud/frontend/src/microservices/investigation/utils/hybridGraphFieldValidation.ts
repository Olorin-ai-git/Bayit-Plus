/**
 * Hybrid Graph Field Validation Utilities
 * Feature: 006-hybrid-graph-integration
 *
 * Validation functions for hybrid graph investigation entity and time range inputs.
 */

import type { EntityType } from '../types/hybridGraphTypes';

export interface TimeRange {
  start: string; // ISO 8601 datetime-local format
  end: string;   // ISO 8601 datetime-local format
}

export function validateEntityId(type: EntityType, id: string): string | undefined {
  if (!id.trim()) return 'Entity ID is required';

  switch (type) {
    case 'user':
      if (!id.includes('@') || !id.includes('.')) {
        return 'User entity ID must be a valid email address';
      }
      break;
    case 'device':
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(id)) {
        return 'Device entity ID must be a valid UUID format';
      }
      break;
    case 'ip':
      const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
      if (!ipv4Pattern.test(id) && !ipv6Pattern.test(id)) {
        return 'IP entity ID must be a valid IPv4 or IPv6 address';
      }
      break;
    case 'transaction':
      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return 'Transaction entity ID must contain only alphanumeric characters';
      }
      break;
  }
  return undefined;
}

export function validateTimeRange(range: TimeRange): string | undefined {
  if (!range.start || !range.end) {
    return 'Both start and end times are required';
  }

  const start = new Date(range.start);
  const end = new Date(range.end);
  const now = new Date();

  if (start >= end) {
    return 'Start time must be before end time';
  }

  if (start > now || end > now) {
    return 'Time range cannot be in the future';
  }

  const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (durationDays > 90) {
    return 'Time range cannot exceed 90 days';
  }

  return undefined;
}

export function getEntityIdPlaceholder(entityType: EntityType): string {
  switch (entityType) {
    case 'user': return 'user@example.com';
    case 'device': return '550e8400-e29b-41d4-a716-446655440000';
    case 'ip': return '192.168.1.1 or 2001:0db8::1';
    case 'transaction': return 'TXN123ABC';
    default: return 'Enter entity ID';
  }
}
