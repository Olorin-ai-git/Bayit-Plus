/**
 * Elapsed Time Hook
 * Feature: 007-progress-wizard-page
 *
 * Calculates elapsed time from investigation start with live updates every second
 * Handles clock skew and continuously updates until investigation completes
 */

import React from 'react';
import type { InvestigationProgress } from '@shared/types/investigation';
import type { Investigation } from '@shared/types/wizard.types';

export function useElapsedTime(
  structuredProgress: InvestigationProgress | null | undefined,
  effectiveInvestigation: Investigation | undefined | null
): number {
  const [elapsedTime, setElapsedTime] = React.useState<number>(0);

  // Determine the start time from available sources
  const startTime = React.useMemo(() => {
    // Priority 1: startedAt from progress
    if (structuredProgress?.startedAt) {
      return new Date(structuredProgress.startedAt).getTime();
    }
    // Priority 2: createdAt from progress
    if (structuredProgress?.createdAt) {
      return new Date(structuredProgress.createdAt).getTime();
    }
    // Priority 3: createdAt from investigation
    if (effectiveInvestigation?.createdAt) {
      return new Date(effectiveInvestigation.createdAt).getTime();
    }
    return null;
  }, [structuredProgress?.startedAt, structuredProgress?.createdAt, effectiveInvestigation?.createdAt]);

  // Check if investigation is in a terminal state
  const isTerminalState = React.useMemo(() => {
    const status = structuredProgress?.status || effectiveInvestigation?.status;
    const lifecycleStage = (structuredProgress as any)?.lifecycleStage || (structuredProgress as any)?.lifecycle_stage;

    return (
      status === 'COMPLETED' ||
      status === 'completed' ||
      status === 'FAILED' ||
      status === 'failed' ||
      status === 'ERROR' ||
      status === 'error' ||
      status === 'CANCELLED' ||
      status === 'cancelled' ||
      lifecycleStage === 'completed' ||
      lifecycleStage === 'COMPLETED'
    );
  }, [structuredProgress?.status, effectiveInvestigation?.status, structuredProgress]);

  // Update elapsed time every second if investigation is active
  React.useEffect(() => {
    if (!startTime) {
      setElapsedTime(0);
      return;
    }

    // Calculate initial elapsed time
    const updateElapsedTime = () => {
      const currentTime = Date.now();
      const elapsed = Math.floor((currentTime - startTime) / 1000);
      setElapsedTime(Math.max(0, elapsed));
    };

    // Update immediately
    updateElapsedTime();

    // Stop updating if investigation reached terminal state
    if (isTerminalState) {
      return;
    }

    // Update every second while investigation is running
    const intervalId = setInterval(updateElapsedTime, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [startTime, isTerminalState]);

  return elapsedTime;
}
