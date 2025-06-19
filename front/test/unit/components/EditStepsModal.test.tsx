import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditStepsModal from 'src/js/components/EditStepsModal';
import { InvestigationStepId, StepStatus } from 'src/js/constants/definitions';
import { InvestigationStep } from 'src/js/types/RiskAssessment';

// Mock the useStepTools hook
jest.mock('src/js/hooks/useStepTools', () => ({
  useStepTools: () => [
    {}, // stepToolsMapping
    jest.fn(), // setStepToolsMapping
    (stepId: string, agentName: string) => ['Splunk', 'OII'], // getToolsForStep
    ['Splunk', 'OII', 'DI BB', 'DATA LAKE'], // availableTools
    false, // isLoading
    null, // error
  ],
}));

describe('EditStepsModal', () => {
  const mockAllSteps: InvestigationStep[] = [
    {
      id: InvestigationStepId.NETWORK,
      agent: 'Network Agent',
      title: 'Network Analysis',
      description: 'Analyze network activity',
      status: StepStatus.PENDING,
      tools: [],
    },
    {
      id: InvestigationStepId.LOCATION,
      agent: 'Location Agent',
      title: 'Location Analysis',
      description: 'Analyze location data',
      status: StepStatus.PENDING,
      tools: [],
    },
  ];

  const mockSelectedSteps: InvestigationStep[] = [
    {
      id: InvestigationStepId.NETWORK,
      agent: 'Network Agent',
      title: 'Network Analysis',
      description: 'Analyze network activity',
      status: StepStatus.PENDING,
      tools: ['Splunk', 'OII'],
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    allSteps: mockAllSteps,
    selectedSteps: mockSelectedSteps,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with steps', () => {
    render(<EditStepsModal {...defaultProps} />);
    
    expect(screen.getByText('Edit Investigation Steps')).toBeInTheDocument();
    expect(screen.getByText('Available Steps')).toBeInTheDocument();
    expect(screen.getByText('Selected Steps (in order)')).toBeInTheDocument();
  });

  it('shows tools panel when a step is clicked', async () => {
    render(<EditStepsModal {...defaultProps} />);
    
    // Click on the Network Analysis step
    const networkStep = screen.getByText('Network Analysis');
    fireEvent.click(networkStep);
    
    // Wait for the tools panel to appear
    await waitFor(() => {
      expect(screen.getByText('Tools Configuration')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Step: Network Analysis')).toBeInTheDocument();
    expect(screen.getByText('Agent: Network Agent')).toBeInTheDocument();
  });

  it('displays available tools as checkboxes', async () => {
    render(<EditStepsModal {...defaultProps} />);
    
    // Click on the Network Analysis step
    const networkStep = screen.getByText('Network Analysis');
    fireEvent.click(networkStep);
    
    // Wait for the tools panel to appear
    await waitFor(() => {
      expect(screen.getByText('Tools Configuration')).toBeInTheDocument();
    });
    
         // Check that all tools are displayed
     expect(screen.getByLabelText('Splunk')).toBeInTheDocument();
     expect(screen.getByLabelText('OII')).toBeInTheDocument();
     expect(screen.getByLabelText('DI BB')).toBeInTheDocument();
     expect(screen.getByLabelText('DATA LAKE')).toBeInTheDocument();
  });

  it('shows selected tools as checked', async () => {
    render(<EditStepsModal {...defaultProps} />);
    
    // Click on the Network Analysis step
    const networkStep = screen.getByText('Network Analysis');
    fireEvent.click(networkStep);
    
    // Wait for the tools panel to appear
    await waitFor(() => {
      expect(screen.getByText('Tools Configuration')).toBeInTheDocument();
    });
    
         // Check that Splunk and OII are checked (as per the mock)
     const splunkCheckbox = screen.getByLabelText('Splunk');
     const oiiCheckbox = screen.getByLabelText('OII');
     const diBbCheckbox = screen.getByLabelText('DI BB');
     
     expect(splunkCheckbox).toBeChecked();
     expect(oiiCheckbox).toBeChecked();
     expect(diBbCheckbox).not.toBeChecked();
  });

  it('closes tools panel when close button is clicked', async () => {
    render(<EditStepsModal {...defaultProps} />);
    
    // Click on the Network Analysis step
    const networkStep = screen.getByText('Network Analysis');
    fireEvent.click(networkStep);
    
    // Wait for the tools panel to appear
    await waitFor(() => {
      expect(screen.getByText('Tools Configuration')).toBeInTheDocument();
    });
    
    // Click the close button in the tools panel
    const closeButtons = screen.getAllByRole('button');
    const toolsPanelCloseButton = closeButtons.find(button => 
      button.getAttribute('aria-label') === null && 
      button.querySelector('svg') // Has an icon
    );
    
    if (toolsPanelCloseButton) {
      fireEvent.click(toolsPanelCloseButton);
    }
    
    // Tools panel should be closed
    await waitFor(() => {
      expect(screen.queryByText('Tools Configuration')).not.toBeInTheDocument();
    });
  });

  it('adds and removes steps correctly', () => {
    render(<EditStepsModal {...defaultProps} />);
    
    // Add Location Analysis step
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);
    
    // Should now show both steps in selected
    expect(screen.getAllByText('Remove')).toHaveLength(2);
    
    // Remove Network Analysis step
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    
    // Should now have only one Remove button
    expect(screen.getAllByText('Remove')).toHaveLength(1);
  });

  it('calls onSave with correct data when Save Changes is clicked', () => {
    render(<EditStepsModal {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    expect(defaultProps.onSave).toHaveBeenCalledWith(mockSelectedSteps);
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<EditStepsModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('highlights selected step for tools configuration', async () => {
    render(<EditStepsModal {...defaultProps} />);
    
    // Click on the Network Analysis step
    const networkStep = screen.getByText('Network Analysis');
    fireEvent.click(networkStep);
    
    // The step should be highlighted (we can check for the tools panel appearing)
    await waitFor(() => {
      expect(screen.getByText('Tools Configuration')).toBeInTheDocument();
    });
  });
});
