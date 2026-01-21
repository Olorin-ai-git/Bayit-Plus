/**
 * DEMO-ONLY: Central export for all demo services.
 * Not used in production.
 */

export { delay } from './delay';
export { demoAuthService } from './auth';
export { demoContentService, demoLiveService, demoRadioService } from './content';
export { demoPodcastService } from './podcast';
export { demoSubscriptionService } from './subscription';
export { demoWatchlistService, demoHistoryService, demoFavoritesService } from './user';
export { demoSearchService } from './search';
export { demoZmanService } from './zman';
export { demoTrendingService } from './trending';
export { demoRitualService } from './ritual';
export { demoSubtitlesService, demoChaptersService } from './media';
export { demoPartyService, demoChatService } from './social';

// Default export for backward compatibility
import { demoAuthService } from './auth';
import { demoContentService, demoLiveService, demoRadioService } from './content';
import { demoPodcastService } from './podcast';
import { demoSubscriptionService } from './subscription';
import { demoWatchlistService, demoHistoryService, demoFavoritesService } from './user';
import { demoSearchService } from './search';
import { demoZmanService } from './zman';
import { demoTrendingService } from './trending';
import { demoRitualService } from './ritual';
import { demoSubtitlesService, demoChaptersService } from './media';
import { demoPartyService, demoChatService } from './social';

export default {
  auth: demoAuthService,
  content: demoContentService,
  live: demoLiveService,
  radio: demoRadioService,
  podcast: demoPodcastService,
  subscription: demoSubscriptionService,
  watchlist: demoWatchlistService,
  history: demoHistoryService,
  favorites: demoFavoritesService,
  search: demoSearchService,
  zman: demoZmanService,
  trending: demoTrendingService,
  ritual: demoRitualService,
  subtitles: demoSubtitlesService,
  chapters: demoChaptersService,
  party: demoPartyService,
  chat: demoChatService,
};
