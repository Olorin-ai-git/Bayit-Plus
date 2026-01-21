/**
 * Wizard Navigation Hook
 * Feature: 004-new-olorin-frontend
 *
 * Custom hook for managing Investigation Wizard navigation.
 * Provides navigation between steps with validation.
 */

import { useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { WizardStep } from '@shared/types/wizardState';

// Code loaded - Use wizardState.ts for uppercase enum values

// Step to URL path mapping
const stepToPath: Record<WizardStep, string> = {
  [WizardStep.SETTINGS]: '/investigation/settings',
  [WizardStep.PROGRESS]: '/investigation/progress'
};

// Path to step mapping
const pathToStep: Record<string, WizardStep> = {
  '/investigation/wizard': WizardStep.SETTINGS,
  '/investigation/settings': WizardStep.SETTINGS,
  '/investigation/progress': WizardStep.PROGRESS
};

export interface WizardNavigationResult {
  currentStep: WizardStep;
  completedSteps: WizardStep[]; // Derived from investigation status or always empty (URL-based)
  canGoNext: boolean;
  canGoPrevious: boolean;
  goNext: () => void;
  goPrevious: () => void;
  goToStep: (step: WizardStep) => void;
  isStepAccessible: (step: WizardStep) => boolean;
}

/**
 * Hook for wizard navigation with validation
 * CRITICAL: URL is the single source of truth - no store sync needed
 */
export const useWizardNavigation = (): WizardNavigationResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Derive current step from URL - URL is the source of truth
  const currentStep = pathToStep[location.pathname] || WizardStep.SETTINGS;
  
  // Completed steps - always empty for URL-based navigation
  // Can be derived from investigation status if needed
  const completedSteps: WizardStep[] = [];

  // Step order
  const stepOrder: WizardStep[] = [
    WizardStep.SETTINGS,
    WizardStep.PROGRESS
  ];

  // Get current step index
  const getCurrentStepIndex = useCallback((): number => {
    return stepOrder.indexOf(currentStep);
  }, [currentStep]);

  // Check if can go to next step
  const canGoNext = useCallback((): boolean => {
    const currentIndex = getCurrentStepIndex();
    return currentIndex < stepOrder.length - 1;
  }, [getCurrentStepIndex]);

  // Check if can go to previous step
  const canGoPrevious = useCallback((): boolean => {
    const currentIndex = getCurrentStepIndex();
    return currentIndex > 0;
  }, [getCurrentStepIndex]);

  // Check if step is accessible
  const isStepAccessible = useCallback(
    (step: WizardStep): boolean => {
      // Settings is always accessible (can go back anytime)
      if (step === WizardStep.SETTINGS) {
        return true;
      }

      // Current step is always accessible
      if (step === currentStep) {
        return true;
      }

      // Progress is accessible if we have an investigation ID in URL
      if (step === WizardStep.PROGRESS) {
        return !!searchParams.get('id');
      }

      return false;
    },
    [currentStep, searchParams]
  );

  // Navigate to next step
  const goNext = useCallback(() => {
    console.log('🔀 [useWizardNavigation] goNext() called');
    console.log('🔀 [useWizardNavigation] Current step:', currentStep);
    console.log('🔀 [useWizardNavigation] Can go next:', canGoNext());

    if (!canGoNext()) {
      console.warn('⚠️ [useWizardNavigation] Cannot go to next step');
      return;
    }

    const currentIndex = getCurrentStepIndex();
    const nextStep = stepOrder[currentIndex + 1];
    const nextPath = stepToPath[nextStep];
    const investigationId = searchParams.get('id');

    console.log('🔀 [useWizardNavigation] Current index:', currentIndex);
    console.log('🔀 [useWizardNavigation] Next step:', nextStep);

    // Navigate to URL - preserve investigation ID if present
    if (nextStep === WizardStep.PROGRESS && investigationId) {
      navigate(`${nextPath}?id=${investigationId}`, { replace: true });
    } else {
      navigate(nextPath, { replace: true });
    }
    console.log('✅ [useWizardNavigation] Navigated to:', nextPath);
  }, [canGoNext, getCurrentStepIndex, navigate, searchParams]);

  // Navigate to previous step
  const goPrevious = useCallback(() => {
    console.log('🔙 [useWizardNavigation] goPrevious() called');
    console.log('🔙 [useWizardNavigation] Current step:', currentStep);
    console.log('🔙 [useWizardNavigation] Can go previous:', canGoPrevious());

    if (!canGoPrevious()) {
      console.warn('⚠️ [useWizardNavigation] Cannot go to previous step');
      return;
    }

    const currentIndex = getCurrentStepIndex();
    const previousStep = stepOrder[currentIndex - 1];
    const previousPath = stepToPath[previousStep];

    console.log('🔙 [useWizardNavigation] Current index:', currentIndex);
    console.log('🔙 [useWizardNavigation] Previous step:', previousStep);
    console.log('🔙 [useWizardNavigation] Previous path:', previousPath);

    // Navigate to URL
    // If going back to Settings, remove investigation ID from URL params by clearing search
    if (previousStep === WizardStep.SETTINGS) {
      console.log('🧹 [useWizardNavigation] Removing investigation ID from URL (going to Settings)');
      navigate(
        { pathname: previousPath, search: '' },
        { replace: true }
      );
    } else {
      navigate(previousPath, { replace: true });
    }
    console.log('✅ [useWizardNavigation] Navigated to URL:', previousPath);
  }, [canGoPrevious, getCurrentStepIndex, navigate]);

  // Navigate to specific step
  const goToStep = useCallback(
    (step: WizardStep) => {
      console.log('🎯 [useWizardNavigation] goToStep() called for step:', step);

      if (!isStepAccessible(step)) {
        console.warn('⚠️ [useWizardNavigation] Step not accessible:', step);
        return;
      }

      const targetPath = stepToPath[step];
      const investigationId = searchParams.get('id');

      // If navigating to Settings, remove investigation ID from URL
      if (step === WizardStep.SETTINGS) {
        console.log('🧹 [useWizardNavigation] Navigating to Settings - removing investigation ID from URL');
        navigate(
          { pathname: targetPath, search: '' },
          { replace: true }
        );
      } else if (step === WizardStep.PROGRESS && investigationId) {
        // Preserve investigation ID when navigating to Progress
        navigate(`${targetPath}?id=${investigationId}`, { replace: true });
      } else {
        navigate(targetPath, { replace: true });
      }
    },
    [isStepAccessible, navigate, searchParams]
  );

  return {
    currentStep,
    completedSteps,
    canGoNext: canGoNext(),
    canGoPrevious: canGoPrevious(),
    goNext,
    goPrevious,
    goToStep,
    isStepAccessible
  };
};
