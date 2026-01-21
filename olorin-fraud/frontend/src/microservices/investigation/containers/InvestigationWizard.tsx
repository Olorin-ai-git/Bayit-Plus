/**
 * Investigation Wizard Container
 * Feature: 004-new-olorin-frontend
 *
 * Top-level container for the 2-step Investigation Wizard.
 * Orchestrates navigation between Settings and Progress pages with URL routing.
 * Uses Olorin purple styling with progress indicator and error boundaries.
 *
 * SYSTEM MANDATE Compliance:
 * - NO mock data
 * - NO hardcoded defaults
 * - Fail-fast validation
 * - Under 200 lines
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { WizardProgressIndicator, ErrorBoundary } from '../../../shared/components';
import { SettingsPage, ProgressPage } from '../pages';
import { useWizardStore } from '../../../shared/store/wizardStore';
import { WizardStep } from '../../../shared/types/wizardState';
import { useInvestigationRecovery } from '../hooks/useInvestigationRecovery';

/**
 * Mapping between URL paths and wizard steps
 */
const pathToStep: Record<string, WizardStep> = {
  '/investigation/wizard': WizardStep.SETTINGS,
  '/investigation/settings': WizardStep.SETTINGS,
  '/investigation/progress': WizardStep.PROGRESS
};

const stepToPath: Record<WizardStep, string> = {
  [WizardStep.SETTINGS]: '/investigation/settings',
  [WizardStep.PROGRESS]: '/investigation/progress'
};

/**
 * Investigation Wizard container with URL-based step management
 */
export const InvestigationWizard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // URL-based investigation recovery
  const { isLoadingInvestigation } = useInvestigationRecovery();

  // CRITICAL: Derive current step from URL - URL is the single source of truth
  // No store sync needed - React Router handles navigation
  const currentStep = pathToStep[location.pathname] || WizardStep.SETTINGS;

  // Handle wizard step navigation
  const handleStepClick = (step: WizardStep) => {
    const targetPath = stepToPath[step];
    if (targetPath) {
      console.log(`🧭 [InvestigationWizard] Navigating to step: ${step} -> ${targetPath}`);
      navigate(targetPath);
    }
  };

  const renderStep = () => {
    // Normalize step to uppercase to handle old persisted lowercase values
    const normalizedStep = typeof currentStep === 'string'
      ? currentStep.toUpperCase()
      : currentStep;

    switch (normalizedStep) {
      case WizardStep.SETTINGS:
      case 'SETTINGS':
        return (
          <ErrorBoundary>
            <SettingsPage />
          </ErrorBoundary>
        );
      case WizardStep.PROGRESS:
      case 'PROGRESS':
        return (
          <ErrorBoundary>
            <ProgressPage />
          </ErrorBoundary>
        );
      default:
        console.error('❌ [InvestigationWizard] Invalid step:', currentStep, 'normalized:', normalizedStep);
        // Invalid step - redirect to Settings
        return (
          <ErrorBoundary>
            <SettingsPage />
          </ErrorBoundary>
        );
    }
  };

  // Show loading state while recovering investigation
  if (isLoadingInvestigation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-corporate-accentPrimary mx-auto mb-4"></div>
          <p className="text-corporate-textPrimary text-lg">Loading investigation...</p>
          <p className="text-corporate-textSecondary text-sm mt-2">
            Recovering investigation state from server
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Wizard Progress Indicator */}
      <div className="sticky top-0 z-50 bg-corporate-bgPrimary border-b border-corporate-borderPrimary">
        <WizardProgressIndicator
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Wizard Step Content */}
      <div className="wizard-content">
        {renderStep()}
      </div>
    </div>
  );
};

export default InvestigationWizard;
