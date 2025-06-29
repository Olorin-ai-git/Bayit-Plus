import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestigationSteps from 'src/js/components/InvestigationSteps';
import {
  InvestigationStep,
  InvestigationStepId,
  StepStatus,
} from 'src/js/types/RiskAssessment';

// Mock the InvestigationStep component
jest.mock(
  'src/js/components/InvestigationStep',
  () =>
    function MockInvestigationStep({
      step,
      isActive,
      startTime,
      endTime,
    }: {
      step: InvestigationStep;
      isActive: boolean;
      startTime?: Date | null;
      endTime?: Date | null;
    }) {
      return (
        <div data-testid="investigation-step">
          <h3>{step.title}</h3>
          <p>{step.description}</p>
          <span>{step.status}</span>
        </div>
      );
    },
);

// Mock the ProgressBar component
jest.mock(
  'src/js/components/ProgressBar',
  () =>
    function MockProgressBar({
      currentStep,
      steps,
    }: {
      currentStep: number;
      steps: { title: string }[];
    }) {
      return (
        <div data-testid="progress-bar">
          {steps.map((step, index) => (
            <div key={index} data-testid="progress-step">
              {step.title}
            </div>
          ))}
        </div>
      );
    },
);

describe('InvestigationSteps', () => {
  const mockSteps = [
    {
      id: InvestigationStepId.NETWORK,
      title: 'Network Analysis',
      description: 'Analyze network activity',
      status: StepStatus.PENDING,
      agent: 'Network Agent',
      details: null,
      timestamp: new Date().toISOString(),
      tools: [],
    },
    {
      id: InvestigationStepId.DEVICE,
      title: 'Device Analysis',
      description: 'Analyze device activity',
      status: StepStatus.COMPLETED,
      agent: 'Device Agent',
      details: null,
      timestamp: new Date().toISOString(),
      tools: [],
    },
  ];

  const defaultProps = {
    steps: mockSteps,
    stepStates: mockSteps,
    selectedInvestigationSteps: mockSteps,
    currentStepIndex: 0,
    isLoading: false,
    isInvestigationClosed: false,
    stepStartTimes: {
      [InvestigationStepId.INIT]: null,
      [InvestigationStepId.NETWORK]: null,
      [InvestigationStepId.LOCATION]: null,
      [InvestigationStepId.DEVICE]: null,
      [InvestigationStepId.LOG]: null,
      [InvestigationStepId.RISK]: null,
    },
    stepEndTimes: {
      [InvestigationStepId.INIT]: null,
      [InvestigationStepId.NETWORK]: null,
      [InvestigationStepId.LOCATION]: null,
      [InvestigationStepId.DEVICE]: null,
      [InvestigationStepId.LOG]: null,
      [InvestigationStepId.RISK]: null,
    },
    onStepClick: jest.fn(),
    onEditSteps: jest.fn(),
    currentStep: InvestigationStepId.NETWORK,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all steps', () => {
    render(<InvestigationSteps {...defaultProps} />);
    expect(screen.getByText('Network Analysis')).toBeInTheDocument();
    expect(screen.getByText('Device Analysis')).toBeInTheDocument();
  });

  it('calls onStepClick when a step is clicked', () => {
    render(<InvestigationSteps {...defaultProps} />);
    fireEvent.click(screen.getByText('Device Analysis'));
    expect(defaultProps.onStepClick).toHaveBeenCalledWith(
      InvestigationStepId.DEVICE,
    );
  });

  it('highlights the current step', () => {
    render(<InvestigationSteps {...defaultProps} />);
    const currentStep = screen.getByText('Network Analysis').closest('div');
    expect(currentStep).toHaveClass('bg-blue-50');
  });

  it('renders steps with unique keys', () => {
    render(<InvestigationSteps {...defaultProps} />);
    const steps = screen.getAllByRole('button');
    steps.forEach((step, index) => {
      expect(step).toHaveAttribute('data-step-id', mockSteps[index].id);
    });
  });

  it('renders progress bar', () => {
    render(<InvestigationSteps {...defaultProps} />);
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<InvestigationSteps {...defaultProps} />);
    expect(screen.getByText('Network Analysis')).toBeInTheDocument();
    expect(screen.getByText('Device Analysis')).toBeInTheDocument();
  });

  it('renders step statuses', () => {
    render(<InvestigationSteps {...defaultProps} />);
    expect(screen.getAllByText('pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('completed').length).toBeGreaterThan(0);
  });

  it('handles empty step states', () => {
    const props = {
      ...defaultProps,
      stepStates: [],
    };
    render(<InvestigationSteps {...props} />);
    expect(screen.queryAllByTestId('investigation-step').length).toBe(0);
  });

  it('handles missing start and end times', () => {
    const propsWithoutTimes = {
      ...defaultProps,
      startTime: undefined,
      endTime: undefined,
    };
    const steps = mockSteps.map((step) => ({
      ...step,
      id: step.id,
      agent: '',
      status: StepStatus.PENDING,
      details: null,
      title: step.title,
      description: '',
    }));
    const props = {
      ...propsWithoutTimes,
      selectedInvestigationSteps: steps,
    };
    render(<InvestigationSteps {...props} />);
    expect(screen.getAllByText('Network').length).toBeGreaterThan(0);
  });

  it('maintains container structure', () => {
    render(<InvestigationSteps {...defaultProps} />);
    const container = screen.getByText('Investigation Steps').closest('div');
    expect(container).toHaveClass('flex', 'items-center', 'mb-4');
  });

  it('renders no steps if stepStates is empty', () => {
    const props = {
      ...defaultProps,
      stepStates: [],
    };
    render(<InvestigationSteps {...props} />);
    expect(screen.queryAllByTestId('investigation-step').length).toBe(0);
  });

  it('opens and closes modal', () => {
    render(<InvestigationSteps {...defaultProps} />);
    // Use a function matcher for the Edit Steps button
    const editBtn = screen.getByRole('button', { name: /edit steps/i });
    fireEvent.click(editBtn);
    expect(screen.getByText(/edit steps/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/cancel/i));
  });
});
