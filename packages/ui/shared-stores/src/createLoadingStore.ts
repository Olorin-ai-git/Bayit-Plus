/**
 * createLoadingStore
 *
 * Factory for creating stores with loading/error state management.
 * Provides consistent patterns for async operations across the ecosystem.
 */

import { create, StateCreator, StoreApi } from 'zustand';

/**
 * Base loading state interface
 */
export interface LoadingState {
  /** Whether an operation is currently in progress */
  isLoading: boolean;
  /** Error message from the last failed operation */
  error: string | null;
  /** Timestamp of the last successful operation */
  lastUpdated: number | null;
}

/**
 * Loading state actions
 */
export interface LoadingActions {
  /** Set loading state to true */
  setLoading: () => void;
  /** Set loading complete with optional error */
  setComplete: (error?: string | null) => void;
  /** Clear any existing error */
  clearError: () => void;
  /** Reset the loading state completely */
  resetLoadingState: () => void;
}

/**
 * Combined loading state with actions
 */
export type LoadingStore = LoadingState & LoadingActions;

/**
 * Initial loading state
 */
export const initialLoadingState: LoadingState = {
  isLoading: false,
  error: null,
  lastUpdated: null,
};

/**
 * Creates loading state slice for use with Zustand stores
 *
 * @returns StateCreator for the loading slice
 *
 * @example
 * ```typescript
 * const useMyStore = create<MyState & LoadingStore>()((...a) => ({
 *   ...createLoadingSlice()(...a),
 *   // ... your other state
 * }));
 * ```
 */
export const createLoadingSlice = <
  T extends LoadingStore = LoadingStore
>(): StateCreator<T, [], [], LoadingStore> => {
  return (set) => ({
    ...initialLoadingState,

    setLoading: () => {
      set({ isLoading: true, error: null } as Partial<T>);
    },

    setComplete: (error?: string | null) => {
      set({
        isLoading: false,
        error: error ?? null,
        lastUpdated: error ? null : Date.now(),
      } as Partial<T>);
    },

    clearError: () => {
      set({ error: null } as Partial<T>);
    },

    resetLoadingState: () => {
      set(initialLoadingState as Partial<T>);
    },
  });
};

/**
 * Creates a standalone loading store
 *
 * @returns Zustand store with loading state
 *
 * @example
 * ```typescript
 * const useLoadingStore = createLoadingStore();
 *
 * function MyComponent() {
 *   const { isLoading, setLoading, setComplete } = useLoadingStore();
 *
 *   async function handleAction() {
 *     setLoading();
 *     try {
 *       await doSomething();
 *       setComplete();
 *     } catch (error) {
 *       setComplete(error.message);
 *     }
 *   }
 * }
 * ```
 */
export function createLoadingStore(): StoreApi<LoadingStore> {
  return create<LoadingStore>()(createLoadingSlice());
}

/**
 * Helper to wrap async functions with loading state management
 *
 * @param store - Store API with loading actions
 * @param fn - Async function to wrap
 * @returns Wrapped function that manages loading state
 *
 * @example
 * ```typescript
 * const fetchData = withLoading(useMyStore, async () => {
 *   const response = await api.getData();
 *   return response;
 * });
 * ```
 */
export function withLoading<T, Args extends unknown[]>(
  store: StoreApi<LoadingStore> | { getState: () => LoadingStore },
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
  return async (...args: Args) => {
    const state = store.getState();
    state.setLoading();
    try {
      const result = await fn(...args);
      state.setComplete();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      state.setComplete(message);
      throw error;
    }
  };
}
