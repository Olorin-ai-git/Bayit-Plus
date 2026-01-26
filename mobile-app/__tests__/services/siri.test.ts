/**
 * Siri Service Tests
 *
 * Tests for Siri Shortcuts integration
 */

import { NativeModules, Platform } from 'react-native';

// Mock setup before importing service
const mockSiriModule = {
  donatePlayIntent: jest.fn(),
  donateSearchIntent: jest.fn(),
  donateWidgetIntent: jest.fn(),
  donateResumeIntent: jest.fn(),
  deleteAllShortcuts: jest.fn(),
  getSuggestedShortcuts: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: {
    SiriModule: mockSiriModule,
  },
  Platform: {
    OS: 'ios',
  },
}));

// Import after mocking
import { siriService } from '../../src/services/siri';

describe('SiriService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform mock to iOS
    (Platform as any).OS = 'ios';
  });

  describe('donatePlayIntent', () => {
    it('should donate play intent successfully', async () => {
      mockSiriModule.donatePlayIntent.mockResolvedValueOnce(undefined);

      await siriService.donatePlayIntent('movie-123', 'Test Movie', 'movie');

      expect(mockSiriModule.donatePlayIntent).toHaveBeenCalledWith('movie-123', 'Test Movie', 'movie');
    });

    it('should handle movie content type', async () => {
      mockSiriModule.donatePlayIntent.mockResolvedValueOnce(undefined);

      await siriService.donatePlayIntent('movie-456', 'Action Movie', 'movie');

      expect(mockSiriModule.donatePlayIntent).toHaveBeenCalledWith('movie-456', 'Action Movie', 'movie');
    });

    it('should handle series content type', async () => {
      mockSiriModule.donatePlayIntent.mockResolvedValueOnce(undefined);

      await siriService.donatePlayIntent('series-789', 'Drama Series', 'series');

      expect(mockSiriModule.donatePlayIntent).toHaveBeenCalledWith('series-789', 'Drama Series', 'series');
    });

    it('should handle liveTV content type', async () => {
      mockSiriModule.donatePlayIntent.mockResolvedValueOnce(undefined);

      await siriService.donatePlayIntent('channel-123', 'News Channel', 'liveTV');

      expect(mockSiriModule.donatePlayIntent).toHaveBeenCalledWith('channel-123', 'News Channel', 'liveTV');
    });

    it('should handle donation errors gracefully', async () => {
      mockSiriModule.donatePlayIntent.mockRejectedValueOnce(new Error('Donation failed'));

      await siriService.donatePlayIntent('movie-123', 'Test Movie', 'movie');

      expect(mockSiriModule.donatePlayIntent).toHaveBeenCalledTimes(1);
    });

    it('should not donate on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      await siriService.donatePlayIntent('movie-123', 'Test Movie', 'movie');

      expect(mockSiriModule.donatePlayIntent).not.toHaveBeenCalled();
    });
  });

  describe('donateSearchIntent', () => {
    it('should donate search intent successfully', async () => {
      mockSiriModule.donateSearchIntent.mockResolvedValueOnce(undefined);

      await siriService.donateSearchIntent('action movies');

      expect(mockSiriModule.donateSearchIntent).toHaveBeenCalledWith('action movies');
    });

    it('should handle Hebrew search queries', async () => {
      mockSiriModule.donateSearchIntent.mockResolvedValueOnce(undefined);

      await siriService.donateSearchIntent('סרטי פעולה');

      expect(mockSiriModule.donateSearchIntent).toHaveBeenCalledWith('סרטי פעולה');
    });

    it('should handle donation errors gracefully', async () => {
      mockSiriModule.donateSearchIntent.mockRejectedValueOnce(new Error('Donation failed'));

      await siriService.donateSearchIntent('test query');

      expect(mockSiriModule.donateSearchIntent).toHaveBeenCalledTimes(1);
    });

    it('should not donate on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      await siriService.donateSearchIntent('test query');

      expect(mockSiriModule.donateSearchIntent).not.toHaveBeenCalled();
    });
  });

  describe('donateWidgetIntent', () => {
    it('should donate widget intent successfully', async () => {
      mockSiriModule.donateWidgetIntent.mockResolvedValueOnce(undefined);

      await siriService.donateWidgetIntent('liveTV', 'channel-123', 'News Channel');

      expect(mockSiriModule.donateWidgetIntent).toHaveBeenCalledWith('liveTV', 'channel-123', 'News Channel');
    });

    it('should handle quickPlay widget type', async () => {
      mockSiriModule.donateWidgetIntent.mockResolvedValueOnce(undefined);

      await siriService.donateWidgetIntent('quickPlay', 'show-123', 'Popular Show');

      expect(mockSiriModule.donateWidgetIntent).toHaveBeenCalledWith('quickPlay', 'show-123', 'Popular Show');
    });

    it('should handle donation errors gracefully', async () => {
      mockSiriModule.donateWidgetIntent.mockRejectedValueOnce(new Error('Donation failed'));

      await siriService.donateWidgetIntent('liveTV', 'channel-123', 'News Channel');

      expect(mockSiriModule.donateWidgetIntent).toHaveBeenCalledTimes(1);
    });

    it('should not donate on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      await siriService.donateWidgetIntent('liveTV', 'channel-123', 'News Channel');

      expect(mockSiriModule.donateWidgetIntent).not.toHaveBeenCalled();
    });
  });

  describe('donateResumeIntent', () => {
    it('should donate resume intent successfully', async () => {
      mockSiriModule.donateResumeIntent.mockResolvedValueOnce(undefined);

      await siriService.donateResumeIntent();

      expect(mockSiriModule.donateResumeIntent).toHaveBeenCalledTimes(1);
    });

    it('should handle donation errors gracefully', async () => {
      mockSiriModule.donateResumeIntent.mockRejectedValueOnce(new Error('Donation failed'));

      await siriService.donateResumeIntent();

      expect(mockSiriModule.donateResumeIntent).toHaveBeenCalledTimes(1);
    });

    it('should not donate on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      await siriService.donateResumeIntent();

      expect(mockSiriModule.donateResumeIntent).not.toHaveBeenCalled();
    });
  });

  describe('deleteAllShortcuts', () => {
    it('should delete all shortcuts and return count', async () => {
      mockSiriModule.deleteAllShortcuts.mockResolvedValueOnce({ deleted: 5 });

      const result = await siriService.deleteAllShortcuts();

      expect(result).toBe(5);
      expect(mockSiriModule.deleteAllShortcuts).toHaveBeenCalledTimes(1);
    });

    it('should return 0 on error', async () => {
      mockSiriModule.deleteAllShortcuts.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await siriService.deleteAllShortcuts();

      expect(result).toBe(0);
    });

    it('should return 0 on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      const result = await siriService.deleteAllShortcuts();

      expect(result).toBe(0);
      expect(mockSiriModule.deleteAllShortcuts).not.toHaveBeenCalled();
    });
  });

  describe('getSuggestedShortcuts', () => {
    it('should return shortcuts array', async () => {
      const mockShortcuts = [
        { identifier: 'play-1', phrase: 'Play my show', type: 'play' },
        { identifier: 'search-1', phrase: 'Search for movies', type: 'search' },
      ];
      mockSiriModule.getSuggestedShortcuts.mockResolvedValueOnce({ shortcuts: mockShortcuts });

      const result = await siriService.getSuggestedShortcuts();

      expect(result).toEqual(mockShortcuts);
    });

    it('should return empty array when no shortcuts', async () => {
      mockSiriModule.getSuggestedShortcuts.mockResolvedValueOnce({ shortcuts: [] });

      const result = await siriService.getSuggestedShortcuts();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockSiriModule.getSuggestedShortcuts.mockRejectedValueOnce(new Error('Fetch failed'));

      const result = await siriService.getSuggestedShortcuts();

      expect(result).toEqual([]);
    });

    it('should return empty array on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      const result = await siriService.getSuggestedShortcuts();

      expect(result).toEqual([]);
      expect(mockSiriModule.getSuggestedShortcuts).not.toHaveBeenCalled();
    });
  });
});
