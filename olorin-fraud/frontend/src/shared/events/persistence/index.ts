/**
 * Event Persistence - Public API
 * Main entry point with backward-compatible exports
 * Feature: Event persistence system
 *
 * REFACTORED FROM: event-persistence.ts (701 lines, 350% over 200-line limit!)
 * NEW ARCHITECTURE: Modular structure with focused modules
 *
 * MODULES (all < 200 lines):
 * - types/persistence-types.ts (162 lines) - Type definitions
 * - config/persistence-config.ts (159 lines) - Configuration from process.env
 * - utils/persistence-utils.ts (141 lines) - Utility functions
 * - export/import-manager.ts (107 lines) - CSV/JSON export/import
 * - storage/storage-manager.ts (106 lines) - localStorage operations
 * - core/filter-stats.ts (98 lines) - Event filtering and statistics
 * - sync/sync-manager.ts (90 lines) - Batch synchronization
 * - core/event-manager-internal.ts (88 lines) - Internal network listeners
 * - validation/validators.ts (85 lines) - Event validation
 * - sync/sync-operations.ts (51 lines) - Sync orchestration
 * - core/EventPersistenceManager.ts (192 lines) - Main class
 */

// Type Definitions
export type {
  PersistedEvent,
  EventPriority,
  PersistenceConfig,
  SyncResult,
  SyncError,
  EventFilter,
  StorageStats,
  StorageUsage,
} from './types/persistence-types';

// Main Class
export { EventPersistenceManager, createEventPersistenceManager } from './core/EventPersistenceManager';
export { default } from './core/EventPersistenceManager';

// Configuration
export {
  defaultPersistenceConfig,
  getPersistenceConfig,
  getStorageSizeLimit,
  getCriticalEvents,
  isPersistenceEnabled,
} from './config/persistence-config';

// Utility Functions
export { EventPersistenceUtils } from './utils/persistence-utils';

// Export/Import Utilities
export { ExportImportManager } from './export/import-manager';

// Storage Utilities
export { StorageManager } from './storage/storage-manager';

// Validation
export {
  isValidPersistedEvent,
  isValidEventPriority,
  isValidEventId,
  isValidEventName,
  isValidTimestamp,
  isValidRetryCount,
  isValidMaxRetries,
  isValidServiceName,
} from './validation/validators';
