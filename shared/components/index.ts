// Bayit+ Shared Components
// Used by both web and TV apps

// UI Components
export * from './ui';

// Theme
export * from './theme';

// Utils
export * from './utils/platform';

// Composite Components
export { AnimatedLogo } from './AnimatedLogo';
export { ContentRow } from './ContentRow';
export { DemoBanner } from './DemoBanner';
export { DualClock } from './DualClock';
export { FocusableCard } from './FocusableCard';
export { GlassCarousel } from './GlassCarousel';
export { GlassSidebar } from './GlassSidebar';
export { GlassTopBar } from './GlassTopBar';
export { InteractiveSubtitles } from './InteractiveSubtitles';
export { LanguageSelector } from './LanguageSelector';
// ProfileDropdown is web-only (uses lucide-react and react-dom portal)
// Import directly from './ProfileDropdown' in web app
export { SideMenu } from './SideMenu';
export { TrendingRow } from './TrendingRow';
export { UserAccountMenu } from './UserAccountMenu';
export { VoiceSearchButton } from './VoiceSearchButton';
export { SoundwaveVisualizer } from './SoundwaveVisualizer';

// Note: Admin, WatchParty, and Chat components are web-only
// They use lucide-react icons which are not available in React Native
// Import them directly in web app if needed:
// - Admin: './admin'
// - WatchParty: './watchparty'
// - Chat: './chat'
