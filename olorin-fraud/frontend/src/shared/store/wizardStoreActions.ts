/**
 * Wizard Store Actions
 * Feature: 005-polling-and-persistence
 *
 * Core action implementations for wizard store.
 * Extracted validation and backward compat to separate files to maintain < 200 line limit.
 */

import { wizardStateService } from '../services/wizardStateService';
import {
  WizardState,
  WizardStateCreate,
  WizardStateUpdate,
  WizardStep
} from '../types/wizardState';
import { initialPollingState } from './wizardValidation';
import { clearBrowserCache, clearInvestigationCache } from '../utils/cacheManager';

/**
 * Helper to create backward compatibility fields from WizardState
 */
const createBackwardCompatFields = (state: WizardState) => ({
  investigation: {
    id: state.investigation_id,
    status: state.status,
    createdAt: state.created_at,
    updatedAt: state.updated_at
  },
  settings: state.settings || null
});

/**
 * Create wizard actions for the store
 */
export function createWizardActions(set: any, get: any) {
  return {
    // Data actions (Feature 005)
    createState: async (data: WizardStateCreate): Promise<WizardState> => {
      set({ isLoading: true, error: null });
      try {
        const state = await wizardStateService.createState(data);
        set({ wizardState: state, serverState: state, localChanges: null, isLoading: false });
        return state;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create', isLoading: false });
        throw error;
      }
    },

    loadState: async (investigationId: string) => {
      set({ isLoading: true, error: null });
      try {
        const state = await wizardStateService.loadState(investigationId);
        if (state) {
          set({
            wizardState: state,
            serverState: state,
            localChanges: null,
            isLoading: false,
            ...createBackwardCompatFields(state)
          });
        } else {
          set({ error: 'State not found', isLoading: false });
        }
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to load', isLoading: false });
        throw error;
      }
    },

    updateState: async (updates: Partial<WizardState>) => {
      const { wizardState, serverState } = get();
      if (!wizardState) {
        set({ error: 'No wizard state loaded' });
        return;
      }

      const updatedState = { ...wizardState, ...updates };
      set({
        wizardState: updatedState,
        localChanges: { ...get().localChanges, ...updates },
        isSyncing: true,
        error: null
      });

      try {
        const updatePayload: WizardStateUpdate = {
          ...updates,
          version: wizardState.version
        };

        const newState = await wizardStateService.updateState(
          wizardState.investigation_id,
          updatePayload
        );

        set({
          wizardState: newState,
          serverState: newState,
          localChanges: null,
          isSyncing: false
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update state';

        if (message.includes('modified by another request')) {
          try {
            await get().syncWithServer(wizardState.investigation_id);
            set({ error: 'State updated by another user. Changes merged.', isSyncing: false });
          } catch (syncErr) {
            set({ wizardState: serverState, localChanges: null, error: 'Conflict. Changes reverted.', isSyncing: false });
          }
        } else {
          set({ wizardState: serverState, localChanges: null, error: message, isSyncing: false });
        }
      }
    },

    deleteState: async (investigationId: string) => {
      set({ isLoading: true, error: null });
      try {
        await wizardStateService.deleteState(investigationId);
        set({ wizardState: null, serverState: null, localChanges: null, isLoading: false, polling: initialPollingState });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete', isLoading: false });
        throw error;
      }
    },

    startPolling: (investigationId: string) => {
      set({ polling: { isPolling: true, currentInterval: 2000, retryCount: 0, lastPollTime: new Date().toISOString(), error: null } });
    },

    stopPolling: () => set({ polling: initialPollingState }),

    syncWithServer: async (investigationId: string) => {
      set({ isSyncing: true, error: null });
      try {
        const latestState = await wizardStateService.loadState(investigationId);
        if (!latestState) {
          set({ error: 'Investigation state not found on server', isSyncing: false });
          return;
        }

        const { localChanges } = get();
        set({ serverState: latestState });

        if (localChanges) {
          const mergedState = { ...latestState, ...localChanges };
          set({
            wizardState: mergedState,
            isSyncing: false,
            ...createBackwardCompatFields(mergedState)
          });
        } else {
          set({
            wizardState: latestState,
            localChanges: null,
            isSyncing: false,
            ...createBackwardCompatFields(latestState)
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sync';
        set({ error: message, isSyncing: false });
        throw error;
      }
    },

    // Navigation actions removed - URL is now the source of truth
    // Navigation is handled via React Router navigation hooks

    resetWizard: () => set({
      wizardState: null,
      serverState: null,
      localChanges: null,
      error: null,
      polling: initialPollingState,
      settings: null
      // Navigation state removed - reset handled by navigating to /investigation/settings
    }),

    // Cache management actions
    clearCache: async (investigationId?: string) => {
      try {
        if (investigationId) {
          // Clear specific investigation cache
          await clearInvestigationCache(investigationId);
        } else {
          // Clear all browser cache
          await clearBrowserCache();
        }
        console.log('[WizardStore] Cache cleared successfully', { investigationId });
      } catch (error) {
        console.error('[WizardStore] Failed to clear cache:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to clear cache' });
      }
    },

    clearAndReset: async () => {
      try {
        // Clear all browser cache
        await clearBrowserCache();
        // Reset wizard state
        set({
          currentStep: WizardStep.SETTINGS,
          completedSteps: [],
          wizardState: null,
          serverState: null,
          localChanges: null,
          error: null,
          polling: initialPollingState
        });
        console.log('[WizardStore] Cache cleared and wizard reset successfully');
      } catch (error) {
        console.error('[WizardStore] Failed to clear cache and reset:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to clear cache and reset' });
      }
    }
  };
}

// Re-export createBackwardCompatActions for backward compatibility
export { createBackwardCompatActions } from './wizardBackwardCompat';
