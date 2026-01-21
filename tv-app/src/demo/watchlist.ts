/**
 * DEMO-ONLY: This file may include mocks/stubs/hardcoded demo values. Not used in production.
 * Contains demo watchlist data for development and testing purposes.
 */

export interface WatchlistItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series';
  year?: string;
  duration?: string;
  addedAt?: string;
  progress?: number; // 0-100 for continue watching
}

export const demoWatchlist: WatchlistItem[] = [
  {
    id: 'wl-1',
    title: 'פאודה עונה 4',
    title_en: 'Fauda Season 4',
    title_es: 'Fauda Temporada 4',
    subtitle: 'הסדרה הישראלית המצליחה',
    subtitle_en: 'The hit Israeli series',
    subtitle_es: 'La exitosa serie israeli',
    thumbnail: 'https://picsum.photos/seed/fauda4/400/225',
    type: 'series',
    year: '2024',
    addedAt: '2024-01-15',
    progress: 45,
  },
  {
    id: 'wl-2',
    title: 'טהרן עונה 3',
    title_en: 'Tehran Season 3',
    title_es: 'Teheran Temporada 3',
    subtitle: 'מותחן ריגול',
    subtitle_en: 'Spy thriller',
    subtitle_es: 'Thriller de espionaje',
    thumbnail: 'https://picsum.photos/seed/tehran3/400/225',
    type: 'series',
    year: '2024',
    addedAt: '2024-01-12',
  },
  {
    id: 'wl-3',
    title: 'גט',
    title_en: 'Gett: The Trial of Viviane Amsalem',
    title_es: 'Gett: El divorcio de Viviane Amsalem',
    subtitle: 'דרמה משפטית',
    subtitle_en: 'Legal drama',
    subtitle_es: 'Drama legal',
    thumbnail: 'https://picsum.photos/seed/gett/400/225',
    type: 'movie',
    year: '2014',
    duration: '1h 55m',
    addedAt: '2024-01-10',
  },
  {
    id: 'wl-4',
    title: 'שבעה ימים טובים',
    title_en: 'Seven Blessed Days',
    title_es: 'Siete Dias Bendecidos',
    subtitle: 'קומדיה ישראלית',
    subtitle_en: 'Israeli comedy',
    subtitle_es: 'Comedia israeli',
    thumbnail: 'https://picsum.photos/seed/shiva/400/225',
    type: 'movie',
    year: '2023',
    duration: '1h 42m',
    addedAt: '2024-01-08',
    progress: 78,
  },
  {
    id: 'wl-5',
    title: 'בית הספר של שבתאי',
    title_en: "Shabbtai's School",
    title_es: 'La Escuela de Shabbtai',
    subtitle: 'סדרת דרמה',
    subtitle_en: 'Drama series',
    subtitle_es: 'Serie de drama',
    thumbnail: 'https://picsum.photos/seed/shabbtai/400/225',
    type: 'series',
    year: '2023',
    addedAt: '2024-01-05',
  },
  {
    id: 'wl-6',
    title: 'נערות פורנו',
    title_en: 'Checkout Girls',
    title_es: 'Chicas de Caja',
    subtitle: 'סדרה קומית',
    subtitle_en: 'Comedy series',
    subtitle_es: 'Serie de comedia',
    thumbnail: 'https://picsum.photos/seed/checkout/400/225',
    type: 'series',
    year: '2022',
    addedAt: '2024-01-03',
  },
];
