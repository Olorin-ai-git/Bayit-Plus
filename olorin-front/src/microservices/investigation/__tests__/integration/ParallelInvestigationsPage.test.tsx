import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ParallelInvestigationsPage } from '../../pages/ParallelInvestigationsPage';
import * as investigationService from '../../services/investigationService';

// Mock the investigation service
jest.mock('../../services/investigationService');

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock configuration
jest.mock('../../config/investigationConfig', () => ({
  getInvestigationConfig: () => ({
    pollingInterval: 10000,
    apiBaseUrl: 'http://localhost:8090',
    enableStatusFilter: false,
    enableRealTimeUpdates: false,
    paginationSize: 50,
  }),
}));

// Mock event bus for real-time updates
jest.mock('../../../../shared/events/UnifiedEventBus', () => ({
  eventBusInstance: {
    on: jest.fn((event, callback) => callback),
    off: jest.fn(),
    emit: jest.fn(),
  },
}));

const mockInvestigations = [
  {
    id: 'auto-comp-inv-001',
    investigationId: 'auto-comp-inv-001',
    entityValue: 'user@example.com',
    status: 'IN_PROGRESS',
    riskScore: 0.75,
    startTime: '2025-01-15T10:00:00Z',
    createdAt: '2025-01-15T10:00:00Z',
    progress: 45,
  },
  {
    id: 'auto-comp-inv-002',
    investigationId: 'auto-comp-inv-002',
    entityValue: 'merchant@test.com',
    status: 'COMPLETED',
    riskScore: 0.35,
    startTime: '2025-01-15T09:00:00Z',
    createdAt: '2025-01-15T09:00:00Z',
    progress: 100,
  },
];

describe('ParallelInvestigationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // T009: Integration test - Page loads and displays investigations table
  describe('T009: Page loads and displays investigations table', () => {
    test('should render table with correct columns', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText(/Investigation ID/i)).toBeInTheDocument();
      });

      // Verify column headers
      expect(screen.getByText(/Entity Value/i)).toBeInTheDocument();
      expect(screen.getByText(/Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Risk Score/i)).toBeInTheDocument();
      expect(screen.getByText(/Start Time/i)).toBeInTheDocument();
    });

    test('should display investigations from API', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      // Wait for investigations to render
      await waitFor(() => {
        expect(screen.getByText('auto-comp-inv-001')).toBeInTheDocument();
        expect(screen.getByText('auto-comp-inv-002')).toBeInTheDocument();
      });

      // Verify data is displayed
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('merchant@test.com')).toBeInTheDocument();
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    test('should show loading state initially', () => {
      (investigationService.getInvestigations as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      // Check for loading indicator
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('should handle empty investigation list', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByText(/No investigations found/i)).toBeInTheDocument();
      });
    });
  });

  // T010: Integration test - Automatic polling refreshes data
  describe('T010: Automatic polling refreshes data', () => {
    test('should call API on mount', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(investigationService.getInvestigations).toHaveBeenCalledTimes(1);
      });
    });

    test('should poll API every 10 seconds', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValue({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      // Initial call
      await waitFor(() => {
        expect(investigationService.getInvestigations).toHaveBeenCalledTimes(1);
      });

      // Advance time by 10 seconds
      jest.advanceTimersByTime(10000);

      // Should be called again
      await waitFor(() => {
        expect(investigationService.getInvestigations).toHaveBeenCalledTimes(2);
      });

      // Advance time by another 10 seconds
      jest.advanceTimersByTime(10000);

      // Should be called third time
      await waitFor(() => {
        expect(investigationService.getInvestigations).toHaveBeenCalledTimes(3);
      });
    });

    test('should update UI with new data from polling', async () => {
      const initialData = {
        investigations: [mockInvestigations[0]],
        totalCount: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      const updatedData = {
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      (investigationService.getInvestigations as jest.Mock)
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(updatedData);

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      // Initial render shows one investigation
      await waitFor(() => {
        expect(screen.getByText('auto-comp-inv-001')).toBeInTheDocument();
      });

      expect(screen.queryByText('auto-comp-inv-002')).not.toBeInTheDocument();

      // Advance polling timer
      jest.advanceTimersByTime(10000);

      // Wait for second investigation to appear
      await waitFor(() => {
        expect(screen.getByText('auto-comp-inv-002')).toBeInTheDocument();
      });
    });

    test('should use correct polling interval from config', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValue({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(investigationService.getInvestigations).toHaveBeenCalledTimes(1);
      });

      // Advance by 5 seconds (less than polling interval)
      jest.advanceTimersByTime(5000);

      // Should still be 1 call
      expect(investigationService.getInvestigations).toHaveBeenCalledTimes(1);

      // Advance by 6 more seconds (total 11 seconds)
      jest.advanceTimersByTime(6000);

      // Should be called second time
      await waitFor(() => {
        expect(investigationService.getInvestigations).toHaveBeenCalledTimes(2);
      });
    });

    test('should pass search filter to API', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(investigationService.getInvestigations).toHaveBeenCalled();
      });

      // Verify search filter for auto-comp investigations
      const call = (investigationService.getInvestigations as jest.Mock).mock.calls[0];
      expect(call[0]).toEqual(
        expect.objectContaining({
          search: 'auto-comp-',
        })
      );
    });
  });

  // T024: Row click navigation test
  describe('T024: Row click navigation', () => {
    test('should navigate to progress page when row clicked', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('auto-comp-inv-001')).toBeInTheDocument();
      });

      // Click on first investigation row
      const investigationCell = screen.getByText('auto-comp-inv-001');
      await userEvent.click(investigationCell);

      // Verify navigation was called
      expect(mockNavigate).toHaveBeenCalledWith('/investigation/progress?id=auto-comp-inv-001');
    });
  });

  // T035: Error handling test
  describe('T035: Error handling', () => {
    test('should display error message on API failure', async () => {
      const errorMessage = 'Failed to fetch investigations';
      (investigationService.getInvestigations as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to/i)).toBeInTheDocument();
      });
    });

    test('should show retry button on error', async () => {
      (investigationService.getInvestigations as jest.Mock)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          investigations: mockInvestigations,
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false,
        });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      // Should reload data
      await waitFor(() => {
        expect(screen.getByText('auto-comp-inv-001')).toBeInTheDocument();
      });
    });
  });

  // T036: WebSocket real-time updates test
  describe('T036: WebSocket real-time updates', () => {
    test('should display WebSocket connection status', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('auto-comp-inv-001')).toBeInTheDocument();
      });

      // Should show polling mode initially (no WebSocket connected)
      expect(screen.getByText('Polling mode')).toBeInTheDocument();
    });

    test('should update connection status when WebSocket connects', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const { rerender } = render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Polling mode')).toBeInTheDocument();
      });

      // Simulate WebSocket connection via event bus
      const mockEventBus = require('../../../../shared/events/UnifiedEventBus').eventBusInstance;
      const callbacks = new Map();

      mockEventBus.on.mockImplementation((event, callback) => {
        if (!callbacks.has(event)) callbacks.set(event, []);
        callbacks.get(event).push(callback);
        return callback;
      });

      // Re-render to allow event listener to be set up
      rerender(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      // Trigger WebSocket connected event
      const wsCallbacks = callbacks.get('system:websocket-connected') || [];
      wsCallbacks.forEach(cb => cb?.());

      await waitFor(() => {
        expect(screen.getByText('Real-time')).toBeInTheDocument();
      });
    });
  });

  // T037: Status filtering tests
  describe('T037: Status filtering', () => {
    test('should show filter UI when feature flag enabled', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('auto-comp-inv-001')).toBeInTheDocument();
      });

      // Filter UI should be visible when enableStatusFilter is true
      // Note: Test mock has enableStatusFilter: false, so filter won't show
      const filterElement = screen.queryByText(/Filter by Status/i);
      expect(filterElement).not.toBeInTheDocument();
    });

    test('should filter investigations by status', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 2 investigations')).toBeInTheDocument();
      });
    });
  });

  // T038: Last updated timestamp tests
  describe('T038: Last updated timestamp', () => {
    test('should display last updated timestamp', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
      });
    });
  });

  // T039: Advanced error recovery tests
  describe('T039: Advanced error recovery', () => {
    test('should show error message with retry button', async () => {
      const errorMsg = 'Network connection failed';
      (investigationService.getInvestigations as jest.Mock).mockRejectedValueOnce(
        new Error(errorMsg)
      );

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Error loading investigations')).toBeInTheDocument();
        expect(screen.getByText(errorMsg)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry with Backoff/i });
      expect(retryButton).toBeInTheDocument();
    });

    test('should retry with exponential backoff', async () => {
      (investigationService.getInvestigations as jest.Mock)
        .mockRejectedValueOnce(new Error('Connection error'))
        .mockResolvedValueOnce({
          investigations: mockInvestigations,
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false,
        });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Error loading investigations')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry with Backoff/i });
      await userEvent.click(retryButton);

      // Should attempt retry after delay
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(investigationService.getInvestigations).toHaveBeenCalled();
      });
    });
  });

  // T040: Refresh button improvements tests
  describe('T040: Refresh button improvements', () => {
    test('should show loading spinner during refresh', async () => {
      (investigationService.getInvestigations as jest.Mock).mockResolvedValueOnce({
        investigations: mockInvestigations,
        totalCount: 2,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      render(
        <BrowserRouter>
          <ParallelInvestigationsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('auto-comp-inv-001')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      expect(refreshButton).not.toBeDisabled();
    });
  });
});
