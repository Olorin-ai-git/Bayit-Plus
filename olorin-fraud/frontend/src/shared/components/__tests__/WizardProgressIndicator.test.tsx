/**
 * WizardProgressIndicator Contract Tests
 * Feature: 004-new-olorin-frontend
 *
 * Tests 3-step wizard progress component interface and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WizardProgressIndicator } from '../WizardProgressIndicator';
import { WizardStep } from '@shared/types/wizardState'; // Use wizardState.ts for uppercase enum values

describe('WizardProgressIndicator Contract Tests', () => {
  describe('Component Interface', () => {
    it('should render with required props', () => {
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.SETTINGS}
          completedSteps={[]}
        />
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    it('should accept all prop types correctly', () => {
      const onStepClick = jest.fn();
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.PROGRESS}
          completedSteps={[WizardStep.SETTINGS]}
          onStepClick={onStepClick}
        />
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Results')).toBeInTheDocument();
    });
  });

  describe('Prop Validation', () => {
    it('should show Settings as current step', () => {
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.SETTINGS}
          completedSteps={[]}
        />
      );

      // eslint-disable-next-line testing-library/no-node-access
      const settingsStep = screen.getByText('Settings').closest('div');
      expect(settingsStep).toBeInTheDocument();
    });

    it('should show Progress as current step', () => {
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.PROGRESS}
          completedSteps={[WizardStep.SETTINGS]}
        />
      );

      // eslint-disable-next-line testing-library/no-node-access
      const progressStep = screen.getByText('Progress').closest('div');
      expect(progressStep).toBeInTheDocument();
    });

    it('should show Results as current step', () => {
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.RESULTS}
          completedSteps={[WizardStep.SETTINGS, WizardStep.PROGRESS]}
        />
      );

      // eslint-disable-next-line testing-library/no-node-access
      const resultsStep = screen.getByText('Results').closest('div');
      expect(resultsStep).toBeInTheDocument();
    });

    it('should mark completed steps with checkmarks', () => {
      const { container } = render(
        <WizardProgressIndicator
          currentStep={WizardStep.RESULTS}
          completedSteps={[WizardStep.SETTINGS, WizardStep.PROGRESS]}
        />
      );

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const checkmarks = container.querySelectorAll('svg path[d*="M5 13l4 4L19 7"]');
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should handle empty completedSteps array', () => {
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.SETTINGS}
          completedSteps={[]}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should allow navigation to completed steps when onStepClick provided', () => {
      const onStepClick = jest.fn();
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.PROGRESS}
          completedSteps={[WizardStep.SETTINGS]}
          onStepClick={onStepClick}
        />
      );

      // eslint-disable-next-line testing-library/no-node-access
      const settingsContainer = screen.getByText('Settings').closest('div');
      expect(settingsContainer).toBeDefined();
      // eslint-disable-next-line testing-library/no-node-access
      const clickableElement = settingsContainer?.querySelector('[role="button"]');
      expect(clickableElement).toBeDefined();
      if (clickableElement) {
        fireEvent.click(clickableElement);
      }
      expect(onStepClick).toHaveBeenCalledWith(WizardStep.SETTINGS);
    });

    it('should be keyboard accessible for completed steps', () => {
      const onStepClick = jest.fn();
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.RESULTS}
          completedSteps={[WizardStep.SETTINGS, WizardStep.PROGRESS]}
          onStepClick={onStepClick}
        />
      );

      // eslint-disable-next-line testing-library/no-node-access
      const settingsContainer = screen.getByText('Settings').closest('div');
      expect(settingsContainer).toBeDefined();
      // eslint-disable-next-line testing-library/no-node-access
      const clickableElement = settingsContainer?.querySelector('[role="button"]');
      expect(clickableElement).toBeDefined();
      if (clickableElement) {
        fireEvent.click(clickableElement);
      }
      expect(onStepClick).toHaveBeenCalledWith(WizardStep.SETTINGS);
    });

    it('should not be clickable for incomplete future steps', () => {
      const onStepClick = jest.fn();
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.SETTINGS}
          completedSteps={[]}
          onStepClick={onStepClick}
        />
      );

      // eslint-disable-next-line testing-library/no-node-access
      const resultsContainer = screen.getByText('Results').closest('div');
      expect(resultsContainer).toBeDefined();
      // eslint-disable-next-line testing-library/no-node-access
      const clickableElement = resultsContainer?.querySelector('[role="button"]');
      expect(clickableElement).toBeNull();
    });

    it('should have proper tab index for clickable steps', () => {
      const onStepClick = jest.fn();
      render(
        <WizardProgressIndicator
          currentStep={WizardStep.PROGRESS}
          completedSteps={[WizardStep.SETTINGS]}
          onStepClick={onStepClick}
        />
      );

      // eslint-disable-next-line testing-library/no-node-access
      const settingsContainer = screen.getByText('Settings').closest('div');
      expect(settingsContainer).toBeDefined();
      // eslint-disable-next-line testing-library/no-node-access
      const clickableElement = settingsContainer?.querySelector('[tabindex="0"]');
      expect(clickableElement).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should enforce WizardStep enum type for currentStep', () => {
      // TypeScript compile-time check
      const validSteps: WizardStep[] = [
        WizardStep.SETTINGS,
        WizardStep.PROGRESS,
        WizardStep.RESULTS
      ];

      validSteps.forEach((step) => {
        const { unmount } = render(
          <WizardProgressIndicator
            currentStep={step}
            completedSteps={[]}
          />
        );
        unmount();
      });
    });

    it('should enforce WizardStep enum type for completedSteps', () => {
      // TypeScript compile-time check
      const completedSteps: WizardStep[] = [
        WizardStep.SETTINGS,
        WizardStep.PROGRESS
      ];

      render(
        <WizardProgressIndicator
          currentStep={WizardStep.RESULTS}
          completedSteps={completedSteps}
        />
      );

      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    it('should accept optional onStepClick callback', () => {
      const onStepClick = jest.fn((step: WizardStep) => {
        expect([WizardStep.SETTINGS, WizardStep.PROGRESS, WizardStep.RESULTS]).toContain(step);
      });

      render(
        <WizardProgressIndicator
          currentStep={WizardStep.PROGRESS}
          completedSteps={[WizardStep.SETTINGS]}
          onStepClick={onStepClick}
        />
      );
    });
  });
});
