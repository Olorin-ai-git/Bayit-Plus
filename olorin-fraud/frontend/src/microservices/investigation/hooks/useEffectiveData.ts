/**
 * Effective Data Hook
 * Feature: 007-progress-wizard-page
 *
 * Creates fallback investigation and settings when missing
 */

import React from 'react';
import type { Investigation, WizardSettings } from '@shared/types/wizard.types';

interface UseEffectiveDataResult {
  effectiveInvestigation: Investigation | null;
  effectiveSettings: WizardSettings;
}

export function useEffectiveData(
  investigation: Investigation | null | undefined,
  settings: WizardSettings | null | undefined,
  structuredInvestigationId: string | null
): UseEffectiveDataResult {
  const effectiveInvestigation = React.useMemo(() => {
    // CRITICAL: URL investigation ID is the source of truth
    // If URL ID is provided, use it even if store has a different investigation
    if (structuredInvestigationId) {
      // If store investigation matches URL ID, use store (has more data)
      // Otherwise, create new investigation from URL ID
      if (investigation?.id === structuredInvestigationId) {
        return investigation;
      } else {
        return {
          id: structuredInvestigationId,
          status: 'running',
          name: `Investigation ${structuredInvestigationId.slice(0, 8)}...`
        } as Investigation;
      }
    }
    // Fallback to store investigation if no URL ID
    return investigation || null;
  }, [investigation, structuredInvestigationId]);

  const effectiveSettings = React.useMemo(() => {
    return settings || {
      entities: [],
      primaryEntityId: null,
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      tools: [],
      correlationMode: 'OR' as const,
      executionMode: 'parallel' as const,
      riskThreshold: 50,
      notificationEmail: '',
      investigationMode: 'risk_based' as const,
      investigationType: 'structured' as const
    } as WizardSettings;
  }, [settings]);

  return { effectiveInvestigation, effectiveSettings };
}
