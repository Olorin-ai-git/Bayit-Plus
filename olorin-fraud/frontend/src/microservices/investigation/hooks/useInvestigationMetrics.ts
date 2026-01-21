/**
 * Investigation Metrics Hook
 * Feature: 007-progress-wizard-page
 *
 * Calculates investigation metrics: entities count, tools count, progress percent
 * Extracts data from investigation state API response structure
 */

import React from 'react';
import type { InvestigationProgress } from '@shared/types/investigation';
import type { WizardSettings } from '@shared/types/wizard.types';

export function useInvestigationMetrics(
  effectiveSettings: WizardSettings,
  structuredProgress: InvestigationProgress | null | undefined
) {
  return React.useMemo(() => {
    // Extract entities count from progress object
    // After fix in investigationService.ts, entities are now properly included in progress
    const entitiesCount =
      structuredProgress?.entities?.length ??
      effectiveSettings?.entities?.length ??
      0;

    // Tools count: use totalTools from progress, or calculate from toolExecutions, or fallback to settings
    // Note: Check for undefined/null specifically, not 0 (which is a valid value)
    const toolsCount = structuredProgress?.totalTools !== undefined && structuredProgress?.totalTools !== null
      ? structuredProgress.totalTools
      : (structuredProgress?.toolExecutions?.length ?? 0) ||
        (effectiveSettings.tools || []).filter(t => t.isEnabled).length || 0;

    // Progress percent: use completionPercent from progress
    const progressPercent =
      structuredProgress?.completionPercent ??
      (structuredProgress?.completedTools && structuredProgress?.totalTools
        ? Math.round((structuredProgress.completedTools / structuredProgress?.totalTools) * 100)
        : (structuredProgress?.toolExecutions?.length && structuredProgress?.totalTools
          ? Math.round((structuredProgress.toolExecutions.length / structuredProgress.totalTools) * 100)
          : 0));

    console.log('🎯 [useInvestigationMetrics] Calculated metrics:', {
      entitiesCount,
      toolsCount,
      progressPercent,
      hasStructuredProgress: !!structuredProgress,
      progressEntitiesLength: structuredProgress?.entities?.length,
      effectiveSettingsEntitiesLength: effectiveSettings?.entities?.length,
      totalTools: structuredProgress?.totalTools,
      completedTools: structuredProgress?.completedTools,
      toolExecutionsLength: structuredProgress?.toolExecutions?.length,
      completionPercent: structuredProgress?.completionPercent
    });

    return { entitiesCount, toolsCount, progressPercent };
  }, [effectiveSettings.entities, effectiveSettings.tools, structuredProgress]);
}
