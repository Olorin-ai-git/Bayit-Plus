import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestigationStep from 'src/js/components/InvestigationStep';
import {
  InvestigationStepId,
  StepStatus,
  InvestigationStep as InvestigationStepType,
} from 'src/js/types/RiskAssessment';

// Mock components
const MockLocationMap = () => (
  <div data-testid="mock-location-map">Location Map</div>
);

interface MockAgentDetailsTableProps {
  details: any;
  agentType: string;
}

const MockAgentDetailsTable = ({
  details,
  agentType,
}: MockAgentDetailsTableProps) => (
  <div data-testid="mock-agent-details">Agent Details</div>
);

interface MockStopwatchProps {
  startTime: Date;
  endTime?: Date | null;
  label: string;
}

const MockStopwatch = ({ startTime, endTime, label }: MockStopwatchProps) => (
  <div data-testid="mock-stopwatch">Stopwatch</div>
);

// Mock the components
jest.mock('../../src/js/components/LocationMap', () => MockLocationMap);
jest.mock(
  '../../src/js/components/AgentDetailsTable',
  () => MockAgentDetailsTable,
);
jest.mock('../../src/js/components/Stopwatch', () => MockStopwatch);

describe('InvestigationStep', () => {
  const defaultStep: InvestigationStepType = {
    id: InvestigationStepId.NETWORK,
    agent: 'network',
    title: 'Network Analysis',
    description: 'Analyze network activity',
    status: StepStatus.PENDING,
    tools: [],
  };

  const defaultProps = {
    step: defaultStep,
    isActive: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step with basic information', () => {
    render(<InvestigationStep {...defaultProps} />);
    expect(screen.getByText('Network Analysis')).toBeInTheDocument();
  });

  it('displays correct status indicator', () => {
    const step = { ...defaultStep, status: StepStatus.IN_PROGRESS };
    render(<InvestigationStep {...defaultProps} step={step} />);
    expect(screen.getByTestId('mock-stopwatch')).toBeInTheDocument();
  });

  it('displays location map when step is completed and has map data', () => {
    const step = {
      ...defaultStep,
      id: InvestigationStepId.LOCATION,
      status: StepStatus.COMPLETED,
      details: {
        mapData: [{ lat: 0, lng: 0 }],
      },
    };
    render(<InvestigationStep {...defaultProps} step={step} />);
    expect(screen.getByTestId('mock-location-map')).toBeInTheDocument();
  });

  it('displays agent details when step is completed', () => {
    const step = {
      ...defaultStep,
      status: StepStatus.COMPLETED,
      details: {
        risk_assessment: {
          risk_level: 0.5,
          risk_factors: ['test'],
          confidence: 0.8,
          timestamp: '2024-03-21T10:00:00Z',
        },
      },
    };
    render(<InvestigationStep {...defaultProps} step={step} />);
    expect(screen.getByTestId('mock-agent-details')).toBeInTheDocument();
  });

  it('shows details button when step has details', () => {
    const step = {
      ...defaultStep,
      status: StepStatus.COMPLETED,
      details: {
        risk_assessment: {
          risk_level: 0.5,
          risk_factors: ['test'],
          confidence: 0.8,
          timestamp: '2024-03-21T10:00:00Z',
        },
      },
    };
    render(<InvestigationStep {...defaultProps} step={step} />);
    expect(screen.getByText('Show Details')).toBeInTheDocument();
  });

  it('hides details button when step has no details', () => {
    render(<InvestigationStep {...defaultProps} />);
    expect(screen.getByText('Show Details')).toBeDisabled();
  });
});
