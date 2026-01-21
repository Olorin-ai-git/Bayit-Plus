/**
 * DEMO-ONLY: Demo trending service.
 * Not used in production.
 */

import { demoTrending, demoSeries } from '../../demo';
import { delay } from './delay';

export const demoTrendingService = {
  getTopics: async () => {
    await delay();
    return {
      topics: [
        {
          title: 'בחירות 2025',
          title_en: 'Elections 2025',
          title_es: 'Elecciones 2025',
          category: 'politics',
          category_label: { he: 'פוליטיקה', en: 'Politics', es: 'Política' },
          sentiment: 'neutral',
          importance: 10,
          summary: 'הבחירות הקרובות מעסיקות את הציבור',
          summary_en: 'The upcoming elections are on everyone\'s mind',
          summary_es: 'Las próximas elecciones están en la mente de todos',
          keywords: ['בחירות', 'ממשלה', 'כנסת'],
        },
        {
          title: 'מכבי תל אביב בליגת האלופות',
          title_en: 'Maccabi Tel Aviv in Champions League',
          title_es: 'Maccabi Tel Aviv en la Liga de Campeones',
          category: 'sports',
          category_label: { he: 'ספורט', en: 'Sports', es: 'Deportes' },
          sentiment: 'positive',
          importance: 8,
          summary: 'ניצחון דרמטי בליגת אלופות',
          summary_en: 'Dramatic victory in the Champions League',
          summary_es: 'Victoria dramática en la Liga de Campeones',
          keywords: ['מכבי', 'כדורגל', 'ליגת אלופות'],
        },
        {
          title: 'סטארט-אפ ישראלי גייס 100 מיליון',
          title_en: 'Israeli Startup Raises $100M',
          title_es: 'Startup Israelí Recauda $100M',
          category: 'tech',
          category_label: { he: 'טכנולוגיה', en: 'Tech', es: 'Tecnología' },
          sentiment: 'positive',
          importance: 7,
          summary: 'חדשנות טכנולוגית ישראלית',
          summary_en: 'Israeli technological innovation',
          summary_es: 'Innovación tecnológica israelí',
          keywords: ['הייטק', 'סטארט-אפ', 'גיוס'],
        },
        {
          title: 'מזג אוויר סוער בסוף השבוע',
          title_en: 'Stormy Weather This Weekend',
          title_es: 'Clima Tormentoso Este Fin de Semana',
          category: 'weather',
          category_label: { he: 'מזג אוויר', en: 'Weather', es: 'Clima' },
          sentiment: 'neutral',
          importance: 6,
          summary: 'גשמים צפויים בסוף השבוע',
          summary_en: 'Rain expected this weekend',
          summary_es: 'Se esperan lluvias este fin de semana',
          keywords: ['גשם', 'סערה', 'מזג אוויר'],
        },
        {
          title: 'פרסי האקדמיה הישראלית',
          title_en: 'Israeli Academy Awards',
          title_es: 'Premios de la Academia Israelí',
          category: 'entertainment',
          category_label: { he: 'בידור', en: 'Entertainment', es: 'Entretenimiento' },
          sentiment: 'positive',
          importance: 7,
          summary: 'פרסי האקדמיה הישראלית הוכרזו',
          summary_en: 'Israeli Academy Awards announced',
          summary_es: 'Se anunciaron los Premios de la Academia Israelí',
          keywords: ['קולנוע', 'פרסים', 'אקדמיה'],
        },
      ],
      overall_mood: 'הציבור הישראלי עסוק בבחירות ובספורט',
      overall_mood_en: 'The Israeli public is focused on elections and sports',
      overall_mood_es: 'El público israelí se enfoca en las elecciones y los deportes',
      top_story: 'בחירות 2025 בעיצומן',
      top_story_en: '2025 Elections in full swing',
      top_story_es: 'Elecciones 2025 en pleno apogeo',
      sources: ['Ynet', 'Walla', 'Mako', 'Calcalist', 'Sport5'],
      analyzed_at: new Date().toISOString(),
    };
  },
  getHeadlines: async (source?: string, limit: number = 20) => {
    await delay();
    return {
      headlines: demoTrending.topics.map(t => ({
        title: t.title,
        source: source || 'Ynet',
        url: '#',
        published_at: new Date().toISOString(),
      })),
    };
  },
  getRecommendations: async (limit: number = 10) => {
    await delay();
    return { recommendations: demoSeries.slice(0, limit) };
  },
  getSummary: async () => {
    await delay();
    return {
      summary: demoTrending.overall_mood,
      top_story: demoTrending.top_story,
    };
  },
  getByCategory: async (category: string) => {
    await delay();
    return {
      topics: demoTrending.topics.filter(t => t.category === category),
    };
  },
};
