/**
 * Settings Page Validation Utilities
 * Feature: 006-hybrid-graph-integration
 *
 * Generates validation items for Settings Page supporting both
 * structured and hybrid graph investigation modes.
 */

import type { InvestigationSettings } from '@shared/types/wizard.types';
import type { EntityType } from '../types/hybridGraphTypes';

interface ValidationItem {
  id: string;
  label: string;
  isValid: boolean;
  message: string;
  severity: 'error';
}

interface HybridConfig {
  entityType: EntityType;
  entityId: string;
  timeRange: { start: string; end: string };
}

export function getValidationItems(
  useHybridGraph: boolean,
  settings: InvestigationSettings | null,
  hybridConfig: HybridConfig | null
): ValidationItem[] {
  if (useHybridGraph) {
    return [
      {
        id: 'hybridEntity',
        label: 'Entity Configuration',
        isValid: hybridConfig !== null && !!hybridConfig.entityId,
        message: hybridConfig?.entityId ? 'Entity configured' : 'Entity required',
        severity: 'error' as const
      },
      {
        id: 'hybridTimeRange',
        label: 'Time Range',
        isValid:
          hybridConfig !== null &&
          !!hybridConfig.timeRange.start &&
          !!hybridConfig.timeRange.end,
        message: hybridConfig?.timeRange.start ? 'Time range configured' : 'Time range required',
        severity: 'error' as const
      },
      {
        id: 'tools',
        label: 'Investigation Tools',
        isValid: !!settings?.toolSelections && settings.toolSelections.filter((t) => t.isEnabled).length > 0,
        message: settings?.toolSelections
          ? `${settings.toolSelections.filter((t) => t.isEnabled).length} tool(s) selected`
          : 'At least one tool required',
        severity: 'error' as const
      }
    ];
  }

  return [
    {
      id: 'name',
      label: 'Investigation Name',
      isValid: !!settings?.name && settings.name.length > 0,
      message: settings?.name ? 'Valid' : 'Name is required',
      severity: 'error' as const
    },
    {
      id: 'entities',
      label: 'Entities',
      isValid: !!settings?.entities && settings.entities.length > 0,
      message: settings?.entities?.length
        ? `${settings.entities.length} entity(ies) added`
        : 'At least one entity required',
      severity: 'error' as const
    },
    {
      id: 'timeRange',
      label: 'Time Range',
      isValid: !!settings?.timeRange,
      message: settings?.timeRange ? 'Valid' : 'Time range required',
      severity: 'error' as const
    },
    {
      id: 'tools',
      label: 'Investigation Tools',
      isValid: !!settings?.toolSelections && settings.toolSelections.filter((t) => t.isEnabled).length > 0,
      message: settings?.toolSelections
        ? `${settings.toolSelections.filter((t) => t.isEnabled).length} tool(s) selected`
        : 'At least one tool required',
      severity: 'error' as const
    }
  ];
}

export function canStartHybridInvestigation(
  hybridConfig: HybridConfig | null,
  settings: InvestigationSettings | null,
  isSubmittingHybrid: boolean
): boolean {
  return (
    hybridConfig !== null &&
    !!hybridConfig.entityId &&
    !!hybridConfig.timeRange.start &&
    !!settings?.toolSelections.filter((t) => t.isEnabled).length &&
    !isSubmittingHybrid
  );
}
