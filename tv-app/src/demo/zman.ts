/**
 * DEMO-ONLY: Demo Israel time and Shabbat data for testing Jewish calendar features.
 * Not used in production.
 */

const now = new Date();
const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
const localTime = now;

export const demoZmanData = {
  time: {
    israel: {
      time: israelTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      datetime: israelTime.toISOString(),
      day: israelTime.toLocaleDateString('he-IL', { weekday: 'long' }),
    },
    local: {
      time: localTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      datetime: localTime.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
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
    hebrew_date: 'כ"ה בטבת תשפ"ה',
  },
  shabbat: {
    is_shabbat: false,
    is_erev_shabbat: israelTime.getDay() === 5,
    candle_lighting: '16:45',
    havdalah: '17:50',
    parasha: 'וארא',
    next_shabbat: '2025-01-17',
    countdown_hours: 48,
  },
  shabbat_content: [
    { id: 'shabbat-1', title: 'שירי שבת', type: 'music' },
    { id: 'shabbat-2', title: 'דרשות', type: 'podcast' },
    { id: 'shabbat-3', title: 'סרטים משפחתיים', type: 'movie' },
  ],
};
