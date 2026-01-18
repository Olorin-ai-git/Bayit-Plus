/**
 * DEMO-ONLY: Demo watch history and engagement data for testing personalization features.
 * Not used in production.
 */

import { demoMovies } from './movies';
import { demoSeries } from './series';

export const demoContinueWatching = [
  {
    id: 'series-1',
    title: 'פאודה',
    title_en: 'Fauda',
    title_es: 'Fauda',
    thumbnail: 'https://picsum.photos/400/225?random=601',
    progress: 0.65,
    remaining: '18:30',
    episode: 'עונה 4 פרק 5',
    episode_en: 'Season 4 Episode 5',
    episode_es: 'Temporada 4 Episodio 5',
    type: 'series',
  },
  {
    id: 'series-4',
    title: 'הבורר',
    title_en: 'The Arbitrator',
    title_es: 'El Árbitro',
    thumbnail: 'https://picsum.photos/400/225?random=602',
    progress: 0.3,
    remaining: '21:00',
    episode: 'עונה 2 פרק 8',
    episode_en: 'Season 2 Episode 8',
    episode_es: 'Temporada 2 Episodio 8',
    type: 'series',
  },
  {
    id: 'movie-3',
    title: 'פוקסטרוט',
    title_en: 'Foxtrot',
    title_es: 'Foxtrot',
    thumbnail: 'https://picsum.photos/400/225?random=603',
    progress: 0.45,
    remaining: '62:00',
    type: 'movie',
  },
];

export const demoCategories = [
  {
    id: 'israeli-movies',
    name: 'סרטים ישראליים',
    name_en: 'Israeli Movies',
    name_es: 'Películas Israelíes',
    items: demoMovies,
  },
  {
    id: 'israeli-series',
    name: 'סדרות ישראליות',
    name_en: 'Israeli Series',
    name_es: 'Series Israelíes',
    items: demoSeries,
  },
  {
    id: 'action',
    name: 'אקשן ומתח',
    name_en: 'Action & Thriller',
    name_es: 'Acción y Suspenso',
    items: [...demoSeries.filter(s => s.genre === 'action' || s.genre === 'thriller')],
  },
  {
    id: 'comedy',
    name: 'קומדיה',
    name_en: 'Comedy',
    name_es: 'Comedia',
    items: [...demoSeries.filter(s => s.genre === 'comedy'), ...demoMovies.filter(m => m.genre === 'comedy')],
  },
  {
    id: 'drama',
    name: 'דרמה',
    name_en: 'Drama',
    name_es: 'Drama',
    items: [...demoMovies.filter(m => m.genre === 'drama')],
  },
];

export const demoFeatured = {
  items: [
    { ...demoSeries[0], featured_type: 'hero' },
    { ...demoSeries[1], featured_type: 'spotlight' },
    { ...demoSeries[2], featured_type: 'spotlight' },
    { ...demoMovies[0], featured_type: 'pick' },
    { ...demoMovies[2], featured_type: 'pick' },
  ],
  hero: demoSeries[0],
  spotlight: [demoSeries[1], demoSeries[2]],
  picks: [demoMovies[0], demoMovies[2]],
};

export const demoWatchParties = [
  {
    id: 'party-1',
    room_code: 'FAUDA1',
    content_id: 'series-1',
    content_title: 'פאודה',
    host_id: 'demo-user-1',
    host_name: 'משתמש דמו',
    participants: [
      { id: 'user-2', name: 'דני', avatar: null },
      { id: 'user-3', name: 'שרה', avatar: null },
    ],
    is_active: true,
    audio_enabled: true,
    chat_enabled: true,
    created_at: new Date().toISOString(),
  },
];
