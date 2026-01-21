/**
 * DEMO-ONLY: Demo user data for testing authentication and preferences.
 * Not used in production.
 */

import { DemoUser } from './types';

export const demoUser: DemoUser = {
  id: 'demo-user-1',
  email: 'demo@bayit.tv',
  name: 'משתמש דמו',
  profile_image: null,
  subscription: {
    plan: 'premium',
    status: 'active',
    expires_at: '2025-12-31T23:59:59Z',
  },
  preferences: {
    language: 'he',
    subtitles_enabled: true,
    nikud_enabled: true,
    tap_translate_enabled: true,
    show_israel_time: true,
    shabbat_mode_enabled: true,
    local_timezone: 'America/New_York',
    morning_ritual_enabled: true,
    morning_ritual_start: 7,
    morning_ritual_end: 9,
    morning_ritual_content: ['news', 'radio'],
    layout_tv: 'cinematic',
  },
  created_at: '2024-01-15T10:30:00Z',
};
