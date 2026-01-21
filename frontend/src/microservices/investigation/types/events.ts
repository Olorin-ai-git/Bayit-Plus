/**
 * Event Types & Interfaces
 * Feature: 008-live-investigation-updates (US2)
 *
 * TypeScript interfaces for event pagination and audit trail.
 * Matches backend EventsFeedResponse and InvestigationEvent models.
 */

/**
 * Actor who performed an action
 */
export interface EventActor {
  type: 'USER' | 'SYSTEM' | 'WEBHOOK' | 'POLLING';
  id: string;
}

/**
 * Single investigation event/change
 */
export interface InvestigationEvent {
  id: string; // Cursor format: timestamp_sequence
  ts: number; // Timestamp in milliseconds
  op: 'CREATED' | 'UPDATED' | 'DELETED' | 'STATE_CHANGE' | 'SETTINGS_CHANGE' | 'DOMAIN_FINDINGS' | 'PHASE_CHANGE' | 'PROGRESS' | 'COMPLETED';
  investigation_id: string;
  actor: EventActor;
  payload: Record<string, unknown>;
  version?: number;
}

/**
 * Paginated events response
 */
export interface EventsFeedResponse {
  items: InvestigationEvent[];
  next_cursor: string | null;
  has_more: boolean;
  poll_after_seconds: number;
  etag: string;
}

/**
 * Event filtering criteria
 */
export interface EventFilterParams {
  action_types?: ('CREATED' | 'UPDATED' | 'DELETED' | 'STATE_CHANGE' | 'SETTINGS_CHANGE')[];
  sources?: ('UI' | 'API' | 'SYSTEM' | 'WEBHOOK' | 'POLLING')[];
  user_ids?: string[];
  since_timestamp?: number;
  until_timestamp?: number;
}

/**
 * Audit trail summary
 */
export interface AuditTrailSummary {
  investigation_id: string;
  total_events: number;
  action_counts: Record<string, number>;
  source_counts: Record<string, number>;
  earliest_event_ts?: number;
  latest_event_ts?: number;
  last_updated: string;
}

/**
 * Event display information
 */
export interface EventDisplay {
  event: InvestigationEvent;
  timestamp: Date;
  displayText: string;
  icon: string;
  color: string;
}

/**
 * Event pagination state
 */
export interface EventPaginationState {
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  events: InvestigationEvent[];
  pollIntervalSeconds: number;
  etag: string | null;
}

/**
 * Event sorting options
 */
export type EventSortBy = 'timestamp-asc' | 'timestamp-desc' | 'type' | 'source';

/**
 * Event filter state
 */
export interface EventFilterState {
  selectedActionTypes: Set<string>;
  selectedSources: Set<string>;
  selectedUsers: Set<string>;
  startDate: Date | null;
  endDate: Date | null;
  sortBy: EventSortBy;
}

