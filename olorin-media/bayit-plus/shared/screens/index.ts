// Main screens - safe for all platforms (web, TV, mobile)
export { HomeScreen } from './HomeScreen';
export { PlayerScreen } from './PlayerScreen';
export { LoginScreen } from './LoginScreen';
export { RegisterScreen } from './RegisterScreen';
export { ProfileScreen } from './ProfileScreen';
export { ProfileSelectionScreen } from './ProfileSelectionScreen';
export { LiveTVScreen } from './LiveTVScreen';
export { RadioScreen } from './RadioScreen';
export { VODScreen } from './VODScreen';
export { PodcastsScreen } from './PodcastsScreen';
export { SearchScreen } from './SearchScreen';
export { FavoritesScreen } from './FavoritesScreen';
export { DownloadsScreen } from './DownloadsScreen';
export { WatchlistScreen } from './WatchlistScreen';
export { ChildrenScreen } from './ChildrenScreen';
export { JudaismScreen } from './JudaismScreen';
export { default as FlowsScreen } from './FlowsScreen';
export { default as MorningRitualScreen } from './MorningRitualScreen';
export { EPGScreen } from './EPGScreen';
export { default as MovieDetailScreen } from './MovieDetailScreen';
export { default as SeriesDetailScreen } from './SeriesDetailScreen';
export { default as SettingsScreen } from './SettingsScreen';
export { default as RecordingsScreen } from './RecordingsScreen';
export { default as HelpScreen } from './HelpScreen';
export { default as SupportScreen } from './SupportScreen';
export { SubscribeScreen } from './SubscribeScreen';

// Admin screens are in a separate export to avoid bundling web-only dependencies in TV apps
// Import from '@bayit/shared-screens/admin' instead
