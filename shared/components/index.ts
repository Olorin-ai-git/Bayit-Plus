// Bayit+ Shared Components
// Used by both web and TV apps

// UI Components
export * from './ui';

// Theme
export * from './theme';

// Utils
export * from './utils/platform';

// Search Components
export * from './search';

// Composite Components
export { AnimatedLogo } from './AnimatedLogo';
export { ContentActionButtons } from './ContentActionButtons';
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
export { SubtitleFlags } from './SubtitleFlags';
export { TrendingRow } from './TrendingRow';
export { JerusalemRow } from './JerusalemRow';
export { TelAvivRow } from './TelAvivRow';
export { UserAccountMenu } from './UserAccountMenu';
export { VoiceSearchButton } from './VoiceSearchButton';
export { SoundwaveVisualizer } from './SoundwaveVisualizer';

// Voice-first conversational interface components (Phases 3, 10)
export { VoiceStatusOverlay } from './VoiceStatusOverlay';
export { VoiceVideoIndicator } from './VoiceVideoIndicator';
export { VisualFeedbackSystem } from './VisualFeedbackSystem';

// Error handling
export { ErrorBoundary } from './ErrorBoundary';

// Settings Components
export * from './settings';

// Judaism Components (Shabbat features)
export * from './judaism';

// Note: Admin, WatchParty, and Chat components are web-only
// They use lucide-react icons which are not available in React Native
// Import them directly in web app if needed:
// - Admin: './admin'
// - WatchParty: './watchparty'
// - Chat: './chat'
