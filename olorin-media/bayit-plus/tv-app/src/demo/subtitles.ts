/**
 * DEMO-ONLY: Demo subtitle and translation data for testing Hebrew learning features.
 * Not used in production.
 */

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
