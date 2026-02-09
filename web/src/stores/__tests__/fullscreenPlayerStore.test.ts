/**
 * Test suite for fullscreenPlayerStore (Zustand)
 * Tests player open/close, content management,
 * and document side effects.
 */

import { useFullscreenPlayerStore } from '../fullscreenPlayerStore';

function resetStore() {
  useFullscreenPlayerStore.setState({
    isOpen: false,
    content: null,
    startTime: 0,
  });
  // Reset document.body.style.overflow
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
}

describe('fullscreenPlayerStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  // MARK: - Initial State

  describe('initial state', () => {
    it('starts closed', () => {
      expect(useFullscreenPlayerStore.getState().isOpen).toBe(false);
    });

    it('starts with no content', () => {
      expect(useFullscreenPlayerStore.getState().content).toBeNull();
    });

    it('starts with zero start time', () => {
      expect(useFullscreenPlayerStore.getState().startTime).toBe(0);
    });
  });

  // MARK: - openPlayer

  describe('openPlayer', () => {
    const movieContent = {
      id: 'movie-1',
      title: 'Test Movie',
      src: 'https://stream.example.com/movie.m3u8',
      poster: 'https://img.example.com/poster.jpg',
      type: 'movie' as const,
      contentId: 'content-1',
    };

    it('opens player with content', () => {
      useFullscreenPlayerStore.getState().openPlayer(movieContent);

      const state = useFullscreenPlayerStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.content).toEqual(movieContent);
    });

    it('defaults startTime to 0', () => {
      useFullscreenPlayerStore.getState().openPlayer(movieContent);

      expect(useFullscreenPlayerStore.getState().startTime).toBe(0);
    });

    it('sets custom startTime', () => {
      useFullscreenPlayerStore.getState().openPlayer(movieContent, 120);

      expect(useFullscreenPlayerStore.getState().startTime).toBe(120);
    });

    it('hides document overflow', () => {
      useFullscreenPlayerStore.getState().openPlayer(movieContent);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('handles live content type', () => {
      const liveContent = {
        id: 'ch-1',
        title: 'Channel 12',
        src: 'https://stream.example.com/live.m3u8',
        type: 'live' as const,
      };

      useFullscreenPlayerStore.getState().openPlayer(liveContent);

      expect(useFullscreenPlayerStore.getState().content!.type).toBe('live');
    });

    it('handles series content with episode data', () => {
      const seriesContent = {
        id: 'ep-1',
        title: 'Episode 1',
        src: 'https://stream.example.com/ep1.m3u8',
        type: 'series' as const,
        contentId: 'series-1',
        episodeId: 'ep-1',
        seriesId: 'series-1',
      };

      useFullscreenPlayerStore.getState().openPlayer(seriesContent);

      const content = useFullscreenPlayerStore.getState().content!;
      expect(content.episodeId).toBe('ep-1');
      expect(content.seriesId).toBe('series-1');
    });

    it('handles content with chapters', () => {
      const contentWithChapters = {
        ...movieContent,
        chapters: [
          { start_time: 0, end_time: 300, title: 'Chapter 1' },
          { start_time: 300, end_time: 600, title: 'Chapter 2' },
        ],
      };

      useFullscreenPlayerStore.getState().openPlayer(contentWithChapters);

      expect(useFullscreenPlayerStore.getState().content!.chapters).toHaveLength(2);
    });

    it('handles kids content fields', () => {
      const kidsContent = {
        ...movieContent,
        is_kids_content: true,
        age_group: 'preschool' as const,
      };

      useFullscreenPlayerStore.getState().openPlayer(kidsContent);

      const content = useFullscreenPlayerStore.getState().content!;
      expect(content.is_kids_content).toBe(true);
      expect(content.age_group).toBe('preschool');
    });

    it('handles subtitle fields', () => {
      const subtitledContent = {
        ...movieContent,
        initialSubtitleLang: 'he',
        initialSplitMode: true,
        initialSplitLanguages: ['he', 'en'] as [string, string],
      };

      useFullscreenPlayerStore.getState().openPlayer(subtitledContent);

      const content = useFullscreenPlayerStore.getState().content!;
      expect(content.initialSubtitleLang).toBe('he');
      expect(content.initialSplitMode).toBe(true);
      expect(content.initialSplitLanguages).toEqual(['he', 'en']);
    });
  });

  // MARK: - closePlayer

  describe('closePlayer', () => {
    const content = {
      id: 'movie-1',
      title: 'Test Movie',
      src: 'https://stream.example.com/movie.m3u8',
      type: 'movie' as const,
    };

    it('closes player and clears content', () => {
      useFullscreenPlayerStore.getState().openPlayer(content, 60);

      useFullscreenPlayerStore.getState().closePlayer();

      const state = useFullscreenPlayerStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.content).toBeNull();
      expect(state.startTime).toBe(0);
    });

    it('restores document overflow', () => {
      useFullscreenPlayerStore.getState().openPlayer(content);
      expect(document.body.style.overflow).toBe('hidden');

      useFullscreenPlayerStore.getState().closePlayer();
      expect(document.body.style.overflow).toBe('');
    });

    it('is safe to call when already closed', () => {
      useFullscreenPlayerStore.getState().closePlayer();

      const state = useFullscreenPlayerStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.content).toBeNull();
    });
  });

  // MARK: - updateContent

  describe('updateContent', () => {
    const content = {
      id: 'movie-1',
      title: 'Test Movie',
      src: 'https://stream.example.com/movie.m3u8',
      type: 'movie' as const,
    };

    it('updates content fields', () => {
      useFullscreenPlayerStore.getState().openPlayer(content);

      useFullscreenPlayerStore.getState().updateContent({
        title: 'Updated Title',
      });

      expect(useFullscreenPlayerStore.getState().content!.title).toBe('Updated Title');
    });

    it('preserves unchanged content fields', () => {
      useFullscreenPlayerStore.getState().openPlayer(content);

      useFullscreenPlayerStore.getState().updateContent({
        poster: 'https://img.example.com/new-poster.jpg',
      });

      const updated = useFullscreenPlayerStore.getState().content!;
      expect(updated.id).toBe('movie-1');
      expect(updated.title).toBe('Test Movie');
      expect(updated.src).toBe('https://stream.example.com/movie.m3u8');
      expect(updated.poster).toBe('https://img.example.com/new-poster.jpg');
    });

    it('does nothing when no content is set', () => {
      useFullscreenPlayerStore.getState().updateContent({
        title: 'Should Not Appear',
      });

      expect(useFullscreenPlayerStore.getState().content).toBeNull();
    });

    it('updates subtitle settings on open content', () => {
      useFullscreenPlayerStore.getState().openPlayer(content);

      useFullscreenPlayerStore.getState().updateContent({
        initialSubtitleLang: 'en',
        initialSplitMode: true,
      });

      const updated = useFullscreenPlayerStore.getState().content!;
      expect(updated.initialSubtitleLang).toBe('en');
      expect(updated.initialSplitMode).toBe(true);
    });

    it('updates kids content fields', () => {
      useFullscreenPlayerStore.getState().openPlayer(content);

      useFullscreenPlayerStore.getState().updateContent({
        is_kids_content: true,
        age_group: 'elementary',
      });

      const updated = useFullscreenPlayerStore.getState().content!;
      expect(updated.is_kids_content).toBe(true);
      expect(updated.age_group).toBe('elementary');
    });
  });

  // MARK: - Edge Cases

  describe('edge cases', () => {
    it('opening player replaces previous content', () => {
      const content1 = {
        id: 'movie-1',
        title: 'First Movie',
        src: 'https://stream.example.com/first.m3u8',
        type: 'movie' as const,
      };
      const content2 = {
        id: 'movie-2',
        title: 'Second Movie',
        src: 'https://stream.example.com/second.m3u8',
        type: 'movie' as const,
      };

      useFullscreenPlayerStore.getState().openPlayer(content1, 100);
      useFullscreenPlayerStore.getState().openPlayer(content2, 200);

      const state = useFullscreenPlayerStore.getState();
      expect(state.content!.id).toBe('movie-2');
      expect(state.startTime).toBe(200);
    });

    it('handles all content types', () => {
      const types = ['movie', 'series', 'live', 'vod', 'audiobook', 'podcast', 'radio'] as const;

      for (const contentType of types) {
        const content = {
          id: `${contentType}-1`,
          title: `Test ${contentType}`,
          src: `https://stream.example.com/${contentType}.m3u8`,
          type: contentType,
        };

        useFullscreenPlayerStore.getState().openPlayer(content);
        expect(useFullscreenPlayerStore.getState().content!.type).toBe(contentType);

        useFullscreenPlayerStore.getState().closePlayer();
      }
    });
  });
});
