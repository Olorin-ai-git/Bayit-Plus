import { renderHook, act } from '@testing-library/react';
import { useExportReporting } from '../../hooks/useExportReporting';
import { Investigation } from '../../types/investigation';
import { ExportOptions } from '../../components/ExportReporting';

// Mock the export service
jest.mock('../../services/exportService', () => ({
  exportService: {
    exportInvestigation: jest.fn()
  }
}));

import { exportService } from '../../services/exportService';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

const mockInvestigation: Investigation = {
  id: 'inv-test-123',
  title: 'Test Investigation',
  description: 'A test investigation',
  status: 'completed',
  priority: 'high',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  createdBy: 'test-user@example.com',
  assignedAgents: ['agent-1'],
  configuration: {
    parameters: {
      parallelAgents: true,
      timeRange: '24h',
      threshold: 0.8
    }
  },
  progress: {
    overall: 100,
    agents: []
  },
  results: {
    riskScore: 0.75,
    confidence: 0.88,
    summary: 'Test investigation summary',
    findings: ['Finding 1'],
    recommendations: ['Recommendation 1']
  }
};

const mockExportOptions: ExportOptions = {
  format: 'json',
  sections: {
    summary: true,
    riskAnalysis: true,
    findings: true,
    recommendations: true,
    evidence: true,
    agentResults: true,
    timeline: true,
    charts: true
  },
  includeMetadata: true,
  includeRawData: false
};

describe('useExportReporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useExportReporting());

      expect(result.current.exportState).toEqual({
        isExporting: false,
        lastExport: null,
        error: null
      });
    });

    it('loads export history from localStorage', () => {
      const mockHistory = [
        {
          id: '1',
          investigationId: 'inv-1',
          investigationTitle: 'Test Investigation',
          timestamp: '2024-01-01T00:00:00Z',
          format: 'JSON',
          template: 'Custom',
          status: 'completed' as const,
          filename: 'test.json'
        }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

      const { result } = renderHook(() => useExportReporting());

      expect(result.current.getExportHistory()).toEqual(mockHistory);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('olorin-export-history');
    });

    it('handles invalid localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const { result } = renderHook(() => useExportReporting());

      expect(result.current.getExportHistory()).toEqual([]);
    });
  });

  describe('Export Investigation', () => {
    it('successfully exports investigation', async () => {
      const mockExportResult = {
        success: true,
        filename: 'test-export.json',
        downloadUrl: 'blob:test-url'
      };

      (exportService.exportInvestigation as jest.Mock).mockResolvedValue(mockExportResult);

      const { result } = renderHook(() => useExportReporting());

      await act(async () => {
        await result.current.exportInvestigation(mockInvestigation, mockExportOptions);
      });

      expect(result.current.exportState.isExporting).toBe(false);
      expect(result.current.exportState.lastExport).toEqual(mockExportResult);
      expect(result.current.exportState.error).toBeNull();

      // Verify history was updated
      const history = result.current.getExportHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        investigationId: 'inv-test-123',
        investigationTitle: 'Test Investigation',
        format: 'JSON',
        status: 'completed',
        filename: 'test-export.json'
      });
    });

    it('handles export failure', async () => {
      const mockExportResult = {
        success: false,
        filename: '',
        error: 'Export failed'
      };

      (exportService.exportInvestigation as jest.Mock).mockResolvedValue(mockExportResult);

      const { result } = renderHook(() => useExportReporting());

      await act(async () => {
        await result.current.exportInvestigation(mockInvestigation, mockExportOptions);
      });

      expect(result.current.exportState.isExporting).toBe(false);
      expect(result.current.exportState.lastExport).toEqual(mockExportResult);
      expect(result.current.exportState.error).toBe('Export failed');

      // Verify failed export was added to history
      const history = result.current.getExportHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        status: 'failed',
        error: 'Export failed'
      });
    });

    it('handles export service exceptions', async () => {
      const errorMessage = 'Service unavailable';
      (exportService.exportInvestigation as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useExportReporting());

      await act(async () => {
        await result.current.exportInvestigation(mockInvestigation, mockExportOptions);
      });

      expect(result.current.exportState.isExporting).toBe(false);
      expect(result.current.exportState.error).toBe(errorMessage);

      // Verify failed export was added to history
      const history = result.current.getExportHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        status: 'failed',
        error: errorMessage
      });
    });

    it('sets isExporting to true during export', async () => {
      let resolveExport: (value: any) => void;
      const exportPromise = new Promise(resolve => {
        resolveExport = resolve;
      });

      (exportService.exportInvestigation as jest.Mock).mockReturnValue(exportPromise);

      const { result } = renderHook(() => useExportReporting());

      // Start export
      act(() => {
        result.current.exportInvestigation(mockInvestigation, mockExportOptions);
      });

      expect(result.current.exportState.isExporting).toBe(true);

      // Complete export
      await act(async () => {
        resolveExport!({
          success: true,
          filename: 'test.json',
          downloadUrl: 'blob:test'
        });
        await exportPromise;
      });

      expect(result.current.exportState.isExporting).toBe(false);
    });
  });

  describe('History Management', () => {
    it('saves history to localStorage', async () => {
      const mockExportResult = {
        success: true,
        filename: 'test-export.json',
        downloadUrl: 'blob:test-url'
      };

      (exportService.exportInvestigation as jest.Mock).mockResolvedValue(mockExportResult);

      const { result } = renderHook(() => useExportReporting());

      await act(async () => {
        await result.current.exportInvestigation(mockInvestigation, mockExportOptions);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'olorin-export-history',
        expect.stringContaining('inv-test-123')
      );
    });

    it('limits history to 50 items', async () => {
      // Create existing history with 50 items
      const existingHistory = Array.from({ length: 50 }, (_, i) => ({
        id: `old-${i}`,
        investigationId: `inv-${i}`,
        investigationTitle: `Investigation ${i}`,
        timestamp: '2024-01-01T00:00:00Z',
        format: 'JSON',
        template: 'Custom',
        status: 'completed' as const
      }));

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingHistory));

      const mockExportResult = {
        success: true,
        filename: 'new-export.json',
        downloadUrl: 'blob:test-url'
      };

      (exportService.exportInvestigation as jest.Mock).mockResolvedValue(mockExportResult);

      const { result } = renderHook(() => useExportReporting());

      await act(async () => {
        await result.current.exportInvestigation(mockInvestigation, mockExportOptions);
      });

      const history = result.current.getExportHistory();
      expect(history).toHaveLength(50); // Still 50, oldest item removed
      expect(history[0].investigationId).toBe('inv-test-123'); // New item at top
    });

    it('provides current export history', () => {
      const mockHistory = [
        {
          id: '1',
          investigationId: 'inv-1',
          investigationTitle: 'Test Investigation',
          timestamp: '2024-01-01T00:00:00Z',
          format: 'JSON',
          template: 'Custom',
          status: 'completed' as const
        }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

      const { result } = renderHook(() => useExportReporting());

      expect(result.current.getExportHistory()).toEqual(mockHistory);
    });
  });

  describe('Error Management', () => {
    it('clears error state', async () => {
      const mockExportResult = {
        success: false,
        filename: '',
        error: 'Export failed'
      };

      (exportService.exportInvestigation as jest.Mock).mockResolvedValue(mockExportResult);

      const { result } = renderHook(() => useExportReporting());

      await act(async () => {
        await result.current.exportInvestigation(mockInvestigation, mockExportOptions);
      });

      expect(result.current.exportState.error).toBe('Export failed');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.exportState.error).toBeNull();
    });
  });

  describe('Scheduled Exports', () => {
    it('schedules export for future time', async () => {
      const { result } = renderHook(() => useExportReporting());

      const futureTime = new Date(Date.now() + 3600000); // 1 hour from now

      await act(async () => {
        await result.current.scheduleExport(mockInvestigation, mockExportOptions, futureTime);
      });

      const history = result.current.getExportHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        status: 'scheduled',
        timestamp: futureTime.toISOString()
      });
    });

    it('immediately executes scheduled export if within 5 minutes', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay) => {
        if (delay <= 300000) { // 5 minutes
          fn(); // Execute immediately for testing
        }
        return 1 as any;
      });

      const mockExportResult = {
        success: true,
        filename: 'scheduled-export.json',
        downloadUrl: 'blob:test-url'
      };

      (exportService.exportInvestigation as jest.Mock).mockResolvedValue(mockExportResult);

      const { result } = renderHook(() => useExportReporting());

      const nearFutureTime = new Date(Date.now() + 60000); // 1 minute from now

      await act(async () => {
        await result.current.scheduleExport(mockInvestigation, mockExportOptions, nearFutureTime);
      });

      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);

      jest.restoreAllMocks();
    });

    it('does not execute scheduled export if beyond 5 minutes', async () => {
      const mockSetTimeout = jest.spyOn(global, 'setTimeout');

      const { result } = renderHook(() => useExportReporting());

      const distantFutureTime = new Date(Date.now() + 3600000); // 1 hour from now

      await act(async () => {
        await result.current.scheduleExport(mockInvestigation, mockExportOptions, distantFutureTime);
      });

      expect(mockSetTimeout).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('Integration Tests', () => {
    it('handles multiple concurrent exports', async () => {
      const mockExportResult1 = {
        success: true,
        filename: 'export1.json',
        downloadUrl: 'blob:test1'
      };

      const mockExportResult2 = {
        success: true,
        filename: 'export2.csv',
        downloadUrl: 'blob:test2'
      };

      (exportService.exportInvestigation as jest.Mock)
        .mockResolvedValueOnce(mockExportResult1)
        .mockResolvedValueOnce(mockExportResult2);

      const { result } = renderHook(() => useExportReporting());

      const options1 = { ...mockExportOptions, format: 'json' as const };
      const options2 = { ...mockExportOptions, format: 'csv' as const };

      await act(async () => {
        await Promise.all([
          result.current.exportInvestigation(mockInvestigation, options1),
          result.current.exportInvestigation(mockInvestigation, options2)
        ]);
      });

      const history = result.current.getExportHistory();
      expect(history).toHaveLength(2);
      expect(history.some(h => h.format === 'JSON')).toBe(true);
      expect(history.some(h => h.format === 'CSV')).toBe(true);
    });

    it('maintains state consistency across multiple operations', async () => {
      const { result } = renderHook(() => useExportReporting());

      // Successful export
      (exportService.exportInvestigation as jest.Mock).mockResolvedValueOnce({
        success: true,
        filename: 'success.json',
        downloadUrl: 'blob:success'
      });

      await act(async () => {
        await result.current.exportInvestigation(mockInvestigation, mockExportOptions);
      });

      expect(result.current.exportState.error).toBeNull();

      // Failed export
      (exportService.exportInvestigation as jest.Mock).mockResolvedValueOnce({
        success: false,
        filename: '',
        error: 'Network error'
      });

      await act(async () => {
        await result.current.exportInvestigation(mockInvestigation, mockExportOptions);
      });

      expect(result.current.exportState.error).toBe('Network error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.exportState.error).toBeNull();

      // Verify both exports are in history
      const history = result.current.getExportHistory();
      expect(history).toHaveLength(2);
      expect(history[0].status).toBe('failed');
      expect(history[1].status).toBe('completed');
    });
  });
});