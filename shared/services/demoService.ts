/**
 * Demo Service for TV App
 * Provides mock implementations of all API services for demo mode.
 * Returns comprehensive demo data with simulated network delay.
 */
import { config } from '../config/appConfig';
import {
  demoUser,
  demoMovies,
  demoSeries,
  demoChannels,
  demoRadioStations,
  demoPodcasts,
  demoPodcastCategories,
  demoTrending,
  demoChapters,
  demoSubtitles,
  demoTranslations,
  demoZmanData,
  demoMorningRitual,
  demoContinueWatching,
  demoCategories,
  demoFeatured,
  demoWatchParties,
  demoRecordings,
  demoSearchResults,
} from '../data/demoData';

// Simulate network delay
const delay = (ms: number = config.mock.delay): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// ===========================================
// AUTH SERVICE (Demo)
// ===========================================
export const demoAuthService = {
  login: async (email: string, password: string) => {
    await delay();
    return { user: demoUser, token: 'demo-token-12345' };
  },
  register: async (userData: { email: string; name: string; password: string }) => {
    await delay();
    return { user: { ...demoUser, ...userData }, token: 'demo-token-12345' };
  },
  me: async () => {
    await delay();
    return demoUser;
  },
  getGoogleAuthUrl: async () => {
    await delay();
    return { url: '#demo-google-auth' };
  },
  googleCallback: async (code: string) => {
    await delay();
    return { user: demoUser, token: 'demo-token-google' };
  },
};

// ===========================================
// CONTENT SERVICE (Demo)
// ===========================================
export const demoContentService = {
  getFeatured: async () => {
    await delay();
    return demoFeatured;
  },
  getCategories: async () => {
    await delay();
    return { categories: demoCategories };
  },
  getByCategory: async (categoryId: string) => {
    await delay();
    const category = demoCategories.find(c => c.id === categoryId);
    return { items: category?.items || [] };
  },
  getById: async (contentId: string) => {
    await delay();
    const content = [...demoMovies, ...demoSeries].find(c => c.id === contentId);
    return content || null;
  },
  getStreamUrl: async (contentId: string) => {
    await delay();
    return { stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' };
  },

  // Series endpoints
  getSeriesDetails: async (seriesId: string) => {
    await delay();
    const series = demoSeries.find(s => s.id === seriesId);
    return series || null;
  },
  getSeriesSeasons: async (seriesId: string) => {
    await delay();
    const series = demoSeries.find(s => s.id === seriesId);
    return { seasons: series?.seasons || [] };
  },
  getSeasonEpisodes: async (seriesId: string, seasonNum: number) => {
    await delay();
    const series = demoSeries.find(s => s.id === seriesId);
    const season = series?.seasons?.find((s: any) => s.season_number === seasonNum);
    return { episodes: season?.episodes || [] };
  },

  // Movie endpoints
  getMovieDetails: async (movieId: string) => {
    await delay();
    const movie = demoMovies.find(m => m.id === movieId);
    return movie || null;
  },

  // Preview endpoint
  getContentPreview: async (contentId: string) => {
    await delay();
    const content = [...demoMovies, ...demoSeries].find(c => c.id === contentId);
    return content ? { preview_url: content.trailer_url } : null;
  },

  // Recommendations endpoint
  getRecommendations: async (contentId: string, limit: number = 10) => {
    await delay();
    // Return random mix of movies and series as recommendations
    const allContent = [...demoMovies, ...demoSeries].filter(c => c.id !== contentId);
    return { items: allContent.slice(0, limit) };
  },
};

// ===========================================
// LIVE SERVICE (Demo)
// ===========================================
export const demoLiveService = {
  getChannels: async () => {
    await delay();
    return { channels: demoChannels };
  },
  getChannel: async (channelId: string) => {
    await delay();
    return demoChannels.find(c => c.id === channelId) || null;
  },
  getStreamUrl: async (channelId: string) => {
    await delay();
    return { stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' };
  },
};

// ===========================================
// RADIO SERVICE (Demo)
// ===========================================
export const demoRadioService = {
  getStations: async () => {
    await delay();
    return { stations: demoRadioStations };
  },
  getStation: async (stationId: string) => {
    await delay();
    return demoRadioStations.find(s => s.id === stationId) || null;
  },
  getStreamUrl: async (stationId: string) => {
    await delay();
    return { stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3' };
  },
};

// ===========================================
// PODCAST SERVICE (Demo)
// ===========================================
export const demoPodcastService = {
  getShows: async (categoryId?: string) => {
    await delay();
    let shows = demoPodcasts;
    if (categoryId && categoryId !== 'all') {
      shows = demoPodcasts.filter(p => p.category === categoryId);
    }
    return { shows, categories: demoPodcastCategories };
  },
  getShow: async (showId: string) => {
    await delay();
    return demoPodcasts.find(p => p.id === showId) || null;
  },
  getEpisodes: async (showId: string) => {
    await delay();
    const podcast = demoPodcasts.find(p => p.id === showId);
    return { episodes: podcast?.episodes || [] };
  },
  getCategories: async () => {
    await delay();
    return { categories: demoPodcastCategories };
  },
};

// ===========================================
// SUBSCRIPTION SERVICE (Demo)
// ===========================================
export const demoSubscriptionService = {
  getPlans: async () => {
    await delay();
    return {
      plans: [
        { id: 'basic', name: 'בסיסי', price: 9.99, currency: 'ILS', interval: 'month', features: ['צפייה ב-HD', '1 מכשיר'] },
        { id: 'premium', name: 'פרימיום', price: 29.90, currency: 'ILS', interval: 'month', features: ['צפייה ב-4K', '4 מכשירים', 'הורדות'] },
        { id: 'family', name: 'משפחתי', price: 49.90, currency: 'ILS', interval: 'month', features: ['צפייה ב-4K', '6 מכשירים', 'הורדות', '5 פרופילים'] },
      ],
    };
  },
  getCurrentPlan: async () => {
    await delay();
    return { plan: 'premium', status: 'active', expires_at: '2025-12-31T23:59:59Z' };
  },
  createCheckout: async (planId: string) => {
    await delay();
    return { checkout_url: '#demo-checkout' };
  },
  cancelSubscription: async () => {
    await delay();
    return { message: 'Subscription cancelled' };
  },
  getInvoices: async () => {
    await delay();
    return {
      invoices: [
        { id: 'inv-1', date: '2025-01-01', amount: 29.90, currency: 'ILS', status: 'paid', description: 'מנוי פרימיום - ינואר' },
        { id: 'inv-2', date: '2024-12-01', amount: 29.90, currency: 'ILS', status: 'paid', description: 'מנוי פרימיום - דצמבר' },
        { id: 'inv-3', date: '2024-11-01', amount: 29.90, currency: 'ILS', status: 'paid', description: 'מנוי פרימיום - נובמבר' },
      ],
    };
  },
  getPaymentMethods: async () => {
    await delay();
    return {
      payment_methods: [
        { id: 'pm-1', type: 'visa', last4: '4242', expiry: '12/25', is_default: true },
        { id: 'pm-2', type: 'mastercard', last4: '8888', expiry: '06/26', is_default: false },
      ],
    };
  },
  addPaymentMethod: async (token: string) => {
    await delay();
    return { message: 'Payment method added', id: 'pm-new' };
  },
  removePaymentMethod: async (methodId: string) => {
    await delay();
    return { message: 'Payment method removed' };
  },
  setDefaultPaymentMethod: async (methodId: string) => {
    await delay();
    return { message: 'Default payment method set' };
  },
};

// ===========================================
// PLAYLIST SERVICE (Demo)
// ===========================================
export const demoPlaylistService = {
  getPlaylist: async () => {
    await delay();
    return { items: demoSeries.slice(0, 3) };
  },
  addItem: async (contentId: string, contentType: string) => {
    await delay();
    return { message: 'Added to playlist' };
  },
  removeItem: async (contentId: string) => {
    await delay();
    return { message: 'Removed from playlist' };
  },
  checkItem: async (contentId: string) => {
    await delay();
    return { in_playlist: Math.random() > 0.5 };
  },
  toggleItem: async (contentId: string, contentType: string = 'vod') => {
    await delay();
    const inPlaylist = Math.random() > 0.5;
    return { in_playlist: inPlaylist, message: inPlaylist ? 'Added to playlist' : 'Removed from playlist' };
  },
};

// ===========================================
// HISTORY SERVICE (Demo)
// ===========================================
export const demoHistoryService = {
  getContinueWatching: async () => {
    await delay();
    return { items: demoContinueWatching };
  },
  updateProgress: async (contentId: string, contentType: string, position: number, duration: number) => {
    await delay();
    return { message: 'Progress updated' };
  },
};

// ===========================================
// SEARCH SERVICE (Demo)
// ===========================================
export const demoSearchService = {
  search: async (query: string, filters?: any) => {
    await delay();
    const results = demoSearchResults(query);
    return {
      ...results,
      interpretation: `Showing results for "${query}"`,
      suggestions: [
        'Popular Movies',
        'Live TV Channels',
        'Israeli Radio Stations',
        'Recent Podcasts',
      ],
    };
  },
  quickSearch: async (query: string, limit: number = 5) => {
    await delay();
    const results = demoSearchResults(query);
    return { suggestions: results.results.slice(0, limit) };
  },
  getSuggestions: async () => {
    await delay();
    return {
      suggestions: [
        'Popular Movies',
        'Live TV Channels',
        'Israeli Radio Stations',
        'Recent Podcasts',
        'Trending Content',
      ],
    };
  },
  voiceSearch: async (transcript: string, language: string, filters?: any) => {
    await delay();
    return demoSearchResults(transcript);
  },
};

// ===========================================
// FAVORITES SERVICE (Demo)
// ===========================================
export const demoFavoritesService = {
  getFavorites: async () => {
    await delay();
    return { items: demoSeries.slice(0, 4) };
  },
  addToFavorites: async (contentId: string, contentType: string) => {
    await delay();
    return { message: 'Added to favorites' };
  },
  addFavorite: async (contentId: string, contentType: string) => {
    await delay();
    return { message: 'Added to favorites' };
  },
  removeFromFavorites: async (contentId: string) => {
    await delay();
    return { message: 'Removed from favorites' };
  },
  removeFavorite: async (contentId: string) => {
    await delay();
    return { message: 'Removed from favorites' };
  },
  isFavorite: async (contentId: string) => {
    await delay();
    return { is_favorite: Math.random() > 0.5 };
  },
  toggleFavorite: async (contentId: string, contentType: string = 'vod') => {
    await delay();
    const isFavorite = Math.random() > 0.5;
    return { is_favorite: isFavorite, message: isFavorite ? 'Added to favorites' : 'Removed from favorites' };
  },
};

// ===========================================
// ZMAN SERVICE (Demo)
// ===========================================
export const demoZmanService = {
  getTime: async (timezone?: string) => {
    await delay();
    // Return fresh time data on each call
    const now = new Date();

    // Safe time formatting that works on tvOS
    let israelTimeStr: string;
    let israelDayStr: string;
    let localTimeStr: string;
    let localTimezone: string;
    let dayOfWeek: number;

    try {
      // Try using Intl APIs (may fail on tvOS)
      israelTimeStr = now.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jerusalem'
      });
      israelDayStr = now.toLocaleDateString('he-IL', {
        weekday: 'long',
        timeZone: 'Asia/Jerusalem'
      });
      localTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      localTimezone = timezone || Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || 'America/New_York';
      // Get Israel day of week (Friday = 5)
      const israelDateParts = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: 'Asia/Jerusalem'
      }).format(now);
      dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(israelDateParts);
    } catch {
      // Fallback for tvOS/environments with limited Intl support
      // Israel is UTC+2 (or UTC+3 during DST) - approximate with UTC+2
      const israelOffset = 2 * 60 * 60 * 1000; // 2 hours in ms
      const israelMs = now.getTime() + israelOffset + (now.getTimezoneOffset() * 60 * 1000);
      const israelDate = new Date(israelMs);

      const hours = israelDate.getUTCHours().toString().padStart(2, '0');
      const minutes = israelDate.getUTCMinutes().toString().padStart(2, '0');
      israelTimeStr = `${hours}:${minutes}`;

      const days = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      dayOfWeek = israelDate.getUTCDay();
      israelDayStr = days[dayOfWeek];

      const localHours = now.getHours().toString().padStart(2, '0');
      const localMins = now.getMinutes().toString().padStart(2, '0');
      localTimeStr = `${localHours}:${localMins}`;
      localTimezone = timezone || 'Local';
    }

    return {
      israel: {
        time: israelTimeStr,
        datetime: now.toISOString(),
        day: israelDayStr,
      },
      local: {
        time: localTimeStr,
        datetime: now.toISOString(),
        timezone: localTimezone,
      },
      shabbat: {
        is_shabbat: dayOfWeek === 6,
        is_erev_shabbat: dayOfWeek === 5,
        countdown: '48:00',
        countdown_label: 'Until Shabbat',
        candle_lighting: '16:45',
        havdalah: '17:50',
        parasha: 'Vaera',
        parasha_hebrew: 'וארא',
      },
    };
  },
  getShabbatTimes: async (latitude?: number, longitude?: number) => {
    await delay();
    return demoZmanData.shabbat;
  },
  getShabbatContent: async () => {
    await delay();
    return { content: demoZmanData.shabbat_content };
  },
  updatePreferences: async (prefs: any) => {
    await delay();
    return { message: 'Preferences updated' };
  },
  getTimezones: async () => {
    await delay();
    return {
      timezones: [
        { id: 'America/New_York', name: 'New York (EST)' },
        { id: 'America/Los_Angeles', name: 'Los Angeles (PST)' },
        { id: 'America/Chicago', name: 'Chicago (CST)' },
        { id: 'Europe/London', name: 'London (GMT)' },
      ],
    };
  },
};

// ===========================================
// TRENDING SERVICE (Demo)
// ===========================================
export const demoTrendingService = {
  getTopics: async () => {
    await delay();
    // Return data in the format expected by TrendingRow component
    return {
      topics: [
        {
          title: 'בחירות 2025',
          title_en: 'Elections 2025',
          title_es: 'Elecciones 2025',
          category: 'politics',
          category_label: { he: 'פוליטיקה', en: 'Politics', es: 'Política' },
          sentiment: 'neutral',
          importance: 10,
          summary: 'הבחירות הקרובות מעסיקות את הציבור',
          summary_en: 'The upcoming elections are on everyone\'s mind',
          summary_es: 'Las próximas elecciones están en la mente de todos',
          keywords: ['בחירות', 'ממשלה', 'כנסת'],
        },
        {
          title: 'מכבי תל אביב בליגת האלופות',
          title_en: 'Maccabi Tel Aviv in Champions League',
          title_es: 'Maccabi Tel Aviv en la Liga de Campeones',
          category: 'sports',
          category_label: { he: 'ספורט', en: 'Sports', es: 'Deportes' },
          sentiment: 'positive',
          importance: 8,
          summary: 'ניצחון דרמטי בליגת אלופות',
          summary_en: 'Dramatic victory in the Champions League',
          summary_es: 'Victoria dramática en la Liga de Campeones',
          keywords: ['מכבי', 'כדורגל', 'ליגת אלופות'],
        },
        {
          title: 'סטארט-אפ ישראלי גייס 100 מיליון',
          title_en: 'Israeli Startup Raises $100M',
          title_es: 'Startup Israelí Recauda $100M',
          category: 'tech',
          category_label: { he: 'טכנולוגיה', en: 'Tech', es: 'Tecnología' },
          sentiment: 'positive',
          importance: 7,
          summary: 'חדשנות טכנולוגית ישראלית',
          summary_en: 'Israeli technological innovation',
          summary_es: 'Innovación tecnológica israelí',
          keywords: ['הייטק', 'סטארט-אפ', 'גיוס'],
        },
        {
          title: 'מזג אוויר סוער בסוף השבוע',
          title_en: 'Stormy Weather This Weekend',
          title_es: 'Clima Tormentoso Este Fin de Semana',
          category: 'weather',
          category_label: { he: 'מזג אוויר', en: 'Weather', es: 'Clima' },
          sentiment: 'neutral',
          importance: 6,
          summary: 'גשמים צפויים בסוף השבוע',
          summary_en: 'Rain expected this weekend',
          summary_es: 'Se esperan lluvias este fin de semana',
          keywords: ['גשם', 'סערה', 'מזג אוויר'],
        },
        {
          title: 'פרסי האקדמיה הישראלית',
          title_en: 'Israeli Academy Awards',
          title_es: 'Premios de la Academia Israelí',
          category: 'entertainment',
          category_label: { he: 'בידור', en: 'Entertainment', es: 'Entretenimiento' },
          sentiment: 'positive',
          importance: 7,
          summary: 'פרסי האקדמיה הישראלית הוכרזו',
          summary_en: 'Israeli Academy Awards announced',
          summary_es: 'Se anunciaron los Premios de la Academia Israelí',
          keywords: ['קולנוע', 'פרסים', 'אקדמיה'],
        },
      ],
      overall_mood: 'הציבור הישראלי עסוק בבחירות ובספורט',
      overall_mood_en: 'The Israeli public is focused on elections and sports',
      overall_mood_es: 'El público israelí se enfoca en las elecciones y los deportes',
      top_story: 'בחירות 2025 בעיצומן',
      top_story_en: '2025 Elections in full swing',
      top_story_es: 'Elecciones 2025 en pleno apogeo',
      sources: ['Ynet', 'Walla', 'Mako', 'Calcalist', 'Sport5'],
      analyzed_at: new Date().toISOString(),
    };
  },
  getHeadlines: async (source?: string, limit: number = 20) => {
    await delay();
    return {
      headlines: demoTrending.topics.map(t => ({
        title: t.title,
        source: source || 'Ynet',
        url: '#',
        published_at: new Date().toISOString(),
      })),
    };
  },
  getRecommendations: async (limit: number = 10) => {
    await delay();
    return { recommendations: demoSeries.slice(0, limit) };
  },
  getSummary: async () => {
    await delay();
    return {
      summary: demoTrending.overall_mood,
      top_story: demoTrending.top_story,
    };
  },
  getByCategory: async (category: string) => {
    await delay();
    return {
      topics: demoTrending.topics.filter(t => t.category === category),
    };
  },
};

// ===========================================
// RITUAL SERVICE (Demo)
// ===========================================
export const demoRitualService = {
  check: async () => {
    await delay();
    return demoMorningRitual;
  },
  shouldShow: async () => {
    await delay();
    const hour = new Date().getHours();
    const isRitualTime = hour >= 7 && hour < 9;
    return {
      show_ritual: isRitualTime || false,
      reason: isRitualTime ? 'active' : 'outside_time_window',
      auto_play: true,
    };
  },
  getContent: async () => {
    await delay();
    return {
      playlist: demoMorningRitual.playlist,
      total_items: demoMorningRitual.playlist.length,
      estimated_duration: 900,
    };
  },
  getAIBrief: async () => {
    await delay();
    return {
      ...demoMorningRitual.ai_brief,
      israel_context: demoMorningRitual.israel_context,
      generated_at: new Date().toISOString(),
    };
  },
  getIsraelNow: async () => {
    await delay();
    return demoMorningRitual.israel_context;
  },
  getPreferences: async () => {
    await delay();
    return {
      preferences: {
        morning_ritual_enabled: true,
        morning_ritual_start: 7,
        morning_ritual_end: 9,
        morning_ritual_content: ['news', 'radio'],
        morning_ritual_auto_play: true,
        morning_ritual_skip_weekends: false,
      },
      local_timezone: 'America/New_York',
    };
  },
  updatePreferences: async (prefs: Record<string, any>) => {
    await delay();
    return { message: 'Preferences updated', preferences: prefs };
  },
  skipToday: async () => {
    await delay();
    return { message: 'Morning ritual skipped for today', skipped_date: new Date().toISOString().split('T')[0] };
  },
};

// ===========================================
// SUBTITLES SERVICE (Demo)
// ===========================================
export const demoSubtitlesService = {
  getLanguages: async () => {
    await delay();
    return {
      languages: [
        { code: 'he', name: 'עברית', name_en: 'Hebrew', rtl: true },
        { code: 'en', name: 'English', name_en: 'English', rtl: false },
        { code: 'ar', name: 'العربية', name_en: 'Arabic', rtl: true },
        { code: 'ru', name: 'Русский', name_en: 'Russian', rtl: false },
      ],
    };
  },
  getTracks: async (contentId: string, language?: string) => {
    await delay();
    const track = demoSubtitles[contentId];
    return track ? [track] : [];
  },
  getCues: async (contentId: string, language: string = 'he', withNikud: boolean = false, startTime?: number, endTime?: number) => {
    await delay();
    const track = demoSubtitles[contentId];
    if (!track) return { cues: [] };

    let cues = track.cues;
    if (startTime !== undefined) {
      cues = cues.filter((c: any) => c.end_time >= startTime);
    }
    if (endTime !== undefined) {
      cues = cues.filter((c: any) => c.start_time <= endTime);
    }

    return {
      content_id: contentId,
      language: track.language,
      language_name: track.language_name,
      has_nikud: track.has_nikud,
      cues: cues.map((c: any) => ({
        ...c,
        text: withNikud && c.text_nikud ? c.text_nikud : c.text,
      })),
    };
  },
  generateNikud: async (contentId: string, language: string = 'he', force: boolean = false) => {
    await delay(500);
    return {
      message: 'Nikud generated successfully',
      content_id: contentId,
      generated_at: new Date().toISOString(),
    };
  },
  translateWord: async (word: string, sourceLang: string = 'he', targetLang: string = 'en') => {
    await delay(300);
    return demoTranslations[word] || {
      word,
      translation: `[תרגום של ${word}]`,
      transliteration: word,
      part_of_speech: 'noun',
      cached: false,
    };
  },
  translatePhrase: async (phrase: string, sourceLang: string = 'he', targetLang: string = 'en') => {
    await delay(500);
    return {
      phrase,
      translation: `[Translation of: ${phrase}]`,
      source_lang: sourceLang,
      target_lang: targetLang,
    };
  },
  addNikudToText: async (text: string) => {
    await delay(300);
    return {
      original: text,
      with_nikud: text,
    };
  },
  fetchExternal: async (contentId: string, languages?: string[]) => {
    await delay(2000);
    // Demo mode - simulate finding some subtitles
    return {
      message: 'Demo mode - simulated subtitle fetch',
      imported: [
        { language: 'en', language_name: 'English', cue_count: 100, track_id: 'demo-en' },
      ],
      skipped: [],
      failed: [
        { language: 'he', reason: 'Demo mode' },
      ],
      quota_remaining: 100,
    };
  },
};

// ===========================================
// CHAPTERS SERVICE (Demo)
// ===========================================
export const demoChaptersService = {
  getChapters: async (contentId: string) => {
    await delay();
    return demoChapters[contentId] || { chapters: [] };
  },
  generateChapters: async (contentId: string, force: boolean = false, transcript?: string) => {
    await delay(1000);
    return demoChapters[contentId] || {
      content_id: contentId,
      chapters: [
        { start_time: 0, end_time: 300, title: 'פתיחה', category: 'intro' },
        { start_time: 300, end_time: 1200, title: 'עלילה ראשית', category: 'main' },
        { start_time: 1200, end_time: 1800, title: 'סיום', category: 'conclusion' },
      ],
      generated_at: new Date().toISOString(),
    };
  },
  getLiveChapters: async (channelId: string) => {
    await delay();
    return {
      chapters: [
        { start_time: 0, end_time: 600, title: 'חדשות פתיחה', category: 'news' },
        { start_time: 600, end_time: 1200, title: 'ביטחון', category: 'security' },
        { start_time: 1200, end_time: 1800, title: 'כלכלה', category: 'economy' },
      ],
    };
  },
  getCategories: async () => {
    await delay();
    return {
      categories: ['intro', 'news', 'security', 'politics', 'sports', 'weather', 'conclusion'],
    };
  },
};

// ===========================================
// PARTY SERVICE (Demo)
// ===========================================
export const demoPartyService = {
  create: async (data: any) => {
    await delay();
    return {
      id: 'demo-party-' + Date.now(),
      room_code: 'DEMO' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      ...data,
    };
  },
  getMyParties: async () => {
    await delay();
    return { parties: demoWatchParties };
  },
  joinByCode: async (roomCode: string) => {
    await delay();
    return { party_id: 'demo-party-1', ...demoWatchParties[0] };
  },
  getParty: async (partyId: string) => {
    await delay();
    return demoWatchParties[0];
  },
  joinParty: async (partyId: string) => {
    await delay();
    return { message: 'Joined party' };
  },
  leaveParty: async (partyId: string) => {
    await delay();
    return { message: 'Left party' };
  },
  endParty: async (partyId: string) => {
    await delay();
    return { message: 'Party ended' };
  },
  sendMessage: async (partyId: string, message: string, messageType: string = 'text') => {
    await delay();
    return {
      id: 'msg-' + Date.now(),
      user_name: demoUser.name,
      message,
      message_type: messageType,
      timestamp: new Date().toISOString(),
    };
  },
  getChatHistory: async (partyId: string, limit: number = 50, before?: string) => {
    await delay();
    return {
      messages: [
        { id: 'msg-1', user_name: 'דני', message: 'מה קורה?', timestamp: new Date().toISOString() },
        { id: 'msg-2', user_name: 'שרה', message: '!איזה פרק מדהים', timestamp: new Date().toISOString() },
      ],
    };
  },
  syncPlayback: async (partyId: string, position: number, isPlaying: boolean = true) => {
    await delay();
    return { message: 'Playback synced' };
  },
};

// ===========================================
// RECORDING SERVICE (Demo)
// ===========================================
export const demoRecordingService = {
  getRecordings: async () => {
    await delay();
    return { recordings: demoRecordings };
  },
  getRecording: async (recordingId: string) => {
    await delay();
    const recording = demoRecordings.find(r => r.id === recordingId);
    return recording || null;
  },
  deleteRecording: async (recordingId: string) => {
    await delay();
    return { message: `Recording ${recordingId} deleted successfully` };
  },
  scheduleRecording: async (data: {
    channel_id: string;
    start_time: string;
    end_time: string;
    title?: string;
  }) => {
    await delay();
    return {
      id: 'rec-' + Date.now(),
      ...data,
      status: 'scheduled',
      message: 'Recording scheduled successfully',
    };
  },
  cancelScheduledRecording: async (recordingId: string) => {
    await delay();
    return { message: `Scheduled recording ${recordingId} cancelled successfully` };
  },
};

// ===========================================
// CHAT SERVICE (Demo)
// ===========================================
export const demoChatService = {
  sendMessage: async (message: string, _conversationId?: string, _context?: any, _language?: string) => {
    await delay();
    return {
      response: 'This is a demo response. In production, you would get AI-powered recommendations.',
      conversationId: 'demo-conversation',
    };
  },
  clearConversation: async (_conversationId: string) => {
    return { success: true };
  },
  getConversation: async (_conversationId: string) => {
    return { messages: [] };
  },
  transcribeAudio: async (_audioBlob: Blob, _language: string = 'he') => {
    await delay();
    return { text: 'Demo transcription', language: _language };
  },
  resolveContent: async (items: Array<{ name: string; type: string }>, _language: string = 'he') => {
    await delay(300);
    return {
      items: items.map((item, index) => ({
        id: `demo-${item.type}-${index}`,
        name: item.name,
        type: item.type || 'channel',
        thumbnail: 'https://via.placeholder.com/300x200',
        stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        matched_name: item.name,
        confidence: 0.9,
      })),
      unresolved: [],
      total_requested: items.length,
      total_resolved: items.length,
    };
  },
  searchUsers: async (name: string) => {
    await delay(200);
    return {
      users: [{ id: 'demo-user-1', name: name }],
    };
  },
};

// ===========================================
// DOWNLOADS SERVICE (Demo)
// ===========================================
export const demoDownloadsService = {
  getDownloads: async () => {
    await delay();
    return [
      {
        id: 'dl-1',
        content_id: 'fauda-s4e1',
        content_type: 'episode',
        title: 'פאודה - עונה 4 פרק 1',
        title_en: 'Fauda - Season 4 Episode 1',
        thumbnail: 'https://picsum.photos/seed/fauda-ep1/400/225',
        quality: 'hd',
        status: 'completed',
        progress: 100,
        file_size: 1288490188,
        downloaded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dl-2',
        content_id: 'shtisel-s3e5',
        content_type: 'episode',
        title: 'שטיסל - עונה 3 פרק 5',
        title_en: 'Shtisel - Season 3 Episode 5',
        thumbnail: 'https://picsum.photos/seed/shtisel-ep5/400/225',
        quality: 'hd',
        status: 'completed',
        progress: 100,
        file_size: 1027604480,
        downloaded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dl-3',
        content_id: 'waltz',
        content_type: 'movie',
        title: 'ואלס עם באשיר',
        title_en: 'Waltz with Bashir',
        thumbnail: 'https://picsum.photos/seed/waltz/400/225',
        quality: 'fhd',
        status: 'completed',
        progress: 100,
        file_size: 2576980377,
        downloaded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  },
  startDownload: async (contentId: string, contentType: string, quality: string = 'hd') => {
    await delay(300);
    return { message: 'Download started', id: `dl-demo-${Date.now()}`, status: 'pending' };
  },
  deleteDownload: async (_downloadId: string) => {
    await delay(200);
    return { message: 'Download deleted' };
  },
  checkDownload: async (_contentId: string) => {
    await delay(100);
    return { is_downloaded: false };
  },
};

// ===========================================
// JERUSALEM SERVICE (Demo)
// ===========================================
export const demoJerusalemService = {
  getContent: async (category?: string, _page?: number, _limit?: number) => {
    await delay(300);
    const items = [
      {
        id: 'jrslm-1',
        source_name: 'ynet',
        title: 'טקס השבעה מרגש בכותל המערבי',
        title_he: 'טקס השבעה מרגש בכותל המערבי',
        title_en: 'Moving Swearing-In Ceremony at the Western Wall',
        url: 'https://www.ynet.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'מאות חיילים הושבעו הלילה בטקס מרגש ברחבת הכותל המערבי',
        category: 'idf-ceremony',
        category_label: { he: 'טקסי צה"ל', en: 'IDF Ceremonies' },
        tags: ['כותל', 'צהל', 'השבעה'],
        relevance_score: 8.5,
      },
      {
        id: 'jrslm-2',
        source_name: 'walla',
        title: 'אלפי מבקרים בכותל לקראת החגים',
        title_he: 'אלפי מבקרים בכותל לקראת החגים',
        title_en: 'Thousands of Visitors at the Western Wall Before the Holidays',
        url: 'https://news.walla.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'הכותל המערבי מלא במבקרים מכל העולם לקראת תקופת החגים',
        category: 'kotel',
        category_label: { he: 'הכותל המערבי', en: 'Western Wall' },
        tags: ['כותל', 'חגים', 'ירושלים'],
        relevance_score: 7.2,
      },
      {
        id: 'jrslm-3',
        source_name: 'mako',
        title: 'משלחת תגלית מגיעה לישראל',
        title_he: 'משלחת תגלית מגיעה לישראל',
        title_en: 'Birthright Delegation Arrives in Israel',
        url: 'https://www.mako.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'צעירים יהודים מארה"ב הגיעו לביקור ראשון בארץ הקודש',
        category: 'diaspora-connection',
        category_label: { he: 'קשר לתפוצות', en: 'Diaspora Connection' },
        tags: ['תגלית', 'תפוצות', 'עלייה'],
        relevance_score: 6.8,
      },
    ];

    const filtered = category ? items.filter(item => item.category === category) : items;
    return {
      items: filtered,
      pagination: { page: 1, limit: 20, total: filtered.length, pages: 1 },
      sources_count: 3,
      last_updated: new Date().toISOString(),
      category,
    };
  },
  getFeatured: async () => {
    await delay(300);
    const content = await demoJerusalemService.getContent();
    return {
      featured: content.items.slice(0, 6),
      kotel_live: {
        name: 'Western Wall Live',
        name_he: 'שידור חי מהכותל',
        url: 'https://www.kotel.org/en/kotel-live',
        icon: '🕎',
      },
      upcoming_ceremonies: [],
      last_updated: new Date().toISOString(),
    };
  },
  getCategories: async () => {
    await delay(200);
    return [
      { id: 'kotel', name: 'Western Wall', name_he: 'הכותל המערבי', icon: '🕎' },
      { id: 'idf-ceremony', name: 'IDF Ceremonies', name_he: 'טקסי צה"ל', icon: '🎖️' },
      { id: 'diaspora-connection', name: 'Diaspora Connection', name_he: 'קשר לתפוצות', icon: '🌍' },
      { id: 'holy-sites', name: 'Holy Sites', name_he: 'מקומות קדושים', icon: '✡️' },
      { id: 'jerusalem-events', name: 'Jerusalem Events', name_he: 'אירועים בירושלים', icon: '🇮🇱' },
    ];
  },
  getKotelContent: async (page?: number, limit?: number) =>
    demoJerusalemService.getContent('kotel', page, limit),
  getKotelEvents: async () => {
    await delay(200);
    return {
      events: [],
      kotel_live: {
        name: 'Western Wall Live',
        name_he: 'שידור חי מהכותל',
        url: 'https://www.kotel.org/en/kotel-live',
        icon: '🕎',
      },
    };
  },
  getIDFCeremonies: async (page?: number, limit?: number) =>
    demoJerusalemService.getContent('idf-ceremony', page, limit),
  getDiasporaConnection: async (page?: number, limit?: number) =>
    demoJerusalemService.getContent('diaspora-connection', page, limit),
  getSources: async () => {
    await delay(200);
    return {
      sources: [
        { id: '1', name: 'Ynet Jerusalem', name_he: 'ynet ירושלים', website_url: 'https://www.ynet.co.il', is_active: true },
        { id: '2', name: 'Walla Jerusalem', name_he: 'וואלה ירושלים', website_url: 'https://news.walla.co.il', is_active: true },
        { id: '3', name: 'Mako Jerusalem', name_he: 'mako ירושלים', website_url: 'https://www.mako.co.il', is_active: true },
      ],
      total: 3,
    };
  },
};

// ===========================================
// TEL AVIV SERVICE (Demo)
// ===========================================
export const demoTelAvivService = {
  getContent: async (category?: string, _page?: number, _limit?: number) => {
    await delay(300);
    const items = [
      {
        id: 'tlv-1',
        source_name: 'ynet',
        title: 'פסטיבל חוף תל אביב - אלפי משתתפים',
        title_he: 'פסטיבל חוף תל אביב - אלפי משתתפים',
        title_en: 'Tel Aviv Beach Festival - Thousands of Participants',
        url: 'https://www.ynet.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'אלפי אנשים השתתפו בפסטיבל המוזיקה השנתי על חוף גורדון',
        category: 'beaches',
        category_label: { he: 'חופים', en: 'Beaches' },
        tags: ['חוף', 'פסטיבל', 'תל אביב'],
        relevance_score: 8.5,
      },
      {
        id: 'tlv-2',
        source_name: 'walla',
        title: 'פתיחת מסעדה חדשה בשרונה מרקט',
        title_he: 'פתיחת מסעדה חדשה בשרונה מרקט',
        title_en: 'New Restaurant Opens at Sarona Market',
        url: 'https://news.walla.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'שף ידוע פותח מסעדה ים תיכונית חדשה בלב שרונה',
        category: 'food',
        category_label: { he: 'אוכל ומסעדות', en: 'Food & Dining' },
        tags: ['מסעדה', 'שרונה', 'אוכל'],
        relevance_score: 7.2,
      },
      {
        id: 'tlv-3',
        source_name: 'mako',
        title: 'מופע חדש בברבי קלאב',
        title_he: 'מופע חדש בברבי קלאב',
        title_en: 'New Show at Barby Club',
        url: 'https://www.mako.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'להקה מקומית חוגגת אלבום חדש במופע מיוחד',
        category: 'music',
        category_label: { he: 'מוזיקה', en: 'Music Scene' },
        tags: ['מוזיקה', 'הופעה', 'ברבי'],
        relevance_score: 6.8,
      },
      {
        id: 'tlv-4',
        source_name: 'geektime',
        title: 'סטארטאפ תל אביבי גייס 50 מיליון דולר',
        title_he: 'סטארטאפ תל אביבי גייס 50 מיליון דולר',
        title_en: 'Tel Aviv Startup Raises $50 Million',
        url: 'https://www.geektime.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'חברת AI מתל אביב סגרה סבב גיוס משמעותי',
        category: 'tech',
        category_label: { he: 'סטארטאפים והייטק', en: 'Tech & Startups' },
        tags: ['סטארטאפ', 'הייטק', 'גיוס'],
        relevance_score: 7.5,
      },
    ];

    const filtered = category ? items.filter(item => item.category === category) : items;
    return {
      items: filtered,
      pagination: { page: 1, limit: 20, total: filtered.length, pages: 1 },
      sources_count: 4,
      last_updated: new Date().toISOString(),
      category,
    };
  },
  getFeatured: async () => {
    await delay(300);
    const content = await demoTelAvivService.getContent();
    return {
      featured: content.items.slice(0, 6),
      beach_webcam: {
        name: 'Tel Aviv Beach Live',
        name_he: 'חוף תל אביב בשידור חי',
        url: 'https://www.skylinewebcams.com/en/webcam/israel/tel-aviv-district/tel-aviv/tel-aviv-beach.html',
        icon: '🏖️',
      },
      upcoming_events: [],
      last_updated: new Date().toISOString(),
    };
  },
  getCategories: async () => {
    await delay(200);
    return [
      { id: 'beaches', name: 'Beaches', name_he: 'חופים', icon: '🏖️' },
      { id: 'nightlife', name: 'Nightlife', name_he: 'חיי לילה', icon: '🌃' },
      { id: 'culture', name: 'Culture & Art', name_he: 'תרבות ואמנות', icon: '🎭' },
      { id: 'music', name: 'Music Scene', name_he: 'מוזיקה', icon: '🎵' },
      { id: 'food', name: 'Food & Dining', name_he: 'אוכל ומסעדות', icon: '🍽️' },
      { id: 'tech', name: 'Tech & Startups', name_he: 'סטארטאפים והייטק', icon: '💻' },
      { id: 'events', name: 'Events', name_he: 'אירועים', icon: '🎉' },
    ];
  },
  getBeachesContent: async (page?: number, limit?: number) =>
    demoTelAvivService.getContent('beaches', page, limit),
  getNightlifeContent: async (page?: number, limit?: number) =>
    demoTelAvivService.getContent('nightlife', page, limit),
  getCultureContent: async (page?: number, limit?: number) =>
    demoTelAvivService.getContent('culture', page, limit),
  getMusicContent: async (page?: number, limit?: number) =>
    demoTelAvivService.getContent('music', page, limit),
  getSources: async () => {
    await delay(200);
    return {
      sources: [
        { id: '1', name: 'Ynet Tel Aviv', name_he: 'ynet תל אביב', website_url: 'https://www.ynet.co.il', is_active: true },
        { id: '2', name: 'Walla Tel Aviv', name_he: 'וואלה תל אביב', website_url: 'https://news.walla.co.il', is_active: true },
        { id: '3', name: 'Time Out Tel Aviv', name_he: 'טיים אאוט תל אביב', website_url: 'https://www.timeout.co.il', is_active: true },
        { id: '4', name: 'Geektime', name_he: 'גיקטיים', website_url: 'https://www.geektime.co.il', is_active: true },
      ],
      total: 4,
    };
  },
};

// ===========================================
// CULTURE SERVICE (Demo)
// ===========================================
export const demoCultureService = {
  getCultures: async () => {
    await delay(200);
    return [
      {
        id: '1',
        culture_id: 'israeli',
        name: 'Israeli',
        name_localized: { he: 'ישראלי', en: 'Israeli', es: 'Israelí' },
        flag_emoji: '🇮🇱',
        country_code: 'IL',
        primary_timezone: 'Asia/Jerusalem',
        primary_language: 'he',
        has_shabbat_mode: true,
        has_lunar_calendar: false,
        display_order: 0,
        is_active: true,
        is_default: true,
      },
      {
        id: '2',
        culture_id: 'chinese',
        name: 'Chinese',
        name_localized: { zh: '中国', he: 'סיני', en: 'Chinese', es: 'Chino' },
        flag_emoji: '🇨🇳',
        country_code: 'CN',
        primary_timezone: 'Asia/Shanghai',
        primary_language: 'zh',
        has_shabbat_mode: false,
        has_lunar_calendar: true,
        display_order: 1,
        is_active: true,
        is_default: false,
      },
    ];
  },
  getCulture: async (cultureId: string) => {
    const cultures = await demoCultureService.getCultures();
    return cultures.find(c => c.culture_id === cultureId) || cultures[0];
  },
  getDefaultCulture: async () => {
    const cultures = await demoCultureService.getCultures();
    return cultures.find(c => c.is_default) || cultures[0];
  },
  getCultureCities: async (cultureId: string, _featuredOnly: boolean = true) => {
    await delay(200);
    if (cultureId === 'israeli') {
      return [
        {
          id: '1',
          city_id: 'jerusalem',
          culture_id: 'israeli',
          name: 'Jerusalem',
          name_localized: { he: 'ירושלים', en: 'Jerusalem' },
          name_native: 'ירושלים',
          timezone: 'Asia/Jerusalem',
          display_order: 0,
          is_featured: true,
          accent_color: '#C5A03A',
        },
        {
          id: '2',
          city_id: 'tel-aviv',
          culture_id: 'israeli',
          name: 'Tel Aviv',
          name_localized: { he: 'תל אביב', en: 'Tel Aviv' },
          name_native: 'תל אביב',
          timezone: 'Asia/Jerusalem',
          display_order: 1,
          is_featured: true,
          accent_color: '#F97316',
        },
      ];
    }
    return [
      {
        id: '3',
        city_id: 'beijing',
        culture_id: 'chinese',
        name: 'Beijing',
        name_localized: { zh: '北京', en: 'Beijing' },
        name_native: '北京',
        timezone: 'Asia/Shanghai',
        display_order: 0,
        is_featured: true,
        accent_color: '#FFD700',
      },
      {
        id: '4',
        city_id: 'shanghai',
        culture_id: 'chinese',
        name: 'Shanghai',
        name_localized: { zh: '上海', en: 'Shanghai' },
        name_native: '上海',
        timezone: 'Asia/Shanghai',
        display_order: 1,
        is_featured: true,
        accent_color: '#00BFFF',
      },
    ];
  },
  getCity: async (cultureId: string, cityId: string) => {
    const cities = await demoCultureService.getCultureCities(cultureId);
    return cities.find(c => c.city_id === cityId) || cities[0];
  },
  getCityContent: async (cultureId: string, cityId: string, _category?: string, _page?: number, _limit?: number) => {
    await delay(300);
    if (cultureId === 'israeli' && cityId === 'jerusalem') {
      return demoJerusalemService.getContent(_category, _page, _limit);
    }
    if (cultureId === 'israeli' && cityId === 'tel-aviv') {
      return demoTelAvivService.getContent(_category, _page, _limit);
    }
    return { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, sources_count: 0, last_updated: new Date().toISOString() };
  },
  getTrending: async (cultureId: string, _limit?: number) => {
    await delay(200);
    const content = cultureId === 'israeli'
      ? await demoJerusalemService.getContent()
      : { items: [] };
    return content.items.slice(0, _limit || 10);
  },
  getFeatured: async (cultureId: string) => {
    await delay(200);
    const content = cultureId === 'israeli'
      ? await demoJerusalemService.getContent()
      : { items: [] };
    return {
      featured: content.items.slice(0, 6),
      trending: content.items.slice(0, 10),
      last_updated: new Date().toISOString(),
      culture_id: cultureId,
    };
  },
  getCategories: async (cultureId: string, _cityId?: string) => {
    if (cultureId === 'israeli') {
      return demoJerusalemService.getCategories();
    }
    return [
      { id: 'general', name: 'General', name_localized: { en: 'General', zh: '综合' } },
    ];
  },
  getSources: async (cultureId: string, _cityId?: string) => {
    if (cultureId === 'israeli') {
      return demoJerusalemService.getSources();
    }
    return { sources: [], total: 0 };
  },
  getCultureTime: async (cultureId: string) => {
    await delay(100);
    const now = new Date();
    const timezone = cultureId === 'israeli' ? 'Asia/Jerusalem' : 'Asia/Shanghai';
    return {
      culture_id: cultureId,
      timezone,
      current_time: now.toISOString(),
      display_time: now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }),
      display_date: now.toLocaleDateString('en-US', { timeZone: timezone, month: 'long', day: 'numeric', year: 'numeric' }),
      day_of_week: now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' }),
      is_weekend: cultureId === 'israeli' ? [5, 6].includes(now.getDay()) : [0, 6].includes(now.getDay()),
    };
  },
};

// Export all demo services
export default {
  auth: demoAuthService,
  content: demoContentService,
  live: demoLiveService,
  radio: demoRadioService,
  podcast: demoPodcastService,
  playlist: demoPlaylistService,
  watchlist: demoPlaylistService,
  history: demoHistoryService,
  search: demoSearchService,
  favorites: demoFavoritesService,
  zman: demoZmanService,
  trending: demoTrendingService,
  ritual: demoRitualService,
  subtitles: demoSubtitlesService,
  chapters: demoChaptersService,
  party: demoPartyService,
  recording: demoRecordingService,
  chat: demoChatService,
  downloads: demoDownloadsService,
  jerusalem: demoJerusalemService,
  telAviv: demoTelAvivService,
  culture: demoCultureService,
};
