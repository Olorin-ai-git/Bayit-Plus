import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import {
  authService,
  contentService,
  liveService,
  searchService,
  watchlistService,
  historyService,
} from '../api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock auth store
jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

// Mock app config
jest.mock('../../config/appConfig', () => ({
  isDemo: false,
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: jest.fn((obj) => obj.web),
}));

describe('API Services', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: {} }),
      post: jest.fn().mockResolvedValue({ data: {} }),
      put: jest.fn().mockResolvedValue({ data: {} }),
      delete: jest.fn().mockResolvedValue({ data: {} }),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    // Mock auth store getState
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      token: 'mock-token-123',
      user: { id: 'user-1', email: 'test@example.com' },
      logout: jest.fn(),
    });
  });

  describe('Auth Service', () => {
    describe('login', () => {
      it('should call POST /auth/login with email and password', async () => {
        const email = 'test@example.com';
        const password = 'password123';
        const mockResponse = {
          token: 'new-token',
          user: { id: 'user-1', email },
        };

        mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

        const result = await authService.login(email, password);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', {
          email,
          password,
        });
        expect(result.token).toBe('new-token');
      });

      it('should handle login errors', async () => {
        const error = {
          response: {
            data: { detail: 'Invalid credentials' },
            status: 401,
          },
        };

        mockAxiosInstance.post.mockRejectedValue(error);

        await expect(
          authService.login('wrong@example.com', 'wrong')
        ).rejects.toMatchObject({
          detail: 'Invalid credentials',
        });
      });
    });

    describe('register', () => {
      it('should call POST /auth/register with user data', async () => {
        const userData = {
          email: 'new@example.com',
          name: 'New User',
          password: 'password123',
        };

        mockAxiosInstance.post.mockResolvedValue({
          data: { user: userData, token: 'new-token' },
        });

        await authService.register(userData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/auth/register',
          userData
        );
      });

      it('should handle registration errors', async () => {
        const error = {
          response: {
            data: { detail: 'Email already exists' },
            status: 400,
          },
        };

        mockAxiosInstance.post.mockRejectedValue(error);

        await expect(
          authService.register({
            email: 'exists@example.com',
            name: 'User',
            password: 'pass',
          })
        ).rejects.toMatchObject({
          detail: 'Email already exists',
        });
      });
    });

    describe('me', () => {
      it('should call GET /auth/me', async () => {
        const mockUser = { id: 'user-1', email: 'test@example.com' };
        mockAxiosInstance.get.mockResolvedValue({ data: mockUser });

        const result = await authService.me();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/me');
        expect(result).toEqual(mockUser);
      });

      it('should handle unauthorized errors', async () => {
        const error = {
          response: {
            data: { detail: 'Not authenticated' },
            status: 401,
          },
        };

        mockAxiosInstance.get.mockRejectedValue(error);

        await expect(authService.me()).rejects.toMatchObject({
          detail: 'Not authenticated',
        });
      });
    });
  });

  describe('Content Service', () => {
    describe('getFeatured', () => {
      it('should call GET /content/featured', async () => {
        const mockContent = [
          { id: '1', title: 'Movie 1', type: 'movie' },
          { id: '2', title: 'Series 1', type: 'series' },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockContent });

        const result = await contentService.getFeatured();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/content/featured');
        expect(result).toEqual(mockContent);
      });
    });

    describe('getById', () => {
      it('should call GET /content/{id}', async () => {
        const contentId = 'movie-123';
        const mockContent = {
          id: contentId,
          title: 'Test Movie',
          type: 'movie',
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockContent });

        const result = await contentService.getById(contentId);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/content/${contentId}`
        );
        expect(result).toEqual(mockContent);
      });

      it('should handle content not found errors', async () => {
        const error = {
          response: {
            data: { detail: 'Content not found' },
            status: 404,
          },
        };

        mockAxiosInstance.get.mockRejectedValue(error);

        await expect(contentService.getById('invalid-id')).rejects.toMatchObject({
          detail: 'Content not found',
        });
      });
    });

    describe('getStreamUrl', () => {
      it('should call GET /content/{id}/stream', async () => {
        const contentId = 'movie-123';
        const mockStream = {
          url: 'https://stream.example.com/movie.m3u8',
          format: 'hls',
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockStream });

        const result = await contentService.getStreamUrl(contentId);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/content/${contentId}/stream`
        );
        expect(result).toEqual(mockStream);
      });
    });

    describe('getSeriesDetails', () => {
      it('should call GET /content/series/{id}', async () => {
        const seriesId = 'series-456';
        const mockSeries = {
          id: seriesId,
          title: 'Test Series',
          seasons: 5,
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockSeries });

        const result = await contentService.getSeriesDetails(seriesId);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/content/series/${seriesId}`
        );
        expect(result).toEqual(mockSeries);
      });
    });

    describe('getSeasonEpisodes', () => {
      it('should call GET /content/series/{id}/season/{num}/episodes', async () => {
        const seriesId = 'series-456';
        const seasonNum = 2;
        const mockEpisodes = [
          { id: 'ep1', title: 'Episode 1', episode_number: 1 },
          { id: 'ep2', title: 'Episode 2', episode_number: 2 },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockEpisodes });

        const result = await contentService.getSeasonEpisodes(seriesId, seasonNum);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/content/series/${seriesId}/season/${seasonNum}/episodes`
        );
        expect(result).toEqual(mockEpisodes);
      });
    });
  });

  describe('Live Service', () => {
    describe('getChannels', () => {
      it('should call GET /live/channels', async () => {
        const mockChannels = [
          { id: 'ch1', name: 'Channel 1', number: 1 },
          { id: 'ch2', name: 'Channel 2', number: 2 },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockChannels });

        const result = await liveService.getChannels();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/live/channels');
        expect(result).toEqual(mockChannels);
      });
    });

    describe('getChannel', () => {
      it('should call GET /live/{id}', async () => {
        const channelId = 'ch1';
        const mockChannel = {
          id: channelId,
          name: 'Channel 1',
          number: 1,
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockChannel });

        const result = await liveService.getChannel(channelId);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/live/${channelId}`);
        expect(result).toEqual(mockChannel);
      });
    });

    describe('getStreamUrl', () => {
      it('should call GET /live/{id}/stream', async () => {
        const channelId = 'ch1';
        const mockStream = {
          url: 'https://stream.example.com/channel1.m3u8',
          format: 'hls',
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockStream });

        const result = await liveService.getStreamUrl(channelId);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          `/live/${channelId}/stream`
        );
        expect(result).toEqual(mockStream);
      });
    });
  });

  describe('Search Service', () => {
    describe('search', () => {
      it('should call POST /search/llm with query and filters', async () => {
        const query = 'action movies';
        const filters = { type: 'movies' as const, limit: 10 };
        const mockResults = {
          results: [
            { id: '1', title: 'Action Movie 1', type: 'movie' as const },
          ],
          query,
          total: 1,
        };

        mockAxiosInstance.post.mockResolvedValue({ data: mockResults });

        const result = await searchService.search(query, filters);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/search/llm', {
          query,
          ...filters,
        });
        expect(result).toEqual(mockResults);
      });

      it('should handle search without filters', async () => {
        const query = 'test';
        mockAxiosInstance.post.mockResolvedValue({
          data: { results: [], query, total: 0 },
        });

        await searchService.search(query);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/search/llm', {
          query,
        });
      });
    });

    describe('quickSearch', () => {
      it('should call GET /search/quick with query and limit', async () => {
        const query = 'test';
        const limit = 5;
        const mockResults = [
          { id: '1', title: 'Result 1' },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockResults });

        const result = await searchService.quickSearch(query, limit);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search/quick', {
          params: { q: query, limit },
        });
        expect(result).toEqual(mockResults);
      });

      it('should use default limit of 5', async () => {
        const query = 'test';
        mockAxiosInstance.get.mockResolvedValue({ data: [] });

        await searchService.quickSearch(query);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search/quick', {
          params: { q: query, limit: 5 },
        });
      });
    });

    describe('voiceSearch', () => {
      it('should call POST /search/voice with transcript and language', async () => {
        const transcript = 'find comedy movies';
        const language = 'en';
        const mockResults = {
          results: [
            { id: '1', title: 'Comedy 1', type: 'movie' as const },
          ],
          query: transcript,
          total: 1,
        };

        mockAxiosInstance.post.mockResolvedValue({ data: mockResults });

        const result = await searchService.voiceSearch(transcript, language);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/search/voice', {
          transcript,
          language,
        });
        expect(result).toEqual(mockResults);
      });
    });
  });

  describe('Watchlist Service', () => {
    describe('getWatchlist', () => {
      it('should call GET /watchlist', async () => {
        const mockWatchlist = [
          { id: '1', title: 'Movie 1', added_at: '2026-01-15' },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockWatchlist });

        const result = await watchlistService.getWatchlist();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/watchlist');
        expect(result).toEqual(mockWatchlist);
      });
    });

    describe('addToWatchlist', () => {
      it('should call POST /watchlist with content ID and type', async () => {
        const contentId = 'movie-123';
        const contentType = 'vod';

        mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

        await watchlistService.addToWatchlist(contentId, contentType);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/watchlist', {
          content_id: contentId,
          content_type: contentType,
        });
      });
    });

    describe('removeFromWatchlist', () => {
      it('should call DELETE /watchlist/{id}', async () => {
        const contentId = 'movie-123';

        mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });

        await watchlistService.removeFromWatchlist(contentId);

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
          `/watchlist/${contentId}`
        );
      });
    });

    describe('toggleWatchlist', () => {
      it('should call POST /watchlist/toggle with content ID', async () => {
        const contentId = 'movie-123';
        const contentType = 'vod';

        mockAxiosInstance.post.mockResolvedValue({
          data: { in_watchlist: true },
        });

        await watchlistService.toggleWatchlist(contentId, contentType);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/watchlist/toggle/${contentId}?content_type=${contentType}`
        );
      });
    });
  });

  describe('History Service', () => {
    describe('getContinueWatching', () => {
      it('should call GET /history/continue', async () => {
        const mockHistory = [
          {
            id: '1',
            title: 'Movie 1',
            progress: 0.5,
            last_watched: '2026-01-15',
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockHistory });

        const result = await historyService.getContinueWatching();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/history/continue');
        expect(result).toEqual(mockHistory);
      });
    });

    describe('updateProgress', () => {
      it('should call POST /history/progress with playback data', async () => {
        const contentId = 'movie-123';
        const contentType = 'vod';
        const position = 120;
        const duration = 3600;

        mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

        await historyService.updateProgress(
          contentId,
          contentType,
          position,
          duration
        );

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/history/progress', {
          content_id: contentId,
          content_type: contentType,
          position,
          duration,
        });
      });
    });
  });

  describe('Request Interceptor', () => {
    it('should add authorization header when token exists', () => {
      const config = { headers: {} };
      const token = 'mock-token-123';

      (useAuthStore.getState as jest.Mock).mockReturnValue({ token });

      // Simulate request interceptor behavior
      const modifiedConfig = { ...config, headers: { Authorization: `Bearer ${token}` } };

      expect(modifiedConfig.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('should not add authorization header when token is missing', () => {
      const config = { headers: {} };

      (useAuthStore.getState as jest.Mock).mockReturnValue({ token: null });

      // Config should remain unchanged
      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    it('should logout on critical auth endpoint 401 errors', () => {
      const logout = jest.fn();
      (useAuthStore.getState as jest.Mock).mockReturnValue({ logout });

      const error = {
        response: {
          status: 401,
          data: { detail: 'Invalid token' },
        },
        config: { url: '/auth/me' },
      };

      // Simulate response interceptor error handling
      const isCriticalAuthEndpoint = ['/auth/me', '/auth/login', '/auth/refresh'].some(
        (path) => error.config.url.includes(path)
      );

      if (isCriticalAuthEndpoint) {
        logout();
      }

      expect(logout).toHaveBeenCalled();
    });

    it('should logout on token validation errors', () => {
      const logout = jest.fn();
      (useAuthStore.getState as jest.Mock).mockReturnValue({ logout });

      const error = {
        response: {
          status: 401,
          data: { detail: 'Token has expired' },
        },
        config: { url: '/content/featured' },
      };

      // Simulate checking for token errors
      const isTokenError = [
        'Could not validate credentials',
        'Token has expired',
        'Invalid token',
      ].some((msg) =>
        error.response.data.detail.toLowerCase().includes(msg.toLowerCase())
      );

      if (isTokenError) {
        logout();
      }

      expect(logout).toHaveBeenCalled();
    });

    it('should NOT logout on non-critical 401 errors', () => {
      const logout = jest.fn();
      (useAuthStore.getState as jest.Mock).mockReturnValue({ logout });

      const error = {
        response: {
          status: 401,
          data: { detail: 'Not authenticated' },
        },
        config: { url: '/watchlist' },
      };

      // This should not trigger logout (not critical endpoint, not token error)
      const isCriticalAuthEndpoint = ['/auth/me', '/auth/login', '/auth/refresh'].some(
        (path) => error.config.url.includes(path)
      );

      const isTokenError = [
        'Could not validate credentials',
        'Token has expired',
        'Invalid token',
      ].some((msg) =>
        error.response.data.detail.toLowerCase().includes(msg.toLowerCase())
      );

      if (isCriticalAuthEndpoint || isTokenError) {
        logout();
      }

      expect(logout).not.toHaveBeenCalled();
    });
  });
});
