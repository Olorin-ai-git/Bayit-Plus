/**
 * React Hook for Wizard State Management - Feature: 005-polling-and-persistence
 * Provides optimistic updates, auto-save, conflict resolution, and proper cleanup.
 * SYSTEM MANDATE compliant: config-driven, complete implementation, no placeholders.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { WizardState, WizardStateCreate } from '../types/wizardState';
import { wizardStateService } from '../services/wizardStateService';
import { WizardStateError, VersionConflictError } from '../services/wizardStateService.errors';
import { getConfig } from '../config/env.config';
import {
  isDirty as checkDirty,
  applyUpdates,
  extractConflictInfo,
  resolveConflict,
  ConflictInfo,
  StateSetters,
  loadStateOperation,
  createStateOperation,
  deleteStateOperation,
} from './useWizardState.utils';

export interface UseWizardStateOptions {
  investigationId: string;
  autoLoad?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  onConflict?: (conflict: ConflictInfo) => Promise<'use-local' | 'use-server' | 'merge'>;
  onError?: (error: WizardStateError) => void;
}
export interface UseWizardStateReturn {
  state: WizardState | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: WizardStateError | null;
  isDirty: boolean;
  lastSyncedAt: Date | null;
  loadState: () => Promise<void>;
  updateState: (updates: Partial<WizardState>) => Promise<void>;
  createState: (data: WizardStateCreate) => Promise<void>;
  deleteState: () => Promise<void>;
  refreshState: () => Promise<void>;
  resetState: () => void;
  resolveConflict: (strategy: 'use-local' | 'use-server' | 'merge') => Promise<void>;
}

export function useWizardState(options: UseWizardStateOptions): UseWizardStateReturn {
  const config = getConfig();
  const autoSaveMs = options.autoSaveInterval || config.ui.autoSaveInterval;

  const [localState, setLocalState] = useState<WizardState | null>(null);
  const [serverState, setServerState] = useState<WizardState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<WizardStateError | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isDirty = checkDirty(localState, serverState);

  const setters: StateSetters = {
    setLocalState,
    setServerState,
    setIsLoading,
    setIsSyncing,
    setError,
    setLastSyncedAt,
    setConflictInfo,
  };

  const loadState = useCallback(async () => {
    await loadStateOperation(
      options.investigationId,
      setters,
      () => isMountedRef.current,
      options.onError
    );
  }, [options.investigationId, options.onError]);

  const updateState = useCallback(
    async (updates: Partial<WizardState>) => {
      if (!localState) return;

      const optimisticState = applyUpdates(localState, updates);
      setLocalState(optimisticState);
      setIsSyncing(true);
      setError(null);

      try {
        const savedState = await wizardStateService.updateState(
          options.investigationId,
          { ...updates, version: localState.version }
        );

        if (isMountedRef.current) {
          setLocalState(savedState);
          setServerState(savedState);
          setLastSyncedAt(new Date());
        }
      } catch (err) {
        const wizardError = err as WizardStateError;

        if (wizardError instanceof VersionConflictError && options.onConflict) {
          const conflict = extractConflictInfo(wizardError, optimisticState);
          setConflictInfo(conflict);
          const resolution = await options.onConflict(conflict);
          const resolvedState = resolveConflict(resolution, conflict);
          if (isMountedRef.current) {
            setLocalState(resolvedState);
            setServerState(resolvedState);
          }
        } else {
          if (isMountedRef.current) {
            setLocalState(serverState);
            setError(wizardError);
            options.onError?.(wizardError);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setIsSyncing(false);
        }
      }
    },
    [localState, serverState, options.investigationId, options.onConflict, options.onError]
  );

  const createState = useCallback(
    async (data: WizardStateCreate) => {
      await createStateOperation(data, setters, () => isMountedRef.current, options.onError);
    },
    [options.onError]
  );

  const deleteState = useCallback(async () => {
    await deleteStateOperation(
      options.investigationId,
      setters,
      () => isMountedRef.current,
      options.onError
    );
  }, [options.investigationId, options.onError]);

  const refreshState = useCallback(() => loadState(), [loadState]);
  const resetState = useCallback(() => {
    setLocalState(null);
    setServerState(null);
    setError(null);
    setLastSyncedAt(null);
    setConflictInfo(null);
  }, []);
  const resolveConflictManually = useCallback(
    async (strategy: 'use-local' | 'use-server' | 'merge') => {
      if (!conflictInfo) return;
      const resolvedState = resolveConflict(strategy, conflictInfo);
      setLocalState(resolvedState);
      setServerState(resolvedState);
      setConflictInfo(null);
      await updateState(resolvedState);
    },
    [conflictInfo, updateState]
  );
  useEffect(() => {
    if (options.autoLoad) loadState();
  }, [options.autoLoad, loadState]);
  useEffect(() => {
    if (options.autoSave && isDirty && !isSyncing && localState) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => updateState(localState), autoSaveMs);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [options.autoSave, isDirty, isSyncing, localState, autoSaveMs, updateState]);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  return {
    state: localState,
    isLoading,
    isSyncing,
    error,
    isDirty,
    lastSyncedAt,
    loadState,
    updateState,
    createState,
    deleteState,
    refreshState,
    resetState,
    resolveConflict: resolveConflictManually,
  };
}
