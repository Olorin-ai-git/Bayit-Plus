/**
 * Types and constants for JudaismScreen and its components.
 */

export interface JudaismItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  category: string;
  duration?: string;
  rabbi?: string;
  rabbi_en?: string;
  rabbi_es?: string;
}

export interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  icon?: string;
}

export interface NewsItem {
  id: string;
  source_name: string;
  title: string;
  title_he?: string;
  link: string;
  published_at: string;
  summary?: string;
  category: string;
}

export interface CalendarData {
  gregorian_date: string;
  hebrew_date: string;
  hebrew_date_full: string;
  day_of_week: string;
  day_of_week_he: string;
  is_shabbat: boolean;
  is_holiday: boolean;
  parasha?: string;
  parasha_he?: string;
  holidays: Array<{ title: string; title_he?: string; category: string }>;
}

export interface ShabbatStatus {
  status: 'regular' | 'erev_shabbat' | 'shabbat';
  is_erev_shabbat: boolean;
  is_shabbat: boolean;
  candle_lighting: string;
  havdalah: string;
  parasha: string;
  parasha_he: string;
}

export const CATEGORY_ICONS: Record<string, string> = {
  all: '✡️',
  news: '📰',
  calendar: '📅',
  community: '🏛️',
  shiurim: '📖',
  tefila: '🕯️',
  music: '🎵',
  holidays: '🕎',
  documentaries: '🎬',
};
