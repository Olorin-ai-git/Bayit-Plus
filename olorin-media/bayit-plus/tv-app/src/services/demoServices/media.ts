/**
 * DEMO-ONLY: Demo subtitles and chapters services.
 * Not used in production.
 */

import { demoChapters, demoSubtitles, demoTranslations } from '../../demo';
import { delay } from './delay';

export const demoSubtitlesService = {
  getLanguages: async () => {
    await delay();
    return {
      languages: [
        { code: 'he', name: 'עברית', name_en: 'Hebrew', rtl: true },
        { code: 'en', name: 'English', name_en: 'English', rtl: false },
        { code: 'ar', name: 'العربية', name_en: 'Arabic', rtl: true },
        { code: 'ru', name: 'Русский', name_en: 'Russian', rtl: false },
      ],
    };
  },
  getTracks: async (contentId: string, language?: string) => {
    await delay();
    const track = demoSubtitles[contentId];
    return track ? [track] : [];
  },
  getCues: async (contentId: string, language: string = 'he', withNikud: boolean = false, startTime?: number, endTime?: number) => {
    await delay();
    const track = demoSubtitles[contentId];
    if (!track) return { cues: [] };

    let cues = track.cues;
    if (startTime !== undefined) {
      cues = cues.filter((c: any) => c.end_time >= startTime);
    }
    if (endTime !== undefined) {
      cues = cues.filter((c: any) => c.start_time <= endTime);
    }

    return {
      content_id: contentId,
      language: track.language,
      language_name: track.language_name,
      has_nikud: track.has_nikud,
      cues: cues.map((c: any) => ({
        ...c,
        text: withNikud && c.text_nikud ? c.text_nikud : c.text,
      })),
    };
  },
  generateNikud: async (contentId: string, language: string = 'he', force: boolean = false) => {
    await delay(500);
    return {
      message: 'Nikud generated successfully',
      content_id: contentId,
      generated_at: new Date().toISOString(),
    };
  },
  translateWord: async (word: string, sourceLang: string = 'he', targetLang: string = 'en') => {
    await delay(300);
    return demoTranslations[word] || {
      word,
      translation: `[תרגום של ${word}]`,
      transliteration: word,
      part_of_speech: 'noun',
      cached: false,
    };
  },
  translatePhrase: async (phrase: string, sourceLang: string = 'he', targetLang: string = 'en') => {
    await delay(500);
    return {
      phrase,
      translation: `[Translation of: ${phrase}]`,
      source_lang: sourceLang,
      target_lang: targetLang,
    };
  },
  addNikudToText: async (text: string) => {
    await delay(300);
    return {
      original: text,
      with_nikud: text,
    };
  },
};

export const demoChaptersService = {
  getChapters: async (contentId: string) => {
    await delay();
    return demoChapters[contentId] || { chapters: [] };
  },
  generateChapters: async (contentId: string, force: boolean = false, transcript?: string) => {
    await delay(1000);
    return demoChapters[contentId] || {
      content_id: contentId,
      chapters: [
        { start_time: 0, end_time: 300, title: 'פתיחה', category: 'intro' },
        { start_time: 300, end_time: 1200, title: 'עלילה ראשית', category: 'main' },
        { start_time: 1200, end_time: 1800, title: 'סיום', category: 'conclusion' },
      ],
      generated_at: new Date().toISOString(),
    };
  },
  getLiveChapters: async (channelId: string) => {
    await delay();
    return {
      chapters: [
        { start_time: 0, end_time: 600, title: 'חדשות פתיחה', category: 'news' },
        { start_time: 600, end_time: 1200, title: 'ביטחון', category: 'security' },
        { start_time: 1200, end_time: 1800, title: 'כלכלה', category: 'economy' },
      ],
    };
  },
  getCategories: async () => {
    await delay();
    return {
      categories: ['intro', 'news', 'security', 'politics', 'sports', 'weather', 'conclusion'],
    };
  },
};
