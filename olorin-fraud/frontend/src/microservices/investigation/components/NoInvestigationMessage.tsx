/**
 * No Investigation Message
 * Feature: 004-new-olorin-frontend
 *
 * Message displayed when no investigation is in progress.
 */

import React from 'react';
import { WizardButton } from '@shared/components';

interface NoInvestigationMessageProps {
  canGoPrevious: boolean;
  onGoBack: () => void;
}

export const NoInvestigationMessage: React.FC<NoInvestigationMessageProps> = ({
  canGoPrevious,
  onGoBack
}) => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <p className="text-corporate-textSecondary">No investigation in progress</p>
        {canGoPrevious && (
          <WizardButton onClick={onGoBack} variant="secondary" className="mt-4">
            Back to Settings
          </WizardButton>
        )}
      </div>
    </div>
  );
};
