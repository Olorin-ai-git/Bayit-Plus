import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestigationHeader from 'src/js/components/InvestigationHeader';
import {
  InvestigationStep,
  InvestigationStepId,
  StepStatus,
} from 'src/js/types/RiskAssessment';

// Mock the Stopwatch component
jest.mock(
  'src/js/components/Stopwatch',
  () =>
    function MockStopwatch({
      startTime,
      endTime,
    }: {
      startTime: Date | null;
      endTime: Date | null;
    }) {
      return (
        <div data-testid="stopwatch">
          {startTime ? 'Timer running' : 'No timer'}
        </div>
      );
    },
);

describe('InvestigationHeader', () => {
  const mockStepStates: InvestigationStep[] = [
    {
      id: InvestigationStepId.NETWORK,
      title: 'Network Analysis',
      description: 'Analyze network activity',
      status: 'not_started' as StepStatus,
      timestamp: new Date().toISOString(),
      details: {},
      agent: 'Network Agent',
      tools: [],
    },
    {
      id: InvestigationStepId.LOCATION,
      title: 'Location Analysis',
      description: 'Analyze location data',
      status: 'in_progress' as StepStatus,
      timestamp: new Date().toISOString(),
      details: {},
      agent: 'Location Agent',
      tools: [],
    },
  ];

  const defaultProps = {
    useMock: false,
    isSidebarOpen: false,
    setIsSidebarOpen: jest.fn(),
    isEditModalOpen: false,
    setIsEditModalOpen: jest.fn(),
    isLoading: false,
    userId: 'test123',
    setUserId: jest.fn(),
    handleSubmit: jest.fn(),
    cancelledRef: { current: false },
    closeInvestigation: jest.fn(),
    startTime: null,
    endTime: null,
    isChatSidebarOpen: false,
    setIsChatSidebarOpen: jest.fn(),
    currentInvestigationId: 'INV-123',
    timeRange: '10d',
    onTimeRangeChange: jest.fn(),
    selectedInputType: 'userId' as const,
    setSelectedInputType: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders investigation title and ID', () => {
    render(<InvestigationHeader {...defaultProps} />);
    expect(
      screen.getByText(/ATO Fraud Investigation System/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/INV-123/)).toBeInTheDocument();
  });

  it('calls setIsSidebarOpen when sidebar button is clicked', () => {
    render(<InvestigationHeader {...defaultProps} />);
    const sidebarBtn = screen.getByLabelText(/Toggle Logs Sidebar/i);
    fireEvent.click(sidebarBtn);
    expect(defaultProps.setIsSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('calls setIsEditModalOpen when edit button is clicked', () => {
    render(<InvestigationHeader {...defaultProps} />);
    const editBtn = screen.getByLabelText(/Edit Steps/i);
    fireEvent.click(editBtn);
    expect(defaultProps.setIsEditModalOpen).toHaveBeenCalledWith(true);
  });

  it('calls setIsChatSidebarOpen when comment button is clicked', () => {
    render(<InvestigationHeader {...defaultProps} />);
    const commentBtn = screen.getByLabelText(/Toggle Chat Sidebar/i);
    fireEvent.click(commentBtn);
    expect(defaultProps.setIsChatSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('handles empty userId', () => {
    render(<InvestigationHeader {...defaultProps} userId="" />);
    expect(
      screen.getByText(/ATO Fraud Investigation System/i),
    ).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    render(<InvestigationHeader {...defaultProps} />);
    expect(
      screen.getByText('ATO Fraud Investigation System'),
    ).toBeInTheDocument();
  });

  it('handles sidebar toggle', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        isSidebarOpen={false}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const toggleButton = screen.getByTestId('toggle-logs-btn');
    fireEvent.click(toggleButton);
    expect(defaultProps.setIsSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('handles edit modal toggle', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const editButton = screen.getByTestId('edit-steps-btn');
    fireEvent.click(editButton);
    expect(defaultProps.setIsEditModalOpen).toHaveBeenCalledWith(true);
  });

  it('handles user ID input', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const input = screen.getByPlaceholderText('Enter User ID');
    fireEvent.change(input, { target: { value: 'test123' } });
    expect(defaultProps.setUserId).toHaveBeenCalledWith('test123');
  });

  it('handles form submission', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        userId="test123"
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const submitButton = screen.getByText('Start investigation');
    fireEvent.click(submitButton);
    expect(defaultProps.handleSubmit).toHaveBeenCalled();
  });

  it('shows stop button when loading', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        isLoading
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    expect(screen.getByText('Stop investigation')).toBeInTheDocument();
  });

  it('handles stop investigation', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        isLoading
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const stopButton = screen.getByText('Stop investigation');
    fireEvent.click(stopButton);
    expect(defaultProps.closeInvestigation).toHaveBeenCalled();
  });

  it('disables edit button when loading', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        isLoading
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const editButton = screen.getByTestId('edit-steps-btn');
    expect(editButton).toBeDisabled();
  });

  it('renders stopwatch when startTime is provided', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        startTime={new Date()}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    expect(screen.getByTestId('stopwatch')).toBeInTheDocument();
  });

  it('handles enter key press on user ID input', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const input = screen.getByPlaceholderText('Enter User ID');
    fireEvent.change(input, { target: { value: 'test123' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(defaultProps.handleSubmit).toHaveBeenCalled();
  });

  it('does not submit when user ID is empty', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        userId=""
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const submitButton = screen.getByText('Start investigation');
    expect(submitButton).toBeDisabled();
  });

  it('maintains sticky positioning', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const header = screen
      .getByText('ATO Fraud Investigation System')
      .closest('.sticky');
    expect(header).toHaveClass('sticky', 'top-0', 'bg-white');
  });

  it('toggles logs sidebar', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        isSidebarOpen={false}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const toggleLogsBtn = screen.getByTestId('toggle-logs-btn');
    fireEvent.click(toggleLogsBtn);
    expect(defaultProps.setIsSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('toggles comment sidebar', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        isChatSidebarOpen={false}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const toggleCommentBtn = screen.getByTestId('toggle-chat-btn');
    fireEvent.click(toggleCommentBtn);
    expect(defaultProps.setIsChatSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('renders timeRange select and options', () => {
    function Wrapper() {
      const [timeRange, setTimeRange] = React.useState(defaultProps.timeRange);
      return (
        <InvestigationHeader
          {...defaultProps}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      );
    }
    render(<Wrapper />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('10d');
  });

  it('renders button tooltips and aria-labels', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    expect(screen.getByLabelText('Toggle Logs Sidebar')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit Steps')).toBeInTheDocument();
  });

  it('focuses and activates buttons with keyboard', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    const logsBtn = screen.getByTestId('toggle-logs-btn');
    logsBtn.focus();
    fireEvent.keyDown(logsBtn, { key: 'Enter', code: 'Enter' });
  });

  it('renders with empty currentInvestigationId', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        currentInvestigationId=""
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    expect(screen.getByText('Investigation ID:')).toBeInTheDocument();
  });

  it('renders with null startTime and endTime', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        startTime={null}
        endTime={null}
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    expect(
      screen.getByText('ATO Fraud Investigation System'),
    ).toBeInTheDocument();
  });

  it('handleButtonClick fallback branch', () => {
    render(
      <InvestigationHeader
        {...defaultProps}
        userId="test123"
        timeRange={defaultProps.timeRange}
        onTimeRangeChange={defaultProps.onTimeRangeChange}
      />,
    );
    fireEvent.click(screen.getByText('Start investigation'));
  });

  it('handleStopInvestigation with already true cancelledRef', () => {
    const cancelledProps = {
      ...defaultProps,
      isLoading: true,
      cancelledRef: { current: true },
      timeRange: defaultProps.timeRange,
      onTimeRangeChange: defaultProps.onTimeRangeChange,
    };
    render(<InvestigationHeader {...cancelledProps} />);
  });
});
