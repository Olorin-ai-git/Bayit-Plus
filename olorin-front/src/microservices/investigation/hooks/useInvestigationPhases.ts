/**
 * Investigation Phases Hook
 * Feature: 004-new-olorin-frontend
 *
 * Manages investigation phases and progression logic.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Phase, LogEntry } from '@shared/components';
import type { WizardSettings } from '@shared/types/wizard.types';

/**
 * Hook to manage investigation phases
 */
export function useInvestigationPhases(
  settings: WizardSettings | null,
  addLog: (log: LogEntry) => void
) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [currentPhaseId, setCurrentPhaseId] = useState<string | null>(null);

  // Initialize phases from settings
  useEffect(() => {
    if (!settings) return;

    const now = new Date().toISOString();
    const initialPhases: Phase[] = [
      {
        id: 'initialization',
        name: 'Initialization',
        description: 'Preparing investigation environment and validating settings',
        status: 'running',
        progress: 0,
        startTime: now
      },
      {
        id: 'data_collection',
        name: 'Data Collection',
        description: 'Gathering data from configured sources',
        status: 'pending',
        progress: 0
      },
      {
        id: 'tool_execution',
        name: 'Tool Execution',
        description: 'Running selected investigation tools',
        status: 'pending',
        progress: 0
      },
      {
        id: 'analysis',
        name: 'Analysis',
        description: 'Analyzing collected data and generating insights',
        status: 'pending',
        progress: 0
      },
      {
        id: 'finalization',
        name: 'Finalization',
        description: 'Compiling results and preparing report',
        status: 'pending',
        progress: 0
      }
    ];
    setPhases(initialPhases);
    setCurrentPhaseId('initialization');
  }, [settings]);

  // Update phase progress
  const updatePhaseProgress = useCallback((phaseId: string, progress: number) => {
    setPhases((prev) => {
      const updated = [...prev];
      const phaseIndex = updated.findIndex((p) => p.id === phaseId);

      if (phaseIndex !== -1) {
        updated[phaseIndex].progress = Math.min(progress, 100);

        // Add progress log at milestones
        if (progress % 25 === 0 && progress > 0) {
          const log: LogEntry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `${updated[phaseIndex].name} progress: ${progress}%`,
            source: phaseId
          };
          addLog(log);
        }

        // Complete phase if progress reaches 100
        if (progress >= 100) {
          updated[phaseIndex].status = 'completed';
          updated[phaseIndex].endTime = new Date().toISOString();

          // Move to next phase
          if (phaseIndex < updated.length - 1) {
            updated[phaseIndex + 1].status = 'running';
            updated[phaseIndex + 1].startTime = new Date().toISOString();
            setCurrentPhaseId(updated[phaseIndex + 1].id);

            const log: LogEntry = {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `Starting ${updated[phaseIndex + 1].name}`,
              source: 'system'
            };
            addLog(log);
          }
        }
      }

      return updated;
    });
  }, [addLog]);

  return { phases, currentPhaseId, updatePhaseProgress };
}
