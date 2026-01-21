/**
 * Investigation State Store
 *
 * Unified Zustand store for all investigation state management.
 * Replaces: InvestigationContext, useInvestigation hook, inline state
 *
 * @module shared/stores/investigationStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Investigation,
  InvestigationListItem,
  InvestigationSettings,
  InvestigationStatus
} from '../validation/schemas';

// ============================================================================
// Types
// ============================================================================

export interface InvestigationFilters {
  status?: InvestigationStatus[];
  searchQuery?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
}

export interface InvestigationState {
  // Data
  investigations: Record<string, Investigation>;
  investigationsList: InvestigationListItem[];
  selectedId: string | null;
  filters: InvestigationFilters;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  // UI State
  isLoading: boolean;
  error: Error | null;
  lastFetch: number | null;

  // Actions - Investigations
  setInvestigations: (investigations: Investigation[]) => void;
  setInvestigationsList: (list: InvestigationListItem[]) => void;
  addInvestigation: (investigation: Investigation) => void;
  updateInvestigation: (id: string, updates: Partial<Investigation>) => void;
  removeInvestigation: (id: string) => void;

  // Actions - Selection
  selectInvestigation: (id: string | null) => void;

  // Actions - Filters
  setFilters: (filters: Partial<InvestigationFilters>) => void;
  clearFilters: () => void;

  // Actions - Pagination
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setPaginationData: (data: { totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean }) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;

  // Actions - Loading/Error
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;

  // Selectors
  getInvestigation: (id: string) => Investigation | undefined;
  getSelectedInvestigation: () => Investigation | undefined;
  getFilteredInvestigations: () => InvestigationListItem[];

  // Actions - State Management
  reset: () => void;
  hydrate: (state: Partial<InvestigationState>) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  investigations: {},
  investigationsList: [],
  selectedId: null,
  filters: {},
  currentPage: 1,
  pageSize: 20,
  totalCount: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  isLoading: false,
  error: null,
  lastFetch: null
};

// ============================================================================
// Store Implementation
// ============================================================================

/**
 * Investigation state store with persistence
 *
 * @example
 * ```tsx
 * // Access state
 * const { investigations, selectedId, selectInvestigation } = useInvestigationStore();
 *
 * // Select investigation
 * selectInvestigation('investigation-123');
 *
 * // Update investigation
 * const updateInvestigation = useInvestigationStore(state => state.updateInvestigation);
 * updateInvestigation('investigation-123', { status: 'completed' });
 *
 * // Get filtered investigations
 * const getFiltered = useInvestigationStore(state => state.getFilteredInvestigations);
 * const filtered = getFiltered();
 * ```
 */
export const useInvestigationStore = create<InvestigationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // Actions - Investigations
      // ========================================================================

      setInvestigations: (investigations) => {
        const investigationsMap = investigations.reduce(
          (acc, inv) => ({
            ...acc,
            [inv.investigationId]: inv
          }),
          {} as Record<string, Investigation>
        );

        set({
          investigations: investigationsMap,
          lastFetch: Date.now()
        });
      },

      setInvestigationsList: (list) => {
        set({
          investigationsList: list,
          lastFetch: Date.now()
        });
      },

      addInvestigation: (investigation) => {
        set((state) => ({
          investigations: {
            ...state.investigations,
            [investigation.investigationId]: investigation
          },
          investigationsList: [
            ...state.investigationsList,
            {
              investigationId: investigation.investigationId,
              name: investigation.settings.name,
              status: investigation.status,
              priority: investigation.settings.priority,
              createdAt: investigation.createdAt,
              progress: investigation.progress
            }
          ]
        }));
      },

      updateInvestigation: (id, updates) => {
        set((state) => {
          const existing = state.investigations[id];
          if (!existing) return state;

          const updated = { ...existing, ...updates };

          return {
            investigations: {
              ...state.investigations,
              [id]: updated
            },
            investigationsList: state.investigationsList.map((item) =>
              item.investigationId === id
                ? {
                    ...item,
                    name: updated.settings.name,
                    status: updated.status,
                    priority: updated.settings.priority,
                    progress: updated.progress
                  }
                : item
            )
          };
        });
      },

      removeInvestigation: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.investigations;

          return {
            investigations: rest,
            investigationsList: state.investigationsList.filter(
              (item) => item.investigationId !== id
            ),
            selectedId: state.selectedId === id ? null : state.selectedId
          };
        });
      },

      // ========================================================================
      // Actions - Selection
      // ========================================================================

      selectInvestigation: (id) => {
        set({ selectedId: id });
      },

      // ========================================================================
      // Actions - Filters
      // ========================================================================

      setFilters: (filters) => {
        set((state) => ({
          filters: {
            ...state.filters,
            ...filters
          }
        }));
      },

      clearFilters: () => {
        set({ filters: {}, currentPage: 1 });
      },

      // ========================================================================
      // Actions - Pagination
      // ========================================================================

      setPage: (page) => {
        set({ currentPage: page });
      },

      setPageSize: (pageSize) => {
        set({ pageSize, currentPage: 1 });
      },

      setPaginationData: (data) => {
        set({
          totalCount: data.totalCount,
          hasNextPage: data.hasNextPage,
          hasPreviousPage: data.hasPreviousPage
        });
      },

      goToNextPage: () => {
        set((state) => {
          if (state.hasNextPage) {
            return { currentPage: state.currentPage + 1 };
          }
          return state;
        });
      },

      goToPreviousPage: () => {
        set((state) => {
          if (state.hasPreviousPage) {
            return { currentPage: state.currentPage - 1 };
          }
          return state;
        });
      },

      // ========================================================================
      // Actions - Loading/Error
      // ========================================================================

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error });
      },

      // ========================================================================
      // Selectors
      // ========================================================================

      getInvestigation: (id) => {
        return get().investigations[id];
      },

      getSelectedInvestigation: () => {
        const { investigations, selectedId } = get();
        return selectedId ? investigations[selectedId] : undefined;
      },

      getFilteredInvestigations: () => {
        const { investigationsList, filters } = get();
        let filtered = [...investigationsList];

        // Filter by status
        if (filters.status && filters.status.length > 0) {
          filtered = filtered.filter((inv) => filters.status!.includes(inv.status));
        }

        // Filter by search query
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          filtered = filtered.filter((inv) =>
            inv.name.toLowerCase().includes(query) ||
            inv.investigationId.toLowerCase().includes(query)
          );
        }

        // Filter by date range
        if (filters.dateRange) {
          const start = new Date(filters.dateRange.start).getTime();
          const end = new Date(filters.dateRange.end).getTime();

          filtered = filtered.filter((inv) => {
            const created = new Date(inv.createdAt).getTime();
            return created >= start && created <= end;
          });
        }

        return filtered;
      },

      // ========================================================================
      // Actions - State Management
      // ========================================================================

      reset: () => {
        set(initialState);
      },

      hydrate: (state) => {
        set((current) => ({
          ...current,
          ...state
        }));
      }
    }),
    {
      name: 'investigation-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist selection, filters, and pagination settings
        selectedId: state.selectedId,
        filters: state.filters,
        currentPage: state.currentPage,
        pageSize: state.pageSize
      })
    }
  )
);

// ============================================================================
// Selectors (for performance optimization)
// ============================================================================

/**
 * Select investigation by ID (memoized)
 */
export const useInvestigationById = (id: string | undefined) =>
  useInvestigationStore((state) => (id ? state.investigations[id] : undefined));

/**
 * Select currently selected investigation
 */
export const useSelectedInvestigation = () =>
  useInvestigationStore((state) => state.getSelectedInvestigation());

/**
 * Select filtered investigations list
 */
export const useFilteredInvestigations = () =>
  useInvestigationStore((state) => state.getFilteredInvestigations());

/**
 * Select investigation loading state
 */
export const useInvestigationLoading = () =>
  useInvestigationStore((state) => state.isLoading);

/**
 * Select investigation error
 */
export const useInvestigationError = () =>
  useInvestigationStore((state) => state.error);

// ============================================================================
// Actions (for convenient access)
// ============================================================================

export const investigationActions = {
  setInvestigations: (investigations: Investigation[]) =>
    useInvestigationStore.getState().setInvestigations(investigations),

  addInvestigation: (investigation: Investigation) =>
    useInvestigationStore.getState().addInvestigation(investigation),

  updateInvestigation: (id: string, updates: Partial<Investigation>) =>
    useInvestigationStore.getState().updateInvestigation(id, updates),

  removeInvestigation: (id: string) =>
    useInvestigationStore.getState().removeInvestigation(id),

  selectInvestigation: (id: string | null) =>
    useInvestigationStore.getState().selectInvestigation(id),

  setFilters: (filters: Partial<InvestigationFilters>) =>
    useInvestigationStore.getState().setFilters(filters),

  clearFilters: () =>
    useInvestigationStore.getState().clearFilters(),

  reset: () =>
    useInvestigationStore.getState().reset()
};
