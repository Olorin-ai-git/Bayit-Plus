/**
 * Comprehensive Demo Data for Bayit+ TV App
 * All mock data for demo mode - fully demonstrates all features
 */

// =====================================
// TYPES
// =====================================
export interface DemoUser {
  id: string;
  email: string;
  name: string;
  profile_image: string | null;
  subscription: {
    plan: string;
    status: string;
    expires_at: string;
  };
  preferences: {
    language: string;
    subtitles_enabled: boolean;
    nikud_enabled: boolean;
    tap_translate_enabled: boolean;
    show_israel_time: boolean;
    shabbat_mode_enabled: boolean;
    local_timezone: string;
    morning_ritual_enabled: boolean;
    morning_ritual_start: number;
    morning_ritual_end: number;
    morning_ritual_content: string[];
    layout_tv: string;
  };
  created_at: string;
}

export interface ContentItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description: string;
  description_en?: string;
  description_es?: string;
  type: string;
  genre: string;
  year: number;
  duration: number;
  rating: string;
  thumbnail: string;
  backdrop?: string;
  stream_url: string;
  seasons?: number;
  episodes?: number;
}

export interface LiveChannel {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  logo: string;
  stream_url: string;
  category: string;
  epg_id: string;
  current_program?: string;
  current_program_en?: string;
  current_program_es?: string;
  is_hd: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  logo: string;
  stream_url: string;
  genre: string;
  description: string;
  current_show?: string;
}

export interface Podcast {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  host: string;
  host_en?: string;
  host_es?: string;
  description: string;
  description_en?: string;
  description_es?: string;
  thumbnail: string;
  category: string;
  episodes: PodcastEpisode[];
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  duration: number;
  published_at: string;
  audio_url: string;
}

export interface TrendingTopic {
  id: string;
  title: string;
  title_en?: string;
  source: string;
  category: string;
  sentiment: string;
  trend_score: number;
  related_content: string[];
  summary: string;
  summary_en?: string;
}

// =====================================
// DEMO USER
// =====================================
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

// =====================================
// MOVIES
// =====================================
export const demoMovies: ContentItem[] = [
  {
    id: 'movie-1',
    title: 'וואלס עם באשיר',
    title_en: 'Waltz with Bashir',
    title_es: 'Vals con Bashir',
    description: 'סרט אנימציה דוקומנטרי על מלחמת לבנון הראשונה',
    description_en: 'Animated documentary about the First Lebanon War',
    description_es: 'Documental animado sobre la Primera Guerra del Líbano',
    type: 'movie',
    genre: 'documentary',
    year: 2008,
    duration: 90,
    rating: 'R',
    thumbnail: 'https://picsum.photos/400/600?random=101',
    backdrop: 'https://picsum.photos/1280/720?random=201',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'movie-2',
    title: 'לבנון',
    title_en: 'Lebanon',
    title_es: 'Líbano',
    description: 'דרמת מלחמה מתוך טנק בזמן מלחמת לבנון',
    description_en: 'War drama from inside a tank during the Lebanon War',
    description_es: 'Drama bélico desde dentro de un tanque durante la Guerra del Líbano',
    type: 'movie',
    genre: 'drama',
    year: 2009,
    duration: 93,
    rating: 'R',
    thumbnail: 'https://picsum.photos/400/600?random=102',
    backdrop: 'https://picsum.photos/1280/720?random=202',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'movie-3',
    title: 'פוקסטרוט',
    title_en: 'Foxtrot',
    title_es: 'Foxtrot',
    description: 'דרמה על משפחה ישראלית מתמודדת עם אובדן',
    description_en: 'Drama about an Israeli family coping with loss',
    description_es: 'Drama sobre una familia israelí enfrentando la pérdida',
    type: 'movie',
    genre: 'drama',
    year: 2017,
    duration: 113,
    rating: 'R',
    thumbnail: 'https://picsum.photos/400/600?random=103',
    backdrop: 'https://picsum.photos/1280/720?random=203',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'movie-4',
    title: 'הערת שוליים',
    title_en: 'Footnote',
    title_es: 'Nota al Pie',
    description: 'קומדיה דרמטית על שני חוקרי תלמוד',
    description_en: 'Dramatic comedy about two Talmud scholars',
    description_es: 'Comedia dramática sobre dos eruditos del Talmud',
    type: 'movie',
    genre: 'comedy',
    year: 2011,
    duration: 105,
    rating: 'PG-13',
    thumbnail: 'https://picsum.photos/400/600?random=104',
    backdrop: 'https://picsum.photos/1280/720?random=204',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'movie-5',
    title: 'גט',
    title_en: 'Gett: The Trial of Viviane Amsalem',
    title_es: 'Gett: El Juicio de Viviane Amsalem',
    description: 'דרמה על אישה נלחמת לקבל גט בבית הדין הרבני',
    description_en: 'Drama about a woman fighting for divorce in rabbinical court',
    description_es: 'Drama sobre una mujer luchando por el divorcio en un tribunal rabínico',
    type: 'movie',
    genre: 'drama',
    year: 2014,
    duration: 115,
    rating: 'PG-13',
    thumbnail: 'https://picsum.photos/400/600?random=105',
    backdrop: 'https://picsum.photos/1280/720?random=205',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
];

// =====================================
// SERIES
// =====================================
export const demoSeries: ContentItem[] = [
  {
    id: 'series-1',
    title: 'פאודה',
    title_en: 'Fauda',
    title_es: 'Fauda',
    description: 'סדרת מתח על יחידה מסתערבים',
    description_en: 'Thriller series about an undercover unit',
    description_es: 'Serie de suspenso sobre una unidad encubierta',
    type: 'series',
    genre: 'action',
    year: 2015,
    duration: 45,
    rating: 'TV-MA',
    thumbnail: 'https://picsum.photos/400/600?random=111',
    backdrop: 'https://picsum.photos/1280/720?random=211',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    seasons: 4,
    episodes: 48,
  },
  {
    id: 'series-2',
    title: 'שטיסל',
    title_en: 'Shtisel',
    title_es: 'Shtisel',
    description: 'דרמה על משפחה חרדית בירושלים',
    description_en: 'Drama about an ultra-Orthodox family in Jerusalem',
    description_es: 'Drama sobre una familia ultraortodoxa en Jerusalén',
    type: 'series',
    genre: 'drama',
    year: 2013,
    duration: 45,
    rating: 'TV-14',
    thumbnail: 'https://picsum.photos/400/600?random=112',
    backdrop: 'https://picsum.photos/1280/720?random=212',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    seasons: 3,
    episodes: 33,
  },
  {
    id: 'series-3',
    title: 'טהרן',
    title_en: 'Tehran',
    title_es: 'Teherán',
    description: 'סדרת ריגול על סוכנת מוסד באיראן',
    description_en: 'Spy series about a Mossad agent in Iran',
    description_es: 'Serie de espionaje sobre una agente del Mossad en Irán',
    type: 'series',
    genre: 'thriller',
    year: 2020,
    duration: 50,
    rating: 'TV-MA',
    thumbnail: 'https://picsum.photos/400/600?random=113',
    backdrop: 'https://picsum.photos/1280/720?random=213',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    seasons: 2,
    episodes: 16,
  },
  {
    id: 'series-4',
    title: 'הבורר',
    title_en: 'The Arbitrator',
    title_es: 'El Árbitro',
    description: 'קומדיה על בורר בסכסוכים בשכונה',
    description_en: 'Comedy about a neighborhood dispute arbitrator',
    description_es: 'Comedia sobre un árbitro de disputas vecinales',
    type: 'series',
    genre: 'comedy',
    year: 2010,
    duration: 30,
    rating: 'TV-14',
    thumbnail: 'https://picsum.photos/400/600?random=114',
    backdrop: 'https://picsum.photos/1280/720?random=214',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    seasons: 3,
    episodes: 36,
  },
  {
    id: 'series-5',
    title: 'עבודה ערבית',
    title_en: 'Arab Labor',
    title_es: 'Trabajo Árabe',
    description: 'קומדיה סאטירית על יחסי יהודים-ערבים',
    description_en: 'Satirical comedy about Jewish-Arab relations',
    description_es: 'Comedia satírica sobre las relaciones judeo-árabes',
    type: 'series',
    genre: 'comedy',
    year: 2007,
    duration: 25,
    rating: 'TV-14',
    thumbnail: 'https://picsum.photos/400/600?random=115',
    backdrop: 'https://picsum.photos/1280/720?random=215',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    seasons: 4,
    episodes: 52,
  },
  {
    id: 'series-6',
    title: 'בית לחם',
    title_en: 'Bethlehem',
    description: 'דרמת מתח על יחסי מפעיל ומקור',
    type: 'series',
    genre: 'thriller',
    year: 2013,
    duration: 50,
    rating: 'TV-MA',
    thumbnail: 'https://picsum.photos/400/600?random=116',
    backdrop: 'https://picsum.photos/1280/720?random=216',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    seasons: 1,
    episodes: 10,
  },
];

// =====================================
// LIVE CHANNELS
// =====================================
export const demoChannels: LiveChannel[] = [
  {
    id: 'kan11',
    name: 'כאן 11',
    name_en: 'Kan 11',
    name_es: 'Kan 11',
    logo: 'https://picsum.photos/200/200?random=301',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'general',
    epg_id: 'kan11.il',
    current_program: 'חדשות הבוקר',
    current_program_en: 'Morning News',
    current_program_es: 'Noticias de la Manana',
    is_hd: true,
  },
  {
    id: 'keshet12',
    name: 'קשת 12',
    name_en: 'Keshet 12',
    name_es: 'Keshet 12',
    logo: 'https://picsum.photos/200/200?random=302',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'general',
    epg_id: 'keshet12.il',
    current_program: 'פאודה - פרק 5',
    current_program_en: 'Fauda - Episode 5',
    current_program_es: 'Fauda - Episodio 5',
    is_hd: true,
  },
  {
    id: 'reshet13',
    name: 'רשת 13',
    name_en: 'Reshet 13',
    name_es: 'Reshet 13',
    logo: 'https://picsum.photos/200/200?random=303',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'general',
    epg_id: 'reshet13.il',
    current_program: 'חדשות 13',
    current_program_en: 'News 13',
    current_program_es: 'Noticias 13',
    is_hd: true,
  },
  {
    id: 'channel14',
    name: 'ערוץ 14',
    name_en: 'Channel 14',
    name_es: 'Canal 14',
    logo: 'https://picsum.photos/200/200?random=304',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'news',
    epg_id: 'ch14.il',
    current_program: 'פגוש את העיתונות',
    current_program_en: 'Meet the Press',
    current_program_es: 'Encuentro con la Prensa',
    is_hd: false,
  },
  {
    id: 'sport5',
    name: 'ספורט 5',
    name_en: 'Sport 5',
    name_es: 'Deporte 5',
    logo: 'https://picsum.photos/200/200?random=305',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'sports',
    epg_id: 'sport5.il',
    current_program: 'משחק הליגה',
    current_program_en: 'League Match',
    current_program_es: 'Partido de Liga',
    is_hd: true,
  },
  {
    id: 'yes_drama',
    name: 'yes דרמה',
    name_en: 'Yes Drama',
    name_es: 'Yes Drama',
    logo: 'https://picsum.photos/200/200?random=306',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'entertainment',
    epg_id: 'yesdrama.il',
    current_program: 'שטיסל - עונה 3',
    current_program_en: 'Shtisel - Season 3',
    current_program_es: 'Shtisel - Temporada 3',
    is_hd: true,
  },
];

// =====================================
// RADIO STATIONS
// =====================================
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

// =====================================
// PODCASTS
// =====================================
export const demoPodcastCategories = [
  { id: 'history', name: 'היסטוריה', name_en: 'History', name_es: 'Historia' },
  { id: 'entertainment', name: 'בידור', name_en: 'Entertainment', name_es: 'Entretenimiento' },
  { id: 'business', name: 'עסקים', name_en: 'Business', name_es: 'Negocios' },
  { id: 'news', name: 'חדשות', name_en: 'News', name_es: 'Noticias' },
  { id: 'comedy', name: 'קומדיה', name_en: 'Comedy', name_es: 'Comedia' },
  { id: 'tech', name: 'טכנולוגיה', name_en: 'Technology', name_es: 'Tecnologia' },
];

export const demoPodcasts: Podcast[] = [
  {
    id: 'podcast-1',
    title: 'עושים היסטוריה',
    title_en: 'Making History',
    title_es: 'Haciendo Historia',
    host: 'רן לוי',
    host_en: 'Ran Levi',
    host_es: 'Ran Levi',
    description: 'פודקאסט היסטוריה פופולרי בעברית',
    description_en: 'Popular Hebrew history podcast',
    description_es: 'Podcast de historia popular en hebreo',
    thumbnail: 'https://picsum.photos/400/400?random=501',
    category: 'history',
    episodes: [
      {
        id: 'ep-1-1',
        title: 'מלחמת העולם הראשונה',
        description: 'סיפורה של המלחמה הגדולה',
        duration: 3600,
        published_at: '2024-01-15',
        audio_url: 'https://example.com/podcast.mp3',
      },
      {
        id: 'ep-1-2',
        title: 'המהפכה הצרפתית',
        description: 'איך נפלה המלוכה בצרפת',
        duration: 2700,
        published_at: '2024-01-08',
        audio_url: 'https://example.com/podcast.mp3',
      },
    ],
  },
  {
    id: 'podcast-2',
    title: 'הפודקאסט של דוד והדר',
    title_en: 'David and Hadar Podcast',
    title_es: 'El Podcast de David y Hadar',
    host: 'דוד והדר',
    host_en: 'David and Hadar',
    host_es: 'David y Hadar',
    description: 'שיחות על החיים, הקולנוע והכל',
    description_en: 'Conversations about life, cinema and everything',
    description_es: 'Conversaciones sobre la vida, el cine y todo',
    thumbnail: 'https://picsum.photos/400/400?random=502',
    category: 'entertainment',
    episodes: [
      {
        id: 'ep-2-1',
        title: 'סרטי 2024',
        description: 'סיכום שנת הקולנוע',
        duration: 4200,
        published_at: '2024-01-20',
        audio_url: 'https://example.com/podcast.mp3',
      },
    ],
  },
  {
    id: 'podcast-3',
    title: 'כלכליסט',
    title_en: 'Calcalist',
    title_es: 'Calcalist',
    host: 'אבירם אלעד',
    host_en: 'Aviram Elad',
    host_es: 'Aviram Elad',
    description: 'פודקאסט הכלכלה המוביל',
    description_en: 'The leading economy podcast',
    description_es: 'El podcast de economia lider',
    thumbnail: 'https://picsum.photos/400/400?random=503',
    category: 'business',
    episodes: [
      {
        id: 'ep-3-1',
        title: 'שוק ההייטק 2024',
        description: 'מגמות בהייטק הישראלי',
        duration: 1800,
        published_at: '2024-01-22',
        audio_url: 'https://example.com/podcast.mp3',
      },
    ],
  },
  {
    id: 'podcast-4',
    title: 'סדנא לחדשות',
    title_en: 'News Workshop',
    title_es: 'Taller de Noticias',
    host: 'ירדן בכר',
    host_en: 'Yarden Bachar',
    host_es: 'Yarden Bachar',
    description: 'מאחורי הקלעים של החדשות',
    description_en: 'Behind the scenes of the news',
    description_es: 'Detras de las escenas de las noticias',
    thumbnail: 'https://picsum.photos/400/400?random=504',
    category: 'news',
    episodes: [
      {
        id: 'ep-4-1',
        title: 'שנה של בחירות',
        description: 'מבט מאחורי הקלעים',
        duration: 2400,
        published_at: '2024-01-18',
        audio_url: 'https://example.com/podcast.mp3',
      },
    ],
  },
  {
    id: 'podcast-5',
    title: 'הקצה',
    title_en: 'The Edge',
    title_es: 'El Borde',
    host: 'גיא מרוז',
    host_en: 'Guy Maroz',
    host_es: 'Guy Maroz',
    description: 'פודקאסט קומדיה סטנדאפ',
    description_en: 'Stand-up comedy podcast',
    description_es: 'Podcast de comedia stand-up',
    thumbnail: 'https://picsum.photos/400/400?random=505',
    category: 'comedy',
    episodes: [
      {
        id: 'ep-5-1',
        title: 'סטנדאפ חי',
        description: 'הקלטה מהופעה חיה',
        duration: 3600,
        published_at: '2024-01-25',
        audio_url: 'https://example.com/podcast.mp3',
      },
    ],
  },
  {
    id: 'podcast-6',
    title: 'גיקטיים',
    title_en: 'Geektime',
    title_es: 'Geektime',
    host: 'צוות גיקטיים',
    host_en: 'Geektime Team',
    host_es: 'Equipo Geektime',
    description: 'חדשות הייטק וסטארטאפים',
    description_en: 'Tech and startup news',
    description_es: 'Noticias de tecnologia y startups',
    thumbnail: 'https://picsum.photos/400/400?random=506',
    category: 'tech',
    episodes: [
      {
        id: 'ep-6-1',
        title: 'AI בישראל',
        description: 'המהפכה של הבינה המלאכותית',
        duration: 2700,
        published_at: '2024-01-28',
        audio_url: 'https://example.com/podcast.mp3',
      },
    ],
  },
];

// =====================================
// TRENDING TOPICS
// =====================================
export const demoTrending = {
  topics: [
    {
      id: 'trend-1',
      title: 'בחירות 2025',
      title_en: '2025 Elections',
      source: 'Ynet',
      category: 'politics',
      sentiment: 'neutral',
      trend_score: 95,
      related_content: ['series-4', 'movie-5'],
      summary: 'הבחירות הקרובות מעסיקות את הציבור',
      summary_en: 'The upcoming elections occupy the public',
    },
    {
      id: 'trend-2',
      title: 'מכבי תל אביב',
      title_en: 'Maccabi Tel Aviv',
      source: 'Sport5',
      category: 'sports',
      sentiment: 'positive',
      trend_score: 88,
      related_content: [],
      summary: 'ניצחון דרמטי בליגת אלופות',
      summary_en: 'Dramatic victory in Champions League',
    },
    {
      id: 'trend-3',
      title: 'חדשנות טכנולוגית',
      title_en: 'Tech Innovation',
      source: 'Calcalist',
      category: 'tech',
      sentiment: 'positive',
      trend_score: 75,
      related_content: ['podcast-3'],
      summary: 'סטארט-אפ ישראלי גייס 100 מיליון דולר',
      summary_en: 'Israeli startup raises $100 million',
    },
    {
      id: 'trend-4',
      title: 'מזג האוויר',
      title_en: 'Weather Update',
      source: 'Walla',
      category: 'weather',
      sentiment: 'neutral',
      trend_score: 60,
      related_content: [],
      summary: 'גשמים צפויים בסוף השבוע',
      summary_en: 'Rain expected this weekend',
    },
    {
      id: 'trend-5',
      title: 'תרבות ובידור',
      title_en: 'Culture & Entertainment',
      source: 'Mako',
      category: 'entertainment',
      sentiment: 'positive',
      trend_score: 70,
      related_content: ['series-1', 'series-2'],
      summary: 'פרסי האקדמיה הישראלית הוכרזו',
      summary_en: 'Israeli Academy Awards announced',
    },
  ] as TrendingTopic[],
  overall_mood: 'הציבור הישראלי עסוק בבחירות ובספורט',
  overall_mood_en: 'The Israeli public is focused on elections and sports',
  top_story: 'בחירות 2025 בעיצומן',
  top_story_en: '2025 Elections in full swing',
  last_updated: new Date().toISOString(),
};

// =====================================
// AI CHAPTERS (for content)
// =====================================
export const demoChapters: Record<string, any> = {
  'series-1': {
    content_id: 'series-1',
    chapters: [
      { start_time: 0, end_time: 180, title: 'פתיחה', category: 'intro' },
      { start_time: 180, end_time: 600, title: 'בסיס המסתערבים', category: 'security' },
      { start_time: 600, end_time: 1200, title: 'המשימה', category: 'action' },
      { start_time: 1200, end_time: 1800, title: 'חקירה', category: 'investigation' },
      { start_time: 1800, end_time: 2400, title: 'עימות', category: 'climax' },
      { start_time: 2400, end_time: 2700, title: 'סיום', category: 'conclusion' },
    ],
    generated_at: new Date().toISOString(),
  },
  'movie-1': {
    content_id: 'movie-1',
    chapters: [
      { start_time: 0, end_time: 300, title: 'הפתיחה', category: 'intro' },
      { start_time: 300, end_time: 1200, title: 'זכרונות מטושטשים', category: 'memory' },
      { start_time: 1200, end_time: 2400, title: 'החיפוש', category: 'investigation' },
      { start_time: 2400, end_time: 3600, title: 'ההתעוררות', category: 'revelation' },
      { start_time: 3600, end_time: 5400, title: 'הסיום', category: 'conclusion' },
    ],
    generated_at: new Date().toISOString(),
  },
};

// =====================================
// SUBTITLES
// =====================================
export const demoSubtitles: Record<string, any> = {
  'series-1': {
    content_id: 'series-1',
    language: 'he',
    language_name: 'עברית',
    has_nikud: true,
    cues: [
      {
        index: 1,
        start_time: 0,
        end_time: 3,
        text: 'המשימה מתחילה היום',
        text_nikud: 'הַמְּשִׁימָה מַתְחִילָה הַיּוֹם',
        words: ['המשימה', 'מתחילה', 'היום'],
      },
      {
        index: 2,
        start_time: 3,
        end_time: 6,
        text: 'אנחנו נכנסים לשטח',
        text_nikud: 'אֲנַחְנוּ נִכְנָסִים לַשֶּׁטַח',
        words: ['אנחנו', 'נכנסים', 'לשטח'],
      },
      {
        index: 3,
        start_time: 6,
        end_time: 9,
        text: 'היזהרו שם בחוץ',
        text_nikud: 'הִיזָּהֲרוּ שָׁם בַּחוּץ',
        words: ['היזהרו', 'שם', 'בחוץ'],
      },
    ],
  },
};

// =====================================
// TRANSLATIONS
// =====================================
export const demoTranslations: Record<string, any> = {
  'המשימה': {
    word: 'המשימה',
    translation: 'the mission',
    transliteration: 'ha-mesima',
    part_of_speech: 'noun',
    gender: 'feminine',
    cached: true,
  },
  'מתחילה': {
    word: 'מתחילה',
    translation: 'begins',
    transliteration: 'matchila',
    part_of_speech: 'verb',
    tense: 'present',
    cached: true,
  },
  'נכנסים': {
    word: 'נכנסים',
    translation: 'entering',
    transliteration: 'nichnasim',
    part_of_speech: 'verb',
    tense: 'present',
    cached: true,
  },
  'שטח': {
    word: 'שטח',
    translation: 'territory / area',
    transliteration: 'shetach',
    part_of_speech: 'noun',
    gender: 'masculine',
    cached: true,
  },
};

// =====================================
// ZMAN (Israel Time) DATA
// =====================================
// Safe initialization that works on tvOS (which has limited Intl support)
const getZmanInitData = () => {
  const now = new Date();
  let israelTimeStr = '12:00';
  let israelDayStr = 'יום שני';
  let localTimeStr = '12:00';
  let localTimezone = 'America/New_York';
  let dayOfWeek = 1;

  try {
    israelTimeStr = now.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jerusalem'
    });
    israelDayStr = now.toLocaleDateString('he-IL', {
      weekday: 'long',
      timeZone: 'Asia/Jerusalem'
    });
    localTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    localTimezone = Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || 'America/New_York';
    // Get Israel day of week
    const israelDateParts = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: 'Asia/Jerusalem'
    }).format(now);
    dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(israelDateParts);
  } catch {
    // Fallback for tvOS - use local time with UTC+2 offset for Israel
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    israelTimeStr = `${hours}:${minutes}`;
    localTimeStr = `${hours}:${minutes}`;
    dayOfWeek = now.getDay();
    const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
    israelDayStr = days[dayOfWeek];
  }

  return { now, israelTimeStr, israelDayStr, localTimeStr, localTimezone, dayOfWeek };
};

const zmanInit = getZmanInitData();

export const demoZmanData = {
  // Time data in the format expected by DualClock component
  time: {
    israel: {
      time: zmanInit.israelTimeStr,
      datetime: zmanInit.now.toISOString(),
      day: zmanInit.israelDayStr,
    },
    local: {
      time: zmanInit.localTimeStr,
      datetime: zmanInit.now.toISOString(),
      timezone: zmanInit.localTimezone,
    },
    shabbat: {
      is_shabbat: zmanInit.dayOfWeek === 6,
      is_erev_shabbat: zmanInit.dayOfWeek === 5,
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
    is_shabbat: zmanInit.dayOfWeek === 6,
    is_erev_shabbat: zmanInit.dayOfWeek === 5,
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

// =====================================
// MORNING RITUAL
// =====================================
export const demoMorningRitual = {
  is_ritual_time: false,
  reason: 'outside_time_window',
  auto_play: true,
  playlist: [
    {
      id: 'ritual-news',
      type: 'live',
      title: 'חדשות הבוקר',
      channel_id: 'kan11',
      duration: 300,
      order: 1,
    },
    {
      id: 'ritual-radio',
      type: 'radio',
      title: 'גלגלצ בבוקר',
      station_id: 'glglz',
      duration: 600,
      order: 2,
    },
    {
      id: 'ritual-podcast',
      type: 'podcast',
      title: 'סדנא לחדשות - פרק היום',
      podcast_id: 'podcast-4',
      episode_id: 'ep-4-1',
      duration: 1800,
      order: 3,
    },
  ],
  ai_brief: {
    headline: 'בוקר טוב! הנה מה שקורה היום בישראל',
    summary: 'הבחירות ממשיכות להעסיק, מכבי ניצחה, וגשם בדרך',
    top_stories: [
      'סקרים חדשים לקראת הבחירות',
      'מכבי ת"א בליגת האלופות',
      'מזג אוויר סוער בסוף השבוע',
    ],
    personalized_note: 'היום יש לך התראות על תוכן חדש מפאודה',
    generated_at: new Date().toISOString(),
  },
  israel_context: {
    weather: 'שמשי, 18°C בתל אביב',
    headline_news: 'הבחירות בעיצומן',
    trending_show: 'פאודה עונה 4',
    local_time: '08:30',
  },
};

// =====================================
// CONTINUE WATCHING
// =====================================
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

// =====================================
// CATEGORIES
// =====================================
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

// =====================================
// FEATURED
// =====================================
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

// =====================================
// WATCH PARTIES
// =====================================
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

// =====================================
// SEARCH RESULTS GENERATOR
// =====================================
export const demoSearchResults = (query: string) => {
  const lowerQuery = query.toLowerCase();
  const results = [
    ...demoMovies.filter(m =>
      m.title.includes(query) ||
      m.title_en?.toLowerCase().includes(lowerQuery) ||
      m.description.includes(query)
    ),
    ...demoSeries.filter(s =>
      s.title.includes(query) ||
      s.title_en?.toLowerCase().includes(lowerQuery) ||
      s.description.includes(query)
    ),
    ...demoChannels.filter(c => c.name.includes(query)),
    ...demoRadioStations.filter(r => r.name.includes(query)),
    ...demoPodcasts.filter(p => p.title.includes(query) || p.host.includes(query)),
  ];

  return {
    results: results.length > 0 ? results : [...demoSeries.slice(0, 3), ...demoMovies.slice(0, 2)],
    query,
    interpretation: `חיפוש: "${query}"`,
    suggestions: ['פאודה', 'שטיסל', 'טהרן', 'הבורר'],
    total: results.length || 5,
  };
};

// =====================================
// RECORDINGS DATA
// =====================================
export interface DemoRecording {
  id: string;
  title: string;
  channel_name: string;
  channel_id: string;
  thumbnail?: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  status: 'recording' | 'completed' | 'scheduled' | 'failed';
  file_size_mb?: number;
  stream_url?: string;
}

export const demoRecordings: DemoRecording[] = [
  {
    id: '1',
    title: 'מהדורת חדשות ערוץ 12',
    channel_name: 'ערוץ 12',
    channel_id: 'kan-11',
    thumbnail: 'https://picsum.photos/seed/news1/400/225',
    start_time: new Date(Date.now() - 7200000).toISOString(),
    end_time: new Date(Date.now() - 3600000).toISOString(),
    duration_seconds: 3600,
    status: 'completed',
    file_size_mb: 512,
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: '2',
    title: 'ספורט הלילה - סיכום המחזור',
    channel_name: 'ספורט 5',
    channel_id: 'sport-5',
    thumbnail: 'https://picsum.photos/seed/sports1/400/225',
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    duration_seconds: 3600,
    status: 'scheduled',
  },
  {
    id: '3',
    title: 'פאודה - עונה 4 פרק 5',
    channel_name: 'כאן 11',
    channel_id: 'kan-11',
    thumbnail: 'https://picsum.photos/seed/fauda1/400/225',
    start_time: new Date(Date.now() - 86400000).toISOString(),
    end_time: new Date(Date.now() - 82800000).toISOString(),
    duration_seconds: 3600,
    status: 'completed',
    file_size_mb: 720,
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: '4',
    title: 'חדשות הבוקר',
    channel_name: 'ערוץ 13',
    channel_id: 'reshet-13',
    thumbnail: 'https://picsum.photos/seed/morning1/400/225',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 1800000).toISOString(),
    duration_seconds: 1800,
    status: 'recording',
  },
  {
    id: '5',
    title: 'מכבי תל אביב נגד הפועל באר שבע',
    channel_name: 'ספורט 1',
    channel_id: 'sport-1',
    start_time: new Date(Date.now() + 172800000).toISOString(),
    end_time: new Date(Date.now() + 180000000).toISOString(),
    duration_seconds: 7200,
    status: 'scheduled',
  },
];

// Export all data
export default {
  user: demoUser,
  movies: demoMovies,
  series: demoSeries,
  channels: demoChannels,
  radioStations: demoRadioStations,
  podcasts: demoPodcasts,
  podcastCategories: demoPodcastCategories,
  trending: demoTrending,
  chapters: demoChapters,
  subtitles: demoSubtitles,
  translations: demoTranslations,
  zmanData: demoZmanData,
  morningRitual: demoMorningRitual,
  continueWatching: demoContinueWatching,
  categories: demoCategories,
  featured: demoFeatured,
  watchParties: demoWatchParties,
  recordings: demoRecordings,
  searchResults: demoSearchResults,
};
