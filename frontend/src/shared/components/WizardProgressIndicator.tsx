/**
 * WizardProgressIndicator Component
 * Feature: 004-new-olorin-frontend
 *
 * 2-step wizard progress indicator with numbered circles.
 * Shows Settings → Progress navigation flow.
 */

import React from 'react';
import { WizardStep } from '@shared/types/wizardState'; // Use wizardState.ts for uppercase enum values

export interface WizardProgressIndicatorProps {
  /** Current active step */
  currentStep?: WizardStep;
  /** Steps that have been completed */
  completedSteps?: WizardStep[];
  /** Callback when clicking on completed step (for navigation) */
  onStepClick?: (step: WizardStep) => void;
}

interface StepConfig {
  key: WizardStep;
  label: string;
  number: number;
}

const steps: StepConfig[] = [
  { key: WizardStep.SETTINGS, label: 'Settings', number: 1 },
  { key: WizardStep.PROGRESS, label: 'Progress', number: 2 }
];

/**
 * WizardProgressIndicator component
 */
export const WizardProgressIndicator: React.FC<WizardProgressIndicatorProps> = ({
  currentStep = WizardStep.SETTINGS,
  completedSteps = [],
  onStepClick
}) => {
  const isCompleted = (step: WizardStep) => completedSteps?.includes(step) ?? false;
  const isActive = (step: WizardStep) => currentStep === step;

  // Allow clicking on Settings step always, or on any completed step
  const isClickable = (step: WizardStep) => {
    if (!onStepClick) return false;
    // Always allow navigation to Settings (Step 1)
    // Check both string comparison and enum value
    if (step === WizardStep.SETTINGS || step === 'SETTINGS') return true;
    // Allow navigation to completed steps
    return isCompleted(step);
  };

  const getStepClasses = (step: WizardStep) => {
    const baseClasses = 'flex items-center justify-center w-12 h-12 rounded-full border-2 font-semibold transition-all duration-200';
    const clickable = isClickable(step);

    if (isActive(step)) {
      // Active step - add cursor pointer if clickable (Settings step can be clicked even when active)
      return `${baseClasses} border-corporate-accentPrimary bg-corporate-accentPrimary text-white shadow-lg shadow-corporate-accentPrimary/40 ${
        clickable ? 'cursor-pointer hover:scale-110' : ''
      }`;
    }

    if (isCompleted(step)) {
      // Completed step - always clickable if onStepClick is provided
      return `${baseClasses} border-corporate-accentPrimary bg-corporate-accentPrimary text-white shadow-lg shadow-corporate-accentPrimary/40 ${
        clickable ? 'cursor-pointer hover:scale-110' : ''
      }`;
    }

    // Future/incomplete step - Settings is still clickable
    return `${baseClasses} border-corporate-borderPrimary bg-black/30 backdrop-blur text-corporate-textSecondary ${
      clickable ? 'cursor-pointer hover:bg-black/40 hover:border-corporate-accentSecondary' : ''
    } transition-all`;
  };

  const getConnectorClasses = (index: number) => {
    const step = steps[index];
    const isCompletedOrActive = isCompleted(step.key) || isActive(step.key);

    return `flex-1 h-1 mx-2 rounded ${
      isCompletedOrActive
        ? 'bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary'
        : 'bg-corporate-borderPrimary/50'
    }`;
  };

  const handleStepClick = (step: WizardStep) => {
    console.log(`🧭 [WizardProgressIndicator] Step clicked: ${step}, isClickable: ${isClickable(step)}, onStepClick exists: ${!!onStepClick}`);

    if (isClickable(step) && onStepClick) {
      console.log(`🧭 [WizardProgressIndicator] Calling onStepClick for step: ${step}`);
      onStepClick(step);
    } else {
      console.log(`⚠️ [WizardProgressIndicator] Cannot navigate - isClickable: ${isClickable(step)}, onStepClick: ${!!onStepClick}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={getStepClasses(step.key)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`🎯 [WizardProgressIndicator] onClick fired for step: ${step.key}`);
                  handleStepClick(step.key);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isClickable(step.key)) {
                    handleStepClick(step.key);
                  }
                }}
                role={isClickable(step.key) ? 'button' : undefined}
                tabIndex={isClickable(step.key) ? 0 : undefined}
                aria-label={`${step.label} - Step ${step.number} of ${steps.length}${
                  isActive(step.key) ? ' (current)' : ''
                }${isCompleted(step.key) ? ' (completed)' : ''}${
                  step.key === WizardStep.SETTINGS ? ' (clickable)' : ''
                }`}
                title={step.key === WizardStep.SETTINGS ? 'Click to go back to Settings' : undefined}
              >
                {isCompleted(step.key) ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive(step.key)
                    ? 'text-corporate-textPrimary'
                    : 'text-corporate-textTertiary'
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div className={getConnectorClasses(index)} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
