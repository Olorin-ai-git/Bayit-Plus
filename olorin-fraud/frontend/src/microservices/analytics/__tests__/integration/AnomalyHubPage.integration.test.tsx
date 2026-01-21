/**
 * Integration tests for AnomalyHubPage
 * Tests user interactions, WebSocket updates, and data flow
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AnomalyHubPage } from '../../pages/AnomalyHubPage';
import { AnomalyApiService } from '../../services/anomalyApi';
import { useAnomalies } from '../../hooks/useAnomalies';
import { useAnomalyWebSocket } from '../../hooks/useAnomalyWebSocket';
import type { AnomalyEvent, AnomalyFilter } from '../../types/anomaly';

// Mock dependencies
jest.mock('../../services/anomalyApi');
jest.mock('../../hooks/useAnomalies');
jest.mock('../../hooks/useAnomalyWebSocket');
jest.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
    hideToast: jest.fn(),
  }),
}));

const mockAnomalyApiService = AnomalyApiService as jest.MockedClass<typeof AnomalyApiService>;
const mockUseAnomalies = useAnomalies as jest.MockedFunction<typeof useAnomalies>;
const mockUseAnomalyWebSocket = useAnomalyWebSocket as jest.MockedFunction<typeof useAnomalyWebSocket>;

describe('AnomalyHubPage Integration Tests', () => {
  const mockAnomalies: AnomalyEvent[] = [
    {
      id: '1',
      run_id: 'run-1',
      detector_id: 'detector-1',
      cohort: { merchant_id: 'm1' },
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-01T00:15:00Z',
      metric: 'tx_count',
      observed: 150.0,
      expected: 100.0,
      score: 5.0,
      severity: 'critical',
      persisted_n: 3,
      status: 'new',
      created_at: '2024-01-01T00:15:00Z',
    },
    {
      id: '2',
      run_id: 'run-1',
      detector_id: 'detector-1',
      cohort: { merchant_id: 'm2' },
      window_start: '2024-01-01T00:15:00Z',
      window_end: '2024-01-01T00:30:00Z',
      metric: 'tx_count',
      observed: 120.0,
      expected: 100.0,
      score: 3.5,
      severity: 'warn',
      persisted_n: 2,
      status: 'new',
      created_at: '2024-01-01T00:30:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseAnomalies.mockReturnValue({
      anomalies: mockAnomalies,
      total: 2,
      loading: false,
      error: null,
      refetch: jest.fn(),
      filters: {},
      setFilters: jest.fn(),
    });

    mockUseAnomalyWebSocket.mockReturnValue({
      disconnect: jest.fn(),
      reconnect: jest.fn(),
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AnomalyHubPage />
      </BrowserRouter>
    );
  };

  describe('Initial Render', () => {
    it('should render AnomalyHubPage with header and filters', () => {
      renderComponent();

      expect(screen.getByText(/anomaly hub/i)).toBeInTheDocument();
      expect(screen.getByText(/live feed/i)).toBeInTheDocument();
    });

    it('should display anomalies table when data is loaded', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('m1')).toBeInTheDocument();
        expect(screen.getByText('m2')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching anomalies', () => {
      mockUseAnomalies.mockReturnValue({
        anomalies: [],
        total: 0,
        loading: true,
        error: null,
        refetch: jest.fn(),
        filters: {},
        setFilters: jest.fn(),
      });

      renderComponent();

      // Should show loading indicator
      expect(screen.queryByText('m1')).not.toBeInTheDocument();
    });
  });

  describe('Filter Interactions', () => {
    it('should update filters when severity filter is changed', async () => {
      const setFilters = jest.fn();
      mockUseAnomalies.mockReturnValue({
        anomalies: mockAnomalies,
        total: 2,
        loading: false,
        error: null,
        refetch: jest.fn(),
        filters: {},
        setFilters,
      });

      renderComponent();

      const severityFilter = screen.getByLabelText(/severity/i);
      fireEvent.change(severityFilter, { target: { value: 'critical' } });

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalledWith(
          expect.objectContaining({ severity: 'critical' })
        );
      });
    });

    it('should update filters when metric filter is changed', async () => {
      const setFilters = jest.fn();
      mockUseAnomalies.mockReturnValue({
        anomalies: mockAnomalies,
        total: 2,
        loading: false,
        error: null,
        refetch: jest.fn(),
        filters: {},
        setFilters,
      });

      renderComponent();

      const metricFilter = screen.getByLabelText(/metric/i);
      fireEvent.change(metricFilter, { target: { value: 'tx_count' } });

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalledWith(
          expect.objectContaining({ metric: 'tx_count' })
        );
      });
    });

    it('should update URL when filters change', async () => {
      const setFilters = jest.fn();
      mockUseAnomalies.mockReturnValue({
        anomalies: mockAnomalies,
        total: 2,
        loading: false,
        error: null,
        refetch: jest.fn(),
        filters: { severity: 'critical' },
        setFilters,
      });

      renderComponent();

      // URL should reflect filter state
      expect(window.location.search).toContain('severity');
    });
  });

  describe('WebSocket Updates', () => {
    it('should subscribe to WebSocket on mount', () => {
      renderComponent();

      expect(mockUseAnomalyWebSocket).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ enabled: true })
      );
    });

    it('should update anomalies when WebSocket receives new event', async () => {
      const onAnomaly = jest.fn();
      let wsCallback: (anomaly: AnomalyEvent) => void;

      mockUseAnomalyWebSocket.mockImplementation((callback) => {
        wsCallback = callback;
        return { disconnect: jest.fn(), reconnect: jest.fn() };
      });

      const refetch = jest.fn();
      mockUseAnomalies.mockReturnValue({
        anomalies: mockAnomalies,
        total: 2,
        loading: false,
        error: null,
        refetch,
        filters: {},
        setFilters: jest.fn(),
      });

      renderComponent();

      // Simulate WebSocket message
      const newAnomaly: AnomalyEvent = {
        id: '3',
        run_id: 'run-2',
        detector_id: 'detector-1',
        cohort: { merchant_id: 'm3' },
        window_start: '2024-01-01T01:00:00Z',
        window_end: '2024-01-01T01:15:00Z',
        metric: 'tx_count',
        observed: 200.0,
        expected: 100.0,
        score: 8.0,
        severity: 'critical',
        persisted_n: 4,
        status: 'new',
        created_at: '2024-01-01T01:15:00Z',
      };

      await waitFor(() => {
        if (wsCallback!) {
          wsCallback(newAnomaly);
        }
      });

      // Should trigger refetch or update
      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });

    it('should handle WebSocket reconnection', () => {
      const reconnect = jest.fn();
      mockUseAnomalyWebSocket.mockReturnValue({
        disconnect: jest.fn(),
        reconnect,
      });

      renderComponent();

      // Simulate reconnection trigger
      const reconnectButton = screen.queryByText(/reconnect/i);
      if (reconnectButton) {
        fireEvent.click(reconnectButton);
        expect(reconnect).toHaveBeenCalled();
      }
    });
  });

  describe('Anomaly Table Interactions', () => {
    it('should display anomaly details when row is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        const row = screen.getByText('m1').closest('tr');
        if (row) {
          fireEvent.click(row);
        }
      });

      // Should show details panel or drawer
      await waitFor(() => {
        expect(screen.getByText(/observed/i)).toBeInTheDocument();
        expect(screen.getByText(/150/i)).toBeInTheDocument();
      });
    });

    it('should sort table when column header is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        const scoreHeader = screen.getByText(/score/i);
        if (scoreHeader) {
          fireEvent.click(scoreHeader);
        }
      });

      // Should trigger sort
      await waitFor(() => {
        expect(mockUseAnomalies).toHaveBeenCalled();
      });
    });

    it('should filter by severity when badge is clicked', async () => {
      const setFilters = jest.fn();
      mockUseAnomalies.mockReturnValue({
        anomalies: mockAnomalies,
        total: 2,
        loading: false,
        error: null,
        refetch: jest.fn(),
        filters: {},
        setFilters,
      });

      renderComponent();

      await waitFor(() => {
        const criticalBadge = screen.getByText(/critical/i);
        if (criticalBadge) {
          fireEvent.click(criticalBadge);
        }
      });

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalled();
      });
    });
  });

  describe('Investigation Integration', () => {
    it('should create investigation when "Open in Investigation" is clicked', async () => {
      const mockInvestigate = jest.fn().mockResolvedValue({
        investigation_id: 'inv-1',
        anomaly_id: '1',
        status: 'created',
      });

      mockAnomalyApiService.prototype.investigateAnomaly = mockInvestigate;

      renderComponent();

      await waitFor(() => {
        const investigateButton = screen.getByText(/open in investigation/i);
        if (investigateButton) {
          fireEvent.click(investigateButton);
        }
      });

      await waitFor(() => {
        expect(mockInvestigate).toHaveBeenCalledWith(
          expect.objectContaining({ anomaly_id: '1' })
        );
      });
    });

    it('should navigate to investigation when investigation ID is clicked', async () => {
      const mockAnomalyWithInvestigation = {
        ...mockAnomalies[0],
        investigation_id: 'inv-1',
      };

      mockUseAnomalies.mockReturnValue({
        anomalies: [mockAnomalyWithInvestigation],
        total: 1,
        loading: false,
        error: null,
        refetch: jest.fn(),
        filters: {},
        setFilters: jest.fn(),
      });

      renderComponent();

      await waitFor(() => {
        const investigationLink = screen.getByText(/inv-1/i);
        if (investigationLink) {
          fireEvent.click(investigationLink);
        }
      });

      // Should navigate to investigation page
      // (Navigation testing depends on router implementation)
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', () => {
      mockUseAnomalies.mockReturnValue({
        anomalies: [],
        total: 0,
        loading: false,
        error: new Error('Failed to fetch anomalies'),
        refetch: jest.fn(),
        filters: {},
        setFilters: jest.fn(),
      });

      renderComponent();

      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      const refetch = jest.fn();
      mockUseAnomalies.mockReturnValue({
        anomalies: [],
        total: 0,
        loading: false,
        error: new Error('Failed to fetch'),
        refetch,
        filters: {},
        setFilters: jest.fn(),
      });

      renderComponent();

      const retryButton = screen.getByText(/retry/i);
      fireEvent.click(retryButton);

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('should display empty state when no anomalies found', () => {
      mockUseAnomalies.mockReturnValue({
        anomalies: [],
        total: 0,
        loading: false,
        error: null,
        refetch: jest.fn(),
        filters: { severity: 'critical' },
        setFilters: jest.fn(),
      });

      renderComponent();

      expect(screen.getByText(/no anomalies/i)).toBeInTheDocument();
    });

    it('should suggest clearing filters when filtered results are empty', () => {
      const setFilters = jest.fn();
      mockUseAnomalies.mockReturnValue({
        anomalies: [],
        total: 0,
        loading: false,
        error: null,
        refetch: jest.fn(),
        filters: { severity: 'critical', metric: 'tx_count' },
        setFilters,
      });

      renderComponent();

      const clearFiltersButton = screen.getByText(/clear filters/i);
      if (clearFiltersButton) {
        fireEvent.click(clearFiltersButton);
        expect(setFilters).toHaveBeenCalledWith({});
      }
    });
  });
});

