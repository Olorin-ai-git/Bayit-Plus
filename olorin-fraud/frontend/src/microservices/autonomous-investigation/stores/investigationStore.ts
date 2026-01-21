/**
 * Investigation Store
 * Manages current investigation state and metadata
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Investigation, InvestigationPhase } from '../types';

interface InvestigationState {
  // Current investigation
  currentInvestigation: Investigation | null;
  currentPhase: InvestigationPhase | null;

  // Selection state
  selectedInvestigationId: string | null;

  // Investigation list state
  investigationFilters: {
    status: string[];
    entityType: string[];
    assignedTo: string[];
    dateRange: {
      start: string | null;
      end: string | null;
    };
    search: string;
  };

  // Actions
  setCurrentInvestigation: (investigation: Investigation | null) => void;
  setCurrentPhase: (phase: InvestigationPhase | null) => void;
  setSelectedInvestigationId: (id: string | null) => void;
  updateInvestigationFilters: (filters: Partial<InvestigationState['investigationFilters']>) => void;
  clearInvestigationFilters: () => void;

  // Investigation metadata
  lastRefresh: number | null;
  setLastRefresh: (timestamp: number) => void;
}

const initialFilters = {
  status: [],
  entityType: [],
  assignedTo: [],
  dateRange: {
    start: null,
    end: null,
  },
  search: '',
};

export const useInvestigationStore = create<InvestigationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentInvestigation: null,
        currentPhase: null,
        selectedInvestigationId: null,
        investigationFilters: initialFilters,
        lastRefresh: null,

        // Actions
        setCurrentInvestigation: (investigation) =>
          set(
            {
              currentInvestigation: investigation,
              currentPhase: investigation?.current_phase || null,
              selectedInvestigationId: investigation?.id || null,
            },
            false,
            'setCurrentInvestigation'
          ),

        setCurrentPhase: (phase) =>
          set({ currentPhase: phase }, false, 'setCurrentPhase'),

        setSelectedInvestigationId: (id) =>
          set({ selectedInvestigationId: id }, false, 'setSelectedInvestigationId'),

        updateInvestigationFilters: (newFilters) =>
          set(
            {
              investigationFilters: {
                ...get().investigationFilters,
                ...newFilters,
              },
            },
            false,
            'updateInvestigationFilters'
          ),

        clearInvestigationFilters: () =>
          set(
            { investigationFilters: initialFilters },
            false,
            'clearInvestigationFilters'
          ),

        setLastRefresh: (timestamp) =>
          set({ lastRefresh: timestamp }, false, 'setLastRefresh'),
      }),
      {
        name: 'investigation-store',
        partialize: (state) => ({
          selectedInvestigationId: state.selectedInvestigationId,
          investigationFilters: state.investigationFilters,
        }),
      }
    ),
    {
      name: 'investigation-store',
    }
  )
);

// Computed selectors
export const useCurrentInvestigation = () =>
  useInvestigationStore((state) => state.currentInvestigation);

export const useCurrentPhase = () =>
  useInvestigationStore((state) => state.currentPhase);

export const useSelectedInvestigationId = () =>
  useInvestigationStore((state) => state.selectedInvestigationId);

export const useInvestigationFilters = () =>
  useInvestigationStore((state) => state.investigationFilters);

// Action selectors
export const useInvestigationActions = () =>
  useInvestigationStore((state) => ({
    setCurrentInvestigation: state.setCurrentInvestigation,
    setCurrentPhase: state.setCurrentPhase,
    setSelectedInvestigationId: state.setSelectedInvestigationId,
    updateInvestigationFilters: state.updateInvestigationFilters,
    clearInvestigationFilters: state.clearInvestigationFilters,
    setLastRefresh: state.setLastRefresh,
  }));