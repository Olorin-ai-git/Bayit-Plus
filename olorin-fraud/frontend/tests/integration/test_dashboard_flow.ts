/**
 * Integration Test: Investigation Dashboard Flow
 *
 * Tests the complete user flow through the investigation dashboard.
 * This test verifies end-to-end functionality of the manual investigation UI.
 *
 * Expected to FAIL initially (TDD approach) until implementation is complete.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { InvestigationProvider } from '@manual-investigation/contexts/InvestigationContext';
import { InvestigationDashboard } from '@manual-investigation/components/InvestigationDashboard';
import { Investigation, InvestigationStatus } from '@manual-investigation/types';

// Mock API responses
const mockInvestigations: Investigation[] = [
  {
    id: 'inv_001',
    title: 'Suspicious Login Activity - User John Doe',
    description: 'Multiple failed login attempts from different locations',
    userId: 'user_123',
    priority: 'high',
    status: InvestigationStatus.PENDING,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    steps: [],
    evidence: [],
    comments: [],
    tags: ['account-takeover', 'suspicious-login'],
    metadata: {
      sourceSystem: 'fraud-detection',
      alertId: 'alert_456'
    },
    finalRiskScore: null,
    completedAt: null
  },
  {
    id: 'inv_002',
    title: 'Device Fingerprinting Anomaly - Sarah Wilson',
    description: 'Unusual device characteristics detected during authentication',
    userId: 'user_456',
    priority: 'medium',
    status: InvestigationStatus.IN_PROGRESS,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString(),
    steps: [],
    evidence: [],
    comments: [],
    tags: ['device-spoofing', 'fingerprint-anomaly'],
    metadata: {
      sourceSystem: 'device-tracker',
      riskScore: 0.75
    },
    finalRiskScore: 0.75,
    completedAt: null
  }
];

// Mock WebSocket connection
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN
};

// Mock API service
jest.mock('@manual-investigation/services/InvestigationService', () => ({
  InvestigationService: {
    getInvestigations: jest.fn().mockResolvedValue({
      data: mockInvestigations,
      total: mockInvestigations.length,
      page: 1,
      pageSize: 10
    }),
    getInvestigation: jest.fn().mockImplementation((id: string) => {
      const investigation = mockInvestigations.find(inv => inv.id === id);
      return Promise.resolve(investigation);
    }),
    createInvestigation: jest.fn().mockResolvedValue({
      id: 'inv_new_123',
      title: 'New Investigation',
      status: InvestigationStatus.PENDING,
      createdAt: new Date().toISOString()
    }),
    updateInvestigation: jest.fn().mockResolvedValue({
      ...mockInvestigations[0],
      updatedAt: new Date().toISOString()
    })
  }
}));

// Mock WebSocket service
jest.mock('@shared/services/WebSocketService', () => ({
  WebSocketService: {
    connect: jest.fn().mockReturnValue(mockWebSocket),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true)
  }
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <InvestigationProvider>
      {children}
    </InvestigationProvider>
  </BrowserRouter>
);

describe('Integration Test: Investigation Dashboard Flow', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Loading and Display', () => {
    it('should load and display investigations dashboard', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        // Should show loading state initially
        expect(screen.getByText(/loading/i)).toBeInTheDocument();

        // Wait for investigations to load
        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Should display both mock investigations
        expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        expect(screen.getByText('Device Fingerprinting Anomaly - Sarah Wilson')).toBeInTheDocument();

        // Should display investigation metadata
        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Medium Priority')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Dashboard loading test failed: ${error}. This is expected during TDD phase.`);
      }
    });

    it('should display investigation cards with proper styling and information', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Check for Tailwind CSS classes on investigation cards
        const investigationCards = screen.getAllByTestId('investigation-card');
        expect(investigationCards).toHaveLength(2);

        // Verify card styling
        investigationCards.forEach(card => {
          expect(card).toHaveClass('investigation-card');
          expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-md');
        });

        // Check priority badges
        const highPriorityBadge = screen.getByText('High Priority');
        expect(highPriorityBadge).toHaveClass('bg-red-100', 'text-red-800');

        const mediumPriorityBadge = screen.getByText('Medium Priority');
        expect(mediumPriorityBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');

      } catch (error) {
        throw new Error(`Investigation card styling test failed: ${error}`);
      }
    });

    it('should display risk scores with appropriate color coding', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('75%')).toBeInTheDocument(); // Risk score for inv_002
        });

        // High risk score should have appropriate styling
        const riskScoreBadge = screen.getByText('75%');
        expect(riskScoreBadge).toHaveClass('risk-score-high');
        expect(riskScoreBadge).toHaveClass('bg-orange-100', 'text-orange-800');

      } catch (error) {
        throw new Error(`Risk score display test failed: ${error}`);
      }
    });
  });

  describe('Investigation Filtering and Search', () => {
    it('should filter investigations by status', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Click on status filter
        const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
        await user.click(statusFilter);

        // Select "In Progress" status
        const inProgressOption = screen.getByRole('option', { name: /in progress/i });
        await user.click(inProgressOption);

        // Should only show in-progress investigations
        await waitFor(() => {
          expect(screen.getByText('Device Fingerprinting Anomaly - Sarah Wilson')).toBeInTheDocument();
          expect(screen.queryByText('Suspicious Login Activity - User John Doe')).not.toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Status filtering test failed: ${error}`);
      }
    });

    it('should search investigations by title and description', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Type in search box
        const searchInput = screen.getByPlaceholderText(/search investigations/i);
        await user.type(searchInput, 'device fingerprinting');

        // Should filter to matching investigations
        await waitFor(() => {
          expect(screen.getByText('Device Fingerprinting Anomaly - Sarah Wilson')).toBeInTheDocument();
          expect(screen.queryByText('Suspicious Login Activity - User John Doe')).not.toBeInTheDocument();
        });

        // Clear search
        await user.clear(searchInput);

        // Should show all investigations again
        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
          expect(screen.getByText('Device Fingerprinting Anomaly - Sarah Wilson')).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Search functionality test failed: ${error}`);
      }
    });

    it('should filter investigations by priority', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Click on priority filter
        const priorityFilter = screen.getByRole('combobox', { name: /filter by priority/i });
        await user.click(priorityFilter);

        // Select "High" priority
        const highPriorityOption = screen.getByRole('option', { name: /high/i });
        await user.click(highPriorityOption);

        // Should only show high priority investigations
        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
          expect(screen.queryByText('Device Fingerprinting Anomaly - Sarah Wilson')).not.toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Priority filtering test failed: ${error}`);
      }
    });
  });

  describe('Investigation Actions', () => {
    it('should navigate to investigation details when clicking on an investigation', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Click on investigation card
        const investigationCard = screen.getByText('Suspicious Login Activity - User John Doe');
        await user.click(investigationCard);

        // Should navigate to investigation details (mock routing)
        await waitFor(() => {
          expect(window.location.pathname).toBe('/investigation/inv_001');
        });

      } catch (error) {
        throw new Error(`Investigation navigation test failed: ${error}`);
      }
    });

    it('should open create investigation modal', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Click create new investigation button
        const createButton = screen.getByRole('button', { name: /create new investigation/i });
        await user.click(createButton);

        // Should open create modal
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
          expect(screen.getByText(/create new investigation/i)).toBeInTheDocument();
        });

        // Should have form fields
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Create investigation modal test failed: ${error}`);
      }
    });

    it('should create a new investigation through the modal', async () => {
      try {
        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');

        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Open create modal
        const createButton = screen.getByRole('button', { name: /create new investigation/i });
        await user.click(createButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Fill out form
        await user.type(screen.getByLabelText(/title/i), 'New Test Investigation');
        await user.type(screen.getByLabelText(/description/i), 'This is a test investigation');

        // Select priority
        const prioritySelect = screen.getByLabelText(/priority/i);
        await user.click(prioritySelect);
        await user.click(screen.getByRole('option', { name: /critical/i }));

        // Submit form
        const submitButton = screen.getByRole('button', { name: /create investigation/i });
        await user.click(submitButton);

        // Should call API
        await waitFor(() => {
          expect(InvestigationService.createInvestigation).toHaveBeenCalledWith({
            title: 'New Test Investigation',
            description: 'This is a test investigation',
            priority: 'critical'
          });
        });

        // Modal should close
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Create investigation flow test failed: ${error}`);
      }
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time investigation updates via WebSocket', async () => {
      try {
        const { WebSocketService } = require('@shared/services/WebSocketService');

        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Verify WebSocket connection was established
        expect(WebSocketService.connect).toHaveBeenCalled();
        expect(WebSocketService.subscribe).toHaveBeenCalledWith(
          'investigation_updates',
          expect.any(Function)
        );

        // Simulate receiving a WebSocket update
        const mockUpdate = {
          type: 'investigation_updated',
          investigationId: 'inv_001',
          data: {
            ...mockInvestigations[0],
            status: InvestigationStatus.IN_PROGRESS,
            updatedAt: new Date().toISOString()
          }
        };

        // Get the WebSocket callback function
        const subscribeCall = WebSocketService.subscribe.mock.calls.find(
          call => call[0] === 'investigation_updates'
        );
        const updateCallback = subscribeCall[1];

        // Trigger the update
        updateCallback(mockUpdate);

        // Should update the UI
        await waitFor(() => {
          expect(screen.getByText('In Progress')).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Real-time updates test failed: ${error}`);
      }
    });

    it('should display notification for new investigations', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Simulate new investigation notification
        const newInvestigationEvent = {
          type: 'investigation_created',
          data: {
            id: 'inv_new_999',
            title: 'Real-time Created Investigation',
            priority: 'high',
            status: InvestigationStatus.PENDING
          }
        };

        // Trigger the notification
        const { WebSocketService } = require('@shared/services/WebSocketService');
        const subscribeCall = WebSocketService.subscribe.mock.calls.find(
          call => call[0] === 'investigation_updates'
        );
        const updateCallback = subscribeCall[1];
        updateCallback(newInvestigationEvent);

        // Should show notification
        await waitFor(() => {
          expect(screen.getByText(/new investigation created/i)).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`New investigation notification test failed: ${error}`);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      try {
        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');
        InvestigationService.getInvestigations.mockRejectedValueOnce(
          new Error('API server unavailable')
        );

        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        // Should show error state
        await waitFor(() => {
          expect(screen.getByText(/error loading investigations/i)).toBeInTheDocument();
        });

        // Should have retry button
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();

        // Reset mock to success
        InvestigationService.getInvestigations.mockResolvedValueOnce({
          data: mockInvestigations,
          total: mockInvestigations.length
        });

        // Click retry
        await user.click(retryButton);

        // Should load successfully
        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`API error handling test failed: ${error}`);
      }
    });

    it('should handle WebSocket connection failures', async () => {
      try {
        const { WebSocketService } = require('@shared/services/WebSocketService');
        WebSocketService.isConnected.mockReturnValue(false);

        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Should show WebSocket disconnection warning
        expect(screen.getByText(/real-time updates unavailable/i)).toBeInTheDocument();

      } catch (error) {
        throw new Error(`WebSocket error handling test failed: ${error}`);
      }
    });
  });

  describe('Performance and Accessibility', () => {
    it('should be accessible with proper ARIA labels and keyboard navigation', async () => {
      try {
        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Suspicious Login Activity - User John Doe')).toBeInTheDocument();
        });

        // Check for proper ARIA labels
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByLabelText(/search investigations/i)).toBeInTheDocument();

        // Test keyboard navigation
        const firstCard = screen.getByTestId('investigation-card-inv_001');
        expect(firstCard).toHaveAttribute('tabindex', '0');
        expect(firstCard).toHaveAttribute('role', 'button');

        // Focus and activate with keyboard
        firstCard.focus();
        expect(document.activeElement).toBe(firstCard);

        fireEvent.keyDown(firstCard, { key: 'Enter' });
        // Should trigger navigation

      } catch (error) {
        throw new Error(`Accessibility test failed: ${error}`);
      }
    });

    it('should handle large datasets efficiently with virtualization', async () => {
      try {
        // Mock large dataset
        const largeDataset = Array(1000).fill(null).map((_, index) => ({
          ...mockInvestigations[0],
          id: `inv_${index}`,
          title: `Investigation ${index}`
        }));

        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');
        InvestigationService.getInvestigations.mockResolvedValueOnce({
          data: largeDataset,
          total: largeDataset.length
        });

        render(
          <TestWrapper>
            <InvestigationDashboard />
          </TestWrapper>
        );

        // Should load without performance issues
        await waitFor(() => {
          expect(screen.getByText('Investigation 0')).toBeInTheDocument();
        }, { timeout: 5000 });

        // Should implement virtualization (only render visible items)
        const renderedCards = screen.getAllByTestId(/investigation-card/);
        expect(renderedCards.length).toBeLessThan(50); // Should not render all 1000

      } catch (error) {
        throw new Error(`Large dataset performance test failed: ${error}`);
      }
    });
  });
});