/**
 * Settings Page Header Component
 * Feature: 006-hybrid-graph-integration
 *
 * Displays page title and wizard progress indicator.
 */

import React from 'react';
import { WizardProgressIndicator } from '@shared/components';

interface SettingsPageHeaderProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

export function SettingsPageHeader({
  currentStep,
  completedSteps,
  onStepClick
}: SettingsPageHeaderProps) {
  return (
    <div className="bg-black/50 backdrop-blur border-b border-corporate-borderPrimary">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-corporate-textPrimary mb-4">
          Investigation Settings
        </h1>
        <WizardProgressIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={onStepClick}
        />
      </div>
    </div>
  );
}
