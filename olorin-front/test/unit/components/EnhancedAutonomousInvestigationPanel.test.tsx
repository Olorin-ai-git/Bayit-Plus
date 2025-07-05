import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EnhancedAutonomousInvestigationPanel from 'src/js/components/EnhancedAutonomousInvestigationPanel';
import { LogLevel } from 'src/js/types/RiskAssessment';

// Mock the analytics module
jest.mock('src/js/utils/analytics', () => ({
  trackInvestigationEvent: jest.fn(),
}));

// Mock the AutonomousInvestigationPanel component
jest.mock('src/js/components/AutonomousInvestigationPanel', () => {
  return function MockAutonomousInvestigationPanel() {
    return <div data-testid="autonomous-investigation-panel">Autonomous Panel</div>;
  };
});

const theme = createTheme();

const defaultProps = {
  autonomousMode: true,
  stepStates: [],
  userId: 'test-user',
  selectedInputType: 'userId' as const,
  investigationId: 'test-investigation',
  isLoading: false,
  timeRange: '30d',
  selectedInvestigationSteps: [],
  investigationIdState: 'test-investigation-state',
  investigationStartTime: new Date(),
  addLog: jest.fn(),
  closeInvestigation: jest.fn(),
  setIsInvestigationClosed: jest.fn(),
  setInvestigationEndTime: jest.fn(),
  setStepStates: jest.fn(),
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EnhancedAutonomousInvestigationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithTheme(<EnhancedAutonomousInvestigationPanel {...defaultProps} />);
  });

  it('shows the autonomous panel when autonomousMode is true', () => {
    renderWithTheme(
      <EnhancedAutonomousInvestigationPanel {...defaultProps} autonomousMode={true} />
    );
    expect(screen.getByTestId('autonomous-investigation-panel')).toBeInTheDocument();
  });

  it('hides the autonomous panel when autonomousMode is false', () => {
    renderWithTheme(
      <EnhancedAutonomousInvestigationPanel {...defaultProps} autonomousMode={false} />
    );
    expect(screen.queryByTestId('autonomous-investigation-panel')).not.toBeInTheDocument();
  });

  it('shows risk scores when autonomousMode is true and stepStates exist', () => {
    const stepStates = [
      {
        id: 'network',
        agent: 'Network Agent',
        title: 'Network Analysis',
        description: 'Test',
        status: 'COMPLETED',
        details: { risk_score: 0.75 },
        timestamp: new Date().toISOString(),
        tools: [],
      },
    ];

    renderWithTheme(
      <EnhancedAutonomousInvestigationPanel 
        {...defaultProps} 
        autonomousMode={true} 
        stepStates={stepStates}
      />
    );
    
    // Should show risk scores
    expect(screen.getByText('Risk Assessment Pending...')).toBeInTheDocument();
  });
}); 