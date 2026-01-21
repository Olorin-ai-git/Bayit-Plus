/**
 * DEMO-ONLY: Demo time/Shabbat service.
 * Not used in production.
 */

import { demoZmanData } from '../../demo';
import { delay } from './delay';

export const demoZmanService = {
  getTime: async (timezone?: string) => {
    await delay();
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
