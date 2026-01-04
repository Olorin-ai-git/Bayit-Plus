/**
 * Progress Lifecycle Hook
 * Feature: 007-progress-wizard-page
 *
 * Manages hybrid graph polling lifecycle and simulation effects
 */

import React from 'react';
import { useWizardStore } from '@shared/store/wizardStore';
import { WizardStep } from '@shared/types/wizardState';

interface LifecycleCallbacks {
  startHybridPolling: () => void;
  stopHybridPolling: () => void;
  updatePhaseProgress: (phaseId: string, progress: number) => void;
  updateToolStatus: (toolId: string, status: string) => void;
  addAnomaly: (anomaly: any) => void;
  addRelationship: (relationship: any) => void;
  updateAgentMetrics: (metrics: any) => void;
}

interface HybridStatusInfo {
  status?: string;
}

export function useProgressLifecycle(
  isHybridGraph: boolean,
  investigationId: string | null,
  hybridStatus: HybridStatusInfo | null,
  callbacks: LifecycleCallbacks
) {
  const markStepCompleted = useWizardStore((state) => state.markStepCompleted);

  // Track if we've already marked steps as completed to prevent infinite loops
  const stepsMarkedRef = React.useRef(false);

  // Hybrid graph polling lifecycle management
  React.useEffect(() => {
    if (isHybridGraph && investigationId) {
      callbacks.startHybridPolling();
      return () => callbacks.stopHybridPolling();
    }
  }, [isHybridGraph, investigationId, callbacks]);

  // Investigation completion - mark PROGRESS as completed when investigation completes (only once)
  React.useEffect(() => {
    if (isHybridGraph && hybridStatus?.status === 'completed' && !stepsMarkedRef.current) {
      console.log('🎯 [useProgressLifecycle] Investigation completed, marking progress as complete');
      stepsMarkedRef.current = true;
      // Mark PROGRESS step as completed
      markStepCompleted(WizardStep.PROGRESS);
    }
  }, [isHybridGraph, hybridStatus?.status]);
}
