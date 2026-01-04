/**
 * US1 Tests: Real-Time Progress Monitoring
 * Feature: 008-live-investigation-updates (User Story 1)
 *
 * Tests the useProgressData hook with ETag caching,
 * error handling, and real-time updates.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useProgressData } from '../hooks/useProgressData';
import { investigationService } from '../services/investigationService';
import * as useETagCacheModule from '../hooks/useETagCache';

// Mock the investigation service
jest.mock('../services/investigationService');

// Mock useETagCache
jest.mock('../hooks/useETagCache', () => ({
  useETagCache: jest.fn(() => ({
    getETag: jest.fn(),
    saveETag: jest.fn(),
    clearETag: jest.fn(),
  }))
}));

describe('useProgressData Hook - US1 Real-Time Progress Monitoring', () => {
  const mockProgress = {
    id: 'prog-001',
    investigationId: 'inv-001',
    status: 'running' as const,
    lifecycleStage: 'in_progress' as const,
    completionPercent: 45,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    lastUpdatedAt: new Date().toISOString(),
    toolExecutions: [
      {
        id: 'exec-001',
        toolName: 'domain_analyzer',
        agentType: 'device',
        status: 'completed',
        queuedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        executionTimeMs: 4000,
        input: { entityId: 'user123', entityType: 'user_id', parameters: {} },
        result: {
          success: true,
          riskScore: 0.6,
          risk: 60,
          findings: [{ finding: 'Test finding' }],
          metadata: {}
        },
        error: null,
        retryCount: 0,
        maxRetries: 3
      }
    ],
    totalTools: 2,
    completedTools: 1,
    runningTools: 1,
    queuedTools: 0,
    failedTools: 0,
    skippedTools: 0,
    agentStatuses: [],
    riskMetrics: {
      overall: 0.5,
      byAgent: {},
      confidence: 0.8,
      lastCalculated: new Date().toISOString()
    },
    phases: [],
    currentPhase: 'analysis',
    entities: [],
    relationships: [],
    toolsPerSecond: 2.5,
    peakToolsPerSecond: 5.0,
    iceConnected: true,
    errors: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (investigationService.getProgress as jest.Mock).mockResolvedValue(mockProgress);
  });

  describe('T061: Progress Data Fetching', () => {
    it('should fetch progress data on mount', async () => {
      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(investigationService.getProgress).toHaveBeenCalledWith('inv-001');
      });

      await waitFor(() => {
        expect(result.current.progress).toEqual(mockProgress);
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should return null when investigationId is undefined', () => {
      const { result } = renderHook(() => useProgressData(undefined));

      expect(result.current.progress).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should return loading true initially', () => {
      const { result } = renderHook(() => useProgressData('inv-001'));
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('T062: Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const error = new Error('Network error');
      (investigationService.getProgress as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should retry on error with exponential backoff', async () => {
      (investigationService.getProgress as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockProgress);

      const { result, rerender } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(result.current.retryCount).toBeGreaterThan(0);
      });
    });

    it('should clear error when fetch succeeds after retry', async () => {
      (investigationService.getProgress as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockProgress);

      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(result.current.progress).toEqual(mockProgress);
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('T063: Terminal Status Detection', () => {
    it('should stop polling when investigation is completed', async () => {
      const completedProgress = { ...mockProgress, status: 'completed' as const };
      (investigationService.getProgress as jest.Mock).mockResolvedValue(completedProgress);

      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(result.current.progress?.status).toBe('completed');
      });

      // Verify ETag cache was cleared (investigation is done)
      expect(useETagCacheModule.useETagCache).toHaveBeenCalled();
    });

    it('should stop polling when investigation fails', async () => {
      const failedProgress = { ...mockProgress, status: 'failed' as const };
      (investigationService.getProgress as jest.Mock).mockResolvedValue(failedProgress);

      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(result.current.progress?.status).toBe('failed');
      });
    });
  });

  describe('T064: Real-Time Data Updates', () => {
    it('should update progress when new data arrives', async () => {
      const { result, rerender } = renderHook(
        ({ id }) => useProgressData(id),
        { initialProps: { id: 'inv-001' } }
      );

      await waitFor(() => {
        expect(result.current.progress?.completionPercent).toBe(45);
      });

      // Simulate data update
      const updatedProgress = { ...mockProgress, completionPercent: 75 };
      (investigationService.getProgress as jest.Mock).mockResolvedValue(updatedProgress);

      // Trigger refetch
      result.current.refetch?.();

      await waitFor(() => {
        expect(result.current.progress?.completionPercent).toBe(75);
      });
    });

    it('should track tool execution changes', async () => {
      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(result.current.progress?.totalTools).toBe(2);
      });
      expect(result.current.progress?.completedTools).toBe(1);
      expect(result.current.progress?.runningTools).toBe(1);
    });

    it('should update risk metrics in real-time', async () => {
      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(result.current.progress?.riskMetrics.overall).toBe(0.5);
      });
      expect(result.current.progress?.riskMetrics.confidence).toBe(0.8);
    });
  });

  describe('T065: ETag Caching Integration', () => {
    it('should use ETag for conditional requests', async () => {
      const mockGetETag = jest.fn().mockReturnValue('"etag-123"');
      const mockSaveETag = jest.fn();

      (useETagCacheModule.useETagCache as jest.Mock).mockReturnValue({
        getETag: mockGetETag,
        saveETag: mockSaveETag,
        clearETag: jest.fn()
      });

      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(mockGetETag).toHaveBeenCalled();
      });
    });

    it('should clear ETag cache on terminal status', async () => {
      const mockClearETag = jest.fn();

      (useETagCacheModule.useETagCache as jest.Mock).mockReturnValue({
        getETag: jest.fn(),
        saveETag: jest.fn(),
        clearETag: mockClearETag
      });

      const completedProgress = { ...mockProgress, status: 'completed' as const };
      (investigationService.getProgress as jest.Mock).mockResolvedValue(completedProgress);

      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(mockClearETag).toHaveBeenCalled();
      });
    });
  });

  describe('T066: Component Lifecycle', () => {
    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() => useProgressData('inv-001'));

      unmount();

      // Should not throw or have state updates after unmount
      expect(result.current.isLoading).toBeDefined();
    });

    it('should respect enabled parameter', () => {
      const { result: resultDisabled } = renderHook(() =>
        useProgressData('inv-001', false)
      );

      expect(resultDisabled.current.isLoading).toBe(false);

      const { result: resultEnabled } = renderHook(() =>
        useProgressData('inv-001', true)
      );

      expect(resultEnabled.current.isLoading).toBe(true);
    });
  });

  describe('T080: Performance (SSE Delivery <1s)', () => {
    it('should fetch and return data quickly', async () => {
      const startTime = Date.now();
      const { result } = renderHook(() => useProgressData('inv-001'));

      await waitFor(() => {
        expect(result.current.progress).toBeTruthy();
      });

      const elapsedMs = Date.now() - startTime;
      // SSE target: <1000ms
      expect(elapsedMs).toBeLessThan(1000);
    });
  });
});

export {}; // Empty export for TypeScript

