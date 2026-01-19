/**
 * Specialty Services - Zman, Trending, Ritual, Judaism, Flows API endpoints
 */

import { api } from './client';

// Zman Yisrael Service (API)
export const apiZmanService = {
  getTime: (timezone?: string) => api.get('/zman/time', { params: { timezone } }),
  getShabbatTimes: (latitude?: number, longitude?: number) =>
    api.get('/zman/shabbat', { params: { latitude, longitude } }),
  getShabbatContent: () => api.get('/zman/shabbat-content'),
  updatePreferences: (prefs: {
    show_israel_time?: boolean;
    shabbat_mode_enabled?: boolean;
    local_timezone?: string;
  }) => api.post('/zman/preferences', prefs),
  getTimezones: () => api.get('/zman/timezones'),
};

// Trending Service (API)
export const apiTrendingService = {
  getTopics: () => api.get('/trending/topics', { timeout: 20000 }),
  getHeadlines: (source?: string, limit: number = 20) =>
    api.get('/trending/headlines', { params: { source, limit }, timeout: 20000 }),
  getRecommendations: (limit: number = 10) =>
    api.get('/trending/recommendations', { params: { limit }, timeout: 20000 }),
  getSummary: () => api.get('/trending/summary', { timeout: 20000 }),
  getByCategory: (category: string) => api.get(`/trending/category/${category}`, { timeout: 20000 }),
};

// Morning Ritual Service (API)
export const apiRitualService = {
  check: () => api.get('/ritual/check'),
  shouldShow: () => api.get('/ritual/should-show'),
  getContent: () => api.get('/ritual/content'),
  getAIBrief: () => api.get('/ritual/ai-brief'),
  getIsraelNow: () => api.get('/ritual/israel-now'),
  getPreferences: () => api.get('/ritual/preferences'),
  updatePreferences: (prefs: Record<string, any>) => api.post('/ritual/preferences', prefs),
  skipToday: () => api.post('/ritual/skip-today'),
};

// Judaism Service (API)
export const apiJudaismService = {
  // Content
  getContent: (category?: string, page?: number, limit?: number) =>
    api.get('/judaism/content', { params: { category, page, limit } }),
  getCategories: () => api.get('/judaism/categories'),
  getFeatured: () => api.get('/judaism/featured'),
  getLiveShiurim: () => api.get('/judaism/live'),
  getDailyShiur: () => api.get('/judaism/daily'),
  getShabbatFeatured: () => api.get('/judaism/shabbat/featured'),
  getShabbatStatus: (city?: string, state?: string) =>
    api.get('/judaism/shabbat/status', { params: { city, state } }),

  // News
  getNews: (category?: string, source?: string, page?: number, limit?: number) =>
    api.get('/judaism/news', { params: { category, source, page, limit } }),
  getNewsSources: () => api.get('/judaism/news/sources'),

  // Calendar
  getCalendarToday: () => api.get('/judaism/calendar/today'),
  getShabbatTimes: (city?: string, state?: string, geonameId?: number) =>
    api.get('/judaism/calendar/shabbat', { params: { city, state, geoname_id: geonameId } }),
  getDafYomi: () => api.get('/judaism/calendar/daf-yomi'),
  getUpcomingHolidays: (days?: number) =>
    api.get('/judaism/calendar/holidays', { params: { days } }),
  getAvailableCities: () => api.get('/judaism/calendar/cities'),

  // Community
  getRegions: () => api.get('/judaism/community/regions'),
  getSynagogues: (region?: string, denomination?: string, page?: number, limit?: number) =>
    api.get('/judaism/community/synagogues', { params: { region, denomination, page, limit } }),
  getKosherRestaurants: (region?: string, city?: string, state?: string, page?: number, limit?: number) =>
    api.get('/judaism/community/kosher', { params: { region, city, state, page, limit } }),
  getJCCs: (region?: string, page?: number, limit?: number) =>
    api.get('/judaism/community/jcc', { params: { region, page, limit } }),
  getMikvaot: (region?: string, page?: number, limit?: number) =>
    api.get('/judaism/community/mikvaot', { params: { region, page, limit } }),
  getCommunityEvents: (region?: string, days?: number) =>
    api.get('/judaism/community/events', { params: { region, days } }),

  // Torah Shiurim
  getShiurim: (category?: string, rabbi?: string, page?: number, limit?: number) =>
    api.get('/judaism/shiurim', { params: { category, rabbi, page, limit } }),
  getLiveTorahClasses: () => api.get('/judaism/shiurim/live'),
  getDailyShiurRecommendation: () => api.get('/judaism/shiurim/daily'),

  // Admin
  seedContent: () => api.post('/judaism/admin/content/seed'),
  clearContent: () => api.delete('/judaism/admin/content/clear'),
};

// Flows Service (API)
export const apiFlowsService = {
  getFlows: () => api.get('/flows'),
  getActiveFlow: () => api.get('/flows/active'),
  getFlow: (flowId: string) => api.get(`/flows/${flowId}`),
  createFlow: (data: {
    name: string;
    name_en?: string;
    name_es?: string;
    description?: string;
    icon?: string;
    items?: Array<{
      content_id: string;
      content_type: string;
      title: string;
      thumbnail?: string;
      duration_hint?: number;
      order: number;
    }>;
    triggers?: Array<{
      type: string;
      start_time?: string;
      end_time?: string;
      days?: number[];
      skip_shabbat?: boolean;
    }>;
    auto_play?: boolean;
    ai_enabled?: boolean;
    ai_brief_enabled?: boolean;
  }) => api.post('/flows', data),
  updateFlow: (flowId: string, data: {
    name?: string;
    name_en?: string;
    name_es?: string;
    description?: string;
    icon?: string;
    is_active?: boolean;
    items?: Array<any>;
    triggers?: Array<any>;
    auto_play?: boolean;
    ai_enabled?: boolean;
    ai_brief_enabled?: boolean;
  }) => api.put(`/flows/${flowId}`, data),
  deleteFlow: (flowId: string) => api.delete(`/flows/${flowId}`),
  addFlowItem: (flowId: string, item: {
    content_id: string;
    content_type: string;
    title: string;
    thumbnail?: string;
    duration_hint?: number;
  }) => api.post(`/flows/${flowId}/items`, item),
  removeFlowItem: (flowId: string, itemIndex: number) =>
    api.delete(`/flows/${flowId}/items/${itemIndex}`),
  skipFlowToday: (flowId: string) => api.post(`/flows/${flowId}/skip-today`),
  getFlowContent: (flowId: string) => api.get(`/flows/${flowId}/content`),
};
