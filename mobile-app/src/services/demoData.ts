/**
 * Demo Data Service for Mobile App
 * Provides mock data for development and demo mode
 */

import { ContentItem, Channel, RadioStation, Podcast } from './api';

// Featured content for hero carousel
export interface FeaturedItem extends ContentItem {
  backdrop?: string;
  featured_type?: 'hero' | 'spotlight' | 'pick';
  seasons?: number;
  episodes?: number;
}

export const demoMovies: FeaturedItem[] = [
  {
    id: 'movie-1',
    title: 'וואלס עם באשיר',
    type: 'movie',
    description: 'סרט אנימציה דוקומנטרי על מלחמת לבנון הראשונה. עריכה וביום של אוסקר.',
    year: '2008',
    duration: '1:30:00',
    rating: 8.0,
    category: 'דוקומנטרי',
    poster: 'https://picsum.photos/400/600?random=101',
    backdrop: 'https://picsum.photos/1280/720?random=201',
  },
  {
    id: 'movie-2',
    title: 'לבנון',
    type: 'movie',
    description: 'דרמת מלחמה מתוך טנק בזמן מלחמת לבנון. זוכה אריה הזהב בפסטיבל ונציה.',
    year: '2009',
    duration: '1:33:00',
    rating: 7.1,
    category: 'דרמה',
    poster: 'https://picsum.photos/400/600?random=102',
    backdrop: 'https://picsum.photos/1280/720?random=202',
  },
  {
    id: 'movie-3',
    title: 'פוקסטרוט',
    type: 'movie',
    description: 'דרמה על משפחה ישראלית מתמודדת עם אובדן. זוכה אריה הכסף בפסטיבל ונציה.',
    year: '2017',
    duration: '1:53:00',
    rating: 7.6,
    category: 'דרמה',
    poster: 'https://picsum.photos/400/600?random=103',
    backdrop: 'https://picsum.photos/1280/720?random=203',
  },
];

export const demoSeries: FeaturedItem[] = [
  {
    id: 'series-1',
    title: 'פאודה',
    type: 'series',
    description: 'סדרת מתח על יחידה מסתערבים. הסדרה הישראלית הפופולרית בעולם.',
    year: '2015',
    duration: '45 דקות',
    rating: 8.3,
    category: 'אקשן',
    poster: 'https://picsum.photos/400/600?random=111',
    backdrop: 'https://picsum.photos/1280/720?random=211',
    seasons: 4,
    episodes: 48,
  },
  {
    id: 'series-2',
    title: 'שטיסל',
    type: 'series',
    description: 'דרמה על משפחה חרדית בירושלים. סדרה מרגשת על משפחה, אהבה ואמונה.',
    year: '2013',
    duration: '45 דקות',
    rating: 8.6,
    category: 'דרמה',
    poster: 'https://picsum.photos/400/600?random=112',
    backdrop: 'https://picsum.photos/1280/720?random=212',
    seasons: 3,
    episodes: 33,
  },
  {
    id: 'series-3',
    title: 'טהרן',
    type: 'series',
    description: 'סדרת ריגול על סוכנת מוסד באיראן. מועמדת לפרס גולדן גלוב.',
    year: '2020',
    duration: '50 דקות',
    rating: 7.9,
    category: 'מתח',
    poster: 'https://picsum.photos/400/600?random=113',
    backdrop: 'https://picsum.photos/1280/720?random=213',
    seasons: 2,
    episodes: 16,
  },
];

// Featured content combining movies and series
export const demoFeatured = {
  items: [
    { ...demoSeries[0], featured_type: 'hero' as const },
    { ...demoMovies[0], featured_type: 'hero' as const },
    { ...demoSeries[1], featured_type: 'spotlight' as const },
    { ...demoSeries[2], featured_type: 'spotlight' as const },
    { ...demoMovies[1], featured_type: 'pick' as const },
    { ...demoMovies[2], featured_type: 'pick' as const },
  ],
  hero: [demoSeries[0], demoMovies[0], demoSeries[1]],
  spotlight: [demoSeries[1], demoSeries[2]],
  picks: [demoMovies[0], demoMovies[2]],
};

// Demo channels for Live TV
export const demoChannels: Channel[] = [
  {
    id: 'ch-1',
    name: 'כאן 11',
    number: '11',
    logo: 'https://upload.wikimedia.org/wikipedia/he/thumb/7/7b/Kan_11_2017.svg/200px-Kan_11_2017.svg.png',
    category: 'News',
    currentShow: 'חדשות הערב',
    isLive: true,
  },
  {
    id: 'ch-2',
    name: 'קשת 12',
    number: '12',
    logo: 'https://upload.wikimedia.org/wikipedia/he/thumb/e/ea/Keshet_12_logo.svg/200px-Keshet_12_logo.svg.png',
    category: 'Entertainment',
    currentShow: 'הישרדות VIP',
    isLive: true,
  },
  {
    id: 'ch-3',
    name: 'רשת 13',
    number: '13',
    logo: 'https://upload.wikimedia.org/wikipedia/he/thumb/0/0f/Reshet_13_Logo.svg/200px-Reshet_13_Logo.svg.png',
    category: 'News',
    currentShow: 'אולפן שישי',
    isLive: true,
  },
];

// Export demo data service
export const demoDataService = {
  getFeatured: () => Promise.resolve(demoFeatured),
  getChannels: () => Promise.resolve({ channels: demoChannels }),
  getMovies: () => Promise.resolve({ items: demoMovies }),
  getSeries: () => Promise.resolve({ items: demoSeries }),
};
