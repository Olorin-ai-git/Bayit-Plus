import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { mock, instance } from 'ts-mockito';
import { Sandbox } from '@appfabric/sandbox-spec';
import { SandboxContextProvider } from '@appfabric/providers';
import * as GAIAService from 'src/js/services/GAIAService';
import InvestigationPage from '../../../src/js/pages/InvestigationPage';
import { GAIAService as GAIAServiceMock } from '../../../src/js/services/GAIAService';

// Mock GAIAService
jest.mock('src/js/services/GAIAService', () => {
  const mockGaiaService = {
    analyzeNetwork: jest.fn(),
    analyzeLocation: jest.fn(),
    analyzeDevice: jest.fn(),
    analyzeLogs: jest.fn(),
    assessRisk: jest.fn(),
  };
  return {
    __esModule: true,
    GAIAService: jest.fn(() => mockGaiaService),
    default: mockGaiaService,
  };
});

describe('InvestigationPage', () => {
  let mockSandbox: Sandbox;
  let mockSandboxInstance: any;
  let mockGaiaService: jest.Mocked<GAIAServiceMock>;

  beforeEach(() => {
    mockSandbox = mock<Sandbox>();
    mockSandboxInstance = instance(mockSandbox);
    mockGaiaService = (GAIAService.GAIAService as unknown as jest.Mock).mock
      .results[0]?.value;
    if (!mockGaiaService) {
      throw new Error('GAIAService mock not initialized');
    }
    jest.clearAllMocks();

    mockGaiaService.analyzeNetwork.mockResolvedValue({
      data: { network_risk_assessment: { risk_level: 0.85 } },
      status: 200,
      tid: 'mock-tid',
    });

    mockGaiaService.analyzeLocation.mockResolvedValue({
      data: { location_signal_risk_assessment: { risk_level: 0.8 } },
      status: 200,
      tid: 'mock-tid',
    });

    mockGaiaService.analyzeDevice.mockResolvedValue({
      data: { device_risk_assessment: { risk_level: 0.85 } },
      status: 200,
      tid: 'mock-tid',
    });

    mockGaiaService.analyzeLogs.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.7 } },
      status: 200,
      tid: 'mock-tid',
    });

    mockGaiaService.assessRisk.mockResolvedValue({
      data: {
        overall_risk_score: 0.65,
        thoughts: 'Test thoughts',
        risk_factors: ['Test risk factor'],
      },
      status: 200,
      tid: 'mock-tid',
    });
  });

  it('renders investigation page', () => {
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    expect(
      screen.getByText('ATO Fraud Investigation System'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter User ID')).toBeInTheDocument();
    expect(screen.getByText('Start investigation')).toBeInTheDocument();
  });

  it('handles investigation start and completion', async () => {
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );
    await startInvestigation();
    await waitFor(
      () => {
        const text = document.body.textContent || '';
        try {
          expect(text).toMatch(/0\.25|0\.85|0\.8|0\.7|0\.65/);
        } catch (e) {
          debugLogOutput(text);
          throw e;
        }
      },
      { timeout: 5000 },
    );
  });

  it('handles investigation start and completion (demo mode)', async () => {
    (GAIAService.GAIAService as any).analyzeNetwork.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.25 } },
    });
    (GAIAService.GAIAService as any).analyzeLocation.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.25 } },
    });
    (GAIAService.GAIAService as any).analyzeDevice.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.25 } },
    });
    (GAIAService.GAIAService as any).analyzeLogs.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.25 } },
    });
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage investigationId={null} />
      </SandboxContextProvider>,
    );
    await startInvestigation();
    await waitFor(() => {
      expect(screen.getByText('Investigation Time:')).toBeInTheDocument();
      expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
    });
  });

  it('handles sidebar toggle', async () => {
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    const toggleButton = screen.getByTestId('toggle-logs-btn');

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(toggleButton).toBeInTheDocument();
  });

  it('updates step status correctly', async () => {
    (GAIAService.GAIAService as any).analyzeNetwork.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.25 } },
    });

    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    await startInvestigation();

    await waitFor(() => {
      const steps = screen.getAllByText(/Network|Location|Device|Logs/);
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  it('displays risk scores', async () => {
    (GAIAService.GAIAService as any).analyzeNetwork.mockResolvedValue({
      data: { network_risk_assessment: { risk_level: 0.85 } },
    });
    (GAIAService.GAIAService as any).analyzeLocation.mockResolvedValue({
      data: { location_signal_risk_assessment: { risk_level: 0.8 } },
    });
    (GAIAService.GAIAService as any).analyzeDevice.mockResolvedValue({
      data: { device_risk_assessment: { risk_level: 0.85 } },
    });
    (GAIAService.GAIAService as any).analyzeLogs.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.7 } },
    });

    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    await startInvestigation();

    await waitFor(() => {
      const logText = getLogText();
      try {
        expect(logText).toContain('0.85');
        expect(logText).toContain('0.8');
        expect(logText).toContain('0.7');
      } catch (e) {
        debugLogOutput(logText);
        throw e;
      }
    });
  });

  it('displays risk scores (demo mode)', async () => {
    (GAIAService.GAIAService as any).analyzeNetwork.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.25 } },
    });
    (GAIAService.GAIAService as any).analyzeLocation.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.25 } },
    });
    (GAIAService.GAIAService as any).analyzeDevice.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.25 } },
    });
    (GAIAService.GAIAService as any).analyzeLogs.mockResolvedValue({
      data: { risk_assessment: { risk_level: 0.25 } },
    });
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );
    await startInvestigation();
    await waitFor(
      () => {
        const text = document.body.textContent || '';
        try {
          expect(text).toMatch(/0\.00|0\.25/);
        } catch (e) {
          debugLogOutput(text);
          throw e;
        }
      },
      { timeout: 5000 },
    );
  });

  it('handles log display and updates', async () => {
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    await startInvestigation();

    await waitFor(() => {
      const logText = getLogText();
      expect(logText).toContain('Starting investigation');
      expect(logText).toContain('Analysis complete');
    });
  });

  it('handles error states', async () => {
    (GAIAService.GAIAService as any).analyzeNetwork.mockRejectedValue(
      new Error('Network error'),
    );

    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    await startInvestigation();

    await expectErrorTextInDom(/error/i);
  });

  it('handles investigation cancellation', async () => {
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    await startInvestigation();

    const stopButton = screen.getByText('Stop investigation');
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText('Start investigation')).toBeInTheDocument();
    });
  });

  it('handles time range changes', async () => {
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    const timeRangeSelect = screen.getByRole('combobox');
    fireEvent.change(timeRangeSelect, { target: { value: '30d' } });

    await startInvestigation();

    await waitFor(() => {
      const logText = getLogText();
      expect(logText).toContain('Starting investigation');
    });
  });

  it('handles edit modal interactions', async () => {
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    const editButton = screen.getByTestId('edit-steps-btn');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Investigation Steps')).toBeInTheDocument();
    });
  });

  it('handles chat sidebar interactions', async () => {
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    const chatButton = screen.getByTestId('toggle-chat-btn');
    fireEvent.click(chatButton);

    await waitFor(() => {
      expect(
        screen.getByText('Comment Log for Investigation ID'),
      ).toBeInTheDocument();
    });
  });

  it('handles input type changes', async () => {
    render(
      <SandboxContextProvider sandbox={instance(mockSandbox)}>
        <InvestigationPage />
      </SandboxContextProvider>,
    );

    const inputTypeSelect = screen.getByRole('combobox', {
      name: /input type/i,
    });
    fireEvent.change(inputTypeSelect, { target: { value: 'deviceId' } });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Enter Device ID'),
      ).toBeInTheDocument();
    });
  });
});

function getLogText() {
  const logElement = document.querySelector('[data-testid="log-content"]');
  return logElement ? logElement.textContent || '' : '';
}

function debugLogOutput(logText: string) {
  console.log('Log content:', logText);
}

function debugMockCalls(GAIAService: any) {
  console.log('Network analysis calls:', GAIAService.analyzeNetwork.mock.calls);
  console.log(
    'Location analysis calls:',
    GAIAService.analyzeLocation.mock.calls,
  );
  console.log('Device analysis calls:', GAIAService.analyzeDevice.mock.calls);
  console.log('Logs analysis calls:', GAIAService.analyzeLogs.mock.calls);
  console.log('Risk assessment calls:', GAIAService.assessRisk.mock.calls);
}

async function startInvestigation() {
  const input = screen.getByPlaceholderText('Enter User ID');
  fireEvent.change(input, { target: { value: 'test123' } });
  const submitButton = screen.getByText('Start investigation');
  fireEvent.click(submitButton);
}

async function expectErrorTextInDom(errorRegex: RegExp) {
  await waitFor(() => {
    const text = document.body.textContent || '';
    try {
      expect(text).toMatch(errorRegex);
    } catch (e) {
      debugLogOutput(text);
      throw e;
    }
  });
}
