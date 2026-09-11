/**
 * Integration Tests: VideoPlayer Playback Session Management
 *
 * Tests the complete flow:
 * VideoPlayer → usePlaybackSession → Backend API → StreamLimitExceededModal
 */

import '@/__tests__/support/costDashboardI18n';
import React from 'react';
import { render as renderUI, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import api from '@/services/api';
import VideoPlayer from '../VideoPlayer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { deviceService } from '@/services/deviceService';

const render = (ui: React.ReactElement) => {
  const result = renderUI(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 1280, height: 720 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>{ui}</SafeAreaProvider>);
  const media = result.container.querySelector('video, audio');
  if (media) fireEvent.play(media);
  return result;
};

jest.mock('@bayit/shared-services/api/triviaServices', () => ({ triviaApi: {
  getPreferences: jest.fn().mockResolvedValue({ enabled: false }),
  getTrivia: jest.fn().mockResolvedValue({ facts: [] }),
  getEnrichedTrivia: jest.fn().mockResolvedValue({ facts: [] }),
} }));

// Mock dependencies
jest.mock('@/services/api', () => ({ __esModule: true, default: { post: jest.fn().mockResolvedValue({}), get: jest.fn().mockResolvedValue({}) } }));
jest.mock('@/hooks/usePlaybackHeartbeat');
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
jest.mock('@bayit/shared-stores/authStore', () => {
  const state = { user: { id: 'test-user-123', subscription: { tier: 'premium', max_concurrent_streams: 2 } }, token: null, isAdmin: () => false };
  return { useAuthStore: Object.assign((selector: any) => selector ? selector(state) : state, { getState: () => state }) };
});
jest.mock('@/hooks/useLiveFeatureQuota', () => ({
  useLiveFeatureQuota: () => ({
    usageStats: { liveDubbingMinutes: 0, liveSubtitlesMinutes: 0 },
  }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

const mockVideoPlayerProps = {
  src: 'https://example.com/video.m3u8',
  poster: 'https://example.com/poster.jpg',
  title: 'Test Video',
  contentId: 'test-content-123',
  contentType: 'vod' as const,
  isLive: false,
  availableSubtitleLanguages: ['en', 'es'],
  autoPlay: true,
  chapters: [],
  chaptersLoading: false,
};

describe('VideoPlayer Playback Session Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (deviceService.generateDeviceId as jest.Mock).mockResolvedValue('test-device-id');
    (deviceService.getDeviceName as jest.Mock).mockReturnValue('Chrome on macOS');
    (deviceService.getDeviceType as jest.Mock).mockReturnValue('desktop');
    ((deviceService as any).getBrowserName as jest.Mock).mockReturnValue('Chrome');
    (deviceService.getOSName as jest.Mock).mockReturnValue('macOS');
    (deviceService.getPlatform as jest.Mock).mockReturnValue('Web');

    // Mock video element methods
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = jest.fn();
  });

  describe('Session Creation Flow', () => {
    it('should create playback session when video starts playing', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'test-user-123',
        device_id: 'test-device-id',
        content_id: 'test-content-123',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} />
        </BrowserRouter>
      );

      // Wait for session creation
      await waitFor(
        () => {
          expect(mockedApi.post).toHaveBeenCalledWith(
            '/playback/session/start',
            expect.objectContaining({
              device_id: 'test-device-id',
              content_id: 'test-content-123',
              content_type: 'vod',
              device_name: 'Chrome on macOS',
            })
          );
        },
        { timeout: 3000 }
      );
    });

    it('should not create session for widget mode', async () => {
      render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} isWidget={true} />
        </BrowserRouter>
      );

      // Wait to ensure no session is created
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(mockedApi.post).not.toHaveBeenCalledWith(
        '/playback/session/start',
        expect.anything()
      );
    });

    it('should end session when component unmounts', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'test-user-123',
        device_id: 'test-device-id',
        content_id: 'test-content-123',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      const { unmount } = render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          '/playback/session/start',
          expect.anything()
        );
      });

      unmount();

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/playback/session/end', {
          session_id: 'session-123',
        });
      });
    });
  });

  describe('Concurrent Stream Limit Enforcement', () => {
    it('should show modal when stream limit exceeded', async () => {
      const limitError = {
        code: 'CONCURRENT_STREAM_LIMIT_EXCEEDED',
        message: 'Maximum concurrent streams (2) reached for your Premium plan.',
        max_streams: 2,
        active_sessions: 2,
        active_devices: [
          { device_id: 'device-1', device_name: 'iPhone 15', content_id: 'content-1' },
          { device_id: 'device-2', device_name: 'iPad Air', content_id: 'content-2' },
        ],
      };

      mockedApi.post.mockRejectedValueOnce({
        detail: limitError,
      });

      render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} />
        </BrowserRouter>
      );

      // Wait for modal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Stream Limit Reached')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByText(/maximum number of concurrent streams \(2\)/)).toBeInTheDocument();
      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
      expect(screen.getByText('iPad Air')).toBeInTheDocument();
    });

    it('should pause video when stream limit exceeded', async () => {
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

      const { container } = render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Stream Limit Reached')).toBeInTheDocument();
      });

      const videoElement = container.querySelector('video');
      expect(videoElement).toBeInTheDocument();
      expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    });

    it('should close modal when Cancel clicked', async () => {
      const limitError = {
        code: 'CONCURRENT_STREAM_LIMIT_EXCEEDED',
        message: 'Maximum concurrent streams (2) reached',
        max_streams: 2,
        active_sessions: 2,
        active_devices: [
          { device_id: 'device-1', device_name: 'iPhone', content_id: 'content-1' },
        ],
      };

      mockedApi.post.mockRejectedValueOnce({
        detail: limitError,
      });

      render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Stream Limit Reached')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      // JSDOM does not run CSS animations; complete the real modal fade-out.
      const fade = Array.from(document.querySelectorAll('div')).find(
        (element) => getComputedStyle(element).animationTimingFunction === 'ease-out'
      );
      expect(fade).toHaveStyle({ opacity: 0 });
      fireEvent.animationEnd(fade!);

      await waitFor(() => {
        expect(screen.queryByText('Stream Limit Reached')).not.toBeInTheDocument();
      });
    });
  });

  describe('Live Content Handling', () => {
    it('should create session for live content', async () => {
      const mockSession = {
        session_id: 'session-live-123',
        user_id: 'test-user-123',
        device_id: 'test-device-id',
        content_id: 'live-channel-1',
        content_type: 'live',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      render(
        <BrowserRouter>
          <VideoPlayer
            {...mockVideoPlayerProps}
            contentId="live-channel-1"
            contentType="live"
            isLive={true}
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          '/playback/session/start',
          expect.objectContaining({
            content_id: 'live-channel-1',
            content_type: 'live',
          })
        );
      });
    });
  });

  describe('Podcast/Radio Content Handling', () => {
    it('should create session for podcast content', async () => {
      const mockSession = {
        session_id: 'session-podcast-123',
        user_id: 'test-user-123',
        device_id: 'test-device-id',
        content_id: 'podcast-episode-1',
        content_type: 'podcast',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      render(
        <BrowserRouter>
          <VideoPlayer
            {...mockVideoPlayerProps}
            contentId="podcast-episode-1"
            contentType="podcast"
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          '/playback/session/start',
          expect.objectContaining({
            content_id: 'podcast-episode-1',
            content_type: 'podcast',
          })
        );
      });
    });

    it('should create session for radio content', async () => {
      const mockSession = {
        session_id: 'session-radio-123',
        user_id: 'test-user-123',
        device_id: 'test-device-id',
        content_id: 'radio-station-1',
        content_type: 'radio',
        started_at: new Date().toISOString(),
      };

      mockedApi.post.mockResolvedValueOnce(mockSession);

      render(
        <BrowserRouter>
          <VideoPlayer
            {...mockVideoPlayerProps}
            contentId="radio-station-1"
            contentType="radio"
          />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          '/playback/session/start',
          expect.objectContaining({
            content_id: 'radio-station-1',
            content_type: 'radio',
          })
        );
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle network errors gracefully', async () => {
      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      });

      const { container } = render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} />
        </BrowserRouter>
      );

      // Wait and verify player still renders
      await new Promise((resolve) => setTimeout(resolve, 500));

      const videoElement = container.querySelector('video');
      expect(videoElement).toBeInTheDocument();

      // Modal should not be shown for non-403 errors
      expect(screen.queryByText('Stream Limit Reached')).not.toBeInTheDocument();
    });

    it('should handle session cleanup errors gracefully', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'test-user-123',
        device_id: 'test-device-id',
        content_id: 'test-content-123',
        content_type: 'vod',
        started_at: new Date().toISOString(),
      };

      mockedApi.post
        .mockResolvedValueOnce(mockSession)
        .mockRejectedValueOnce(new Error('Network error'));

      const { unmount } = render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          '/playback/session/start',
          expect.anything()
        );
      });

      // Should not throw when unmounting with cleanup error
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Multi-Device Scenarios', () => {
    it('should show all active devices in modal (Basic plan - 1 stream)', async () => {
      const limitError = {
        code: 'CONCURRENT_STREAM_LIMIT_EXCEEDED',
        message: 'Maximum concurrent streams (1) reached',
        max_streams: 1,
        active_sessions: 1,
        active_devices: [{ device_id: 'device-1', device_name: 'iPhone', content_id: 'c1' }],
      };

      mockedApi.post.mockRejectedValueOnce({
        detail: limitError,
      });

      render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/maximum number of concurrent streams \(1\)/)).toBeInTheDocument();
      });

      expect(screen.getByText('iPhone')).toBeInTheDocument();
    });

    it('should show all active devices in modal (Family plan - 4 streams)', async () => {
      const limitError = {
        code: 'CONCURRENT_STREAM_LIMIT_EXCEEDED',
        message: 'Maximum concurrent streams (4) reached',
        max_streams: 4,
        active_sessions: 4,
        active_devices: [
          { device_id: '1', device_name: 'iPhone 15', content_id: 'c1' },
          { device_id: '2', device_name: 'iPad Air', content_id: 'c2' },
          { device_id: '3', device_name: 'Apple TV', content_id: 'c3' },
          { device_id: '4', device_name: 'MacBook Pro', content_id: 'c4' },
        ],
      };

      mockedApi.post.mockRejectedValueOnce({
        detail: limitError,
      });

      render(
        <BrowserRouter>
          <VideoPlayer {...mockVideoPlayerProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/maximum number of concurrent streams \(4\)/)).toBeInTheDocument();
      });

      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
      expect(screen.getByText('iPad Air')).toBeInTheDocument();
      expect(screen.getByText('Apple TV')).toBeInTheDocument();
      expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
    });
  });
});

jest.mock('@bayit/shared-services/ttsService', () => ({ ttsService: { on: jest.fn(), off: jest.fn(), isCurrentlyPlaying: jest.fn(() => false) } }));
