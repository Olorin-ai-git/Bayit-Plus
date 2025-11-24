/**
 * LEGACY event-persistence.ts
 * This file has been SUPERSEDED by the new modular event persistence architecture
 * Feature: Event persistence system
 *
 * REFACTORED FROM: 701 lines (350% over 200-line limit!)
 * NEW ARCHITECTURE: 11 focused modules under persistence/ directory
 *
 * NEW MODULES (all < 200 lines):
 * ✅ types/persistence-types.ts (162 lines) - Type definitions
 * ✅ config/persistence-config.ts (159 lines) - Configuration from process.env
 * ✅ utils/persistence-utils.ts (141 lines) - Utility functions
 * ✅ export/import-manager.ts (107 lines) - CSV/JSON export/import
 * ✅ storage/storage-manager.ts (106 lines) - localStorage operations
 * ✅ core/filter-stats.ts (98 lines) - Event filtering and statistics
 * ✅ sync/sync-manager.ts (90 lines) - Batch synchronization with Phase 1.2 comments
 * ✅ core/event-manager-internal.ts (88 lines) - Internal network listeners
 * ✅ validation/validators.ts (85 lines) - Event validation
 * ✅ sync/sync-operations.ts (51 lines) - Sync orchestration
 * ✅ core/EventPersistenceManager.ts (192 lines) - Main class
 *
 * Backward compatibility: All exports maintained via re-exports below
 */

// Re-export all types and functions from the modular architecture
export type {
  PersistedEvent,
  EventPriority,
  PersistenceConfig,
  SyncResult,
  SyncError,
  EventFilter,
  StorageStats,
  StorageUsage,
} from './persistence';

export {
  EventPersistenceManager,
  createEventPersistenceManager,
  defaultPersistenceConfig,
  getPersistenceConfig,
  getStorageSizeLimit,
  getCriticalEvents,
  isPersistenceEnabled,
  EventPersistenceUtils,
  ExportImportManager,
  StorageManager,
  isValidPersistedEvent,
  isValidEventPriority,
  isValidEventId,
  isValidEventName,
  isValidTimestamp,
  isValidRetryCount,
  isValidMaxRetries,
  isValidServiceName,
} from './persistence';

export { default } from './persistence';
