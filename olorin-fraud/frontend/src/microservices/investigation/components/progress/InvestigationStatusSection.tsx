/**
 * Investigation Status Section
 * Feature: 004-new-olorin-frontend, 007-progress-wizard-page
 *
 * Displays investigation overview status.
 * Uses live progress data when available for real-time entity/tool counts.
 */

import React from 'react';
import { InvestigationStatus } from '@shared/components';
import type { Investigation, WizardSettings } from '@shared/types/wizard.types';
import type { InvestigationProgress } from '@shared/types/investigation';

interface InvestigationStatusSectionProps {
  investigation: Investigation;
  settings: WizardSettings;
  progress?: InvestigationProgress | null;
}

export const InvestigationStatusSection: React.FC<InvestigationStatusSectionProps> = React.memo(({
  investigation,
  settings,
  progress
}) => {
  // Use live progress data if available, fallback to static settings
  const entityCount = progress?.entities?.length ?? settings.entities.length;
  const toolCount = progress?.totalTools ?? (settings.tools || []).filter((t) => t.isEnabled).length;

  return (
    <InvestigationStatus
      investigationId={investigation.id}
      status={investigation.status}
      entityCount={entityCount}
      toolCount={toolCount}
      startTime={investigation.createdAt}
      className="mb-8"
    />
  );
});
