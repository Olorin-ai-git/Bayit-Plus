/**
 * useAudiobookDetail Hook Tests
 *
 * Tests single audiobook detail fetching:
 * - Fetching audiobook by ID
 * - Loading and error states
 * - Null/invalid ID handling
 * - Refresh and retry behavior
 * - Re-fetch on ID change
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAudiobookDetail } from '../useAudiobookDetail';

// Mock dependencies
const mockGetAudiobookDetail = jest.fn();

jest.mock('@/services/audiobookService', () => ({
  __esModule: true,
  default: {
    getAudiobookDetail: (...args: unknown[]) => mockGetAudiobookDetail(...args),
  },
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockAudiobook = {
  id: 'ab-123',
  title: 'The Great Book',
  author: 'Author Name',
  narrator: 'Narrator Name',
  duration: 36000,
  chapters: [
    { id: 'ch-1', title: 'Chapter 1', startTime: 0 },
    { id: 'ch-2', title: 'Chapter 2', startTime: 1800 },
  ],
  coverUrl: 'https://cdn.example.com/covers/ab-123.jpg',
  description: 'A great audiobook about great things.',
};

describe('useAudiobookDetail', () => {
  beforeEach(() => {
    mockGetAudiobookDetail.mockReset();
  });

  describe('successful fetch', () => {
    test('should fetch audiobook detail by ID', async () => {
      mockGetAudiobookDetail.mockResolvedValue(mockAudiobook);

      const { result } = renderHook(() => useAudiobookDetail('ab-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.audiobook).toEqual(mockAudiobook);
      expect(result.current.error).toBeNull();
      expect(mockGetAudiobookDetail).toHaveBeenCalledWith('ab-123');
    });

    test('should start in loading state', () => {
      mockGetAudiobookDetail.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useAudiobookDetail('ab-123'));

      expect(result.current.loading).toBe(true);
      expect(result.current.audiobook).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('null/invalid ID handling', () => {
    test('should set error for null audiobookId', async () => {
      const { result } = renderHook(() => useAudiobookDetail(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Invalid audiobook ID');
      expect(result.current.audiobook).toBeNull();
      expect(mockGetAudiobookDetail).not.toHaveBeenCalled();
    });

    test('should not call service when ID is null', async () => {
      const { result } = renderHook(() => useAudiobookDetail(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetAudiobookDetail).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should set error message on fetch failure', async () => {
      mockGetAudiobookDetail.mockRejectedValue(new Error('Audiobook not found'));

      const { result } = renderHook(() => useAudiobookDetail('nonexistent'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Audiobook not found');
      expect(result.current.audiobook).toBeNull();
    });

    test('should set default error for non-Error exceptions', async () => {
      mockGetAudiobookDetail.mockRejectedValue('Unknown failure');

      const { result } = renderHook(() => useAudiobookDetail('ab-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load audiobook');
    });

    test('should set default error for undefined thrown value', async () => {
      mockGetAudiobookDetail.mockRejectedValue(undefined);

      const { result } = renderHook(() => useAudiobookDetail('ab-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load audiobook');
    });
  });

  describe('refresh', () => {
    test('should re-fetch audiobook detail', async () => {
      mockGetAudiobookDetail.mockResolvedValueOnce(mockAudiobook);

      const { result } = renderHook(() => useAudiobookDetail('ab-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedAudiobook = { ...mockAudiobook, title: 'Updated Title' };
      mockGetAudiobookDetail.mockResolvedValueOnce(updatedAudiobook);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.audiobook).toEqual(updatedAudiobook);
      expect(mockGetAudiobookDetail).toHaveBeenCalledTimes(2);
    });

    test('should set loading true during refresh', async () => {
      mockGetAudiobookDetail.mockResolvedValueOnce(mockAudiobook);

      const { result } = renderHook(() => useAudiobookDetail('ab-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loadingDuringRefresh = false;
      mockGetAudiobookDetail.mockImplementationOnce(() => {
        loadingDuringRefresh = result.current.loading;
        return Promise.resolve(mockAudiobook);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(loadingDuringRefresh).toBe(true);
    });
  });

  describe('retry', () => {
    test('should clear error and retry fetch', async () => {
      mockGetAudiobookDetail.mockRejectedValueOnce(new Error('Temporary failure'));

      const { result } = renderHook(() => useAudiobookDetail('ab-123'));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      mockGetAudiobookDetail.mockResolvedValueOnce(mockAudiobook);

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.audiobook).toEqual(mockAudiobook);
      expect(result.current.loading).toBe(false);
    });

    test('should handle repeated failures', async () => {
      mockGetAudiobookDetail.mockRejectedValueOnce(new Error('Failure 1'));

      const { result } = renderHook(() => useAudiobookDetail('ab-123'));

      await waitFor(() => {
        expect(result.current.error).toBe('Failure 1');
      });

      mockGetAudiobookDetail.mockRejectedValueOnce(new Error('Failure 2'));

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error).toBe('Failure 2');
      expect(result.current.audiobook).toBeNull();
    });
  });

  describe('ID change', () => {
    test('should re-fetch when audiobookId changes', async () => {
      mockGetAudiobookDetail.mockResolvedValueOnce(mockAudiobook);

      const { result, rerender } = renderHook(
        (props: { id: string | null }) => useAudiobookDetail(props.id),
        { initialProps: { id: 'ab-123' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.audiobook).toEqual(mockAudiobook);

      const secondBook = { ...mockAudiobook, id: 'ab-456', title: 'Second Book' };
      mockGetAudiobookDetail.mockResolvedValueOnce(secondBook);

      rerender({ id: 'ab-456' });

      await waitFor(() => {
        expect(result.current.audiobook?.id).toBe('ab-456');
      });

      expect(mockGetAudiobookDetail).toHaveBeenCalledWith('ab-456');
    });

    test('should handle transition from valid ID to null', async () => {
      mockGetAudiobookDetail.mockResolvedValueOnce(mockAudiobook);

      const { result, rerender } = renderHook(
        (props: { id: string | null }) => useAudiobookDetail(props.id),
        { initialProps: { id: 'ab-123' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ id: null });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid audiobook ID');
      });
    });
  });

  describe('return shape', () => {
    test('should return all expected properties', async () => {
      mockGetAudiobookDetail.mockResolvedValue(mockAudiobook);

      const { result } = renderHook(() => useAudiobookDetail('ab-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('audiobook');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refresh');
      expect(result.current).toHaveProperty('retry');
      expect(typeof result.current.refresh).toBe('function');
      expect(typeof result.current.retry).toBe('function');
    });
  });
});
