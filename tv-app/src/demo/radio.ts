/**
 * DEMO-ONLY: Demo radio station data for testing audio streaming features.
 * Not used in production.
 */

import { RadioStation } from './types';

export const demoRadioStations: RadioStation[] = [
  {
    id: 'glglz',
    name: 'גלגלצ',
    logo: 'https://picsum.photos/200/200?random=401',
    stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
    genre: 'pop',
    description: 'תחנת הפופ הישראלית',
    current_show: 'תוכנית הבוקר',
  },
  {
    id: 'reshetbet',
    name: 'רשת ב',
    logo: 'https://picsum.photos/200/200?random=402',
    stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
    genre: 'news',
    description: 'חדשות ואקטואליה',
    current_show: 'מהדורת החדשות',
  },
  {
    id: '88fm',
    name: '88FM',
    logo: 'https://picsum.photos/200/200?random=403',
    stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
    genre: 'rock',
    description: 'רוק ישראלי ובינלאומי',
    current_show: 'רוק על הבוקר',
  },
  {
    id: 'eco99',
    name: 'אקו 99',
    logo: 'https://picsum.photos/200/200?random=404',
    stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
    genre: 'hits',
    description: 'הלהיטים הכי גדולים',
    current_show: 'צהריי אקו',
  },
  {
    id: 'kan_gimel',
    name: 'כאן גימל',
    logo: 'https://picsum.photos/200/200?random=405',
    stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
    genre: 'israeli',
    description: 'מוזיקה ישראלית',
    current_show: 'שירים מהלב',
  },
  {
    id: 'kol_hamusica',
    name: 'קול המוסיקה',
    logo: 'https://picsum.photos/200/200?random=406',
    stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
    genre: 'classical',
    description: 'קלאסית ואופרה',
    current_show: 'בוקר קלאסי',
  },
];
