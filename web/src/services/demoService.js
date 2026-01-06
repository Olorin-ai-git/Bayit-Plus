/**
 * Demo Service
 * Provides mock implementations of all API services for demo mode.
 * Returns comprehensive demo data with simulated network delay.
 */
import { config } from '../config/appConfig';
import demoData, {
  demoUser,
  demoMovies,
  demoSeries,
  demoChannels,
  demoRadioStations,
  demoPodcasts,
  demoTrending,
  demoChapters,
  demoSubtitles,
  demoTranslations,
  demoZmanData,
  demoMorningRitual,
  demoContinueWatching,
  demoCategories,
  demoFeatured,
  demoSearchResults,
} from '../data/demoData';

// Simulate network delay
const delay = (ms = config.mock.delay) => new Promise(resolve => setTimeout(resolve, ms));

// ===========================================
// AUTH SERVICE (Demo)
// ===========================================
export const demoAuthService = {
  login: async (email, password) => {
    await delay();
    return { user: demoUser, token: 'demo-token-12345' };
  },
  register: async (userData) => {
    await delay();
    return { user: { ...demoUser, ...userData }, token: 'demo-token-12345' };
  },
  logout: async () => {
    await delay();
    return { message: 'Logged out' };
  },
  me: async () => {
    await delay();
    return demoUser;
  },
  updateProfile: async (updates) => {
    await delay();
    return { ...demoUser, ...updates };
  },
  resetPassword: async (email) => {
    await delay();
    return { message: 'Password reset email sent' };
  },
  getGoogleAuthUrl: async () => {
    await delay();
    return { url: '#demo-google-auth' };
  },
  googleCallback: async (code) => {
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
  getByCategory: async (categoryId, params) => {
    await delay();
    const category = demoCategories.find(c => c.id === categoryId);
    return { items: category?.items || [] };
  },
  getById: async (contentId) => {
    await delay();
    const content = [...demoMovies, ...demoSeries].find(c => c.id === contentId);
    return content || null;
  },
  getStreamUrl: async (contentId) => {
    await delay();
    return { stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' };
  },
  search: async (query, params) => {
    await delay();
    return demoSearchResults(query);
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
  getChannel: async (channelId) => {
    await delay();
    return demoChannels.find(c => c.id === channelId) || null;
  },
  getEPG: async (channelId, date) => {
    await delay();
    return {
      programs: [
        { start: '06:00', end: '09:00', title: 'בוקר טוב ישראל' },
        { start: '09:00', end: '12:00', title: 'תוכנית הבוקר' },
        { start: '12:00', end: '14:00', title: 'חדשות הצהריים' },
        { start: '14:00', end: '18:00', title: 'משדר אחר הצהריים' },
        { start: '18:00', end: '20:00', title: 'חדשות הערב' },
        { start: '20:00', end: '22:00', title: 'סדרת הדגל' },
        { start: '22:00', end: '00:00', title: 'לייט נייט' },
      ],
    };
  },
  getStreamUrl: async (channelId) => {
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
  getStation: async (stationId) => {
    await delay();
    return demoRadioStations.find(s => s.id === stationId) || null;
  },
  getStreamUrl: async (stationId) => {
    await delay();
    return { stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3' };
  },
};

// ===========================================
// PODCAST SERVICE (Demo)
// ===========================================
export const demoPodcastService = {
  getShows: async (params) => {
    await delay();
    return { shows: demoPodcasts };
  },
  getShow: async (showId) => {
    await delay();
    return demoPodcasts.find(p => p.id === showId) || null;
  },
  getEpisodes: async (showId, params) => {
    await delay();
    const podcast = demoPodcasts.find(p => p.id === showId);
    return { episodes: podcast?.episodes || [] };
  },
  getEpisode: async (showId, episodeId) => {
    await delay();
    const podcast = demoPodcasts.find(p => p.id === showId);
    return podcast?.episodes?.find(e => e.id === episodeId) || null;
  },
};

// ===========================================
// HISTORY SERVICE (Demo)
// ===========================================
export const demoHistoryService = {
  getHistory: async (params) => {
    await delay();
    return { items: demoContinueWatching };
  },
  updateProgress: async (contentId, contentType, position, duration) => {
    await delay();
    return { message: 'Progress updated' };
  },
  getContinueWatching: async () => {
    await delay();
    return { items: demoContinueWatching };
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
  addToWatchlist: async (contentId, contentType) => {
    await delay();
    return { message: 'Added to watchlist' };
  },
  removeFromWatchlist: async (contentId) => {
    await delay();
    return { message: 'Removed from watchlist' };
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
        { id: 'basic', name: 'בסיסי', price: 9.99, features: ['צפייה ב-HD', '1 מכשיר'] },
        { id: 'premium', name: 'פרימיום', price: 14.99, features: ['צפייה ב-4K', '4 מכשירים', 'הורדות'] },
        { id: 'family', name: 'משפחתי', price: 19.99, features: ['צפייה ב-4K', '6 מכשירים', 'הורדות', '5 פרופילים'] },
      ],
    };
  },
  getCurrentPlan: async () => {
    await delay();
    return demoUser.subscription;
  },
  createCheckout: async (planId) => {
    await delay();
    return { checkout_url: '#demo-checkout' };
  },
  cancelSubscription: async () => {
    await delay();
    return { message: 'Subscription cancelled' };
  },
  getInvoices: async () => {
    await delay();
    return { invoices: [] };
  },
};

// ===========================================
// CHAT SERVICE (Demo)
// ===========================================
export const demoChatService = {
  sendMessage: async (message, conversationId) => {
    await delay(500);
    return {
      message: `זו תשובה לדוגמה על "${message}". במצב דמו, הבינה המלאכותית לא פעילה.`,
      conversation_id: conversationId || 'demo-conv-1',
      recommendations: demoSeries.slice(0, 3),
    };
  },
  getConversation: async (conversationId) => {
    await delay();
    return {
      id: conversationId,
      messages: [
        { role: 'user', content: 'מה כדאי לראות?', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'אני ממליץ על פאודה - סדרת מתח מעולה!', timestamp: new Date().toISOString() },
      ],
    };
  },
  clearConversation: async (conversationId) => {
    await delay();
    return { message: 'Conversation cleared' };
  },
  transcribeAudio: async (audioBlob) => {
    await delay(1000);
    return { text: 'אני רוצה לראות סרט פעולה', language: 'he' };
  },
};

// ===========================================
// ZMAN SERVICE (Demo)
// ===========================================
export const demoZmanService = {
  getTime: async (timezone) => {
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
  getShabbatTimes: async (latitude, longitude) => {
    await delay();
    return demoZmanData.shabbat;
  },
  getShabbatContent: async () => {
    await delay();
    return { content: demoZmanData.shabbat_content };
  },
  updatePreferences: async (prefs) => {
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
          category: 'politics',
          category_label: { he: 'פוליטיקה', en: 'Politics' },
          sentiment: 'neutral',
          importance: 10,
          summary: 'הבחירות הקרובות מעסיקות את הציבור',
          keywords: ['בחירות', 'ממשלה', 'כנסת'],
        },
        {
          title: 'מכבי תל אביב בליגת האלופות',
          title_en: 'Maccabi Tel Aviv in Champions League',
          category: 'sports',
          category_label: { he: 'ספורט', en: 'Sports' },
          sentiment: 'positive',
          importance: 8,
          summary: 'ניצחון דרמטי בליגת אלופות',
          keywords: ['מכבי', 'כדורגל', 'ליגת אלופות'],
        },
        {
          title: 'סטארט-אפ ישראלי גייס 100 מיליון',
          title_en: 'Israeli Startup Raises $100M',
          category: 'tech',
          category_label: { he: 'טכנולוגיה', en: 'Tech' },
          sentiment: 'positive',
          importance: 7,
          summary: 'חדשנות טכנולוגית ישראלית',
          keywords: ['הייטק', 'סטארט-אפ', 'גיוס'],
        },
        {
          title: 'מזג אוויר סוער בסוף השבוע',
          title_en: 'Stormy Weather This Weekend',
          category: 'weather',
          category_label: { he: 'מזג אוויר', en: 'Weather' },
          sentiment: 'neutral',
          importance: 6,
          summary: 'גשמים צפויים בסוף השבוע',
          keywords: ['גשם', 'סערה', 'מזג אוויר'],
        },
        {
          title: 'פרסי האקדמיה הישראלית',
          title_en: 'Israeli Academy Awards',
          category: 'entertainment',
          category_label: { he: 'בידור', en: 'Entertainment' },
          sentiment: 'positive',
          importance: 7,
          summary: 'פרסי האקדמיה הישראלית הוכרזו',
          keywords: ['קולנוע', 'פרסים', 'אקדמיה'],
        },
      ],
      overall_mood: 'הציבור הישראלי עסוק בבחירות ובספורט',
      top_story: 'בחירות 2025 בעיצומן',
      sources: ['Ynet', 'Walla', 'Mako', 'Calcalist', 'Sport5'],
      analyzed_at: new Date().toISOString(),
    };
  },
  getHeadlines: async (source, limit = 20) => {
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
  getRecommendations: async (limit = 10) => {
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
  getByCategory: async (category) => {
    await delay();
    return {
      topics: demoTrending.topics.filter(t => t.category === category),
    };
  },
};

// ===========================================
// CHAPTERS SERVICE (Demo)
// ===========================================
export const demoChaptersService = {
  getChapters: async (contentId) => {
    await delay();
    return demoChapters[contentId] || { chapters: [] };
  },
  generateChapters: async (contentId, force = false, transcript = null) => {
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
  getLiveChapters: async (channelId) => {
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
  getTracks: async (contentId, language) => {
    await delay();
    const track = demoSubtitles[contentId];
    return track ? [track] : [];
  },
  getCues: async (contentId, language = 'he', withNikud = false, startTime, endTime) => {
    await delay();
    const track = demoSubtitles[contentId];
    if (!track) return { cues: [] };

    let cues = track.cues;
    if (startTime !== undefined) {
      cues = cues.filter(c => c.end_time >= startTime);
    }
    if (endTime !== undefined) {
      cues = cues.filter(c => c.start_time <= endTime);
    }

    return {
      content_id: contentId,
      language: track.language,
      language_name: track.language_name,
      has_nikud: track.has_nikud,
      cues: cues.map(c => ({
        ...c,
        text: withNikud && c.text_nikud ? c.text_nikud : c.text,
      })),
    };
  },
  generateNikud: async (contentId, language = 'he', force = false) => {
    await delay(500);
    return {
      message: 'Nikud generated successfully',
      content_id: contentId,
      generated_at: new Date().toISOString(),
    };
  },
  importSubtitles: async (contentId, sourceUrl, language, languageName, isDefault) => {
    await delay();
    return { message: 'Subtitles imported', id: 'demo-subtitle-id' };
  },
  translateWord: async (word, sourceLang = 'he', targetLang = 'en') => {
    await delay(300);
    return demoTranslations[word] || {
      word,
      translation: `[תרגום של ${word}]`,
      transliteration: word,
      part_of_speech: 'noun',
      cached: false,
    };
  },
  translatePhrase: async (phrase, sourceLang = 'he', targetLang = 'en') => {
    await delay(500);
    return {
      phrase,
      translation: `[Translation of: ${phrase}]`,
      source_lang: sourceLang,
      target_lang: targetLang,
    };
  },
  addNikudToText: async (text) => {
    await delay(300);
    // Simple demo nikud - just return the text with some vowels
    return {
      original: text,
      with_nikud: text, // In real implementation, this would have nikud marks
    };
  },
  getCacheStats: async () => {
    await delay();
    return { nikud_cache_size: 150, translation_cache_size: 500, max_size: 10000 };
  },
};

// ===========================================
// RITUAL SERVICE (Demo)
// ===========================================
// Store ritual preferences in memory for demo
let ritualPreferencesCache = {
  morning_ritual_enabled: true,
  morning_ritual_start: 7,
  morning_ritual_end: 9,
  morning_ritual_content: ['news', 'radio'],
  morning_ritual_auto_play: true,
  morning_ritual_skip_weekends: false,
};

export const demoRitualService = {
  check: async () => {
    await delay();
    return demoMorningRitual;
  },
  shouldShow: async () => {
    await delay();
    const prefs = ritualPreferencesCache;
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if ritual is enabled
    if (!prefs.morning_ritual_enabled) {
      return {
        show_ritual: false,
        reason: 'disabled',
        auto_play: false,
      };
    }

    // Check for weekend skip (Friday-Saturday for Israel, Sat-Sun for US)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sat-Sun
    if (prefs.morning_ritual_skip_weekends && isWeekend) {
      return {
        show_ritual: false,
        reason: 'weekend_skip',
        auto_play: false,
      };
    }

    // Check if within time window
    const isRitualTime = hour >= prefs.morning_ritual_start && hour < prefs.morning_ritual_end;
    return {
      show_ritual: isRitualTime,
      reason: isRitualTime ? 'active' : 'outside_time_window',
      auto_play: prefs.morning_ritual_auto_play,
      content_types: prefs.morning_ritual_content,
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
      ...ritualPreferencesCache,
      local_timezone: 'America/New_York',
    };
  },
  updatePreferences: async (prefs) => {
    await delay();
    // Update the cache with new preferences
    ritualPreferencesCache = { ...ritualPreferencesCache, ...prefs };
    return { message: 'Preferences updated', preferences: ritualPreferencesCache };
  },
  skipToday: async () => {
    await delay();
    return { message: 'Morning ritual skipped for today', skipped_date: new Date().toISOString().split('T')[0] };
  },
};

// ===========================================
// PARTY SERVICE (Demo)
// ===========================================
export const demoPartyService = {
  create: async (data) => {
    await delay();
    return {
      id: 'demo-party-' + Date.now(),
      room_code: 'DEMO' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      ...data,
    };
  },
  getMyParties: async () => {
    await delay();
    return { parties: demoData.watchParties };
  },
  joinByCode: async (roomCode) => {
    await delay();
    return { party_id: 'demo-party-1', ...demoData.watchParties[0] };
  },
  getParty: async (partyId) => {
    await delay();
    return demoData.watchParties[0];
  },
  joinParty: async (partyId) => {
    await delay();
    return { message: 'Joined party' };
  },
  leaveParty: async (partyId) => {
    await delay();
    return { message: 'Left party' };
  },
  endParty: async (partyId) => {
    await delay();
    return { message: 'Party ended' };
  },
  sendMessage: async (partyId, message, messageType = 'text') => {
    await delay();
    return {
      id: 'msg-' + Date.now(),
      user_name: demoUser.name,
      message,
      message_type: messageType,
      timestamp: new Date().toISOString(),
    };
  },
  getChatHistory: async (partyId, limit = 50, before) => {
    await delay();
    return {
      messages: [
        { id: 'msg-1', user_name: 'דני', message: 'מה קורה?', timestamp: new Date().toISOString() },
        { id: 'msg-2', user_name: 'שרה', message: '!איזה פרק מדהים', timestamp: new Date().toISOString() },
      ],
    };
  },
  addReaction: async (partyId, messageId, emoji) => {
    await delay();
    return { message: 'Reaction added' };
  },
  removeReaction: async (partyId, messageId, emoji) => {
    await delay();
    return { message: 'Reaction removed' };
  },
  syncPlayback: async (partyId, position, isPlaying = true) => {
    await delay();
    return { message: 'Playback synced' };
  },
};

// ===========================================
// SEARCH SERVICE (Demo)
// ===========================================
export const demoSearchService = {
  search: async (query, filters) => {
    await delay();
    return demoSearchResults(query);
  },
  quickSearch: async (query, limit = 5) => {
    await delay();
    const results = demoSearchResults(query);
    return { suggestions: results.results.slice(0, limit) };
  },
  getSuggestions: async () => {
    await delay();
    return { suggestions: ['פאודה', 'שטיסל', 'טהרן', 'הבורר', 'עבודה ערבית'] };
  },
  voiceSearch: async (transcript, language, filters) => {
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
  addToFavorites: async (contentId, contentType) => {
    await delay();
    return { message: 'Added to favorites' };
  },
  removeFromFavorites: async (contentId) => {
    await delay();
    return { message: 'Removed from favorites' };
  },
  isFavorite: async (contentId) => {
    await delay();
    return { is_favorite: Math.random() > 0.5 };
  },
};

export default {
  auth: demoAuthService,
  content: demoContentService,
  live: demoLiveService,
  radio: demoRadioService,
  podcast: demoPodcastService,
  history: demoHistoryService,
  watchlist: demoWatchlistService,
  subscription: demoSubscriptionService,
  chat: demoChatService,
  zman: demoZmanService,
  trending: demoTrendingService,
  chapters: demoChaptersService,
  subtitles: demoSubtitlesService,
  ritual: demoRitualService,
  party: demoPartyService,
  search: demoSearchService,
  favorites: demoFavoritesService,
};
