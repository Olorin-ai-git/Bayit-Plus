import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import api from '@/services/api';
import { usePlaybackSession } from '../usePlaybackSession';
import { deviceService } from '@/services/deviceService';

// Mock dependencies
jest.mock('@/services/api', () => ({ __esModule: true, default: { post: jest.fn().mockResolvedValue({}), get: jest.fn().mockResolvedValue({}) } }));
jest.mock('@/hooks/usePlaybackHeartbeat');

// Mock deviceService
jest.mock('@/services/deviceService', () => ({
  deviceService: {
    generateDeviceId: jest.fn(),
    getDeviceName: jest.fn(),
    getDeviceType: jest.fn(),
    getBrowserName: jest.fn(),
    getOSName: jest.fn(),
    getPlatform: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('usePlaybackSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.post.mockReset().mockResolvedValue({});
    (deviceService.generateDeviceId as jest.Mock).mockResolvedValue('test-device-id');
    (deviceService.getDeviceName as jest.Mock).mockReturnValue('Chrome on macOS');
    (deviceService.getDeviceType as jest.Mock).mockReturnValue('desktop');
    ((deviceService as any).getBrowserName as jest.Mock).mockReturnValue('Chrome');
    (deviceService.getOSName as jest.Mock).mockReturnValue('macOS');
    (deviceService.getPlatform as jest.Mock).mockReturnValue('Web');
  });

  describe('Session Creation', () => {
    it('should create session when playback starts', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'content-789',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() =>
        usePlaybackSession({
          contentId: 'content-789',
          contentType: 'vod',
          isPlaying: true,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/playback/session/start',
        expect.objectContaining({
          device_id: 'test-device-id',
          content_id: 'content-789',
          content_type: 'vod',
          device_name: 'Chrome on macOS',
        })
      );
    });

    it('should not create session when playback is paused', () => {
      renderHook(() =>
        usePlaybackSession({
          contentId: 'content-789',
          contentType: 'vod',
          isPlaying: false,
          enabled: true,
        })
      );

      expect(mockedApi.post).not.toHaveBeenCalled();
    });

    it('should not create session when disabled', () => {
      renderHook(() =>
        usePlaybackSession({
          contentId: 'content-789',
          contentType: 'vod',
          isPlaying: true,
          enabled: false,
        })
      );

      expect(mockedApi.post).not.toHaveBeenCalled();
    });

    it('should not create session when contentId is undefined', () => {
      renderHook(() =>
        usePlaybackSession({
          contentId: undefined,
          contentType: 'vod',
          isPlaying: true,
          enabled: true,
        })
      );

      expect(mockedApi.post).not.toHaveBeenCalled();
    });

    it('should not create duplicate sessions', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'content-789',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValue(mockSession);

      const { rerender } = renderHook(
        ({ isPlaying }) =>
          usePlaybackSession({
            contentId: 'content-789',
            contentType: 'vod',
            isPlaying,
            enabled: true,
          }),
        { initialProps: { isPlaying: true } }
      );

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledTimes(1);
      });

      // Rerender with same props
      rerender({ isPlaying: true });

      // Should not create second session
      expect(mockedApi.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrent Stream Limit Enforcement', () => {
    it('should handle 403 error when stream limit exceeded', async () => {
      const limitError = {
        code: 'CONCURRENT_STREAM_LIMIT_EXCEEDED',
        message: 'Maximum concurrent streams (2) reached',
        max_streams: 2,
        active_sessions: 2,
        active_devices: [
          { device_id: 'device-1', device_name: 'iPhone', content_id: 'content-1' },
          { device_id: 'device-2', device_name: 'iPad', content_id: 'content-2' },
        ],
      };

      mockedApi.post.mockRejectedValueOnce({
        detail: limitError,
      });

      const onLimitExceeded = jest.fn();

      const { result } = renderHook(() =>
        usePlaybackSession({
          contentId: 'content-789',
          contentType: 'vod',
          isPlaying: true,
          enabled: true,
          onLimitExceeded,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(limitError);
      });

      expect(onLimitExceeded).toHaveBeenCalledWith(limitError);
    });

    it('reports failure after exhausting transient API retries', async () => {
      jest.useFakeTimers();
      mockedApi.post.mockRejectedValue({ message: 'Internal server error' });
      const { result, unmount } = renderHook(() => usePlaybackSession({ contentId: 'content-789', contentType: 'vod', isPlaying: true, enabled: true }));
      try {
        await act(async () => { await jest.runAllTimersAsync(); });
        expect(result.current.isCreatingSession).toBe(false);
        expect(result.current.sessionId).toBeNull();
        expect(result.current.error).toEqual(expect.objectContaining({ code: 'SESSION_CREATION_FAILED' }));
        expect(mockedApi.post).toHaveBeenCalledTimes(3);
      } finally { unmount(); jest.useRealTimers(); }
    });
  });

  describe('Session Cleanup', () => {
    it('should end session on unmount', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'content-789',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      const { unmount, result } = renderHook(() =>
        usePlaybackSession({
          contentId: 'content-789',
          contentType: 'vod',
          isPlaying: true,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      unmount();

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/playback/session/end', {
          session_id: 'session-123',
        });
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'content-789',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      mockedApi.post
        .mockResolvedValueOnce(mockSession)
        .mockRejectedValueOnce(new Error('Network error'));

      const { unmount, result } = renderHook(() =>
        usePlaybackSession({
          contentId: 'content-789',
          contentType: 'vod',
          isPlaying: true,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      // Should not throw error
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Manual Session Control', () => {
    it('should allow manual session termination', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'content-789',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() =>
        usePlaybackSession({
          contentId: 'content-789',
          contentType: 'vod',
          isPlaying: true,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      await act(async () => {
        await result.current.endSession();
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/playback/session/end', {
        session_id: 'session-123',
      });

      expect(result.current.sessionId).toBeNull();
    });

    it('should not attempt to end non-existent session', async () => {
      const { result } = renderHook(() =>
        usePlaybackSession({
          contentId: 'content-789',
          contentType: 'vod',
          isPlaying: false,
          enabled: true,
        })
      );

      await act(async () => {
        await result.current.endSession();
      });

      expect(mockedApi.post).not.toHaveBeenCalledWith(
        '/playback/session/end',
        expect.anything()
      );
    });
  });

  describe('Content Change Handling', () => {
    it('should create new session when contentId changes', async () => {
      const mockSession1 = {
        session_id: 'session-123',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'content-789',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      const mockSession2 = {
        session_id: 'session-456',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'content-999',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      mockedApi.post
        .mockResolvedValueOnce(mockSession1)
        .mockResolvedValueOnce(mockSession2);

      const { rerender, result } = renderHook(
        ({ contentId }) =>
          usePlaybackSession({
            contentId,
            contentType: 'vod',
            isPlaying: true,
            enabled: true,
          }),
        { initialProps: { contentId: 'content-789' } }
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      // Change content
      rerender({ contentId: 'content-999' });

      // Should end old session on unmount and create new one
      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/playback/session/end', {
          session_id: 'session-123',
        });
      });
    });
  });

  describe('Live vs VOD Content', () => {
    it('should handle live content type', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'live-channel-1',
        content_type: 'live',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() =>
        usePlaybackSession({
          contentId: 'live-channel-1',
          contentType: 'live',
          isPlaying: true,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/playback/session/start',
        expect.objectContaining({
          content_type: 'live',
        })
      );
    });

    it('should handle podcast content type', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'podcast-123',
        content_type: 'podcast',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() =>
        usePlaybackSession({
          contentId: 'podcast-123',
          contentType: 'podcast',
          isPlaying: true,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/playback/session/start',
        expect.objectContaining({
          content_type: 'podcast',
        })
      );
    });

    it('should handle radio content type', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'user-456',
        device_id: 'test-device-id',
        content_id: 'radio-station-1',
        content_type: 'radio',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      const { result } = renderHook(() =>
        usePlaybackSession({
          contentId: 'radio-station-1',
          contentType: 'radio',
          isPlaying: true,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('session-123');
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/playback/session/start',
        expect.objectContaining({
          content_type: 'radio',
        })
      );
    });
  });
});
