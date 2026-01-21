/**
 * Mock data for testing
 * Provides sample data structures matching API responses
 */

export const mockMovie = {
  id: 'movie-123',
  title: 'Test Movie',
  title_en: 'Test Movie',
  description: 'A test movie description',
  description_en: 'A test movie description',
  thumbnail: 'https://example.com/thumbnail.jpg',
  backdrop: 'https://example.com/backdrop.jpg',
  category: 'Action',
  duration: '120 min',
  year: 2024,
  rating: 'PG-13',
  genre: 'Action, Adventure',
  cast: ['Actor One', 'Actor Two', 'Actor Three'],
  director: 'Director Name',
  trailer_url: 'https://example.com/trailer.m3u8',
  preview_url: 'https://example.com/preview.m3u8',
  imdb_rating: 8.5,
  imdb_votes: 125000,
  type: 'vod',
};

export const mockSeries = {
  id: 'series-456',
  title: 'Test Series',
  title_en: 'Test Series',
  description: 'A test series description',
  description_en: 'A test series description',
  thumbnail: 'https://example.com/series-thumbnail.jpg',
  backdrop: 'https://example.com/series-backdrop.jpg',
  category: 'Drama',
  year: 2024,
  rating: 'TV-14',
  genre: 'Drama, Thriller',
  cast: ['Actor Four', 'Actor Five'],
  director: 'Series Director',
  imdb_rating: 9.0,
  imdb_votes: 250000,
  type: 'vod',
  seasons: [
    {
      season_number: 1,
      episode_count: 10,
      episodes: [
        {
          id: 'episode-1',
          episode_number: 1,
          season_number: 1,
          title: 'Pilot',
          title_en: 'Pilot',
          description: 'The first episode',
          description_en: 'The first episode',
          thumbnail: 'https://example.com/episode1.jpg',
          duration: '45 min',
          progress: 0,
        },
        {
          id: 'episode-2',
          episode_number: 2,
          season_number: 1,
          title: 'Episode Two',
          title_en: 'Episode Two',
          description: 'The second episode',
          description_en: 'The second episode',
          thumbnail: 'https://example.com/episode2.jpg',
          duration: '45 min',
          progress: 75,
        },
      ],
    },
  ],
};

export const mockLiveChannel = {
  id: 'channel-789',
  name: 'Test Channel',
  name_en: 'Test Channel',
  logo: 'https://example.com/channel-logo.jpg',
  category: 'News',
  stream_url: 'https://example.com/stream.m3u8',
  is_live: true,
  viewers: 1250,
  type: 'live',
};

export const mockRadioStation = {
  id: 'radio-101',
  name: 'Test Radio',
  name_en: 'Test Radio',
  logo: 'https://example.com/radio-logo.jpg',
  category: 'Music',
  stream_url: 'https://example.com/radio-stream.m3u8',
  genre: 'Pop',
  type: 'radio',
};

export const mockPodcast = {
  id: 'podcast-202',
  title: 'Test Podcast',
  title_en: 'Test Podcast',
  description: 'A test podcast description',
  description_en: 'A test podcast description',
  thumbnail: 'https://example.com/podcast-thumbnail.jpg',
  host: 'Podcast Host',
  category: 'Technology',
  type: 'podcast',
  episodes: [
    {
      id: 'podcast-ep-1',
      episode_number: 1,
      title: 'Episode 1',
      title_en: 'Episode 1',
      description: 'First podcast episode',
      description_en: 'First podcast episode',
      duration: '30 min',
      published_date: '2024-01-01',
      audio_url: 'https://example.com/podcast-ep1.mp3',
    },
  ],
};

export const mockSearchResults = [
  mockMovie,
  mockSeries,
  mockLiveChannel,
  {
    ...mockMovie,
    id: 'movie-456',
    title: 'Another Test Movie',
  },
];

export const mockRecommendations = [
  {
    ...mockMovie,
    id: 'rec-1',
    title: 'Recommended Movie 1',
  },
  {
    ...mockMovie,
    id: 'rec-2',
    title: 'Recommended Movie 2',
  },
  {
    ...mockMovie,
    id: 'rec-3',
    title: 'Recommended Movie 3',
  },
];

export const mockTrendingSearches = [
  'avengers',
  'spider-man',
  'breaking bad',
  'game of thrones',
  'stranger things',
];

export const mockChapters = [
  {
    id: 'chapter-1',
    title: 'Opening Scene',
    title_en: 'Opening Scene',
    start_time: 0,
    end_time: 300,
    thumbnail: 'https://example.com/chapter1.jpg',
  },
  {
    id: 'chapter-2',
    title: 'Main Plot',
    title_en: 'Main Plot',
    start_time: 300,
    end_time: 1200,
    thumbnail: 'https://example.com/chapter2.jpg',
  },
  {
    id: 'chapter-3',
    title: 'Climax',
    title_en: 'Climax',
    start_time: 1200,
    end_time: 1800,
    thumbnail: 'https://example.com/chapter3.jpg',
  },
];

export const mockCastMembers = [
  {
    id: 'cast-1',
    name: 'Actor One',
    character: 'Hero',
    photo: 'https://example.com/actor1.jpg',
  },
  {
    id: 'cast-2',
    name: 'Actor Two',
    character: 'Villain',
    photo: 'https://example.com/actor2.jpg',
  },
  {
    id: 'cast-3',
    name: 'Actor Three',
    character: 'Sidekick',
    photo: 'https://example.com/actor3.jpg',
  },
];
