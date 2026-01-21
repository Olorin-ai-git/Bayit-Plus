/**
 * Investigation Wizard Visual Component Test
 * Tests the refactored wizard with React Testing Library and screenshots
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestigationWizard from '../InvestigationWizard';

describe('InvestigationWizard - Refactored Component', () => {
  let mockOnComplete: jest.Mock;

  beforeEach(() => {
    mockOnComplete = jest.fn();
  });

  describe('Step 0: Basic Information', () => {
    test('renders initial state correctly', () => {
      const { container } = render(<InvestigationWizard onComplete={mockOnComplete} />);

      // Verify wizard title
      expect(screen.getByText('New Investigation')).toBeInTheDocument();
      expect(screen.getByText('Create a new fraud investigation with guided setup')).toBeInTheDocument();

      // Verify step 0 content
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter investigation title...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe the investigation purpose and scope...')).toBeInTheDocument();

      // Verify Next button is disabled (validation)
      const nextButton = screen.getByRole('button', { name: /Next/i });
      expect(nextButton).toBeDisabled();

      // Snapshot
      expect(container).toMatchSnapshot('wizard-step0-initial');
    });

    test('enables Next button when form is valid', () => {
      render(<InvestigationWizard onComplete={mockOnComplete} />);

      const titleInput = screen.getByPlaceholderText('Enter investigation title...');
      const descriptionTextarea = screen.getByPlaceholderText('Describe the investigation purpose and scope...');
      const nextButton = screen.getByRole('button', { name: /Next/i });

      // Fill form
      fireEvent.change(titleInput, { target: { value: 'Test Investigation' } });
      fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } });

      // Next should now be enabled
      expect(nextButton).toBeEnabled();
    });

    test('Previous button is disabled on first step', () => {
      render(<InvestigationWizard onComplete={mockOnComplete} />);

      const previousButton = screen.getByRole('button', { name: /Previous/i });
      expect(previousButton).toBeDisabled();
    });
  });

  describe('Step 1: Investigation Type', () => {
    test('navigates to step 1 and displays type options', () => {
      const { container } = render(<InvestigationWizard onComplete={mockOnComplete} />);

      // Fill step 0
      const titleInput = screen.getByPlaceholderText('Enter investigation title...');
      const descriptionTextarea = screen.getByPlaceholderText('Describe the investigation purpose and scope...');
      fireEvent.change(titleInput, { target: { value: 'Test Investigation' } });
      fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } });

      // Click Next
      const nextButton = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextButton);

      // Verify step 1 content
      expect(screen.getByText('Investigation Type')).toBeInTheDocument();
      expect(screen.getByText('Choose between manual or structured investigation')).toBeInTheDocument();

      // Snapshot
      expect(container).toMatchSnapshot('wizard-step1-initial');
    });

    test('Previous button navigates back to step 0', () => {
      render(<InvestigationWizard onComplete={mockOnComplete} />);

      // Navigate to step 1
      fireEvent.change(screen.getByPlaceholderText('Enter investigation title...'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('Describe the investigation purpose and scope...'), { target: { value: 'Test desc' } });
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Click Previous
      const previousButton = screen.getByRole('button', { name: /Previous/i });
      fireEvent.click(previousButton);

      // Verify we're back on step 0
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter investigation title...')).toHaveValue('Test');
    });
  });

  describe('Step 2: Agent Selection', () => {
    test('displays all 6 agents', () => {
      const { container } = render(<InvestigationWizard onComplete={mockOnComplete} />);

      // Navigate to step 2
      navigateToStep(2);

      // Verify all agents are displayed
      expect(screen.getByText('Location Agent')).toBeInTheDocument();
      expect(screen.getByText('Device Agent')).toBeInTheDocument();
      expect(screen.getByText('Network Agent')).toBeInTheDocument();
      expect(screen.getByText('Transaction Agent')).toBeInTheDocument();
      expect(screen.getByText('Behavior Agent')).toBeInTheDocument();
      expect(screen.getByText('Document Agent')).toBeInTheDocument();

      // Next should be disabled (no agents selected)
      expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();

      // Snapshot
      expect(container).toMatchSnapshot('wizard-step2-agents');
    });

    test('enables Next when agents are selected', () => {
      render(<InvestigationWizard onComplete={mockOnComplete} />);

      navigateToStep(2);

      // Select agents
      fireEvent.click(screen.getByText('Location Agent'));
      fireEvent.click(screen.getByText('Network Agent'));

      // Next should now be enabled
      expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();
    });
  });

  describe('Step 3: Parameters', () => {
    test('defaults to risk-driven mode', () => {
      const { container } = render(<InvestigationWizard onComplete={mockOnComplete} />);

      navigateToStep(3);

      // Verify Parameters step
      expect(screen.getByText('Parameters')).toBeInTheDocument();
      expect(screen.getByText('Configure investigation parameters and data sources')).toBeInTheDocument();

      // Verify risk-driven is selected by default
      const riskDrivenRadio = screen.getByRole('radio', { name: /Risk-Driven/i });
      expect(riskDrivenRadio).toBeChecked();

      // Next should be enabled for risk-driven mode
      expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();

      // Snapshot
      expect(container).toMatchSnapshot('wizard-step3-risk-driven');
    });

    test('switches to specific entity mode and validates', () => {
      render(<InvestigationWizard onComplete={mockOnComplete} />);

      navigateToStep(3);

      // Switch to specific entity mode
      const specificEntityRadio = screen.getByRole('radio', { name: /Specific Entity/i });
      fireEvent.click(specificEntityRadio);

      // Next should be disabled (entity ID required)
      expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();

      // Fill entity ID
      const entityIdInput = screen.getByPlaceholder(/Enter entity ID/i);
      fireEvent.change(entityIdInput, { target: { value: '192.168.1.100' } });

      // Next should now be enabled
      expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();
    });
  });

  describe('Step 4: Review & Launch', () => {
    test('displays review summary correctly', () => {
      const { container } = render(<InvestigationWizard onComplete={mockOnComplete} />);

      navigateToStep(4);

      // Verify review step
      expect(screen.getByText('Review & Launch')).toBeInTheDocument();
      expect(screen.getByText('Review your configuration and start the investigation')).toBeInTheDocument();

      // Verify Launch button is present
      const launchButton = screen.getByRole('button', { name: /Launch Investigation/i });
      expect(launchButton).toBeInTheDocument();
      expect(launchButton).toBeEnabled();

      // Snapshot
      expect(container).toMatchSnapshot('wizard-step4-review');
    });

    test('calls onComplete when Launch is clicked', () => {
      render(<InvestigationWizard onComplete={mockOnComplete} />);

      navigateToStep(4);

      // Click Launch
      const launchButton = screen.getByRole('button', { name: /Launch Investigation/i });
      fireEvent.click(launchButton);

      // Verify onComplete was called with form data
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Investigation',
          description: 'Test description',
          priority: 'medium',
          type: 'manual',
          agents: expect.arrayContaining(['location', 'network', 'transaction']),
          investigationMode: 'risk-driven'
        })
      );
    });
  });

  describe('Progress Indicator', () => {
    test('shows correct progress state for each step', () => {
      const { baseElement } = render(<InvestigationWizard onComplete={mockOnComplete} />);

      // Step 0
      expect(screen.getByText('1')).toBeInTheDocument();
      const snapshot0 = baseElement.cloneNode(true);

      // Step 1
      navigateToStep(1);
      expect(screen.getByText('2')).toBeInTheDocument();
      const snapshot1 = baseElement.cloneNode(true);

      // Step 2
      navigateToStep(2);
      expect(screen.getByText('3')).toBeInTheDocument();
      const snapshot2 = baseElement.cloneNode(true);

      // Snapshots for progress indicator
      expect(snapshot0).toMatchSnapshot('progress-step0');
      expect(snapshot1).toMatchSnapshot('progress-step1');
      expect(snapshot2).toMatchSnapshot('progress-step2');
    });
  });

  describe('Data Persistence', () => {
    test('retains form data when navigating between steps', () => {
      render(<InvestigationWizard onComplete={mockOnComplete} />);

      // Fill step 0
      const titleInput = screen.getByPlaceholderText('Enter investigation title...');
      const descriptionTextarea = screen.getByPlaceholderText('Describe the investigation purpose and scope...');
      fireEvent.change(titleInput, { target: { value: 'Persistence Test' } });
      fireEvent.change(descriptionTextarea, { target: { value: 'Testing data persistence' } });

      // Navigate forward
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Navigate back
      fireEvent.click(screen.getByRole('button', { name: /Previous/i }));
      fireEvent.click(screen.getByRole('button', { name: /Previous/i }));

      // Verify data is retained
      expect(screen.getByPlaceholderText('Enter investigation title...')).toHaveValue('Persistence Test');
      expect(screen.getByPlaceholderText('Describe the investigation purpose and scope...')).toHaveValue('Testing data persistence');
    });
  });
});

/**
 * Helper function to navigate to a specific wizard step
 */
function navigateToStep(targetStep: number) {
  // Step 0: Basic Information
  if (targetStep >= 1) {
    const titleInput = screen.getByPlaceholderText('Enter investigation title...');
    const descriptionTextarea = screen.getByPlaceholderText('Describe the investigation purpose and scope...');
    fireEvent.change(titleInput, { target: { value: 'Test Investigation' } });
    fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } });
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  }

  // Step 1: Investigation Type
  if (targetStep >= 2) {
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  }

  // Step 2: Agent Selection
  if (targetStep >= 3) {
    fireEvent.click(screen.getByText('Location Agent'));
    fireEvent.click(screen.getByText('Network Agent'));
    fireEvent.click(screen.getByText('Transaction Agent'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  }

  // Step 3: Parameters (risk-driven is default, can proceed)
  if (targetStep >= 4) {
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  }
}
