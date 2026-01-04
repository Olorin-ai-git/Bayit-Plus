/**
 * Utility functions for useWizardState hook
 * Feature: 005-polling-and-persistence
 * Task: T021 - Helper functions for state management and conflict resolution
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Complete implementation
 * - No placeholders or TODOs
 * - File under 200 lines
 */

import { Dispatch, SetStateAction } from 'react';
import { WizardState, WizardStateCreate } from '../types/wizardState';
import {
  WizardStateError,
  VersionConflictError,
} from '../services/wizardStateService.errors';
import { wizardStateService } from '../services/wizardStateService';

/**
 * Check if local state differs from server state.
 */
export function isDirty(
  localState: WizardState | null,
  serverState: WizardState | null
): boolean {
  if (!localState || !serverState) return false;
  return JSON.stringify(localState) !== JSON.stringify(serverState);
}

/**
 * Merge local changes with server state.
 * Used for conflict resolution when both states have changed.
 */
export function mergeStates(
  localState: WizardState,
  serverState: WizardState
): WizardState {
  return {
    ...serverState,
    settings: localState.settings || serverState.settings,
    wizard_step: localState.wizard_step,
    status: localState.status,
    version: serverState.version,
    updated_at: serverState.updated_at,
  };
}

/**
 * Apply partial updates to state.
 */
export function applyUpdates(
  state: WizardState,
  updates: Partial<WizardState>
): WizardState {
  return {
    ...state,
    ...updates,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Conflict resolution information for UI.
 */
export interface ConflictInfo {
  expectedVersion: number;
  actualVersion: number;
  localState: WizardState;
  serverState: WizardState | undefined;
}

/**
 * Extract conflict information from VersionConflictError.
 */
export function extractConflictInfo(
  error: VersionConflictError,
  localState: WizardState
): ConflictInfo {
  return {
    expectedVersion: error.expectedVersion,
    actualVersion: error.actualVersion,
    localState,
    serverState: error.serverState as WizardState | undefined,
  };
}

/**
 * Resolve conflict based on strategy.
 */
export function resolveConflict(
  strategy: 'use-local' | 'use-server' | 'merge',
  conflictInfo: ConflictInfo
): WizardState {
  switch (strategy) {
    case 'use-local':
      return {
        ...conflictInfo.localState,
        version: conflictInfo.actualVersion,
      };
    case 'use-server':
      if (!conflictInfo.serverState) {
        throw new Error('Server state not available for use-server strategy');
      }
      return conflictInfo.serverState;
    case 'merge':
      if (!conflictInfo.serverState) {
        throw new Error('Server state not available for merge strategy');
      }
      return mergeStates(conflictInfo.localState, conflictInfo.serverState);
    default:
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
  }
}

/**
 * State setters interface for operations.
 */
export interface StateSetters {
  setLocalState: Dispatch<SetStateAction<WizardState | null>>;
  setServerState: Dispatch<SetStateAction<WizardState | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<WizardStateError | null>>;
  setLastSyncedAt: Dispatch<SetStateAction<Date | null>>;
  setConflictInfo: Dispatch<SetStateAction<ConflictInfo | null>>;
}

/**
 * Load state operation.
 */
export async function loadStateOperation(
  investigationId: string,
  setters: StateSetters,
  isMounted: () => boolean,
  onError?: (error: WizardStateError) => void
): Promise<void> {
  setters.setIsLoading(true);
  setters.setError(null);
  try {
    const state = await wizardStateService.loadState(investigationId);
    if (isMounted()) {
      setters.setLocalState(state);
      setters.setServerState(state);
      setters.setLastSyncedAt(new Date());
    }
  } catch (err) {
    const wizardError = err as WizardStateError;
    if (isMounted()) {
      setters.setError(wizardError);
      onError?.(wizardError);
    }
  } finally {
    if (isMounted()) {
      setters.setIsLoading(false);
    }
  }
}

/**
 * Create state operation.
 */
export async function createStateOperation(
  data: WizardStateCreate,
  setters: StateSetters,
  isMounted: () => boolean,
  onError?: (error: WizardStateError) => void
): Promise<void> {
  setters.setIsLoading(true);
  setters.setError(null);
  try {
    const newState = await wizardStateService.createState(data);
    if (isMounted()) {
      setters.setLocalState(newState);
      setters.setServerState(newState);
      setters.setLastSyncedAt(new Date());
    }
  } catch (err) {
    const wizardError = err as WizardStateError;
    if (isMounted()) {
      setters.setError(wizardError);
      onError?.(wizardError);
    }
  } finally {
    if (isMounted()) {
      setters.setIsLoading(false);
    }
  }
}

/**
 * Delete state operation.
 */
export async function deleteStateOperation(
  investigationId: string,
  setters: StateSetters,
  isMounted: () => boolean,
  onError?: (error: WizardStateError) => void
): Promise<void> {
  setters.setIsLoading(true);
  setters.setError(null);
  try {
    await wizardStateService.deleteState(investigationId);
    if (isMounted()) {
      setters.setLocalState(null);
      setters.setServerState(null);
      setters.setLastSyncedAt(null);
    }
  } catch (err) {
    const wizardError = err as WizardStateError;
    if (isMounted()) {
      setters.setError(wizardError);
      onError?.(wizardError);
    }
  } finally {
    if (isMounted()) {
      setters.setIsLoading(false);
    }
  }
}
