/**
 * Shared Types - Central Export File
 */

export type {
  Role,
  Permission,
  RolePermissions,
  User,
  AdminUser,
} from './rbac';

export type {
  VoiceMode,
  VoiceModeConfig,
} from './voiceModes';

export type {
  SubtitleCue,
  SubtitleTrack,
  SubtitleSettings,
  SubtitlePreferences,
  LiveSubtitleCue,
  SubtitleTracksResponse,
  SubtitleCuesResponse,
  SubtitleLanguage,
} from './subtitle';

export { SUBTITLE_LANGUAGES, getLanguageInfo } from './subtitle';

export type {
  HomeSectionId,
  HomeSectionConfig,
  HomePagePreferences,
} from './homePageConfig';

export {
  SECTION_ICONS,
  SECTION_LABEL_KEYS,
  DEFAULT_HOME_SECTIONS,
  DEFAULT_HOME_PAGE_PREFERENCES,
  getSortedVisibleSections,
  getHiddenSections,
  reorderSection,
  toggleSectionVisibility,
} from './homePageConfig';

export type {
  TriviaFact,
  TriviaCategory,
  TriviaResponse,
  TriviaEnrichedResponse,
  TriviaFrequency,
  TriviaPreferences,
  TriviaSettings,
  TriviaState,
  TriviaHealthResponse,
  TriviaCategoryInfo,
  TriviaFrequencyInfo,
} from './trivia';

export {
  DEFAULT_TRIVIA_PREFERENCES,
  TRIVIA_CATEGORIES,
  TRIVIA_FREQUENCIES,
  getCategoryInfo,
  getFrequencyInfo,
  getIntervalForFrequency,
} from './trivia';

export type {
  VideoQuality,
  PlaybackSpeed,
  PlaybackSettings,
  AudioQuality,
  AudioSettings,
  EmailDigestFrequency,
  NotificationSettings,
  PrivacySettings,
  ContentRating,
  ParentalControlSettings,
  SecuritySettings,
  ActiveSession,
  TriviaDifficulty,
  DubbingVoice,
  DubbingSettings,
  TriviaGameSettings,
  AIFeatureSettings,
  ColorBlindMode,
  AccessibilitySettings,
  ThemeMode,
  StartupScreen,
  ThemeSettings,
} from './settings';

export {
  DEFAULT_PLAYBACK_SETTINGS,
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_PARENTAL_SETTINGS,
  DEFAULT_DUBBING_SETTINGS,
  DEFAULT_TRIVIA_GAME_SETTINGS,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  DEFAULT_THEME_SETTINGS,
} from './settings';

export type {
  ContentFormat,
  ContentRating,
  AudienceId,
  QualityTier,
  StreamType,
  DRMType,
  SubscriptionTier,
  AudioTrack,
  QualityVariant,
  DRMConfig,
  StreamManifest,
  CastMember,
  Episode,
  Season,
  VODContentItem,
  VODCategory,
  CollectionType,
  VODCollection,
  VODCollectionItem,
  WatchProgress,
  ContinueWatchingItem,
  FavoriteStatus,
  RecommendationReason,
  Recommendation,
  VODSearchSuggestion,
  InteractiveMomentType,
  InteractiveMomentOption,
  InteractiveMoment,
  PaginatedResponse,
  PlayerState,
  PlayerSettings,
  VODFilters,
} from './vod';
