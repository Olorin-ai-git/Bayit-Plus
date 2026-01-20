/**
 * @olorin/shared-stores
 *
 * Cross-platform Zustand store utilities for the Olorin.ai ecosystem.
 * Provides factories, patterns, and helpers for consistent state management.
 */

// Loading state utilities
export {
  createLoadingStore,
  createLoadingSlice,
  withLoading,
  initialLoadingState,
  type LoadingState,
  type LoadingActions,
  type LoadingStore,
} from './createLoadingStore';

// Async data fetching utilities
export {
  createAsyncStore,
  createAsyncSlice,
  createStaleChecker,
  getInitialAsyncState,
  type AsyncState,
  type AsyncActions,
  type AsyncStore,
  type CreateAsyncStoreOptions,
} from './createAsyncStore';

// Persistence utilities
export {
  createWebStorage,
  createMemoryStorage,
  createNoopStorage,
  createPersistConfig,
  isStorageAvailable,
  clearPersistedStores,
  type StorageAdapter,
  type PersistConfig,
} from './persistence';
