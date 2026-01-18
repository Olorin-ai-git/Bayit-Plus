/**
 * DEMO-ONLY: Central export for all demo data.
 * Not used in production.
 */

// Types
export * from './types';

// User data
export { demoUser } from './user';

// Content data
export { demoMovies } from './movies';
export { demoSeries } from './series';
export { demoChannels } from './channels';
export { demoRadioStations } from './radio';
export { demoPodcasts, demoPodcastCategories } from './podcasts';

// Trending and news
export { demoTrending } from './trending';

// Subtitles and learning
export { demoChapters, demoSubtitles, demoTranslations } from './subtitles';

// Time and Shabbat
export { demoZmanData } from './zman';

// Morning ritual
export { demoMorningRitual } from './morningRitual';

// Watch history and engagement
export {
  demoContinueWatching,
  demoCategories,
  demoFeatured,
  demoWatchParties,
} from './watchData';

// Search
export { demoSearchResults } from './search';

// Default export for backward compatibility
import { demoUser } from './user';
import { demoMovies } from './movies';
import { demoSeries } from './series';
import { demoChannels } from './channels';
import { demoRadioStations } from './radio';
import { demoPodcasts, demoPodcastCategories } from './podcasts';
import { demoTrending } from './trending';
import { demoChapters, demoSubtitles, demoTranslations } from './subtitles';
import { demoZmanData } from './zman';
import { demoMorningRitual } from './morningRitual';
import {
  demoContinueWatching,
  demoCategories,
  demoFeatured,
  demoWatchParties,
} from './watchData';
import { demoSearchResults } from './search';

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
  searchResults: demoSearchResults,
};
