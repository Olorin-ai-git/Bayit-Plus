/**
 * Comprehensive Demo Data
 * Complete mock data for all Bayit+ features.
 * Used exclusively in demo mode.
 */

// ===========================================
// USER DATA
// ===========================================
export const demoUser = {
  id: 'demo-user-1',
  email: 'demo@bayit.tv',
  name: 'משתמש דמו',
  name_en: 'Demo User',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
  subscription: {
    plan: 'premium',
    status: 'active',
    expires_at: '2025-12-31',
  },
  preferences: {
    show_israel_time: true,
    shabbat_mode_enabled: true,
    local_timezone: 'America/New_York',
    morning_ritual_enabled: true,
    morning_ritual_start: 7,
    morning_ritual_end: 9,
    morning_ritual_content: ['news', 'radio'],
    subtitles_enabled: true,
    nikud_enabled: true,
    tap_translate_enabled: true,
    favorite_categories: ['drama', 'news', 'comedy'],
  },
};

// ===========================================
// VOD CONTENT
// ===========================================
export const demoMovies = [
  {
    id: 'movie-1',
    title: 'וואלס עם באשיר',
    title_en: 'Waltz with Bashir',
    title_es: 'Vals con Bashir',
    description: 'סרט אנימציה דוקומנטרי ישראלי העוסק במלחמת לבנון הראשונה',
    description_en: 'Israeli animated documentary about the First Lebanon War',
    description_es: 'Documental animado israelí sobre la Primera Guerra del Líbano',
    thumbnail: 'https://picsum.photos/seed/waltz/400/225',
    backdrop: 'https://picsum.photos/seed/waltz-back/1920/1080',
    year: 2008,
    duration: 90,
    rating: 'PG-13',
    genre: ['דוקומנטרי', 'אנימציה', 'דרמה'],
    director: 'ארי פולמן',
    cast: ['ארי פולמן', 'רון בן ישי'],
    content_type: 'movie',
    has_subtitles: true,
    has_nikud: true,
  },
  {
    id: 'movie-2',
    title: 'לבנון',
    title_en: 'Lebanon',
    title_es: 'Líbano',
    description: 'דרמת מלחמה ישראלית המתרחשת בתוך טנק במלחמת לבנון',
    description_en: 'Israeli war drama set inside a tank during the Lebanon War',
    description_es: 'Drama bélico israelí ambientado dentro de un tanque durante la Guerra del Líbano',
    thumbnail: 'https://picsum.photos/seed/lebanon/400/225',
    backdrop: 'https://picsum.photos/seed/lebanon-back/1920/1080',
    year: 2009,
    duration: 93,
    rating: 'R',
    genre: ['דרמה', 'מלחמה'],
    director: 'שמואל מעוז',
    content_type: 'movie',
    has_subtitles: true,
  },
  {
    id: 'movie-3',
    title: 'פוקסטרוט',
    title_en: 'Foxtrot',
    title_es: 'Foxtrot',
    description: 'דרמה ישראלית על משפחה המתמודדת עם אובדן',
    description_en: 'Israeli drama about a family dealing with loss',
    description_es: 'Drama israelí sobre una familia que enfrenta la pérdida',
    thumbnail: 'https://picsum.photos/seed/foxtrot/400/225',
    backdrop: 'https://picsum.photos/seed/foxtrot-back/1920/1080',
    year: 2017,
    duration: 108,
    rating: 'R',
    genre: ['דרמה'],
    director: 'שמואל מעוז',
    content_type: 'movie',
    has_subtitles: true,
    has_nikud: true,
  },
  {
    id: 'movie-4',
    title: 'אפילוג',
    title_en: 'Epilogue',
    title_es: 'Epílogo',
    description: 'זוג מבוגר מתמודד עם מחלה קשה בסרט מרגש',
    description_en: 'An elderly couple faces a serious illness in this moving film',
    description_es: 'Una pareja de ancianos enfrenta una enfermedad grave en esta conmovedora película',
    thumbnail: 'https://picsum.photos/seed/epilog/400/225',
    year: 2020,
    duration: 94,
    genre: ['דרמה'],
    content_type: 'movie',
    has_subtitles: true,
  },
  {
    id: 'movie-5',
    title: 'הערת שוליים',
    title_en: 'Footnote',
    title_es: 'Nota al Pie',
    description: 'קומדיה דרמתית על יריבות אקדמית בין אב לבן',
    description_en: 'Dramatic comedy about academic rivalry between father and son',
    description_es: 'Comedia dramática sobre la rivalidad académica entre padre e hijo',
    thumbnail: 'https://picsum.photos/seed/footnote/400/225',
    year: 2011,
    duration: 103,
    genre: ['דרמה', 'קומדיה'],
    content_type: 'movie',
    has_subtitles: true,
  },
];

export const demoSeries = [
  {
    id: 'series-1',
    title: 'פאודה',
    title_en: 'Fauda',
    title_es: 'Fauda',
    description: 'סדרת מתח ישראלית על יחידה מסתערבים',
    description_en: 'Israeli thriller series about an undercover unit',
    description_es: 'Serie de suspenso israelí sobre una unidad encubierta',
    thumbnail: 'https://picsum.photos/seed/fauda/400/225',
    backdrop: 'https://picsum.photos/seed/fauda-back/1920/1080',
    year: 2015,
    seasons: 4,
    episodes: 48,
    rating: 'TV-MA',
    genre: ['מתח', 'דרמה', 'אקשן'],
    content_type: 'series',
    has_subtitles: true,
    has_nikud: true,
    is_featured: true,
  },
  {
    id: 'series-2',
    title: 'שטיסל',
    title_en: 'Shtisel',
    title_es: 'Shtisel',
    description: 'דרמה על משפחה חרדית בירושלים',
    description_en: 'Drama about an ultra-Orthodox family in Jerusalem',
    description_es: 'Drama sobre una familia ultraortodoxa en Jerusalén',
    thumbnail: 'https://picsum.photos/seed/shtisel/400/225',
    backdrop: 'https://picsum.photos/seed/shtisel-back/1920/1080',
    year: 2013,
    seasons: 3,
    episodes: 33,
    rating: 'TV-PG',
    genre: ['דרמה', 'משפחה'],
    content_type: 'series',
    has_subtitles: true,
    has_nikud: true,
    is_featured: true,
  },
  {
    id: 'series-3',
    title: 'טהרן',
    title_en: 'Tehran',
    title_es: 'Teherán',
    description: 'סדרת ריגול על סוכנת מוסד בטהרן',
    description_en: 'Spy series about a Mossad agent in Tehran',
    description_es: 'Serie de espionaje sobre una agente del Mossad en Teherán',
    thumbnail: 'https://picsum.photos/seed/tehran/400/225',
    backdrop: 'https://picsum.photos/seed/tehran-back/1920/1080',
    year: 2020,
    seasons: 2,
    episodes: 16,
    rating: 'TV-MA',
    genre: ['מתח', 'ריגול'],
    content_type: 'series',
    has_subtitles: true,
    is_featured: true,
  },
  {
    id: 'series-4',
    title: 'הבורר',
    title_en: 'The Arbitrator',
    title_es: 'El Árbitro',
    description: 'קומדיה ישראלית קלאסית',
    description_en: 'Classic Israeli comedy',
    description_es: 'Comedia israelí clásica',
    thumbnail: 'https://picsum.photos/seed/haborer/400/225',
    year: 2006,
    seasons: 3,
    episodes: 36,
    genre: ['קומדיה'],
    content_type: 'series',
    has_subtitles: true,
  },
  {
    id: 'series-5',
    title: 'עבודה ערבית',
    title_en: 'Arab Labor',
    title_es: 'Trabajo Árabe',
    description: 'סיטקום על משפחה ערבית-ישראלית',
    description_en: 'Sitcom about an Arab-Israeli family',
    description_es: 'Comedia sobre una familia árabe-israelí',
    thumbnail: 'https://picsum.photos/seed/arablabor/400/225',
    year: 2007,
    seasons: 4,
    episodes: 40,
    genre: ['קומדיה', 'דרמה'],
    content_type: 'series',
    has_subtitles: true,
    has_nikud: true,
  },
  {
    id: 'series-6',
    title: 'בית הבובות',
    title_en: 'Dollhouse',
    title_es: 'Casa de Muñecas',
    description: 'דרמה פסיכולוגית ישראלית',
    description_en: 'Israeli psychological drama',
    description_es: 'Drama psicológico israelí',
    thumbnail: 'https://picsum.photos/seed/dollhouse/400/225',
    year: 2022,
    seasons: 1,
    episodes: 10,
    genre: ['דרמה', 'מתח'],
    content_type: 'series',
    has_subtitles: true,
  },
];

// ===========================================
// LIVE CHANNELS
// ===========================================
export const demoChannels = [
  {
    id: 'channel-kan11',
    name: 'כאן 11',
    name_en: 'Kan 11',
    name_es: 'Kan 11',
    description: 'ערוץ הטלוויזיה הציבורי של ישראל',
    description_en: 'Israel\'s public television channel',
    description_es: 'Canal de televisión pública de Israel',
    logo: 'https://picsum.photos/seed/kan11/200/200',
    thumbnail: 'https://picsum.photos/seed/kan11-thumb/400/225',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'general',
    is_active: true,
    current_show: 'חדשות הערב',
    next_show: 'מבט לחדשות',
  },
  {
    id: 'channel-keshet12',
    name: 'קשת 12',
    name_en: 'Keshet 12',
    name_es: 'Keshet 12',
    description: 'ערוץ הטלוויזיה המסחרי המוביל',
    description_en: 'Leading commercial television channel',
    description_es: 'Principal canal de televisión comercial',
    logo: 'https://picsum.photos/seed/keshet12/200/200',
    thumbnail: 'https://picsum.photos/seed/keshet12-thumb/400/225',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'general',
    is_active: true,
    current_show: 'הישרדות VIP',
    next_show: 'חדשות 12',
  },
  {
    id: 'channel-reshet13',
    name: 'רשת 13',
    name_en: 'Reshet 13',
    name_es: 'Reshet 13',
    description: 'ערוץ חדשות ובידור',
    description_en: 'News and entertainment channel',
    description_es: 'Canal de noticias y entretenimiento',
    logo: 'https://picsum.photos/seed/reshet13/200/200',
    thumbnail: 'https://picsum.photos/seed/reshet13-thumb/400/225',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'news',
    is_active: true,
    current_show: 'אולפן שישי',
    next_show: 'חדשות 13',
  },
  {
    id: 'channel-14',
    name: 'ערוץ 14',
    name_en: 'Channel 14',
    name_es: 'Canal 14',
    description: 'ערוץ חדשות ופרשנות',
    description_en: 'News and commentary channel',
    description_es: 'Canal de noticias y comentarios',
    logo: 'https://picsum.photos/seed/channel14/200/200',
    thumbnail: 'https://picsum.photos/seed/channel14-thumb/400/225',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'news',
    is_active: true,
    current_show: 'פטריוטים',
  },
  {
    id: 'channel-i24',
    name: 'i24NEWS',
    name_en: 'i24NEWS',
    name_es: 'i24NEWS',
    description: 'חדשות בינלאומיות מישראל',
    description_en: 'International news from Israel',
    description_es: 'Noticias internacionales desde Israel',
    logo: 'https://picsum.photos/seed/i24/200/200',
    thumbnail: 'https://picsum.photos/seed/i24-thumb/400/225',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'news',
    is_active: true,
    current_show: 'Global Eye',
  },
  {
    id: 'channel-sport5',
    name: 'ספורט 5',
    name_en: 'Sport 5',
    name_es: 'Sport 5',
    description: 'ערוץ הספורט המוביל',
    description_en: 'Leading sports channel',
    description_es: 'Principal canal de deportes',
    logo: 'https://picsum.photos/seed/sport5/200/200',
    thumbnail: 'https://picsum.photos/seed/sport5-thumb/400/225',
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'sports',
    is_active: true,
    current_show: 'ליגת העל',
  },
];

// ===========================================
// RADIO STATIONS
// ===========================================
export const demoRadioStations = [
  {
    id: 'radio-galatz',
    name: 'גלי צה"ל',
    name_en: 'Galei Zahal',
    name_es: 'Galei Zahal',
    description: 'תחנת הרדיו של צבא ההגנה לישראל',
    description_en: 'Israel Defense Forces radio station',
    description_es: 'Estación de radio de las Fuerzas de Defensa de Israel',
    logo: 'https://picsum.photos/seed/galatz/200/200',
    stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
    genre: 'news',
    is_active: true,
    current_show: 'בוקר טוב עם בן כספית',
  },
  {
    id: 'radio-kan-bet',
    name: 'כאן ב׳',
    name_en: 'Kan Bet',
    name_es: 'Kan Bet',
    description: 'רדיו מדבר - חדשות ופרשנות',
    description_en: 'Talk radio - news and commentary',
    description_es: 'Radio hablada - noticias y comentarios',
    logo: 'https://picsum.photos/seed/kanbet/200/200',
    stream_url: 'https://kan.media/radio/bet',
    genre: 'news',
    is_active: true,
    current_show: 'היום הזה',
  },
  {
    id: 'radio-kan-gimel',
    name: 'כאן גימל',
    name_en: 'Kan Gimel',
    name_es: 'Kan Gimel',
    description: 'מוזיקה ישראלית',
    description_en: 'Israeli music',
    description_es: 'Música israelí',
    logo: 'https://picsum.photos/seed/kangimel/200/200',
    stream_url: 'https://kan.media/radio/gimel',
    genre: 'music',
    is_active: true,
    current_show: 'שירים ראשונים',
  },
  {
    id: 'radio-88fm',
    name: '88FM',
    name_en: '88FM',
    name_es: '88FM',
    description: 'רדיו רוק ואלטרנטיבי',
    description_en: 'Rock and alternative radio',
    description_es: 'Radio de rock y alternativo',
    logo: 'https://picsum.photos/seed/88fm/200/200',
    stream_url: 'https://88fm.media/stream',
    genre: 'music',
    is_active: true,
    current_show: 'גלגלצ בלילה',
  },
  {
    id: 'radio-103fm',
    name: '103FM',
    name_en: '103FM',
    name_es: '103FM',
    description: 'רדיו פופ ומוזיקה עכשווית',
    description_en: 'Pop and contemporary music radio',
    description_es: 'Radio de pop y música contemporánea',
    logo: 'https://picsum.photos/seed/103fm/200/200',
    stream_url: 'https://103fm.media/stream',
    genre: 'music',
    is_active: true,
    current_show: 'בוקר של 103',
  },
  {
    id: 'radio-eco99',
    name: 'Eco 99FM',
    name_en: 'Eco 99FM',
    name_es: 'Eco 99FM',
    description: 'מוזיקה בינלאומית',
    description_en: 'International music',
    description_es: 'Música internacional',
    logo: 'https://picsum.photos/seed/eco99/200/200',
    stream_url: 'https://eco99.media/stream',
    genre: 'music',
    is_active: true,
    current_show: 'Morning Show',
  },
];

// ===========================================
// PODCASTS
// ===========================================
export const demoPodcasts = [
  {
    id: 'podcast-1',
    title: 'עושים היסטוריה',
    title_en: 'Making History',
    title_es: 'Haciendo Historia',
    description: 'הפודקאסט ההיסטורי הפופולרי בישראל עם רן לוי',
    description_en: 'Israel\'s most popular history podcast with Ran Levi',
    description_es: 'El podcast de historia más popular de Israel con Ran Levi',
    thumbnail: 'https://picsum.photos/seed/history/400/400',
    host: 'רן לוי',
    category: 'היסטוריה',
    episode_count: 450,
    is_featured: true,
    episodes: [
      { id: 'ep-1-1', title: 'מלחמת יום הכיפורים - פרק 1', duration: 3600, published_at: '2024-01-15' },
      { id: 'ep-1-2', title: 'מלחמת יום הכיפורים - פרק 2', duration: 3200, published_at: '2024-01-08' },
      { id: 'ep-1-3', title: 'מבצע אנטבה', duration: 2800, published_at: '2024-01-01' },
    ],
  },
  {
    id: 'podcast-2',
    title: 'הפודקאסט של גלית ומאור',
    title_en: 'The Galit and Maor Podcast',
    title_es: 'El Podcast de Galit y Maor',
    description: 'שיחות על חיים, יחסים ופסיכולוגיה',
    description_en: 'Conversations about life, relationships and psychology',
    description_es: 'Conversaciones sobre la vida, relaciones y psicología',
    thumbnail: 'https://picsum.photos/seed/galitmaor/400/400',
    host: 'גלית וגמור',
    category: 'חברה',
    episode_count: 200,
    episodes: [
      { id: 'ep-2-1', title: 'על גבולות בזוגיות', duration: 4200, published_at: '2024-01-14' },
      { id: 'ep-2-2', title: 'להתמודד עם חרדה', duration: 3800, published_at: '2024-01-07' },
    ],
  },
  {
    id: 'podcast-3',
    title: 'כלכליסט',
    title_en: 'Calcalist',
    title_es: 'Calcalist',
    description: 'חדשות כלכלה וטכנולוגיה',
    description_en: 'Business and technology news',
    description_es: 'Noticias de negocios y tecnología',
    thumbnail: 'https://picsum.photos/seed/calcalist/400/400',
    host: 'עורכי כלכליסט',
    category: 'כלכלה',
    episode_count: 1200,
    episodes: [
      { id: 'ep-3-1', title: 'מגמות ההייטק ב-2024', duration: 1800, published_at: '2024-01-16' },
      { id: 'ep-3-2', title: 'הבורסה היום', duration: 900, published_at: '2024-01-16' },
    ],
  },
  {
    id: 'podcast-4',
    title: 'קצה המזלג',
    title_en: 'Fork\'s Edge',
    title_es: 'El Borde del Tenedor',
    description: 'פודקאסט קולינרי ישראלי',
    description_en: 'Israeli culinary podcast',
    description_es: 'Podcast culinario israelí',
    thumbnail: 'https://picsum.photos/seed/food/400/400',
    host: 'שף יונתן רושפלד',
    category: 'אוכל',
    episode_count: 85,
    episodes: [
      { id: 'ep-4-1', title: 'סודות החומוס המושלם', duration: 2400, published_at: '2024-01-12' },
    ],
  },
];

// ===========================================
// TRENDING TOPICS
// ===========================================
export const demoTrending = {
  topics: [
    {
      title: 'משבר החטופים',
      title_en: 'Hostage Crisis',
      title_es: 'Crisis de Rehenes',
      category: 'security',
      category_label: { he: 'ביטחון', en: 'Security', es: 'Seguridad' },
      sentiment: 'negative',
      importance: 10,
      summary: 'המשא ומתן להחזרת החטופים נמשך עם מעורבות בינלאומית',
      keywords: ['חטופים', 'עזה', 'משא ומתן'],
    },
    {
      title: 'בחירות 2024',
      title_en: 'Elections 2024',
      title_es: 'Elecciones 2024',
      category: 'politics',
      category_label: { he: 'פוליטיקה', en: 'Politics', es: 'Política' },
      sentiment: 'neutral',
      importance: 8,
      summary: 'סקרים חדשים מראים שינויים במפה הפוליטית',
      keywords: ['בחירות', 'ממשלה', 'אופוזיציה'],
    },
    {
      title: 'הייטק ישראלי',
      title_en: 'Israeli Tech',
      title_es: 'Tecnología Israelí',
      category: 'tech',
      category_label: { he: 'טכנולוגיה', en: 'Tech', es: 'Tecnología' },
      sentiment: 'positive',
      importance: 7,
      summary: 'סטארטאפ ישראלי גייס 100 מיליון דולר',
      keywords: ['סטארטאפ', 'השקעות', 'חדשנות'],
    },
    {
      title: 'משחקי הליגה',
      title_en: 'League Games',
      title_es: 'Juegos de Liga',
      category: 'sports',
      category_label: { he: 'ספורט', en: 'Sports', es: 'Deportes' },
      sentiment: 'positive',
      importance: 6,
      summary: 'מכבי תל אביב ניצחה במשחק הדרבי',
      keywords: ['כדורגל', 'ליגה', 'מכבי'],
    },
    {
      title: 'מזג האוויר',
      title_en: 'Weather Update',
      title_es: 'Actualización del Clima',
      category: 'weather',
      category_label: { he: 'מזג אוויר', en: 'Weather', es: 'Clima' },
      sentiment: 'neutral',
      importance: 5,
      summary: 'גל חום צפוי בסוף השבוע',
      keywords: ['חום', 'שרב', 'תחזית'],
    },
  ],
  overall_mood: 'עם ישראל מתאחד בתקופה מאתגרת',
  top_story: 'המאמצים להחזרת החטופים נמשכים ללא לאות',
  sources: ['Ynet', 'Walla', 'Mako', 'כאן חדשות'],
  analyzed_at: new Date().toISOString(),
};

// ===========================================
// AI CHAPTERS (for VOD content)
// ===========================================
export const demoChapters = {
  'movie-1': {
    content_id: 'movie-1',
    chapters: [
      { start_time: 0, end_time: 600, title: 'פתיחה - החלומות', category: 'intro' },
      { start_time: 600, end_time: 1800, title: 'הזיכרונות מתחילים', category: 'flashback' },
      { start_time: 1800, end_time: 3000, title: 'המסע לבירות', category: 'journey' },
      { start_time: 3000, end_time: 4200, title: 'סברא ושתילה', category: 'climax' },
      { start_time: 4200, end_time: 5400, title: 'סיום', category: 'conclusion' },
    ],
    generated_at: new Date().toISOString(),
  },
  'series-1': {
    content_id: 'series-1',
    chapters: [
      { start_time: 0, end_time: 180, title: 'פתיח', category: 'intro' },
      { start_time: 180, end_time: 900, title: 'התכנון', category: 'setup' },
      { start_time: 900, end_time: 1800, title: 'המבצע', category: 'action' },
      { start_time: 1800, end_time: 2400, title: 'הסיבוך', category: 'conflict' },
      { start_time: 2400, end_time: 2700, title: 'סיום הפרק', category: 'cliffhanger' },
    ],
    generated_at: new Date().toISOString(),
  },
};

// ===========================================
// SUBTITLES & NIKUD
// ===========================================
export const demoSubtitles = {
  'movie-1': {
    content_id: 'movie-1',
    language: 'he',
    language_name: 'עברית',
    has_nikud: true,
    cues: [
      {
        index: 1,
        start_time: 0,
        end_time: 4,
        text: 'אתה זוכר מה קרה?',
        text_nikud: 'אַתָּה זוֹכֵר מָה קָרָה?',
        formatted_start: '0:00',
        formatted_end: '0:04',
        words: [
          { word: 'אתה', start: 0, end: 4, is_hebrew: true },
          { word: 'זוכר', start: 5, end: 10, is_hebrew: true },
          { word: 'מה', start: 11, end: 13, is_hebrew: true },
          { word: 'קרה', start: 14, end: 18, is_hebrew: true },
        ],
      },
      {
        index: 2,
        start_time: 4,
        end_time: 8,
        text: 'לא, אני לא זוכר כלום',
        text_nikud: 'לֹא, אֲנִי לֹא זוֹכֵר כְּלוּם',
        formatted_start: '0:04',
        formatted_end: '0:08',
        words: [
          { word: 'לא', start: 0, end: 2, is_hebrew: true },
          { word: 'אני', start: 4, end: 7, is_hebrew: true },
          { word: 'לא', start: 8, end: 10, is_hebrew: true },
          { word: 'זוכר', start: 11, end: 15, is_hebrew: true },
          { word: 'כלום', start: 16, end: 20, is_hebrew: true },
        ],
      },
      {
        index: 3,
        start_time: 8,
        end_time: 12,
        text: 'אז בוא נתחיל מההתחלה',
        text_nikud: 'אָז בּוֹא נַתְחִיל מֵהַהַתְחָלָה',
        formatted_start: '0:08',
        formatted_end: '0:12',
        words: [
          { word: 'אז', start: 0, end: 2, is_hebrew: true },
          { word: 'בוא', start: 3, end: 6, is_hebrew: true },
          { word: 'נתחיל', start: 7, end: 12, is_hebrew: true },
          { word: 'מההתחלה', start: 13, end: 21, is_hebrew: true },
        ],
      },
    ],
  },
};

// ===========================================
// TRANSLATIONS (for tap-to-translate)
// ===========================================
export const demoTranslations = {
  'זוכר': {
    word: 'זוכר',
    translation: 'remember',
    transliteration: 'zocher',
    part_of_speech: 'verb',
    example: 'אני זוכר את היום ההוא',
    example_translation: 'I remember that day',
  },
  'מלחמה': {
    word: 'מלחמה',
    translation: 'war',
    transliteration: 'milchama',
    part_of_speech: 'noun',
    example: 'המלחמה הסתיימה',
    example_translation: 'The war ended',
  },
  'שלום': {
    word: 'שלום',
    translation: 'peace / hello',
    transliteration: 'shalom',
    part_of_speech: 'noun',
    example: 'שלום, מה שלומך?',
    example_translation: 'Hello, how are you?',
  },
  'חטופים': {
    word: 'חטופים',
    translation: 'hostages',
    transliteration: 'chatufim',
    part_of_speech: 'noun',
    example: 'החטופים חזרו הביתה',
    example_translation: 'The hostages returned home',
  },
  'ביטחון': {
    word: 'ביטחון',
    translation: 'security',
    transliteration: 'bitachon',
    part_of_speech: 'noun',
    example: 'מועצת הביטחון התכנסה',
    example_translation: 'The security council convened',
  },
};

// ===========================================
// ZMAN (Israel Time)
// ===========================================
export const demoZmanData = {
  time: {
    israel_time: new Date().toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' }),
    israel_date: new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }),
    local_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    local_date: new Date().toLocaleDateString('en-US'),
    timezone_diff: '+7 hours',
    is_shabbat: new Date().getDay() === 6,
    hebrew_day: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][new Date().getDay()],
  },
  shabbat: {
    candle_lighting: '17:45',
    havdalah: '18:52',
    parasha: 'פרשת בשלח',
    is_shabbat: false,
    countdown_minutes: 180,
  },
  shabbat_content: [
    { id: 'shabbat-1', title: 'שירי שבת', type: 'music', thumbnail: 'https://picsum.photos/seed/shabbat1/400/225' },
    { id: 'shabbat-2', title: 'סיפורי חסידים', type: 'vod', thumbnail: 'https://picsum.photos/seed/shabbat2/400/225' },
    { id: 'shabbat-3', title: 'פרשת השבוע', type: 'vod', thumbnail: 'https://picsum.photos/seed/shabbat3/400/225' },
  ],
};

// ===========================================
// MORNING RITUAL
// ===========================================
export const demoMorningRitual = {
  is_ritual_time: true, // Set to true for demo
  ritual_enabled: true,
  local_time: '07:30',
  local_date: new Date().toLocaleDateString('en-US'),
  israel_context: {
    israel_time: '14:30',
    israel_date: new Date().toLocaleDateString('he-IL'),
    time_of_day: 'afternoon',
    activity_message: 'בישראל עכשיו אחר הצהריים',
    is_shabbat: false,
    day_name_he: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][new Date().getDay()],
  },
  playlist: [
    {
      id: 'ritual-news',
      title: 'חדשות הבוקר - כאן 11',
      type: 'live',
      stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      thumbnail: 'https://picsum.photos/seed/morningnews/400/225',
      duration_hint: 300,
      category: 'news',
    },
    {
      id: 'ritual-radio',
      title: 'רדיו בוקר - גלי צה"ל',
      type: 'radio',
      stream_url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
      thumbnail: 'https://picsum.photos/seed/galatz/400/225',
      duration_hint: 600,
      category: 'radio',
    },
  ],
  ai_brief: {
    greeting: 'בוקר טוב! ☀️',
    israel_update: 'בישראל עכשיו אחר הצהריים, והחדשות מדווחות על התקדמות במשא ומתן',
    recommendation: 'מומלץ להתחיל עם חדשות הבוקר ואז לעבור לרדיו',
    mood: 'uplifting',
  },
};

// ===========================================
// WATCH HISTORY
// ===========================================
export const demoContinueWatching = [
  {
    id: 'series-1',
    title: 'פאודה',
    subtitle: 'עונה 4, פרק 8',
    thumbnail: 'https://picsum.photos/seed/fauda/400/225',
    progress: 0.65,
    remaining: '18:45',
    type: 'series',
  },
  {
    id: 'movie-3',
    title: 'פוקסטרוט',
    subtitle: '45 דקות נותרו',
    thumbnail: 'https://picsum.photos/seed/foxtrot/400/225',
    progress: 0.58,
    remaining: '45:00',
    type: 'movie',
  },
  {
    id: 'series-5',
    title: 'עבודה ערבית',
    subtitle: 'עונה 2, פרק 3',
    thumbnail: 'https://picsum.photos/seed/arablabor/400/225',
    progress: 0.30,
    remaining: '22:15',
    type: 'series',
  },
];

// ===========================================
// WATCH PARTY
// ===========================================
export const demoWatchParties = [
  {
    id: 'party-1',
    room_code: 'FAUDA2024',
    content_id: 'series-1',
    content_title: 'פאודה - עונה 4',
    host_name: 'דני',
    participant_count: 4,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// ===========================================
// CATEGORIES
// ===========================================
export const demoCategories = [
  {
    id: 'drama',
    name: 'דרמה',
    name_en: 'Drama',
    items: [...demoSeries.filter(s => s.genre?.includes('דרמה')), ...demoMovies.filter(m => m.genre?.includes('דרמה'))],
  },
  {
    id: 'comedy',
    name: 'קומדיה',
    name_en: 'Comedy',
    items: [...demoSeries.filter(s => s.genre?.includes('קומדיה')), ...demoMovies.filter(m => m.genre?.includes('קומדיה'))],
  },
  {
    id: 'thriller',
    name: 'מתח',
    name_en: 'Thriller',
    items: demoSeries.filter(s => s.genre?.includes('מתח')),
  },
  {
    id: 'documentary',
    name: 'דוקומנטרי',
    name_en: 'Documentary',
    items: demoMovies.filter(m => m.genre?.includes('דוקומנטרי')),
  },
  {
    id: 'israeli-movies',
    name: 'סרטים ישראליים',
    name_en: 'Israeli Movies',
    items: demoMovies,
  },
  {
    id: 'israeli-series',
    name: 'סדרות ישראליות',
    name_en: 'Israeli Series',
    items: demoSeries,
  },
];

// ===========================================
// FEATURED / HERO CONTENT
// ===========================================
export const demoFeatured = {
  hero: demoSeries[0], // Fauda
  spotlight: demoSeries.filter(s => s.is_featured),
  new_releases: [...demoMovies.slice(0, 3), ...demoSeries.slice(0, 3)],
  // All content for "All" category view
  items: [...demoMovies, ...demoSeries],
};

// ===========================================
// SEARCH RESULTS
// ===========================================
export const demoSearchResults = (query) => {
  const q = query.toLowerCase();
  const allContent = [...demoMovies, ...demoSeries, ...demoPodcasts];

  return {
    results: allContent.filter(item =>
      item.title?.toLowerCase().includes(q) ||
      item.title_en?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    ),
    query,
    interpretation: `חיפוש עבור "${query}"`,
    suggestions: ['פאודה', 'שטיסל', 'טהרן', 'דרמה ישראלית'],
    total: allContent.length,
  };
};

// ===========================================
// JUDAISM CONTENT
// ===========================================
export const demoJudaismCategories = [
  { id: 'all', name: 'הכל', name_en: 'All', name_es: 'Todo' },
  { id: 'shiurim', name: 'שיעורים', name_en: 'Torah Classes', name_es: 'Clases de Torá' },
  { id: 'tefila', name: 'תפילה', name_en: 'Prayer', name_es: 'Oración' },
  { id: 'music', name: 'מוזיקה', name_en: 'Music', name_es: 'Música' },
  { id: 'holidays', name: 'חגים', name_en: 'Holidays', name_es: 'Fiestas' },
  { id: 'documentaries', name: 'תיעודי', name_en: 'Documentaries', name_es: 'Documentales' },
];

export const demoJudaismContent = [
  {
    id: 'judaism-1',
    title: 'פרשת השבוע - בראשית',
    title_en: 'Weekly Torah Portion - Bereishit',
    title_es: 'Porción Semanal - Bereshit',
    description: 'שיעור מעמיק על פרשת בראשית',
    description_en: 'In-depth class on Parashat Bereishit',
    description_es: 'Clase profunda sobre Parashat Bereshit',
    thumbnail: 'https://picsum.photos/seed/torah1/400/225',
    category: 'shiurim',
    rabbi: 'הרב יוסף כהן',
    rabbi_en: 'Rabbi Yosef Cohen',
    rabbi_es: 'Rabino Yosef Cohen',
    duration: '45:00',
  },
  {
    id: 'judaism-2',
    title: 'תפילת שחרית המלאה',
    title_en: 'Complete Morning Prayer',
    title_es: 'Oración Matutina Completa',
    description: 'תפילת שחרית עם הסברים וכוונות',
    description_en: 'Morning prayer with explanations and intentions',
    description_es: 'Oración matutina con explicaciones e intenciones',
    thumbnail: 'https://picsum.photos/seed/prayer1/400/225',
    category: 'tefila',
    rabbi: 'הרב משה לוי',
    rabbi_en: 'Rabbi Moshe Levi',
    rabbi_es: 'Rabino Moshe Levi',
    duration: '30:00',
  },
  {
    id: 'judaism-3',
    title: 'ניגוני חסידות',
    title_en: 'Hasidic Melodies',
    title_es: 'Melodías Jasídicas',
    description: 'אוסף ניגונים חסידיים מרגשים',
    description_en: 'Collection of moving Hasidic melodies',
    description_es: 'Colección de melodías jasídicas emotivas',
    thumbnail: 'https://picsum.photos/seed/music2/400/225',
    category: 'music',
    duration: '60:00',
  },
  {
    id: 'judaism-4',
    title: 'הלכות חנוכה',
    title_en: 'Laws of Hanukkah',
    title_es: 'Leyes de Janucá',
    description: 'כל ההלכות והמנהגים של חג החנוכה',
    description_en: 'All laws and customs of Hanukkah',
    description_es: 'Todas las leyes y costumbres de Janucá',
    thumbnail: 'https://picsum.photos/seed/hanukah/400/225',
    category: 'holidays',
    rabbi: 'הרב אברהם שפירא',
    rabbi_en: 'Rabbi Avraham Shapira',
    rabbi_es: 'Rabino Avraham Shapira',
    duration: '25:00',
  },
  {
    id: 'judaism-5',
    title: 'הכותל המערבי - היסטוריה',
    title_en: 'Western Wall - History',
    title_es: 'Muro de los Lamentos - Historia',
    description: 'סרט תיעודי על ההיסטוריה של הכותל המערבי',
    description_en: 'Documentary about the history of the Western Wall',
    description_es: 'Documental sobre la historia del Muro de los Lamentos',
    thumbnail: 'https://picsum.photos/seed/kotel/400/225',
    category: 'documentaries',
    duration: '55:00',
  },
  {
    id: 'judaism-6',
    title: 'פרקי אבות - פרק א',
    title_en: 'Ethics of the Fathers - Chapter 1',
    title_es: 'Ética de los Padres - Capítulo 1',
    description: 'לימוד מעמיק של פרקי אבות',
    description_en: 'In-depth study of Pirkei Avot',
    description_es: 'Estudio profundo de Pirkei Avot',
    thumbnail: 'https://picsum.photos/seed/avot/400/225',
    category: 'shiurim',
    rabbi: 'הרב דוד שטרן',
    rabbi_en: 'Rabbi David Stern',
    rabbi_es: 'Rabino David Stern',
    duration: '40:00',
  },
];

// ===========================================
// CHILDREN CONTENT
// ===========================================
export const demoChildrenCategories = [
  { id: 'all', name: 'הכל' },
  { id: 'cartoons', name: 'סרטונים' },
  { id: 'educational', name: 'לימודי' },
  { id: 'music', name: 'שירים' },
  { id: 'hebrew', name: 'עברית' },
  { id: 'stories', name: 'סיפורים' },
  { id: 'jewish', name: 'יהדות' },
];

export const demoChildrenContent = [
  {
    id: 'kids-1',
    title: 'שירי ילדים ישראליים',
    description: 'אוסף שירי ילדים קלאסיים',
    thumbnail: 'https://picsum.photos/seed/kids1/400/225',
    category: 'music',
    age_rating: 3,
    duration: '25:00',
    educational_tags: ['מוזיקה', 'עברית'],
  },
  {
    id: 'kids-2',
    title: 'אותיות בכיף',
    description: 'לומדים את האותיות בדרך מהנה',
    thumbnail: 'https://picsum.photos/seed/kids2/400/225',
    category: 'hebrew',
    age_rating: 4,
    duration: '15:00',
    educational_tags: ['קריאה', 'עברית'],
  },
  {
    id: 'kids-3',
    title: 'סיפורי התנ״ך לילדים',
    description: 'סיפורים מהתנ״ך בשפה פשוטה',
    thumbnail: 'https://picsum.photos/seed/kids3/400/225',
    category: 'jewish',
    age_rating: 5,
    duration: '20:00',
    educational_tags: ['יהדות', 'סיפורים'],
  },
  {
    id: 'kids-4',
    title: 'חשבון לכיתה א',
    description: 'לומדים חשבון בדרך משעשעת',
    thumbnail: 'https://picsum.photos/seed/kids4/400/225',
    category: 'educational',
    age_rating: 6,
    duration: '30:00',
    educational_tags: ['מתמטיקה', 'לימודים'],
  },
  {
    id: 'kids-5',
    title: 'הרפתקאות דני הדינוזאור',
    description: 'סדרת אנימציה חינוכית',
    thumbnail: 'https://picsum.photos/seed/kids5/400/225',
    category: 'cartoons',
    age_rating: 3,
    duration: '12:00',
    educational_tags: ['אנימציה', 'דינוזאורים'],
  },
  {
    id: 'kids-6',
    title: 'סיפור לפני השינה',
    description: 'סיפורים קצרים לשעת הלילה',
    thumbnail: 'https://picsum.photos/seed/kids6/400/225',
    category: 'stories',
    age_rating: 3,
    duration: '10:00',
    educational_tags: ['סיפורים', 'שינה'],
  },
  {
    id: 'kids-7',
    title: 'שירי שבת לילדים',
    description: 'שירים ליום השבת',
    thumbnail: 'https://picsum.photos/seed/kids7/400/225',
    category: 'jewish',
    age_rating: 3,
    duration: '18:00',
    educational_tags: ['שבת', 'מוזיקה'],
  },
  {
    id: 'kids-8',
    title: 'צבעים וצורות',
    description: 'לומדים על צבעים וצורות בסיסיות',
    thumbnail: 'https://picsum.photos/seed/kids8/400/225',
    category: 'educational',
    age_rating: 2,
    duration: '8:00',
    educational_tags: ['צבעים', 'צורות'],
  },
];

// ===========================================
// FLOWS
// ===========================================
export const demoFlows = [
  {
    id: 'flow-morning',
    name: 'טקס בוקר',
    name_en: 'Morning Ritual',
    name_es: 'Ritual Matutino',
    description: 'התחל את היום עם חדשות, מזג אוויר ותוכן מותאם אישית',
    description_en: 'Start your day with news, weather and personalized content',
    description_es: 'Comienza tu día con noticias, clima y contenido personalizado',
    flow_type: 'system',
    icon: 'sun',
    triggers: [{ type: 'time', start_time: '07:00', end_time: '09:00', days: [0, 1, 2, 3, 4, 5, 6] }],
    items: [
      { content_id: 'channel-1', content_type: 'live', title: 'חדשות הבוקר', order: 0 },
      { content_id: 'radio-1', content_type: 'radio', title: 'רדיו תל אביב', order: 1 },
    ],
    ai_enabled: true,
    ai_brief_enabled: true,
    auto_play: true,
    is_active: true,
  },
  {
    id: 'flow-shabbat',
    name: 'ליל שבת',
    name_en: 'Shabbat Evening',
    name_es: 'Noche de Shabat',
    description: 'תוכן מיוחד לכניסת השבת',
    description_en: 'Special content for Shabbat evening',
    description_es: 'Contenido especial para la noche de Shabat',
    flow_type: 'system',
    icon: 'candle',
    triggers: [{ type: 'shabbat', skip_shabbat: false }],
    items: [
      { content_id: 'judaism-1', content_type: 'vod', title: 'הדלקת נרות', order: 0 },
      { content_id: 'judaism-2', content_type: 'vod', title: 'קבלת שבת', order: 1 },
    ],
    ai_enabled: false,
    auto_play: true,
    is_active: true,
  },
  {
    id: 'flow-sleep',
    name: 'שעת שינה',
    name_en: 'Sleep Time',
    name_es: 'Hora de Dormir',
    description: 'תוכן מרגיע לפני השינה',
    description_en: 'Relaxing content before sleep',
    description_es: 'Contenido relajante antes de dormir',
    flow_type: 'system',
    icon: 'moon',
    triggers: [{ type: 'time', start_time: '21:00', end_time: '23:00', days: [0, 1, 2, 3, 4, 5, 6] }],
    items: [
      { content_id: 'radio-3', content_type: 'radio', title: 'מוזיקה קלאסית', order: 0 },
    ],
    ai_enabled: false,
    auto_play: false,
    is_active: true,
  },
  {
    id: 'flow-kids',
    name: 'זמן ילדים',
    name_en: 'Kids Time',
    name_es: 'Hora de Niños',
    description: 'תוכן מתאים לילדים',
    description_en: 'Kid-friendly content',
    description_es: 'Contenido para niños',
    flow_type: 'system',
    icon: 'child',
    triggers: [{ type: 'time', start_time: '16:00', end_time: '18:00', days: [0, 1, 2, 3, 4, 5, 6] }],
    items: [
      { content_id: 'kids-1', content_type: 'vod', title: 'קריקטורות', order: 0 },
      { content_id: 'kids-2', content_type: 'vod', title: 'שירים לילדים', order: 1 },
    ],
    ai_enabled: false,
    auto_play: true,
    is_active: true,
  },
];

export default {
  user: demoUser,
  movies: demoMovies,
  series: demoSeries,
  channels: demoChannels,
  radioStations: demoRadioStations,
  podcasts: demoPodcasts,
  trending: demoTrending,
  chapters: demoChapters,
  subtitles: demoSubtitles,
  translations: demoTranslations,
  zman: demoZmanData,
  morningRitual: demoMorningRitual,
  continueWatching: demoContinueWatching,
  watchParties: demoWatchParties,
  categories: demoCategories,
  featured: demoFeatured,
  search: demoSearchResults,
  flows: demoFlows,
};
