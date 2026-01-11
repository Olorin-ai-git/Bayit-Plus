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
// WATCHLIST SERVICE (Demo)
// ===========================================
export const demoWatchlistService = {
  getWatchlist: async () => {
    await delay();
    return { items: demoSeries.slice(0, 3) };
  },
  addToWatchlist: async (contentId: string, contentType: string) => {
    await delay();
    return { message: 'Added to watchlist' };
  },
  removeFromWatchlist: async (contentId: string) => {
    await delay();
    return { message: 'Removed from watchlist' };
  },
  isInWatchlist: async (contentId: string) => {
    await delay();
    return { in_watchlist: Math.random() > 0.5 };
  },
  toggleWatchlist: async (contentId: string, contentType: string = 'vod') => {
    await delay();
    const inWatchlist = Math.random() > 0.5;
    return { in_watchlist: inWatchlist, message: inWatchlist ? 'Added to watchlist' : 'Removed from watchlist' };
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
    return demoSearchResults(query);
  },
  quickSearch: async (query: string, limit: number = 5) => {
    await delay();
    const results = demoSearchResults(query);
    return { suggestions: results.results.slice(0, limit) };
  },
  getSuggestions: async () => {
    await delay();
    return { suggestions: ['פאודה', 'שטיסל', 'טהרן', 'הבורר', 'עבודה ערבית'] };
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
    const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    return {
      israel: {
        time: israelTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        datetime: israelTime.toISOString(),
        day: israelTime.toLocaleDateString('he-IL', { weekday: 'long' }),
      },
      local: {
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        datetime: now.toISOString(),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
      },
      shabbat: {
        is_shabbat: false,
        is_erev_shabbat: israelTime.getDay() === 5,
        countdown: '48:00',
        countdown_label: 'עד שבת',
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
// CHAT SERVICE (Demo)
// ===========================================
export const demoChatService = {
  sendMessage: async (message: string, conversationId?: string) => {
    await delay(500);
    return {
      message: `זו תשובה לדוגמה על "${message}". במצב דמו, הבינה המלאכותית לא פעילה.`,
      conversation_id: conversationId || 'demo-conv-1',
      recommendations: demoSeries.slice(0, 3),
    };
  },
  getConversation: async (conversationId: string) => {
    await delay();
    return {
      id: conversationId,
      messages: [
        { role: 'user', content: 'מה כדאי לראות?', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'אני ממליץ על פאודה - סדרת מתח מעולה!', timestamp: new Date().toISOString() },
      ],
    };
  },
  clearConversation: async (conversationId: string) => {
    await delay();
    return { message: 'Conversation cleared' };
  },
  transcribeAudio: async (audioBlob: Blob) => {
    await delay(1000);
    return { text: 'אני רוצה לראות סרט פעולה', language: 'he' };
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

// Export all demo services
export default {
  auth: demoAuthService,
  content: demoContentService,
  live: demoLiveService,
  radio: demoRadioService,
  podcast: demoPodcastService,
  watchlist: demoWatchlistService,
  history: demoHistoryService,
  search: demoSearchService,
  favorites: demoFavoritesService,
  zman: demoZmanService,
  trending: demoTrendingService,
  ritual: demoRitualService,
  subtitles: demoSubtitlesService,
  chapters: demoChaptersService,
  party: demoPartyService,
  chat: demoChatService,
};
