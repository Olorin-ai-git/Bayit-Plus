/**
 * Demo Service
 * Provides mock implementations of all API services for demo mode.
 * Returns comprehensive demo data with simulated network delay.
 */
import i18n from 'i18next';
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
  demoJudaismCategories,
  demoJudaismContent,
  demoChildrenCategories,
  demoChildrenContent,
  demoFlows,
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
  getCategories: async () => {
    await delay();
    // Extract unique categories from demo podcasts
    const categories = [...new Set(demoPodcasts.map(p => p.category).filter(Boolean))].sort();
    return {
      categories: categories.map(cat => ({ id: cat, name: cat })),
      total: categories.length,
    };
  },
  getShows: async (params) => {
    await delay();
    // Map demo data fields to expected interface
    let shows = demoPodcasts.map(p => ({
      ...p,
      cover: p.thumbnail, // Map thumbnail to cover
      author: p.host, // Map host to author
      episodeCount: p.episode_count || p.episodes?.length || 0,
    }));

    // Handle both old API (categoryId string) and new API (params object)
    let category;
    if (typeof params === 'string') {
      category = params;
    } else if (params?.category) {
      category = params.category;
    }

    // Filter by category if provided
    if (category) {
      shows = shows.filter(show => show.category === category);
    }

    return { shows };
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
  isInWatchlist: async (contentId) => {
    await delay();
    return { in_watchlist: Math.random() > 0.5 };
  },
  toggleWatchlist: async (contentId, contentType = 'vod') => {
    await delay();
    const inWatchlist = Math.random() > 0.5;
    return { in_watchlist: inWatchlist, message: inWatchlist ? 'Added to watchlist' : 'Removed from watchlist' };
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
const generateChatResponse = (message, context) => {
  const lowerMessage = message.toLowerCase();
  const lang = i18n.language || 'he';

  // Check for flow-related queries
  if (lowerMessage.includes('flow') || lowerMessage.includes('פלו') || lowerMessage.includes('רצף')) {
    if (lowerMessage.includes('create') || lowerMessage.includes('צור') || lowerMessage.includes('חדש')) {
      return {
        message: lang === 'he'
          ? 'אשמח ליצור עבורך רצף חדש! מה תרצה שהרצף יכלול? בוקר, ערב או שבת?'
          : 'I\'d be happy to create a new flow for you! What would you like the flow to include? Morning, evening, or Shabbat?',
        action: null,
      };
    }
    if (context?.flows?.length > 0) {
      const flowNames = context.flows.map(f => f.name).join(', ');
      return {
        message: lang === 'he'
          ? `יש לך את הרצפים הבאים: ${flowNames}. מה תרצה לעשות?`
          : `You have the following flows: ${flowNames}. What would you like to do?`,
        action: null,
      };
    }
  }

  // Check for live TV queries
  if (lowerMessage.includes('live') || lowerMessage.includes('שידור') || lowerMessage.includes('ערוץ') || lowerMessage.includes('channel')) {
    if (context?.liveChannels?.length > 0) {
      return {
        message: lang === 'he'
          ? `יש ${context.liveChannels.length} ערוצים זמינים. רוצה שאנווט אותך לשידור חי?`
          : `There are ${context.liveChannels.length} channels available. Would you like me to navigate to live TV?`,
        action: { type: 'navigate', payload: { path: '/live' } },
      };
    }
  }

  // Check for search queries
  if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('חפש') || lowerMessage.includes('מצא')) {
    const searchTerm = message.replace(/search|find|חפש|מצא/gi, '').trim();
    if (searchTerm) {
      return {
        message: lang === 'he'
          ? `מחפש "${searchTerm}"...`
          : `Searching for "${searchTerm}"...`,
        action: { type: 'search', payload: { query: searchTerm } },
      };
    }
  }

  // Check for morning routine
  if (lowerMessage.includes('morning') || lowerMessage.includes('בוקר')) {
    return {
      message: lang === 'he'
        ? 'אשמח ליצור עבורך רצף בוקר עם חדשות, מזג אוויר ותוכן מעודד!'
        : 'I\'d love to create a morning flow for you with news, weather, and uplifting content!',
      action: { type: 'create_flow', payload: { template: { name: { en: 'Morning Routine', he: 'שגרת בוקר' }, triggers: [{ type: 'time', time: '07:00' }] } } },
    };
  }

  // Check for what to watch queries
  if (lowerMessage.includes('watch') || lowerMessage.includes('לראות') || lowerMessage.includes('לצפות') || lowerMessage.includes('recommend') || lowerMessage.includes('המלצ')) {
    return {
      message: lang === 'he'
        ? 'הנה כמה המלצות שעשויות לעניין אותך:'
        : 'Here are some recommendations you might like:',
      recommendations: demoSeries.slice(0, 3),
      action: null,
    };
  }

  // Check for podcast queries
  if (lowerMessage.includes('podcast') || lowerMessage.includes('פודקאסט')) {
    return {
      message: lang === 'he'
        ? 'אנווט אותך לפודקאסטים שלנו.'
        : 'I\'ll navigate you to our podcasts.',
      action: { type: 'navigate', payload: { path: '/podcasts' } },
    };
  }

  // Check for radio queries
  if (lowerMessage.includes('radio') || lowerMessage.includes('רדיו')) {
    return {
      message: lang === 'he'
        ? 'אנווט אותך לתחנות הרדיו שלנו.'
        : 'I\'ll navigate you to our radio stations.',
      action: { type: 'navigate', payload: { path: '/radio' } },
    };
  }

  // Default response with recommendations
  return {
    message: lang === 'he'
      ? `הבנתי: "${message}". איך אוכל לעזור לך? אפשר לחפש תוכן, ליצור רצף, או לנווט לשידור חי.`
      : `Got it: "${message}". How can I help you? I can search for content, create a flow, or navigate to live TV.`,
    action: null,
  };
};

export const demoChatService = {
  sendMessage: async (message, conversationId, context = null) => {
    await delay(500);
    const response = generateChatResponse(message, context);
    return {
      ...response,
      conversation_id: conversationId || 'demo-conv-1',
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
        day: israelTime.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : i18n.language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long' }),
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
        countdown_label: i18n.t('demo.until_shabbat'),
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
    const results = demoSearchResults(query);
    return {
      ...results,
      interpretation: i18n.t('demo.search_interpretation', { query }),
      suggestions: [
        i18n.t('demo.suggestions.0'),
        i18n.t('demo.suggestions.1'),
        i18n.t('demo.suggestions.2'),
        i18n.t('demo.suggestions.3'),
      ],
    };
  },
  quickSearch: async (query, limit = 5) => {
    await delay();
    const results = demoSearchResults(query);
    return { suggestions: results.results.slice(0, limit) };
  },
  getSuggestions: async () => {
    await delay();
    return {
      suggestions: [
        i18n.t('demo.suggestions.0'),
        i18n.t('demo.suggestions.1'),
        i18n.t('demo.suggestions.2'),
        i18n.t('demo.suggestions.3'),
        i18n.t('demo.suggestions.4'),
      ],
    };
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
  addFavorite: async (contentId, contentType) => {
    await delay();
    return { message: 'Added to favorites' };
  },
  removeFavorite: async (contentId) => {
    await delay();
    return { message: 'Removed from favorites' };
  },
  isFavorite: async (contentId) => {
    await delay();
    return { is_favorite: Math.random() > 0.5 };
  },
  toggleFavorite: async (contentId, contentType = 'vod') => {
    await delay();
    const isFavorite = Math.random() > 0.5;
    return { is_favorite: isFavorite, message: isFavorite ? 'Added to favorites' : 'Removed from favorites' };
  },
};

// ===========================================
// DOWNLOADS SERVICE (Demo)
// ===========================================
export const demoDownloadsService = {
  getDownloads: async () => {
    await delay();
    return {
      items: [
        {
          id: 'dl-1',
          title: 'פאודה - עונה 4',
          title_en: 'Fauda - Season 4',
          subtitle: 'פרק 1',
          subtitle_en: 'Episode 1',
          type: 'episode',
          thumbnail: 'https://picsum.photos/seed/fauda/400/225',
          size: '1.2 GB',
          status: 'completed',
          progress: 100,
          downloaded_at: new Date().toISOString(),
        },
        {
          id: 'dl-2',
          title: 'שטיסל - עונה 3',
          title_en: 'Shtisel - Season 3',
          subtitle: 'פרק 5',
          subtitle_en: 'Episode 5',
          type: 'episode',
          thumbnail: 'https://picsum.photos/seed/shtisel/400/225',
          size: '980 MB',
          status: 'completed',
          progress: 100,
          downloaded_at: new Date().toISOString(),
        },
        {
          id: 'dl-3',
          title: 'הבורר',
          title_en: 'The Arbitrator',
          type: 'movie',
          thumbnail: 'https://picsum.photos/seed/borer/400/225',
          size: '2.4 GB',
          status: 'downloading',
          progress: 67,
        },
        {
          id: 'dl-4',
          title: 'עכשיו בישראל - פודקאסט',
          title_en: 'Now in Israel - Podcast',
          subtitle: 'פרק 42',
          subtitle_en: 'Episode 42',
          type: 'podcast',
          thumbnail: 'https://picsum.photos/seed/podcast1/400/225',
          size: '45 MB',
          status: 'completed',
          progress: 100,
          downloaded_at: new Date().toISOString(),
        },
      ],
    };
  },
  startDownload: async (contentId, contentType, quality = 'hd') => {
    await delay();
    return {
      id: 'dl-' + Date.now(),
      content_id: contentId,
      content_type: contentType,
      quality,
      status: 'downloading',
      progress: 0,
    };
  },
  deleteDownload: async (downloadId) => {
    await delay();
    return { message: 'Download deleted' };
  },
  pauseDownload: async (downloadId) => {
    await delay();
    return { message: 'Download paused' };
  },
  resumeDownload: async (downloadId) => {
    await delay();
    return { message: 'Download resumed' };
  },
  getDownloadProgress: async (downloadId) => {
    await delay();
    return { progress: Math.floor(Math.random() * 100) };
  },
};

// ===========================================
// JUDAISM SERVICE (Demo)
// ===========================================
export const demoJudaismService = {
  getContent: async (category, limit) => {
    await delay();
    let content = demoJudaismContent;
    if (category && category !== 'all') {
      content = content.filter(item => item.category === category);
    }
    if (limit) {
      content = content.slice(0, limit);
    }
    return { data: content };
  },
  getCategories: async () => {
    await delay();
    return { data: demoJudaismCategories };
  },
  getLiveShiurim: async () => {
    await delay();
    return { data: [] };
  },
  getDailyContent: async () => {
    await delay();
    return { data: demoJudaismContent.slice(0, 3) };
  },
};

// ===========================================
// CHILDREN SERVICE (Demo)
// ===========================================
export const demoChildrenService = {
  getContent: async (category, maxAge) => {
    await delay();
    let content = demoChildrenContent;
    if (category && category !== 'all') {
      content = content.filter(item => item.category === category);
    }
    if (maxAge) {
      content = content.filter(item => !item.age_rating || item.age_rating <= maxAge);
    }
    return { data: content };
  },
  getCategories: async () => {
    await delay();
    return { data: demoChildrenCategories };
  },
  toggleParentalControls: async (enabled) => {
    await delay();
    return { message: 'Parental controls updated' };
  },
  verifyPin: async (pin) => {
    await delay();
    if (pin === '1234') {
      return { verified: true };
    }
    throw new Error('Invalid PIN');
  },
  setPin: async (pin) => {
    await delay();
    return { message: 'PIN set successfully' };
  },
  getSettings: async () => {
    await delay();
    return { data: { parental_controls: true, max_age: 12 } };
  },
  updateSettings: async (settings) => {
    await delay();
    return { message: 'Settings updated', data: settings };
  },
};

// ===========================================
// FLOWS SERVICE (Demo)
// ===========================================
let flowsState = [...demoFlows];

export const demoFlowsService = {
  getFlows: async () => {
    await delay();
    return { data: flowsState };
  },
  getActiveFlow: async () => {
    await delay();
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Find active flow based on current time
    const activeFlow = flowsState.find(flow => {
      if (!flow.is_active) return false;
      const trigger = flow.triggers[0];
      if (!trigger) return false;

      if (trigger.type === 'time' && trigger.start_time && trigger.end_time) {
        const startHour = parseInt(trigger.start_time.split(':')[0]);
        const endHour = parseInt(trigger.end_time.split(':')[0]);
        const days = trigger.days || [0, 1, 2, 3, 4, 5, 6];
        return currentHour >= startHour && currentHour < endHour && days.includes(currentDay);
      }
      return false;
    });

    return {
      data: {
        should_show: !!activeFlow,
        active_flow: activeFlow || null,
      }
    };
  },
  getFlow: async (flowId) => {
    await delay();
    const flow = flowsState.find(f => f.id === flowId);
    return { data: flow || null };
  },
  getFlowContent: async (flowId) => {
    await delay();
    const flow = flowsState.find(f => f.id === flowId);
    if (!flow) return { data: { content: [], ai_brief: null } };

    // Generate sample content
    const content = flow.items.map((item, index) => ({
      id: item.content_id,
      title: item.title,
      thumbnail: `https://picsum.photos/seed/${item.content_id}/400/225`,
      type: item.content_type,
      duration: '30:00',
      order: item.order,
    }));

    const aiBrief = flow.ai_enabled
      ? 'בוקר טוב! היום מזג האוויר נעים, יש כמה חדשות חשובות מישראל, ובחרתי לך תוכן שיתאים לך במיוחד.'
      : null;

    return { data: { content, ai_brief: aiBrief } };
  },
  createFlow: async (flowData) => {
    await delay();
    const newFlow = {
      id: `flow-custom-${Date.now()}`,
      ...flowData,
      flow_type: 'custom',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    flowsState.push(newFlow);
    return { data: newFlow };
  },
  updateFlow: async (flowId, flowData) => {
    await delay();
    const index = flowsState.findIndex(f => f.id === flowId);
    if (index === -1) throw new Error('Flow not found');
    flowsState[index] = { ...flowsState[index], ...flowData };
    return { data: flowsState[index] };
  },
  deleteFlow: async (flowId) => {
    await delay();
    flowsState = flowsState.filter(f => f.id !== flowId);
    return { message: 'Flow deleted' };
  },
  addFlowItem: async (flowId, item) => {
    await delay();
    const flow = flowsState.find(f => f.id === flowId);
    if (!flow) throw new Error('Flow not found');
    flow.items.push({ ...item, order: flow.items.length });
    return { data: flow };
  },
  removeFlowItem: async (flowId, itemIndex) => {
    await delay();
    const flow = flowsState.find(f => f.id === flowId);
    if (!flow) throw new Error('Flow not found');
    flow.items.splice(itemIndex, 1);
    return { data: flow };
  },
  skipFlowToday: async (flowId) => {
    await delay();
    return { message: 'Flow skipped for today' };
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
  downloads: demoDownloadsService,
  judaism: demoJudaismService,
  children: demoChildrenService,
  flows: demoFlowsService,
};
