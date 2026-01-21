/**
 * DEMO-ONLY: This file may include mocks/stubs/hardcoded demo values. Not used in production.
 * Contains demo favorites data for development and testing purposes.
 */

export interface FavoriteItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'channel' | 'podcast' | 'radio';
  addedAt?: string;
}

export const demoFavorites: FavoriteItem[] = [
  {
    id: 'fav-1',
    title: 'פאודה',
    title_en: 'Fauda',
    title_es: 'Fauda',
    subtitle: 'סדרה דרמטית',
    subtitle_en: 'Drama Series',
    subtitle_es: 'Serie Dramatica',
    thumbnail: 'https://picsum.photos/seed/fauda/400/225',
    type: 'series',
    addedAt: '2024-01-15',
  },
  {
    id: 'fav-2',
    title: 'שטיסל',
    title_en: 'Shtisel',
    title_es: 'Shtisel',
    subtitle: 'סדרה דרמטית',
    subtitle_en: 'Drama Series',
    subtitle_es: 'Serie Dramatica',
    thumbnail: 'https://picsum.photos/seed/shtisel/400/225',
    type: 'series',
    addedAt: '2024-01-10',
  },
  {
    id: 'fav-3',
    title: 'כאן 11',
    title_en: 'Kan 11',
    title_es: 'Kan 11',
    subtitle: 'ערוץ חדשות',
    subtitle_en: 'News Channel',
    subtitle_es: 'Canal de Noticias',
    thumbnail: 'https://picsum.photos/seed/kan11/400/225',
    type: 'channel',
    addedAt: '2024-01-08',
  },
  {
    id: 'fav-4',
    title: 'גלגלצ',
    title_en: 'Galgalatz',
    title_es: 'Galgalatz',
    subtitle: 'תחנת רדיו',
    subtitle_en: 'Radio Station',
    subtitle_es: 'Estacion de Radio',
    thumbnail: 'https://picsum.photos/seed/galgalatz/400/225',
    type: 'radio',
    addedAt: '2024-01-05',
  },
  {
    id: 'fav-5',
    title: 'עושים היסטוריה',
    title_en: 'Making History',
    title_es: 'Haciendo Historia',
    subtitle: 'פודקאסט היסטוריה',
    subtitle_en: 'History Podcast',
    subtitle_es: 'Podcast de Historia',
    thumbnail: 'https://picsum.photos/seed/history/400/225',
    type: 'podcast',
    addedAt: '2024-01-03',
  },
  {
    id: 'fav-6',
    title: 'חטופים',
    title_en: 'Hostages',
    title_es: 'Rehenes',
    subtitle: 'סרט מותחן',
    subtitle_en: 'Thriller Movie',
    subtitle_es: 'Pelicula de Suspenso',
    thumbnail: 'https://picsum.photos/seed/hostages/400/225',
    type: 'movie',
    addedAt: '2024-01-01',
  },
];
