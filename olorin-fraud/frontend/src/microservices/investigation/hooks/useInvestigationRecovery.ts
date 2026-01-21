/**
 * Investigation Recovery Hook
 * Feature: 004-new-olorin-frontend
 *
 * Handles URL-based investigation state recovery and wizard step synchronization.
 * Extracted from InvestigationWizard to maintain < 200 line limit.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWizardStore } from '@shared/store/wizardStore';

export function useInvestigationRecovery() {
  const [searchParams] = useSearchParams();
  const wizardState = useWizardStore((state) => state.wizardState);
  const loadState = useWizardStore((state) => state.loadState);
  
  // Navigation state removed - URL is the source of truth
  // Step mapping removed - URL path determines the step

  const hasAttemptedLoadRef = useRef(false);
  const hasCompletedInitialStepMappingRef = useRef(false);
  const [isLoadingInvestigation, setIsLoadingInvestigation] = useState(false);

  // Check for investigation ID in URL and recover state on mount/refresh
  useEffect(() => {
    const investigationIdFromUrl = searchParams.get('id');

    if (investigationIdFromUrl && !hasAttemptedLoadRef.current) {
      hasAttemptedLoadRef.current = true;
      console.log('🔍 [useInvestigationRecovery] Investigation ID found in URL:', investigationIdFromUrl);

      if (wizardState?.investigation_id === investigationIdFromUrl) {
        console.log('✅ [useInvestigationRecovery] Investigation already loaded, skipping');
        return;
      }

      const recoverInvestigation = async () => {
        setIsLoadingInvestigation(true);
        try {
          console.log('📡 [useInvestigationRecovery] Loading investigation state from server...');
          await loadState(investigationIdFromUrl);
          console.log('✅ [useInvestigationRecovery] Investigation state loaded successfully');
        } catch (error) {
          console.error('❌ [useInvestigationRecovery] Failed to load investigation:', error);
        } finally {
          setIsLoadingInvestigation(false);
        }
      };

      recoverInvestigation();
    }
  }, [searchParams, loadState, wizardState?.investigation_id]);

  // Step mapping removed - URL path determines the step
  // Navigation is handled via React Router, not store

  return { isLoadingInvestigation };
}
