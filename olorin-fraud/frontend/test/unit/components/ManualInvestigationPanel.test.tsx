import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ManualInvestigationPanel from 'src/js/components/ManualInvestigationPanel';
import { InvestigationStepId, StepStatus } from 'src/js/constants/definitions';

const theme = createTheme();

const defaultProps = {
  structuredMode: false,
  stepStates: [],
  selectedInvestigationSteps: [],
  currentStep: InvestigationStepId.INIT,
  currentStepIndex: 0,
  isLoading: false,
  isInvestigationClosed: false,
  stepStartTimes: {},
  stepEndTimes: {},
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ManualInvestigationPanel', () => {
  it('renders without crashing', () => {
    renderWithTheme(<ManualInvestigationPanel {...defaultProps} />);
  });

  it('shows the panel when structuredMode is false', () => {
    renderWithTheme(
      <ManualInvestigationPanel {...defaultProps} structuredMode={false} />
    );
    // The panel should be visible
    expect(screen.getByText('Risk Assessment Pending...')).toBeInTheDocument();
  });

  it('hides the panel when structuredMode is true', () => {
    renderWithTheme(
      <ManualInvestigationPanel {...defaultProps} structuredMode={true} />
    );
    // The panel should not be visible
    expect(screen.queryByText('Risk Assessment Pending...')).not.toBeInTheDocument();
  });

  it('renders splitter bar for resizing', () => {
    renderWithTheme(<ManualInvestigationPanel {...defaultProps} />);
    const splitter = screen.getByRole('separator');
    expect(splitter).toBeInTheDocument();
    expect(splitter).toHaveAttribute('aria-label', 'Resize risk scores and steps');
  });
}); 