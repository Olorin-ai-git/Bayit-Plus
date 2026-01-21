/**
 * DEMO-ONLY: Demo morning ritual service.
 * Not used in production.
 */

import { demoMorningRitual } from '../../demo';
import { delay } from './delay';

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
