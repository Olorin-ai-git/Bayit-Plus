/**
 * Query & Mutation Key Factories for tvOS
 *
 * Type-safe query keys prevent typos and ensure consistent cache invalidation.
 * Separated from queryClient.ts for file-size compliance.
 */

export const queryKeys = {
  content: {
    all: ['content'] as const,
    featured: () => [...queryKeys.content.all, 'featured'] as const,
    categories: () => [...queryKeys.content.all, 'categories'] as const,
    trending: () => [...queryKeys.content.all, 'trending'] as const,
    search: (query: string) =>
      [...queryKeys.content.all, 'search', query] as const,
    detail: (id: string) => [...queryKeys.content.all, 'detail', id] as const,
    location: (city: string, state: string) =>
      [...queryKeys.content.all, 'location', city, state] as const,
  },

  live: {
    all: ['live'] as const,
    channels: () => [...queryKeys.live.all, 'channels'] as const,
    epg: () => [...queryKeys.live.all, 'epg'] as const,
    nowPlaying: () => [...queryKeys.live.all, 'nowPlaying'] as const,
  },

  history: {
    all: ['history'] as const,
    continueWatching: () =>
      [...queryKeys.history.all, 'continueWatching'] as const,
    recent: () => [...queryKeys.history.all, 'recent'] as const,
  },

  user: {
    all: ['user'] as const,
    favorites: () => [...queryKeys.user.all, 'favorites'] as const,
    watchlist: () => [...queryKeys.user.all, 'watchlist'] as const,
    downloads: () => [...queryKeys.user.all, 'downloads'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
  },

  trending: {
    all: ['trending'] as const,
    daily: () => [...queryKeys.trending.all, 'daily'] as const,
    weekly: () => [...queryKeys.trending.all, 'weekly'] as const,
    topShelf: () => [...queryKeys.trending.all, 'topShelf'] as const,
  },

  locations: {
    all: ['locations'] as const,
    jerusalem: () => [...queryKeys.locations.all, 'jerusalem'] as const,
    telAviv: () => [...queryKeys.locations.all, 'telAviv'] as const,
  },

  podcasts: {
    all: ['podcasts'] as const,
    featured: () => [...queryKeys.podcasts.all, 'featured'] as const,
    episodes: (showId: string) =>
      [...queryKeys.podcasts.all, 'episodes', showId] as const,
    detail: (id: string) => [...queryKeys.podcasts.all, 'detail', id] as const,
  },

  kids: {
    all: ['kids'] as const,
    featured: () => [...queryKeys.kids.all, 'featured'] as const,
    categories: () => [...queryKeys.kids.all, 'categories'] as const,
  },

  flows: {
    all: ['flows'] as const,
    featured: () => [...queryKeys.flows.all, 'featured'] as const,
    detail: (id: string) => [...queryKeys.flows.all, 'detail', id] as const,
  },

  epg: {
    all: ['epg'] as const,
    schedule: (date?: string) =>
      [...queryKeys.epg.all, 'schedule', date ?? 'today'] as const,
    channel: (channelId: string) =>
      [...queryKeys.epg.all, 'channel', channelId] as const,
  },

  judaism: {
    all: ['judaism'] as const,
    shiurim: () => [...queryKeys.judaism.all, 'shiurim'] as const,
    news: () => [...queryKeys.judaism.all, 'news'] as const,
    calendar: () => [...queryKeys.judaism.all, 'calendar'] as const,
  },

  onboarding: {
    all: ['onboarding'] as const,
    recommendations: () =>
      [...queryKeys.onboarding.all, 'recommendations'] as const,
  },

  analytics: {
    all: ['analytics'] as const,
  },

  voice: {
    all: ['voice'] as const,
    command: (transcription: string) =>
      [...queryKeys.voice.all, 'command', transcription] as const,
    suggestions: (partial: string, language: string) =>
      [...queryKeys.voice.all, 'suggestions', partial, language] as const,
    health: () => [...queryKeys.voice.all, 'health'] as const,
  },

  widgets: {
    all: ['widgets'] as const,
    system: () => [...queryKeys.widgets.all, 'system'] as const,
    personal: (userId: string) =>
      [...queryKeys.widgets.all, 'personal', userId] as const,
  },
};

export const mutationKeys = {
  favorites: {
    add: 'addFavorite',
    remove: 'removeFavorite',
  },
  watchlist: {
    add: 'addWatchlistItem',
    remove: 'removeWatchlistItem',
  },
  playback: {
    updateProgress: 'updatePlaybackProgress',
  },
  widgets: {
    update: 'updateWidget',
    remove: 'removeWidget',
  },
};
