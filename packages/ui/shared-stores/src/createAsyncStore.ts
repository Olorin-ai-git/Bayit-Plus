/**
 * createAsyncStore
 *
 * Factory for creating stores with async data fetching capabilities.
 * Provides consistent patterns for API data across the ecosystem.
 */

import { create, StateCreator, StoreApi } from 'zustand';

/**
 * Async data state
 */
export interface AsyncState<T> {
  /** The fetched data */
  data: T | null;
  /** Whether data is currently being fetched */
  isLoading: boolean;
  /** Whether data has been fetched at least once */
  isFetched: boolean;
  /** Error from the last fetch attempt */
  error: string | null;
  /** Timestamp of the last successful fetch */
  lastFetchedAt: number | null;
}

/**
 * Async data actions
 */
export interface AsyncActions<T> {
  /** Set data directly */
  setData: (data: T | null) => void;
  /** Fetch data using the provided fetcher */
  fetch: () => Promise<void>;
  /** Refetch data (alias for fetch) */
  refetch: () => Promise<void>;
  /** Clear all data and reset state */
  reset: () => void;
  /** Invalidate cache (sets lastFetchedAt to null) */
  invalidate: () => void;
}

/**
 * Combined async store type
 */
export type AsyncStore<T> = AsyncState<T> & AsyncActions<T>;

/**
 * Options for creating an async store
 */
export interface CreateAsyncStoreOptions<T> {
  /** Function to fetch the data */
  fetcher: () => Promise<T>;
  /** Initial data value */
  initialData?: T | null;
  /** Time in ms before data is considered stale */
  staleTime?: number;
  /** Whether to fetch on store creation */
  fetchOnCreate?: boolean;
}

/**
 * Creates initial async state
 */
export function getInitialAsyncState<T>(initialData?: T | null): AsyncState<T> {
  return {
    data: initialData ?? null,
    isLoading: false,
    isFetched: false,
    error: null,
    lastFetchedAt: null,
  };
}

/**
 * Creates an async store for data fetching
 *
 * @param options - Store configuration options
 * @returns Zustand store with async capabilities
 *
 * @example
 * ```typescript
 * const useUserStore = createAsyncStore({
 *   fetcher: () => api.getUser(),
 *   staleTime: 5 * 60 * 1000, // 5 minutes
 * });
 *
 * function UserProfile() {
 *   const { data: user, isLoading, fetch } = useUserStore();
 *
 *   useEffect(() => {
 *     fetch();
 *   }, []);
 *
 *   if (isLoading) return <Loading />;
 *   return <div>{user?.name}</div>;
 * }
 * ```
 */
export function createAsyncStore<T>(
  options: CreateAsyncStoreOptions<T>
): StoreApi<AsyncStore<T>> {
  const { fetcher, initialData, staleTime, fetchOnCreate = false } = options;

  const store = create<AsyncStore<T>>()((set, get) => ({
    ...getInitialAsyncState(initialData),

    setData: (data: T | null) => {
      set({
        data,
        isFetched: true,
        lastFetchedAt: Date.now(),
      });
    },

    fetch: async () => {
      const state = get();

      // Check if data is still fresh
      if (
        staleTime &&
        state.lastFetchedAt &&
        Date.now() - state.lastFetchedAt < staleTime
      ) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const data = await fetcher();
        set({
          data,
          isLoading: false,
          isFetched: true,
          error: null,
          lastFetchedAt: Date.now(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Fetch failed';
        set({
          isLoading: false,
          error: message,
        });
        throw error;
      }
    },

    refetch: async () => {
      // Force refetch by invalidating first
      set({ lastFetchedAt: null });
      return get().fetch();
    },

    reset: () => {
      set(getInitialAsyncState(initialData));
    },

    invalidate: () => {
      set({ lastFetchedAt: null });
    },
  }));

  // Optionally fetch on creation
  if (fetchOnCreate) {
    store.getState().fetch();
  }

  return store;
}

/**
 * Creates an async store slice for combining with other state
 *
 * @param options - Store configuration options
 * @returns StateCreator for the async slice
 *
 * @example
 * ```typescript
 * interface MyStore extends AsyncStore<User> {
 *   filters: Filters;
 *   setFilters: (filters: Filters) => void;
 * }
 *
 * const useMyStore = create<MyStore>()((...a) => ({
 *   ...createAsyncSlice<User>({
 *     fetcher: () => api.getUsers(),
 *   })(...a),
 *   filters: {},
 *   setFilters: (filters) => set({ filters }),
 * }));
 * ```
 */
export function createAsyncSlice<T>(
  options: CreateAsyncStoreOptions<T>
): StateCreator<AsyncStore<T>, [], [], AsyncStore<T>> {
  const { fetcher, initialData, staleTime } = options;

  return (set, get) => ({
    ...getInitialAsyncState(initialData),

    setData: (data: T | null) => {
      set({
        data,
        isFetched: true,
        lastFetchedAt: Date.now(),
      } as Partial<AsyncStore<T>>);
    },

    fetch: async () => {
      const state = get();

      // Check if data is still fresh
      if (
        staleTime &&
        state.lastFetchedAt &&
        Date.now() - state.lastFetchedAt < staleTime
      ) {
        return;
      }

      set({ isLoading: true, error: null } as Partial<AsyncStore<T>>);

      try {
        const data = await fetcher();
        set({
          data,
          isLoading: false,
          isFetched: true,
          error: null,
          lastFetchedAt: Date.now(),
        } as Partial<AsyncStore<T>>);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Fetch failed';
        set({
          isLoading: false,
          error: message,
        } as Partial<AsyncStore<T>>);
        throw error;
      }
    },

    refetch: async () => {
      set({ lastFetchedAt: null } as Partial<AsyncStore<T>>);
      return get().fetch();
    },

    reset: () => {
      set(getInitialAsyncState(initialData) as Partial<AsyncStore<T>>);
    },

    invalidate: () => {
      set({ lastFetchedAt: null } as Partial<AsyncStore<T>>);
    },
  });
}

/**
 * Hook factory for checking if data is stale
 *
 * @param staleTime - Time in ms before data is considered stale
 * @returns Function to check staleness
 */
export function createStaleChecker(staleTime: number) {
  return (lastFetchedAt: number | null): boolean => {
    if (!lastFetchedAt) return true;
    return Date.now() - lastFetchedAt >= staleTime;
  };
}
