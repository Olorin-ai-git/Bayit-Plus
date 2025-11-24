/**
 * Investigation Logs Hook
 * Feature: 004-new-olorin-frontend
 *
 * Manages log entries for investigation progress.
 */

import { useState, useCallback, useEffect } from 'react';
import type { LogEntry } from '@shared/components';
import type { WizardSettings } from '@shared/types/wizard.types';
import type { InvestigationProgress } from '@shared/types/investigation';

/**
 * Hook to manage investigation log entries
 */
export function useInvestigationLogs(
  settings: WizardSettings | null,
  investigationData?: InvestigationProgress | null
) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize with starting log entry (only once)
  useEffect(() => {
    if (!settings || hasInitialized) return;

    // Use investigation data if available (has real entity count from backend)
    // Otherwise fall back to settings entities
    const entityCount = investigationData?.entities?.length ?? settings.entities.length ?? 0;

    const initialLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Investigation started for ${entityCount} entity(ies)`,
      source: 'system'
    };
    setLogs([initialLog]);
    setHasInitialized(true);
  }, [settings, investigationData, hasInitialized]);

  // Add a new log entry
  const addLog = useCallback((log: LogEntry) => {
    setLogs((prev) => [...prev, log]);
  }, []);

  return { logs, addLog };
}
