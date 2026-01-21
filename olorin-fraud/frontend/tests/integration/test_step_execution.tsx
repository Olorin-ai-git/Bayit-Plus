/* eslint-disable */
/**
 * Integration Test: Execute Investigation Step
 *
 * Tests the complete flow of executing investigation steps with agent analysis.
 * This test verifies end-to-end functionality of step execution and real-time updates.
 *
 * Expected to FAIL initially (TDD approach) until implementation is complete.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { InvestigationProvider } from '@manual-investigation/contexts/InvestigationContext';
import { StepTracker } from '@manual-investigation/components/StepTracker';
import { AgentResultsViewer } from '@manual-investigation/components/AgentResultsViewer';
import { Investigation, StepStatus, StepType } from '@manual-investigation/types';

// Mock investigation with steps
const mockInvestigation: Investigation = {
  id: 'inv_step_test',
  title: 'Step Execution Test Investigation',
  description: 'Testing step execution flow',
  userId: 'user_123',
  priority: 'high',
  status: 'in_progress',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date().toISOString(),
  steps: [
    {
      id: 'step_001',
      investigationId: 'inv_step_test',
      type: StepType.DEVICE_ANALYSIS,
      status: StepStatus.COMPLETED,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      startedAt: new Date(Date.now() - 1700000).toISOString(),
      completedAt: new Date(Date.now() - 900000).toISOString(),
      parameters: {
        deviceId: 'dev_123',
        analysisType: 'full_fingerprint'
      },
      result: {
        riskScore: 0.85,
        anomalies: ['screen_resolution_mismatch', 'unusual_timezone']
      },
      agentResponse: {
        id: 'agent_resp_001',
        stepId: 'step_001',
        agentType: 'device_analysis',
        status: 'completed',
        createdAt: new Date(Date.now() - 900000).toISOString(),
        completedAt: new Date(Date.now() - 900000).toISOString(),
        response: {
          deviceFingerprint: 'fp_abc123',
          riskAssessment: 'high',
          anomalies: ['screen_resolution_mismatch', 'unusual_timezone']
        },
        metadata: {
          processingTime: 5.2,
          confidence: 0.92
        }
      }
    },
    {
      id: 'step_002',
      investigationId: 'inv_step_test',
      type: StepType.NETWORK_ANALYSIS,
      status: StepStatus.RUNNING,
      createdAt: new Date(Date.now() - 300000).toISOString(),
      startedAt: new Date(Date.now() - 240000).toISOString(),
      parameters: {
        ipAddress: '192.168.1.100',
        sessionId: 'sess_456'
      }
    },
    {
      id: 'step_003',
      investigationId: 'inv_step_test',
      type: StepType.LOCATION_ANALYSIS,
      status: StepStatus.PENDING,
      createdAt: new Date(Date.now() - 60000).toISOString(),
      parameters: {
        userId: 'user_123',
        timeWindow: '24h'
      }
    }
  ],
  evidence: [],
  comments: [],
  tags: ['step-execution-test'],
  metadata: {},
  finalRiskScore: null,
  completedAt: null
};

// Mock WebSocket for real-time updates
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN
};

// Mock services
jest.mock('@manual-investigation/services/InvestigationService', () => ({
  InvestigationService: {
    getInvestigation: jest.fn().mockResolvedValue(mockInvestigation),
    executeStep: jest.fn().mockResolvedValue({
      stepId: 'step_new_123',
      status: 'queued',
      estimatedCompletionTime: 30000
    }),
    cancelStep: jest.fn().mockResolvedValue({ success: true }),
    retryStep: jest.fn().mockResolvedValue({
      stepId: 'step_retry_456',
      status: 'queued'
    })
  }
}));

jest.mock('@manual-investigation/services/AgentAnalysisService', () => ({
  AgentAnalysisService: {
    executeNetworkAnalysis: jest.fn().mockResolvedValue({
      id: 'agent_resp_network',
      status: 'queued',
      estimatedTime: 15000
    }),
    executeDeviceAnalysis: jest.fn().mockResolvedValue({
      id: 'agent_resp_device',
      status: 'queued',
      estimatedTime: 10000
    }),
    executeLocationAnalysis: jest.fn().mockResolvedValue({
      id: 'agent_resp_location',
      status: 'queued',
      estimatedTime: 20000
    }),
    getAgentResponse: jest.fn().mockImplementation((id: string) => {
      if (id === 'agent_resp_001') {
        return Promise.resolve(mockInvestigation.steps[0].agentResponse);
      }
      return Promise.resolve(null);
    })
  }
}));

jest.mock('@shared/services/WebSocketService', () => ({
  WebSocketService: {
    connect: jest.fn().mockReturnValue(mockWebSocket),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true)
  }
}));

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <InvestigationProvider>
      {children}
    </InvestigationProvider>
  </BrowserRouter>
);

describe('Integration Test: Execute Investigation Step', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step Tracker Display and Interaction', () => {
    it('should display all investigation steps with correct statuses', async () => {
      try {
        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        // Wait for steps to load
        await waitFor(() => {
          expect(screen.getByText('Device Analysis')).toBeInTheDocument();
        });

        // Should display all three steps
        expect(screen.getByText('Device Analysis')).toBeInTheDocument();
        expect(screen.getByText('Network Analysis')).toBeInTheDocument();
        expect(screen.getByText('Location Analysis')).toBeInTheDocument();

        // Check status indicators
        const completedStep = screen.getByTestId('step-step_001');
        expect(completedStep).toHaveClass('step-status-completed');
        expect(within(completedStep).getByText('Completed')).toBeInTheDocument();

        const runningStep = screen.getByTestId('step-step_002');
        expect(runningStep).toHaveClass('step-status-running');
        expect(within(runningStep).getByText('Running')).toBeInTheDocument();

        const pendingStep = screen.getByTestId('step-step_003');
        expect(pendingStep).toHaveClass('step-status-pending');
        expect(within(pendingStep).getByText('Pending')).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Step display test failed: ${error}. This is expected during TDD phase.`);
      }
    });

    it('should show step progress indicators and timing information', async () => {
      try {
        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Device Analysis')).toBeInTheDocument();
        });

        // Completed step should show completion time
        const completedStep = screen.getByTestId('step-step_001');
        expect(within(completedStep).getByText(/completed in/i)).toBeInTheDocument();

        // Running step should show progress indicator
        const runningStep = screen.getByTestId('step-step_002');
        expect(within(runningStep).getByRole('progressbar')).toBeInTheDocument();
        expect(within(runningStep).getByText(/in progress/i)).toBeInTheDocument();

        // Pending step should show estimated time
        const pendingStep = screen.getByTestId('step-step_003');
        expect(within(pendingStep).getByText(/estimated/i)).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Step progress indicators test failed: ${error}`);
      }
    });

    it('should allow executing pending steps', async () => {
      try {
        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');

        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Location Analysis')).toBeInTheDocument();
        });

        // Click execute button on pending step
        const pendingStep = screen.getByTestId('step-step_003');
        const executeButton = within(pendingStep).getByRole('button', { name: /execute step/i });

        await user.click(executeButton);

        // Should call API to execute step
        await waitFor(() => {
          expect(InvestigationService.executeStep).toHaveBeenCalledWith(
            'inv_step_test',
            'step_003'
          );
        });

        // Should show executing state
        expect(within(pendingStep).getByText(/executing/i)).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Step execution test failed: ${error}`);
      }
    });

    it('should allow canceling running steps', async () => {
      try {
        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');

        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Network Analysis')).toBeInTheDocument();
        });

        // Click cancel button on running step
        const runningStep = screen.getByTestId('step-step_002');
        const cancelButton = within(runningStep).getByRole('button', { name: /cancel step/i });

        await user.click(cancelButton);

        // Should show confirmation dialog
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
          expect(screen.getByText(/cancel this step/i)).toBeInTheDocument();
        });

        // Confirm cancellation
        const confirmButton = screen.getByRole('button', { name: /confirm cancel/i });
        await user.click(confirmButton);

        // Should call API to cancel step
        await waitFor(() => {
          expect(InvestigationService.cancelStep).toHaveBeenCalledWith(
            'inv_step_test',
            'step_002'
          );
        });

      } catch (error) {
        throw new Error(`Step cancellation test failed: ${error}`);
      }
    });

    it('should allow retrying failed steps', async () => {
      try {
        // Mock a failed step
        const failedStep = {
          ...mockInvestigation.steps[2],
          status: StepStatus.FAILED,
          error: 'Agent timeout after 30 seconds'
        };

        const investigationWithFailedStep = {
          ...mockInvestigation,
          steps: [...mockInvestigation.steps.slice(0, 2), failedStep]
        };

        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');
        InvestigationService.getInvestigation.mockResolvedValueOnce(investigationWithFailedStep);

        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Location Analysis')).toBeInTheDocument();
        });

        // Should show failed status
        const failedStepElement = screen.getByTestId('step-step_003');
        expect(failedStepElement).toHaveClass('step-status-failed');
        expect(within(failedStepElement).getByText('Failed')).toBeInTheDocument();

        // Should show retry button
        const retryButton = within(failedStepElement).getByRole('button', { name: /retry step/i });
        await user.click(retryButton);

        // Should call retry API
        await waitFor(() => {
          expect(InvestigationService.retryStep).toHaveBeenCalledWith(
            'inv_step_test',
            'step_003'
          );
        });

      } catch (error) {
        throw new Error(`Step retry test failed: ${error}`);
      }
    });
  });

  describe('Agent Results Viewer', () => {
    it('should display agent response details for completed steps', async () => {
      try {
        render(
          <TestWrapper>
            <AgentResultsViewer
              investigationId="inv_step_test"
              stepId="step_001"
            />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Device Analysis Results')).toBeInTheDocument();
        });

        // Should display agent response data
        expect(screen.getByText('Risk Assessment: high')).toBeInTheDocument();
        expect(screen.getByText('Confidence: 92%')).toBeInTheDocument();
        expect(screen.getByText('Processing Time: 5.2s')).toBeInTheDocument();

        // Should display anomalies
        expect(screen.getByText('screen_resolution_mismatch')).toBeInTheDocument();
        expect(screen.getByText('unusual_timezone')).toBeInTheDocument();

        // Should display device fingerprint
        expect(screen.getByText('fp_abc123')).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Agent results display test failed: ${error}`);
      }
    });

    it('should show formatted risk score with appropriate styling', async () => {
      try {
        render(
          <TestWrapper>
            <AgentResultsViewer
              investigationId="inv_step_test"
              stepId="step_001"
            />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('85%')).toBeInTheDocument();
        });

        // High risk score should have appropriate styling
        const riskScoreBadge = screen.getByText('85%');
        expect(riskScoreBadge).toHaveClass('risk-score-high');
        expect(riskScoreBadge).toHaveClass('bg-orange-100', 'text-orange-800');

      } catch (error) {
        throw new Error(`Risk score styling test failed: ${error}`);
      }
    });

    it('should handle loading state for running steps', async () => {
      try {
        render(
          <TestWrapper>
            <AgentResultsViewer
              investigationId="inv_step_test"
              stepId="step_002"
            />
          </TestWrapper>
        );

        // Should show loading state for running step
        expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();

        // Should show estimated completion time
        expect(screen.getByText(/estimated completion/i)).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Loading state test failed: ${error}`);
      }
    });

    it('should display error information for failed steps', async () => {
      try {
        // Mock failed agent response
        const { AgentAnalysisService } = require('@manual-investigation/services/AgentAnalysisService');
        AgentAnalysisService.getAgentResponse.mockResolvedValueOnce({
          id: 'agent_resp_failed',
          stepId: 'step_failed',
          agentType: 'network_analysis',
          status: 'failed',
          createdAt: new Date().toISOString(),
          error: 'Network analysis service unavailable',
          metadata: {
            errorCode: 'SERVICE_UNAVAILABLE',
            retryable: true
          }
        });

        render(
          <TestWrapper>
            <AgentResultsViewer
              investigationId="inv_step_test"
              stepId="step_failed"
            />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText(/error/i)).toBeInTheDocument();
        });

        // Should display error message
        expect(screen.getByText('Network analysis service unavailable')).toBeInTheDocument();

        // Should show error type
        expect(screen.getByText('SERVICE_UNAVAILABLE')).toBeInTheDocument();

        // Should show retry button if retryable
        expect(screen.getByRole('button', { name: /retry analysis/i })).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Error display test failed: ${error}`);
      }
    });
  });

  describe('Real-time Step Updates', () => {
    it('should handle real-time step status updates via WebSocket', async () => {
      try {
        const { WebSocketService } = require('@shared/services/WebSocketService');

        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Network Analysis')).toBeInTheDocument();
        });

        // Verify WebSocket subscription
        expect(WebSocketService.subscribe).toHaveBeenCalledWith(
          'step_updates',
          expect.any(Function)
        );

        // Simulate step completion update
        const stepCompletedEvent = {
          type: 'step_completed',
          investigationId: 'inv_step_test',
          stepId: 'step_002',
          data: {
            id: 'step_002',
            status: StepStatus.COMPLETED,
            completedAt: new Date().toISOString(),
            result: {
              riskScore: 0.65,
              findings: ['VPN detected', 'Geolocation anomaly']
            }
          }
        };

        // Get the WebSocket callback
        const subscribeCall = WebSocketService.subscribe.mock.calls.find(
          call => call[0] === 'step_updates'
        );
        const updateCallback = subscribeCall[1];

        // Trigger the update
        updateCallback(stepCompletedEvent);

        // Should update the UI
        await waitFor(() => {
          const networkStep = screen.getByTestId('step-step_002');
          expect(networkStep).toHaveClass('step-status-completed');
          expect(within(networkStep).getByText('Completed')).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Real-time step updates test failed: ${error}`);
      }
    });

    it('should handle real-time agent response updates', async () => {
      try {
        render(
          <TestWrapper>
            <AgentResultsViewer
              investigationId="inv_step_test"
              stepId="step_002"
            />
          </TestWrapper>
        );

        // Should initially show loading
        expect(screen.getByText(/analyzing/i)).toBeInTheDocument();

        // Simulate agent response completion
        const agentResponseEvent = {
          type: 'agent_response',
          investigationId: 'inv_step_test',
          stepId: 'step_002',
          data: {
            id: 'agent_resp_002',
            agentType: 'network_analysis',
            status: 'completed',
            response: {
              ipAnalysis: {
                country: 'United States',
                isp: 'Example ISP',
                riskScore: 0.65
              },
              vpnDetected: true,
              geolocationAnomaly: true
            },
            metadata: {
              processingTime: 8.7,
              confidence: 0.88
            }
          }
        };

        // Get WebSocket callback for agent responses
        const { WebSocketService } = require('@shared/services/WebSocketService');
        const subscribeCall = WebSocketService.subscribe.mock.calls.find(
          call => call[0] === 'agent_responses'
        );
        const responseCallback = subscribeCall[1];

        // Trigger the response
        responseCallback(agentResponseEvent);

        // Should update to show results
        await waitFor(() => {
          expect(screen.getByText('Network Analysis Results')).toBeInTheDocument();
          expect(screen.getByText('VPN Detected: Yes')).toBeInTheDocument();
          expect(screen.getByText('65%')).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Real-time agent response updates test failed: ${error}`);
      }
    });

    it('should show progress updates during step execution', async () => {
      try {
        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Network Analysis')).toBeInTheDocument();
        });

        // Simulate progress updates
        const progressEvents = [
          {
            type: 'step_progress',
            stepId: 'step_002',
            progress: {
              percentage: 25,
              status: 'Analyzing IP geolocation',
              estimatedTimeRemaining: 15000
            }
          },
          {
            type: 'step_progress',
            stepId: 'step_002',
            progress: {
              percentage: 75,
              status: 'Checking VPN/proxy indicators',
              estimatedTimeRemaining: 5000
            }
          }
        ];

        const { WebSocketService } = require('@shared/services/WebSocketService');
        const subscribeCall = WebSocketService.subscribe.mock.calls.find(
          call => call[0] === 'step_updates'
        );
        const updateCallback = subscribeCall[1];

        // Send first progress update
        updateCallback(progressEvents[0]);

        await waitFor(() => {
          const networkStep = screen.getByTestId('step-step_002');
          expect(within(networkStep).getByText('25%')).toBeInTheDocument();
          expect(within(networkStep).getByText('Analyzing IP geolocation')).toBeInTheDocument();
        });

        // Send second progress update
        updateCallback(progressEvents[1]);

        await waitFor(() => {
          const networkStep = screen.getByTestId('step-step_002');
          expect(within(networkStep).getByText('75%')).toBeInTheDocument();
          expect(within(networkStep).getByText('Checking VPN/proxy indicators')).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Progress updates test failed: ${error}`);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle step execution failures gracefully', async () => {
      try {
        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');
        InvestigationService.executeStep.mockRejectedValueOnce(
          new Error('Agent service unavailable')
        );

        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Location Analysis')).toBeInTheDocument();
        });

        // Try to execute pending step
        const pendingStep = screen.getByTestId('step-step_003');
        const executeButton = within(pendingStep).getByRole('button', { name: /execute step/i });

        await user.click(executeButton);

        // Should show error state
        await waitFor(() => {
          expect(screen.getByText(/failed to execute step/i)).toBeInTheDocument();
          expect(screen.getByText('Agent service unavailable')).toBeInTheDocument();
        });

        // Should show retry option
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Step execution failure handling test failed: ${error}`);
      }
    });

    it('should handle WebSocket disconnection during step execution', async () => {
      try {
        const { WebSocketService } = require('@shared/services/WebSocketService');
        WebSocketService.isConnected.mockReturnValue(false);

        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Network Analysis')).toBeInTheDocument();
        });

        // Should show disconnection warning
        expect(screen.getByText(/real-time updates unavailable/i)).toBeInTheDocument();

        // Should offer manual refresh option
        expect(screen.getByRole('button', { name: /refresh status/i })).toBeInTheDocument();

      } catch (error) {
        throw new Error(`WebSocket disconnection handling test failed: ${error}`);
      }
    });

    it('should handle concurrent step executions', async () => {
      try {
        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');

        render(
          <TestWrapper>
            <StepTracker investigationId="inv_step_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Location Analysis')).toBeInTheDocument();
        });

        // Try to execute multiple steps simultaneously
        const pendingStep = screen.getByTestId('step-step_003');
        const executeButton = within(pendingStep).getByRole('button', { name: /execute step/i });

        // Rapid multiple clicks
        await user.click(executeButton);
        await user.click(executeButton);
        await user.click(executeButton);

        // Should only make one API call
        await waitFor(() => {
          expect(InvestigationService.executeStep).toHaveBeenCalledTimes(1);
        });

        // Button should be disabled during execution
        expect(executeButton).toBeDisabled();

      } catch (error) {
        throw new Error(`Concurrent execution handling test failed: ${error}`);
      }
    });
  });
});