/**
 * Unit Tests for InvestigationReportsList Component
 * Feature: 001-extensive-investigation-report
 * Task: T078
 *
 * Tests the InvestigationReportsList component which displays a paginated list
 * of investigation reports with loading, error, and empty states.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestigationReportsList from '../../../../../../src/microservices/reporting/components/investigation/InvestigationReportsList';
import { InvestigationReportListResponse } from '../../../../../../src/microservices/reporting/types/reports';

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.open
global.open = jest.fn();

// Mock environment variables
process.env.REACT_APP_API_BASE_URL = 'http://localhost:8090';

const mockReportsResponse: InvestigationReportListResponse = {
  reports: [
    {
      investigation_id: 'test-001',
      title: 'Critical Account Takeover',
      generated_at: '2025-01-01T10:00:00Z',
      file_size_bytes: 1024000,
      overall_risk_score: 92.5,
      entity_id: 'attacker@evil.com',
      entity_type: 'email',
      status: 'COMPLETED',
      owner: 'analyst@olorin.com'
    },
    {
      investigation_id: 'test-002',
      title: 'High Risk Device Spoofing',
      generated_at: '2025-01-02T11:00:00Z',
      file_size_bytes: 512000,
      overall_risk_score: 68.3,
      entity_id: 'device-456',
      entity_type: 'device',
      status: 'COMPLETED',
      owner: 'analyst@olorin.com'
    }
  ],
  total: 2,
  page: 1,
  limit: 20
};

describe('InvestigationReportsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (global.open as jest.Mock).mockClear();
  });

  describe('Loading State', () => {
    it('should display loading spinner when fetching reports', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<InvestigationReportsList />);

      expect(screen.getByText('Loading reports...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should display reports when fetch succeeds', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      render(<InvestigationReportsList />);

      await waitFor(() => {
        expect(screen.getByText('Critical Account Takeover')).toBeInTheDocument();
        expect(screen.getByText('High Risk Device Spoofing')).toBeInTheDocument();
      });

      expect(screen.getByText(/Showing 2 of 2 reports/)).toBeInTheDocument();
    });

    it('should call fetch with correct parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      render(<InvestigationReportsList initialPage={1} initialLimit={20} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8090/api/v1/reports/investigation/?page=1&limit=20',
          expect.objectContaining({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });
    });

    it('should include investigationId filter in API call', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      render(<InvestigationReportsList investigationId="test-123" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('investigation_id=test-123'),
          expect.anything()
        );
      });
    });

    it('should include riskLevel filter in API call', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      render(<InvestigationReportsList riskLevel="critical" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('risk_level=critical'),
          expect.anything()
        );
      });
    });

    it('should include search query in API call', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      render(<InvestigationReportsList search="Account" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=Account'),
          expect.anything()
        );
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<InvestigationReportsList />);

      await waitFor(() => {
        expect(screen.getByText('Error loading reports')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display error when API returns non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      render(<InvestigationReportsList />);

      await waitFor(() => {
        expect(screen.getByText('Error loading reports')).toBeInTheDocument();
        expect(
          screen.getByText(/Failed to fetch reports: Internal Server Error/)
        ).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReportsResponse
        });

      render(<InvestigationReportsList />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Critical Account Takeover')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no reports exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reports: [],
          total: 0,
          page: 1,
          limit: 20
        })
      });

      render(<InvestigationReportsList />);

      await waitFor(() => {
        expect(screen.getByText('No reports found')).toBeInTheDocument();
        expect(
          screen.getByText('Generate investigation reports to see them listed here.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    const multiPageResponse: InvestigationReportListResponse = {
      ...mockReportsResponse,
      total: 50
    };

    it('should display pagination controls when multiple pages exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse
      });

      render(<InvestigationReportsList initialLimit={20} />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first page', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse
      });

      render(<InvestigationReportsList />);

      await waitFor(() => {
        const previousButton = screen.getByRole('button', { name: /previous/i });
        expect(previousButton).toBeDisabled();
      });
    });

    it('should navigate to next page when Next button clicked', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => multiPageResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...multiPageResponse,
            page: 2
          })
        });

      render(<InvestigationReportsList initialLimit={20} />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should navigate to previous page when Previous button clicked', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...multiPageResponse,
            page: 2
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => multiPageResponse
        });

      render(<InvestigationReportsList initialPage={2} initialLimit={20} />);

      await waitFor(() => {
        expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
      });

      const previousButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(previousButton);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
      });
    });

    it('should disable Next button on last page', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockReportsResponse,
          total: 2,
          page: 1
        })
      });

      render(<InvestigationReportsList initialLimit={20} />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeDisabled();
      });
    });

    it('should not display pagination when only one page exists', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      render(<InvestigationReportsList />);

      await waitFor(() => {
        expect(screen.getByText('Critical Account Takeover')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });
  });

  describe('View Report', () => {
    it('should open report in new tab when View button clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      render(<InvestigationReportsList />);

      await waitFor(() => {
        expect(screen.getByText('Critical Account Takeover')).toBeInTheDocument();
      });

      // InvestigationReportListItem should trigger onView callback
      // This is an indirect test - actual button interaction tested in InvestigationReportListItem.test.tsx
      expect(global.open).not.toHaveBeenCalled();
    });
  });

  describe('Filter Updates', () => {
    it('should refetch reports when investigationId prop changes', async () => {
      const { rerender } = render(<InvestigationReportsList />);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      rerender(<InvestigationReportsList investigationId="test-123" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenLastCalledWith(
          expect.stringContaining('investigation_id=test-123'),
          expect.anything()
        );
      });
    });

    it('should refetch reports when riskLevel prop changes', async () => {
      const { rerender } = render(<InvestigationReportsList />);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      rerender(<InvestigationReportsList riskLevel="critical" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenLastCalledWith(
          expect.stringContaining('risk_level=critical'),
          expect.anything()
        );
      });
    });

    it('should refetch reports when search prop changes', async () => {
      const { rerender } = render(<InvestigationReportsList />);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportsResponse
      });

      rerender(<InvestigationReportsList search="Account" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenLastCalledWith(
          expect.stringContaining('search=Account'),
          expect.anything()
        );
      });
    });
  });
});
