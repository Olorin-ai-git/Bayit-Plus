/**
 * DEMO-ONLY: Demo trending topics data for testing news/trending features.
 * Not used in production.
 */

import { TrendingTopic } from './types';

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
