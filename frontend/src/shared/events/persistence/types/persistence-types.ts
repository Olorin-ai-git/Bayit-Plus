/**
 * Event Persistence Type Definitions
 * Type definitions for event persistence and synchronization
 * Feature: Event persistence system
 */

/**
 * Event priority levels for synchronization ordering
 */
export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Persisted event structure
 */
export interface PersistedEvent {
  /** Unique event identifier */
  id: string;

  /** Event name/type */
  event: string;

  /** Event payload data */
  data: any;

  /** Event timestamp */
  timestamp: Date;

  /** Service that generated the event */
  service: string;

  /** Event priority level */
  priority: EventPriority;

  /** Number of retry attempts */
  retryCount: number;

  /** Maximum retry attempts allowed */
  maxRetries: number;

  /** Optional expiry date for the event */
  expiry?: Date;

  /** Whether event has been synchronized */
  synchronized: boolean;
}

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  /** localStorage key for persisted events */
  storageKey: string;

  /** Maximum number of events to persist */
  maxEvents: number;

  /** Retry interval in milliseconds */
  retryInterval: number;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Enable compression for stored data */
  compressionEnabled: boolean;

  /** Enable encryption for stored data */
  encryptionEnabled: boolean;

  /** Enable automatic synchronization */
  autoSync: boolean;

  /** Batch size for synchronization */
  batchSize: number;
}

/**
 * Synchronization result
 */
export interface SyncResult {
  /** Number of successfully synchronized events */
  synchronized: number;

  /** Number of failed synchronization attempts */
  failed: number;

  /** Number of skipped events */
  skipped: number;

  /** Synchronization errors */
  errors: SyncError[];
}

/**
 * Synchronization error details
 */
export interface SyncError {
  /** Event ID that failed */
  eventId: string;

  /** Error message */
  error: string;

  /** Error timestamp */
  timestamp: Date;
}

/**
 * Event filter criteria
 */
export interface EventFilter {
  /** Filter by service names */
  services?: string[];

  /** Filter by priority levels */
  priorities?: EventPriority[];

  /** Filter by date range */
  dateRange?: { start: Date; end: Date };

  /** Filter by synchronization status */
  synchronized?: boolean;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Total number of persisted events */
  totalEvents: number;

  /** Number of pending (unsynchronized) events */
  pendingEvents: number;

  /** Number of synchronized events */
  synchronizedEvents: number;

  /** Storage size in bytes */
  storageSize: number;

  /** Oldest event timestamp */
  oldestEvent?: Date;

  /** Newest event timestamp */
  newestEvent?: Date;

  /** Breakdown by priority */
  priorityBreakdown: Record<EventPriority, number>;

  /** Breakdown by service */
  serviceBreakdown: Record<string, number>;
}

/**
 * Storage usage information
 */
export interface StorageUsage {
  /** Used storage in bytes */
  used: number;

  /** Available storage in bytes */
  available: number;
}
