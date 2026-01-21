/**
 * DEMO-ONLY: Demo search functionality for testing search features.
 * Not used in production.
 */

import { demoMovies } from './movies';
import { demoSeries } from './series';
import { demoChannels } from './channels';
import { demoRadioStations } from './radio';
import { demoPodcasts } from './podcasts';

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
