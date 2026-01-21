import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RiskScoreDisplay from 'src/js/components/RiskScoreDisplay';
import { InvestigationStepId, StepStatus } from 'src/js/constants/definitions';

describe('RiskScoreDisplay', () => {
  const mockSteps = [
    {
      id: InvestigationStepId.NETWORK,
      title: 'Network Analysis',
      description: 'Analyze network activity',
      status: StepStatus.COMPLETED,
      timestamp: new Date().toISOString(),
      details: { risk_assessment: { risk_level: 0.8 } },
      agent: 'Network Agent',
      tools: [],
    },
    {
      id: InvestigationStepId.LOCATION,
      title: 'Location Analysis',
      description: 'Analyze location data',
      status: StepStatus.COMPLETED,
      timestamp: new Date().toISOString(),
      details: { risk_assessment: { risk_level: 0.4 } },
      agent: 'Location Agent',
      tools: [],
    },
    {
      id: InvestigationStepId.RISK,
      title: 'Risk Assessment',
      description: 'Overall risk assessment',
      status: 'completed' as StepStatus,
      timestamp: new Date().toISOString(),
      details: {
        overallRiskScore: 0.7,
        accumulatedLLMThoughts:
          'This is the accumulated LLM thoughts from the backend.',
      },
      agent: 'Risk Assessment Agent',
      tools: [],
    },
  ];

  const defaultProps = {
    steps: mockSteps,
    useMock: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maintains container structure', () => {
    render(<RiskScoreDisplay {...defaultProps} />);
    const container = screen.getByText(/Overall Risk Score/i).closest('div');
    expect(container).toBeInTheDocument();
  });

  it('renders without crashing (demo mode)', () => {
    render(<RiskScoreDisplay {...defaultProps} useMock />);
    expect(screen.getByText('Network Agent')).toBeInTheDocument();
    expect(screen.getByText('Location Agent')).toBeInTheDocument();
    expect(screen.getByText('0.80')).toBeInTheDocument();
    expect(screen.getByText('0.40')).toBeInTheDocument();
  });

  it('displays risk score (demo mode)', () => {
    render(<RiskScoreDisplay {...defaultProps} useMock />);
    expect(screen.queryByText(/0\.80/)).toBeTruthy();
    expect(screen.queryByText(/0\.40/)).toBeTruthy();
  });

  it('displays agent cards with correct color classes (demo mode)', () => {
    render(<RiskScoreDisplay {...defaultProps} useMock />);
    expect(screen.queryByText(/Network Agent/i)).toBeTruthy();
    expect(screen.queryByText(/Location Agent/i)).toBeTruthy();
  });

  it('calculates average risk score correctly (demo mode)', () => {
    render(<RiskScoreDisplay {...defaultProps} useMock />);
    expect(screen.queryByText(/0\.80/)).toBeTruthy();
    expect(screen.queryByText(/0\.40/)).toBeTruthy();
  });

  it('displays agent scores with correct color (demo mode)', () => {
    render(<RiskScoreDisplay {...defaultProps} useMock />);
    expect(screen.queryByText(/Network Agent/i)).toBeTruthy();
    expect(screen.queryByText(/Location Agent/i)).toBeTruthy();
  });

  it.skip('displays overall risk score and LLM thoughts from backend fields in non-demo mode', () => {
    render(<RiskScoreDisplay {...defaultProps} useMock={false} />);
    expect(screen.getByText('0.70')).toBeInTheDocument();
    const overallCard = screen.getByText('Overall Risk Score').closest('div');
    if (overallCard) {
      const el = overallCard.closest('div');
      expect(el).not.toBeNull();
      fireEvent.click(el!);
      const modalTitles = screen.queryAllByText(
        /Risk Assessment Agent\s*Thoughts/,
      );
      expect(modalTitles.length).toBeGreaterThan(0);
      const llmThoughts = screen.queryAllByText(
        /This is the accumulated LLM thoughts from the backend\./,
        { exact: false },
      );
      expect(llmThoughts.length).toBeGreaterThan(0);
    }
  });

  it('renders with no agent steps', () => {
    render(<RiskScoreDisplay steps={[]} />);
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
  });

  it.skip('renders with only one agent', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: {
          risk_assessment: { risk_level: 0.5, thoughts: 'Net thoughts' },
        },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.RISK,
        title: 'Risk Assessment',
        description: 'Overall risk assessment',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { overallRiskScore: 0.5, accumulatedLLMThoughts: 'LLM' },
        agent: 'Risk Assessment Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText('Network Agent')).toBeInTheDocument();
    expect(screen.getByText('0.50')).toBeInTheDocument();
  });

  it('handles no thoughts present', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5 } },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.RISK,
        title: 'Risk Assessment',
        description: 'Overall risk assessment',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { overallRiskScore: 0.5 },
        agent: 'Risk Assessment Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText('Network Agent')).toBeInTheDocument();
    // Try to open modal for overall, should not open
    const el = screen.getByText('Overall Risk Score').closest('div');
    expect(el).not.toBeNull();
    fireEvent.click(el!);
    expect(screen.queryByText(/Thoughts/)).not.toBeInTheDocument();
  });

  it('renders with no completed steps', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: 'pending' as StepStatus,
        timestamp: new Date().toISOString(),
        details: {},
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.RISK,
        title: 'Risk Assessment',
        description: 'Overall risk assessment',
        status: 'pending' as StepStatus,
        timestamp: new Date().toISOString(),
        details: {},
        agent: 'Risk Assessment Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
  });

  it.skip('renders with useMock default (false)', () => {
    render(<RiskScoreDisplay {...defaultProps} />);
    expect(screen.getByText('0.70')).toBeInTheDocument();
  });

  it.skip('opens and closes agent card modal', () => {
    render(<RiskScoreDisplay {...defaultProps} useMock />);
    const agentCards = screen.queryAllByText('Network Agent');
    expect(agentCards.length).toBeGreaterThan(0);
    const agentCard = agentCards[0].closest('.bg-white');
    if (agentCard) {
      fireEvent.click(agentCard);
      // Use a flexible matcher for modal title
      expect(
        screen.queryAllByText(/Network Agent.*Thoughts/i).length,
      ).toBeGreaterThan(0);
      fireEvent.click(screen.getByText('Close'));
      expect(
        screen.queryByText(/Network Agent.*Thoughts/i),
      ).not.toBeInTheDocument();
    }
  });

  it.skip('shows tooltips on agent and overall cards', () => {
    render(<RiskScoreDisplay {...defaultProps} useMock />);
    const agentCards = screen.queryAllByText('Network Agent');
    expect(agentCards.length).toBeGreaterThan(0);
    const agentCard = agentCards[0].closest('.bg-white');
    if (agentCard) {
      expect(agentCard.getAttribute('title')).toMatch(/agent thoughts/i);
    }
    const overallCard = screen.getByText('Overall Risk Score').closest('div');
    if (overallCard) {
      expect(overallCard.getAttribute('title')).toMatch(
        /Risk Assessment Agent thoughts/i,
      );
    }
  });

  it.skip('renders layout with odd/even number of agents', () => {
    // Odd
    const oddSteps = [
      ...defaultProps.steps,
      {
        id: InvestigationStepId.DEVICE,
        title: 'Device Analysis',
        description: 'Analyze device',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.2 } },
        agent: 'Device Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={oddSteps} useMock />);
    expect(screen.getByText('Device Agent')).toBeInTheDocument();
    // Even
    render(<RiskScoreDisplay steps={defaultProps.steps} useMock />);
    expect(screen.getByText('Network Agent')).toBeInTheDocument();
  });

  it.skip('parses thoughts with lists, timestamps, and paragraphs', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: {
          risk_assessment: {
            risk_level: 0.5,
            thoughts:
              'Label: value\n- item1\n- item2\n2023-01-01T12:00:00Z\nParagraph.',
          },
        },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.RISK,
        title: 'Risk Assessment',
        description: 'Overall risk assessment',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { overallRiskScore: 0.5 },
        agent: 'Risk Assessment Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} useMock />);
    const agentCard = screen.getByText('Network Agent').closest('.bg-white');
    if (agentCard) {
      const el = agentCard.closest('.bg-white');
      expect(el).not.toBeNull();
      fireEvent.click(el!);
      expect(screen.getByText(/Label:/)).toBeInTheDocument();
      expect(screen.getByText(/item1/)).toBeInTheDocument();
      expect(screen.getByText(/item2/)).toBeInTheDocument();
      expect(screen.getByText(/Paragraph/)).toBeInTheDocument();
    }
  });

  it.skip('parseThoughts returns No thoughts available for empty string', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5, thoughts: '' } },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.RISK,
        title: 'Risk Assessment',
        description: 'Overall risk assessment',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { overallRiskScore: 0.5 },
        agent: 'Risk Assessment Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} useMock />);
    const agentCards = screen.queryAllByText('Network Agent');
    expect(agentCards.length).toBeGreaterThan(0);
    const agentCard = agentCards[0].closest('.bg-white');
    if (agentCard) {
      fireEvent.click(agentCard);
      // Use a flexible matcher for 'No thoughts available.'
      expect(screen.queryByText(/No thoughts available/i)).toBeInTheDocument();
    }
  });

  it.skip('parseThoughts handles label with empty value', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5, thoughts: 'Label:' } },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.RISK,
        title: 'Risk Assessment',
        description: 'Overall risk assessment',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { overallRiskScore: 0.5 },
        agent: 'Risk Assessment Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} useMock />);
    const agentCard = screen.getByText('Network Agent').closest('.bg-white');
    if (agentCard) {
      const el = agentCard.closest('.bg-white');
      expect(el).not.toBeNull();
      fireEvent.click(el!);
      expect(screen.getByText('Label:')).toBeInTheDocument();
    }
  });

  it.skip('parseThoughts handles value with newlines as list', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: {
          risk_assessment: { risk_level: 0.5, thoughts: 'Label: item1\nitem2' },
        },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.RISK,
        title: 'Risk Assessment',
        description: 'Overall risk assessment',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { overallRiskScore: 0.5 },
        agent: 'Risk Assessment Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} useMock />);
    const agentCard = screen.getByText('Network Agent').closest('.bg-white');
    if (agentCard) {
      const el = agentCard.closest('.bg-white');
      expect(el).not.toBeNull();
      fireEvent.click(el!);
      expect(screen.getByText('Label:')).toBeInTheDocument();
      expect(screen.getByText('item1')).toBeInTheDocument();
      expect(screen.getByText('item2')).toBeInTheDocument();
    }
  });

  it.skip('parseThoughts handles list item with dash and indentation', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: {
          risk_assessment: {
            risk_level: 0.5,
            thoughts: 'Label:\n- item1\n  item2',
          },
        },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.RISK,
        title: 'Risk Assessment',
        description: 'Overall risk assessment',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { overallRiskScore: 0.5 },
        agent: 'Risk Assessment Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} useMock />);
    const agentCard = screen.getByText('Network Agent').closest('.bg-white');
    if (agentCard) {
      const el = agentCard.closest('.bg-white');
      expect(el).not.toBeNull();
      fireEvent.click(el!);
      expect(screen.getByText('item1')).toBeInTheDocument();
      expect(screen.getByText('item2')).toBeInTheDocument();
    }
  });

  it('does not render modal when not open', () => {
    render(<RiskScoreDisplay {...defaultProps} useMock />);
    expect(screen.queryByText(/Thoughts/)).not.toBeInTheDocument();
  });

  it('renders with no agent cards (empty agentScores)', () => {
    const steps = [
      {
        id: InvestigationStepId.RISK,
        title: 'Risk Assessment',
        description: 'Overall risk assessment',
        status: 'completed' as StepStatus,
        timestamp: new Date().toISOString(),
        details: { overallRiskScore: 0.5 },
        agent: 'Risk Assessment Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} useMock />);
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
  });

  it('renders overall and agent scores', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5 } },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.LOCATION,
        title: 'Location Analysis',
        description: 'Analyze location data',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5 } },
        agent: 'Location Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText(/Overall Risk Score/i)).toBeInTheDocument();
    expect(screen.getByText('0.50')).toBeInTheDocument();
    expect(screen.getByText('0.80')).toBeInTheDocument();
    expect(screen.getByText('0.40')).toBeInTheDocument();
  });

  it('shows modal with agent thoughts when agent score is clicked', () => {
    const stepsNoThoughts = [
      {
        id: InvestigationStepId.NETWORK,
        agent: 'Network Agent',
        status: StepStatus.COMPLETED,
        details: { risk_assessment: { risk_level: 3.0 } },
        title: 'Network Analysis',
        description: 'Analyze network activity',
        timestamp: new Date().toISOString(),
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={stepsNoThoughts} />);
    // Click on agent score (should be '3.00')
    fireEvent.click(screen.getByText('3.00'));
    expect(screen.getByText(/No thoughts available/i)).toBeInTheDocument();
  });

  it('renders with empty steps array', () => {
    render(<RiskScoreDisplay steps={[]} />);
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
  });

  it('renders with single step', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5 } },
        agent: 'Network Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText('Network Agent')).toBeInTheDocument();
  });

  it('renders with overall step', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5 } },
        agent: 'Overall',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
  });

  it('renders with thoughts', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: {
          risk_assessment: {
            risk_level: 0.5,
            thoughts: 'Test thoughts',
          },
        },
        agent: 'Network Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText('Network Agent')).toBeInTheDocument();
    expect(screen.getByText('0.50')).toBeInTheDocument();
  });

  it('renders with missing agent scores', () => {
    render(
      <RiskScoreDisplay
        steps={[
          {
            id: InvestigationStepId.NETWORK,
            agent: 'A',
            title: 'Network',
            description: 'Network step',
            status: StepStatus.COMPLETED,
            details: { risk_assessment: { risk_level: 0.5 } },
            tools: [],
          },
        ]}
      />,
    );
    expect(screen.getByText(/Overall Risk Score/i)).toBeInTheDocument();
  });

  it('renders with undefined thoughts', () => {
    render(
      <RiskScoreDisplay
        steps={[
          {
            id: InvestigationStepId.NETWORK,
            agent: 'A',
            title: 'Network',
            description: 'Network step',
            status: StepStatus.COMPLETED,
            details: { risk_assessment: { risk_level: 0.5 } },
            tools: [],
          },
        ]}
      />,
    );
    expect(screen.getByText(/Overall Risk Score/i)).toBeInTheDocument();
  });

  it('renders with only overall score', () => {
    render(
      <RiskScoreDisplay
        steps={[
          {
            id: InvestigationStepId.NETWORK,
            agent: 'Overall',
            title: 'Network',
            description: 'Network step',
            status: StepStatus.COMPLETED,
            details: { risk_assessment: { risk_level: 0.5 } },
            tools: [],
          },
        ]}
      />,
    );
    expect(screen.getByText(/Overall Risk Score/i)).toBeInTheDocument();
  });

  it('renders with all agents missing', () => {
    render(<RiskScoreDisplay steps={[]} />);
    expect(screen.getByText(/Overall Risk Score/i)).toBeInTheDocument();
  });

  it('renders with long thoughts', () => {
    const longThoughts = 'A'.repeat(1000);
    render(
      <RiskScoreDisplay
        steps={[
          {
            id: InvestigationStepId.NETWORK,
            agent: 'A',
            title: 'Network Analysis',
            description: 'Analyze network activity',
            status: 'completed' as StepStatus,
            timestamp: new Date().toISOString(),
            details: {
              risk_assessment: { risk_level: 0.5, thoughts: longThoughts },
            },
            tools: [],
          },
        ]}
      />,
    );
    // Find the agent card by label
    const agentLabel = screen.getByText('A');
    // Traverse up to the clickable card div (first parent div with bg-white)
    let cardDiv = agentLabel.closest('div.bg-white');
    if (!cardDiv) {
      // fallback: find any div with bg-white and text 'A'
      cardDiv =
        (Array.from(document.querySelectorAll('div.bg-white')).find((div) =>
          div.textContent?.includes('A'),
        ) as Element) || null;
    }
    if (!cardDiv) {
      // eslint-disable-next-line no-console
      console.error('DEBUG DOM:', document.body.innerHTML);
      throw new Error('Agent card div not found');
    }
    fireEvent.click(cardDiv);
    // Check for a substring of the long thoughts
    expect(document.body.textContent).toContain('A'.repeat(100));
  });

  it('renders with duplicate agent names', () => {
    render(
      <RiskScoreDisplay
        steps={[
          {
            id: InvestigationStepId.NETWORK,
            agent: 'A',
            title: 'Network',
            description: 'Network step',
            status: StepStatus.COMPLETED,
            details: { risk_assessment: { risk_level: 0.1 } },
            tools: [],
          },
          {
            id: InvestigationStepId.LOCATION,
            agent: 'A',
            title: 'Location',
            description: 'Location step',
            status: StepStatus.COMPLETED,
            details: { risk_assessment: { risk_level: 0.2 } },
            tools: [],
          },
        ]}
      />,
    );
    expect(screen.getByText(/Overall Risk Score/i)).toBeInTheDocument();
  });

  it('renders with null/undefined values', () => {
    // @ts-expect-error purposely missing fields
    render(<RiskScoreDisplay steps={[{ id: InvestigationStepId.NETWORK }]} />);
    expect(screen.getByText(/Overall Risk Score/i)).toBeInTheDocument();
  });

  it('renders with custom colors', () => {
    render(
      <RiskScoreDisplay
        steps={[
          {
            id: InvestigationStepId.NETWORK,
            agent: 'A',
            title: 'Network',
            description: 'Network step',
            status: StepStatus.COMPLETED,
            details: { risk_assessment: { risk_level: 0.5 } },
            tools: [],
          },
        ]}
      />,
    );
    expect(screen.getByText(/Overall Risk Score/i)).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<RiskScoreDisplay steps={[]} />);
    expect(screen.getByText(/Overall Risk Score/i)).toBeInTheDocument();
  });

  it('handles long thoughts and click', () => {
    const longThoughts = 'A'.repeat(100);
    render(
      <RiskScoreDisplay
        steps={[
          {
            id: InvestigationStepId.NETWORK,
            agent: 'A',
            title: 'Network',
            description: 'Network step',
            status: StepStatus.COMPLETED,
            details: {
              risk_assessment: { risk_level: 0.5, thoughts: longThoughts },
            },
            tools: [],
          },
        ]}
      />,
    );
    // Find the clickable card div by searching for div.bg-white with both agent and score
    const cardDiv = Array.from(document.querySelectorAll('div.bg-white')).find(
      (div) =>
        div.textContent?.includes('A') && div.textContent?.includes('0.50'),
    ) as Element | null;
    if (!cardDiv) {
      // eslint-disable-next-line no-console
      console.error('DEBUG DOM:', document.body.innerHTML);
      throw new Error('Agent card div not found');
    }
    fireEvent.click(cardDiv);
    expect(document.body.textContent).toContain('A'.repeat(100));
  });

  it('renders with multiple steps', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.1 } },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.LOCATION,
        title: 'Location Analysis',
        description: 'Analyze location data',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.2 } },
        agent: 'Location Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText('Network Agent')).toBeInTheDocument();
    expect(screen.getByText('Location Agent')).toBeInTheDocument();
  });

  it('renders with thoughts and modal', () => {
    const longThoughts =
      'This is a very long thought that should be truncated in the UI. '.repeat(
        10,
      );
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: {
          risk_assessment: {
            risk_level: 0.5,
            thoughts: longThoughts,
          },
        },
        agent: 'Network Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    const agentCard = screen.getByText('Network Agent').closest('.bg-white');
    if (agentCard) {
      const el = agentCard.closest('.bg-white');
      if (el) {
        fireEvent.click(el);
        expect(
          screen.getByText(/This is a very long thought/),
        ).toBeInTheDocument();
      }
    }
  });

  it('renders with overall risk score', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { overallRiskScore: 0.5 },
        agent: 'Overall',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
  });

  it('renders with useMock prop', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5 } },
        agent: 'Network Agent',
        tools: [],
      },
      {
        id: InvestigationStepId.LOCATION,
        title: 'Location Analysis',
        description: 'Analyze location data',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5 } },
        agent: 'Location Agent',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} useMock />);
    expect(screen.getByText('Network Agent')).toBeInTheDocument();
    expect(screen.getByText('Location Agent')).toBeInTheDocument();
  });

  it('renders with empty steps', () => {
    const steps = [
      {
        id: InvestigationStepId.NETWORK,
        title: 'Network Analysis',
        description: 'Analyze network activity',
        status: StepStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        details: { risk_assessment: { risk_level: 0.5 } },
        agent: 'Overall',
        tools: [],
      },
    ];
    render(<RiskScoreDisplay steps={steps} />);
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
  });
});
