/**
 * TV App Components
 * Re-exports from shared library for backward compatibility
 */

// Re-export all shared components
export {
  AnimatedLogo,
  ContentRow,
  DemoBanner,
  DualClock,
  FocusableCard,
  GlassCarousel,
  GlassSidebar,
  GlassTopBar,
  InteractiveSubtitles,
  JerusalemRow,
  TelAvivRow,
  LanguageSelector,
  SideMenu,
  TrendingRow,
  UserAccountMenu,
  VoiceSearchButton,
} from '@bayit/shared';

// Re-export UI components
export * from './ui';

// Re-export player components (local)
export * from './player';

// Re-export watchparty components
export * from './watchparty';

// Re-export chat components
export * from './chat';
