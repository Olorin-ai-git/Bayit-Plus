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
