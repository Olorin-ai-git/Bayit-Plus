/**
 * DEMO-ONLY: Demo search service.
 * Not used in production.
 */

import { demoSearchResults } from '../../demo';
import { delay } from './delay';

export const demoSearchService = {
  search: async (query: string, filters?: any) => {
    await delay();
    return demoSearchResults(query);
  },
  quickSearch: async (query: string, limit: number = 5) => {
    await delay();
    const results = demoSearchResults(query);
    return { suggestions: results.results.slice(0, limit) };
  },
  getSuggestions: async () => {
    await delay();
    return { suggestions: ['פאודה', 'שטיסל', 'טהרן', 'הבורר', 'עבודה ערבית'] };
  },
  voiceSearch: async (transcript: string, language: string, filters?: any) => {
    await delay();
    return demoSearchResults(transcript);
  },
};
