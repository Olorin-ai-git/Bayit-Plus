import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditStepsModal from 'src/js/components/EditStepsModal';
import { InvestigationStepId, StepStatus } from 'src/js/constants/definitions';

describe('EditStepsModal', () => {
  const mockSteps = [
    {
      id: InvestigationStepId.INIT,
      title: 'Initialization',
      description: 'Init',
      status: StepStatus.PENDING,
      timestamp: new Date().toISOString(),
      details: {},
      agent: 'Init Agent',
    },
    {
      id: InvestigationStepId.NETWORK,
      title: 'Network Analysis',
      description: 'Analyze network activity',
      status: StepStatus.PENDING,
      timestamp: new Date().toISOString(),
      details: {},
      agent: 'Network Agent',
      tools: [],
    },
    {
      id: InvestigationStepId.LOCATION,
      title: 'Location Analysis',
      description: 'Analyze location data',
      status: StepStatus.PENDING,
      timestamp: new Date().toISOString(),
      details: {},
      agent: 'Location Agent',
      tools: [],
    },
    {
      id: InvestigationStepId.RISK,
      title: 'Risk Assessment',
      description: 'Risk',
      status: StepStatus.PENDING,
      timestamp: new Date().toISOString(),
      details: {},
      agent: 'Risk Agent',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    allSteps: [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.PENDING,
        timestamp: new Date().toISOString(),
        details: {},
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.LOCATION,
        title: 'Location Analysis',
        description: 'Analyze location data',
        status: StepStatus.PENDING,
        timestamp: new Date().toISOString(),
        details: {},
        agent: 'Location Agent',
        tools: [],
      },
    ],
    selectedSteps: [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.PENDING,
        timestamp: new Date().toISOString(),
        details: {},
        agent: 'Network Agent',
        tools: [],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<EditStepsModal {...defaultProps} />);
    expect(screen.getByText('Edit Investigation Steps')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<EditStepsModal {...defaultProps} isOpen={false} />);
    expect(
      screen.queryByText('Edit Investigation Steps'),
    ).not.toBeInTheDocument();
  });

  it('initializes with correct available and selected steps', () => {
    render(<EditStepsModal {...defaultProps} />);
    expect(screen.getByText('Network Analysis')).toBeInTheDocument();
    expect(screen.getByText('Location Analysis')).toBeInTheDocument();
  });

  it('moves step from available to selected', () => {
    render(<EditStepsModal {...defaultProps} />);
    const addButton = screen.getAllByTitle('Add')[0];
    fireEvent.click(addButton);
    expect(screen.getAllByTitle('Remove')).toHaveLength(2);
  });

  it('handles cancel button click', () => {
    render(<EditStepsModal {...defaultProps} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('handles close button click', () => {
    render(<EditStepsModal {...defaultProps} />);
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('handles empty allSteps array', () => {
    render(
      <EditStepsModal {...defaultProps} allSteps={[]} selectedSteps={[]} />,
    );
    expect(screen.getByText('No steps available')).toBeInTheDocument();
  });

  it.skip('moves step from selected to available', () => {});
  it.skip('handles drag and drop reordering', () => {});
  it.skip('disables OK button when no steps selected', () => {});
  it.skip('maintains step order after drag and drop', () => {});
});
