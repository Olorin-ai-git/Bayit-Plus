/**
 * Zustand Store - Wizard State Management.
 * Feature: 005-polling-and-persistence
 *
 * Global state management for wizard state with persistence and polling control.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values (all from configuration)
 * - Persistence middleware for localStorage
 * - Optimistic updates with version tracking
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WizardStep, WizardStoreState } from '../types/wizardState';
import { createWizardActions, createBackwardCompatActions } from './wizardStoreActions';

const initialPollingState = {
  isPolling: false,
  currentInterval: 0,
  retryCount: 0,
  lastPollTime: null,
  error: null
};

export const useWizardStore = create<WizardStoreState>()(
  persist(
    (set, get) => ({
      // Data state (Feature 005)
      wizardState: null,
      serverState: null,
      localChanges: null,
      isLoading: false,
      isSyncing: false,
      error: null,
      polling: initialPollingState,

      // Settings form state (persisted across navigation)
      // Navigation state removed - derived from URL instead
      // Investigation data removed - fetched from API based on URL ?id=xxx
      settings: null,

      // All actions
      ...createWizardActions(set, get),
      ...createBackwardCompatActions(get, set)
    }),
    {
      name: 'wizard-state-storage',
      partialize: (state) => ({
        // Persist data state
        wizardState: state.wizardState,
        serverState: state.serverState,
        localChanges: state.localChanges,
        // Persist settings form state (for form persistence across navigation)
        settings: state.settings
        // Navigation state removed - URL is source of truth
        // Investigation data removed - fetched from API
      }),
    }
  )
);
